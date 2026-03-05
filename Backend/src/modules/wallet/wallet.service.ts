import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Wallet,
  WalletTransaction,
  WalletStatus,
  WalletTransactionType,
} from '@core/database/entities';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { WalletBalanceResponseDto } from './dto/wallet-balance.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly walletTxRepository: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * สร้างกระเป๋าเงินให้ User (ถ้ายังไม่มี)
   */
  async createWalletForUser(userId: number): Promise<Wallet> {
    const existing = await this.walletRepository.findOne({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    const wallet = this.walletRepository.create({
      userId,
      balance: '0.00',
      status: WalletStatus.ACTIVE,
    });

    return this.walletRepository.save(wallet);
  }

  /**
   * ดึงยอดเงินคงเหลือใน Wallet ตาม userId
   */
  async getBalance(userId: number): Promise<WalletBalanceResponseDto> {
    let wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      // ถ้ายังไม่มี ให้สร้างใหม่ด้วยยอด 0.00 แทนการโยน 404
      wallet = await this.createWalletForUser(userId);
    }

    return {
      userId: wallet.userId,
      balance: wallet.balance,
      status: wallet.status,
    };
  }

  /**
   * ดึงประวัติธุรกรรมของผู้ใช้ (เรียงจากใหม่ไปเก่า)
   */
  async getTransactions(userId: number): Promise<WalletTransaction[]> {
    let wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      // ถ้ายังไม่มี wallet ให้สร้างใหม่ และคืน array ว่าง
      wallet = await this.createWalletForUser(userId);
      return [];
    }

    return this.walletTxRepository.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * เติมเงินเข้ากระเป๋า (amount > 0: เงินเข้า, amount < 0: เงินออก)
   * ใช้ Transaction + Pessimistic Locking เพื่อป้องกัน Race Condition
   */
  async creditWallet(
    userId: number,
    dto: CreditWalletDto,
  ): Promise<Wallet> {
    const { amount, type, referenceId, description } = dto;

    if (!amount || Number.isNaN(amount)) {
      throw new BadRequestException('Amount is required');
    }

    if (!type) {
      throw new BadRequestException('Transaction type is required');
    }

    return this.dataSource.transaction(async (manager) => {
      // 🔒 Lock wallet row for update
      let wallet = await manager
        .getRepository(Wallet)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId = :userId', { userId })
        .getOne();

      if (!wallet) {
        // ถ้ายังไม่มี wallet ให้สร้างใหม่ก่อน
        wallet = manager.getRepository(Wallet).create({
          userId,
          balance: '0.00',
          status: WalletStatus.ACTIVE,
        });
        wallet = await manager.getRepository(Wallet).save(wallet);
      }

      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException('Wallet is not active');
      }

      const currentBalance = Number(wallet.balance || 0);
      const nextBalance = currentBalance + amount;

      if (nextBalance < 0) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      wallet.balance = nextBalance.toFixed(2);
      await manager.getRepository(Wallet).save(wallet);

      const tx = manager.getRepository(WalletTransaction).create({
        walletId: wallet.id,
        amount: amount.toFixed(2),
        type,
        referenceId: referenceId ?? null,
        description: description ?? null,
      });
      await manager.getRepository(WalletTransaction).save(tx);

      return wallet;
    });
  }
}

