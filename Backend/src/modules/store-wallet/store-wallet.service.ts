import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  StoreWallet,
  StoreWalletTransaction,
  StoreTransactionType,
  StoreWithdrawalRequest,
  WithdrawalStatus,
} from '@core/database/entities';

@Injectable()
export class StoreWalletService {
  constructor(
    @InjectRepository(StoreWallet)
    private readonly storeWalletRepository: Repository<StoreWallet>,
    @InjectRepository(StoreWalletTransaction)
    private readonly storeWalletTxRepository: Repository<StoreWalletTransaction>,
    @InjectRepository(StoreWithdrawalRequest)
    private readonly withdrawalRequestRepository: Repository<StoreWithdrawalRequest>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * สร้างกระเป๋าเงินให้ Store (ถ้ายังไม่มี)
   */
  async createWallet(storeId: number): Promise<StoreWallet> {
    // ตรวจสอบว่ามี wallet อยู่แล้วหรือไม่
    const existing = await this.storeWalletRepository.findOne({
      where: { storeId },
    });

    if (existing) {
      // คืน wallet เดิม แทนที่จะ throw error
      return existing;
    }

    try {
      const wallet = this.storeWalletRepository.create({
        storeId,
        balance: '0.00',
      });

      return await this.storeWalletRepository.save(wallet);
    } catch (error) {
      // Handle duplicate key error (race condition)
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        const existingWallet = await this.storeWalletRepository.findOne({
          where: { storeId },
        });
        if (existingWallet) {
          return existingWallet;
        }
      }
      throw error;
    }
  }

  /**
   * ดึงยอดเงินคงเหลือใน Wallet ตาม storeId
   */
  async getWalletBalance(storeId: number): Promise<StoreWallet> {
    let wallet = await this.storeWalletRepository.findOne({
      where: { storeId },
    });

    if (!wallet) {
      // ถ้ายังไม่มี ให้สร้างใหม่ด้วยยอด 0.00
      wallet = await this.createWallet(storeId);
    }

    return wallet;
  }

  /**
   * ดึงประวัติธุรกรรมของร้านค้า (เรียงจากใหม่ไปเก่า)
   */
  async getTransactions(storeId: number): Promise<StoreWalletTransaction[]> {
    const wallet = await this.getWalletBalance(storeId);

    return this.storeWalletTxRepository.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * เพิ่มรายได้จากการขายเข้ากระเป๋าร้านค้า
   * ใช้ Transaction + Pessimistic Locking เพื่อป้องกัน Race Condition
   */
  async addRevenue(
    storeId: number,
    amount: number,
    referenceOrder: string,
  ): Promise<StoreWallet> {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    return this.dataSource.transaction(async (manager) => {
      // 🔒 Lock wallet row for update
      let wallet = await manager
        .getRepository(StoreWallet)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.storeId = :storeId', { storeId })
        .getOne();

      if (!wallet) {
        // ถ้ายังไม่มี wallet ให้สร้างใหม่ก่อน
        wallet = manager.getRepository(StoreWallet).create({
          storeId,
          balance: '0.00',
        });
        wallet = await manager.getRepository(StoreWallet).save(wallet);
      }

      // คำนวณยอดใหม่ (ใช้ decimal-safe calculation)
      const currentBalance = Number(wallet.balance || 0);
      const amountToAdd = Math.round(amount * 100) / 100; // Round to 2 decimal places
      const nextBalance = Math.round((currentBalance + amountToAdd) * 100) / 100;

      wallet.balance = nextBalance.toFixed(2);
      await manager.getRepository(StoreWallet).save(wallet);

      // บันทึก Transaction log
      const tx = manager.getRepository(StoreWalletTransaction).create({
        walletId: wallet.id,
        amount: amountToAdd.toFixed(2),
        type: StoreTransactionType.SALE_REVENUE,
        referenceId: referenceOrder,
        description: `Revenue from order ${referenceOrder}`,
      });
      await manager.getRepository(StoreWalletTransaction).save(tx);

      return wallet;
    });
  }

  /**
   * ปรับยอดเงินโดย Admin (บวกหรือลบก็ได้)
   */
  async adjustBalance(
    storeId: number,
    amount: number,
    reason: string,
  ): Promise<StoreWallet> {
    if (!amount || Number.isNaN(amount)) {
      throw new BadRequestException('Amount is required');
    }

    if (!reason || reason.trim() === '') {
      throw new BadRequestException('Reason is required for adjustment');
    }

    return this.dataSource.transaction(async (manager) => {
      // 🔒 Lock wallet row for update
      let wallet = await manager
        .getRepository(StoreWallet)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.storeId = :storeId', { storeId })
        .getOne();

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for store ${storeId}`);
      }

      // คำนวณยอดใหม่
      const currentBalance = Number(wallet.balance || 0);
      const adjustAmount = Math.round(amount * 100) / 100;
      const nextBalance = Math.round((currentBalance + adjustAmount) * 100) / 100;

      if (nextBalance < 0) {
        throw new BadRequestException(
          `Insufficient balance. Current: ${currentBalance}, Adjustment: ${adjustAmount}`,
        );
      }

      wallet.balance = nextBalance.toFixed(2);
      await manager.getRepository(StoreWallet).save(wallet);

      // บันทึก Transaction log
      const tx = manager.getRepository(StoreWalletTransaction).create({
        walletId: wallet.id,
        amount: adjustAmount.toFixed(2),
        type: StoreTransactionType.ADJUSTMENT,
        referenceId: null,
        description: reason,
      });
      await manager.getRepository(StoreWalletTransaction).save(tx);

      return wallet;
    });
  }

  /**
   * ถอนเงินออกจากกระเป๋าร้านค้า
   */
  async withdraw(
    storeId: number,
    amount: number,
    referenceId?: string,
  ): Promise<StoreWallet> {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    return this.dataSource.transaction(async (manager) => {
      // 🔒 Lock wallet row for update
      const wallet = await manager
        .getRepository(StoreWallet)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.storeId = :storeId', { storeId })
        .getOne();

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for store ${storeId}`);
      }

      const currentBalance = Number(wallet.balance || 0);
      const withdrawAmount = Math.round(amount * 100) / 100;

      if (currentBalance < withdrawAmount) {
        throw new BadRequestException(
          `Insufficient balance. Current: ${currentBalance}, Withdrawal: ${withdrawAmount}`,
        );
      }

      const nextBalance = Math.round((currentBalance - withdrawAmount) * 100) / 100;
      wallet.balance = nextBalance.toFixed(2);
      await manager.getRepository(StoreWallet).save(wallet);

      // บันทึก Transaction log (amount เป็นลบ)
      const tx = manager.getRepository(StoreWalletTransaction).create({
        walletId: wallet.id,
        amount: (-withdrawAmount).toFixed(2),
        type: StoreTransactionType.WITHDRAWAL,
        referenceId: referenceId ?? null,
        description: `Withdrawal request`,
      });
      await manager.getRepository(StoreWalletTransaction).save(tx);

      return wallet;
    });
  }

  // ============================================================
  // ✅ Withdrawal Request Methods
  // ============================================================

  /**
   * ร้านค้าขอถอนเงิน
   * - ตรวจสอบยอดคงเหลือ
   * - หักเงินจาก Wallet ทันที (Hold)
   * - สร้าง WithdrawalRequest สถานะ PENDING
   */
  async requestWithdrawal(
    storeId: number,
    amount: number,
    bankDetails: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    },
  ): Promise<StoreWithdrawalRequest> {
    if (!amount || amount <= 0) {
      throw new BadRequestException('จำนวนเงินต้องมากกว่า 0');
    }

    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName) {
      throw new BadRequestException('กรุณากรอกข้อมูลธนาคารให้ครบถ้วน');
    }

    return this.dataSource.transaction(async (manager) => {
      // 🔒 Lock wallet row for update
      const wallet = await manager
        .getRepository(StoreWallet)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.storeId = :storeId', { storeId })
        .getOne();

      if (!wallet) {
        throw new NotFoundException(`ไม่พบกระเป๋าเงินของร้านค้า ${storeId}`);
      }

      const currentBalance = Number(wallet.balance || 0);
      const withdrawAmount = Math.round(amount * 100) / 100;

      // ตรวจสอบยอดคงเหลือ
      if (currentBalance < withdrawAmount) {
        throw new BadRequestException(
          `ยอดเงินคงเหลือไม่เพียงพอ (คงเหลือ: ${currentBalance.toFixed(2)} บาท, ต้องการถอน: ${withdrawAmount.toFixed(2)} บาท)`,
        );
      }

      // หักเงินจาก Wallet ทันที (Hold)
      const nextBalance = Math.round((currentBalance - withdrawAmount) * 100) / 100;
      wallet.balance = nextBalance.toFixed(2);
      await manager.getRepository(StoreWallet).save(wallet);

      // สร้าง Withdrawal Request
      const withdrawalRequest = manager.getRepository(StoreWithdrawalRequest).create({
        storeId,
        walletId: wallet.id,
        amount: withdrawAmount.toFixed(2),
        status: WithdrawalStatus.PENDING,
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        accountName: bankDetails.accountName,
      });
      const savedRequest = await manager.getRepository(StoreWithdrawalRequest).save(withdrawalRequest);

      // บันทึก Transaction log (amount เป็นลบ)
      const tx = manager.getRepository(StoreWalletTransaction).create({
        walletId: wallet.id,
        amount: (-withdrawAmount).toFixed(2),
        type: StoreTransactionType.WITHDRAWAL,
        referenceId: `WITHDRAW-${savedRequest.id}`,
        description: `Withdrawal request #${savedRequest.id} - ${bankDetails.bankName} ${bankDetails.accountNumber}`,
      });
      await manager.getRepository(StoreWalletTransaction).save(tx);

      return savedRequest;
    });
  }

  /**
   * ดึงประวัติคำขอถอนเงินของร้านค้า
   */
  async getWithdrawalRequests(storeId: number): Promise<StoreWithdrawalRequest[]> {
    return this.withdrawalRequestRepository.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * ดึงคำขอถอนเงินทั้งหมด (สำหรับ Admin)
   */
  async getAllWithdrawalRequests(status?: WithdrawalStatus): Promise<StoreWithdrawalRequest[]> {
    const where = status ? { status } : {};
    return this.withdrawalRequestRepository.find({
      where,
      relations: ['store', 'wallet'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * ดึงคำขอถอนเงินที่รอดำเนินการ (สำหรับ Admin)
   */
  async getPendingWithdrawalRequests(): Promise<StoreWithdrawalRequest[]> {
    return this.getAllWithdrawalRequests(WithdrawalStatus.PENDING);
  }

  /**
   * Admin อนุมัติคำขอถอนเงิน
   */
  async approveWithdrawal(
    requestId: number,
    proofImage: string,
    adminId: number,
  ): Promise<StoreWithdrawalRequest> {
    const request = await this.withdrawalRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`ไม่พบคำขอถอนเงิน #${requestId}`);
    }

    if (request.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        `คำขอถอนเงินนี้ไม่อยู่ในสถานะรอดำเนินการ (สถานะปัจจุบัน: ${request.status})`,
      );
    }

    if (!proofImage || proofImage.trim() === '') {
      throw new BadRequestException('กรุณาอัปโหลดหลักฐานการโอนเงิน');
    }

    request.status = WithdrawalStatus.APPROVED;
    request.proofImage = proofImage.trim();
    request.processedBy = adminId;
    request.processedAt = new Date();

    return this.withdrawalRequestRepository.save(request);
  }

  /**
   * Admin ปฏิเสธคำขอถอนเงิน (คืนเงินกลับเข้า Wallet)
   */
  async rejectWithdrawal(
    requestId: number,
    reason: string,
    adminId: number,
  ): Promise<StoreWithdrawalRequest> {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('กรุณาระบุเหตุผลในการปฏิเสธ');
    }

    return this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(StoreWithdrawalRequest, {
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundException(`ไม่พบคำขอถอนเงิน #${requestId}`);
      }

      if (request.status !== WithdrawalStatus.PENDING) {
        throw new BadRequestException(
          `คำขอถอนเงินนี้ไม่อยู่ในสถานะรอดำเนินการ (สถานะปัจจุบัน: ${request.status})`,
        );
      }

      // 🔒 Lock wallet row for update
      const wallet = await manager
        .getRepository(StoreWallet)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.id = :walletId', { walletId: request.walletId })
        .getOne();

      if (!wallet) {
        throw new NotFoundException(`ไม่พบกระเป๋าเงิน`);
      }

      // คืนเงินกลับเข้า Wallet
      const refundAmount = Number(request.amount || 0);
      const currentBalance = Number(wallet.balance || 0);
      const nextBalance = Math.round((currentBalance + refundAmount) * 100) / 100;

      wallet.balance = nextBalance.toFixed(2);
      await manager.getRepository(StoreWallet).save(wallet);

      // บันทึก Transaction log (amount เป็นบวก - คืนเงิน)
      const tx = manager.getRepository(StoreWalletTransaction).create({
        walletId: wallet.id,
        amount: refundAmount.toFixed(2),
        type: StoreTransactionType.ADJUSTMENT,
        referenceId: `WITHDRAW-REJECTED-${request.id}`,
        description: `Refund for rejected withdrawal request #${request.id}: ${reason}`,
      });
      await manager.getRepository(StoreWalletTransaction).save(tx);

      // อัปเดต Request status
      request.status = WithdrawalStatus.REJECTED;
      request.adminNote = reason.trim();
      request.processedBy = adminId;
      request.processedAt = new Date();

      return manager.getRepository(StoreWithdrawalRequest).save(request);
    });
  }

  /**
   * ดึงคำขอถอนเงินโดย ID
   */
  async getWithdrawalRequestById(requestId: number): Promise<StoreWithdrawalRequest> {
    const request = await this.withdrawalRequestRepository.findOne({
      where: { id: requestId },
      relations: ['store', 'wallet'],
    });

    if (!request) {
      throw new NotFoundException(`ไม่พบคำขอถอนเงิน #${requestId}`);
    }

    return request;
  }
}
