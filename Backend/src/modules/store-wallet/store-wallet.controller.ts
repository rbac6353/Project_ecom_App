import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StoreWalletService } from './store-wallet.service';
import { JwtAuthGuard } from '@core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@core/auth/guards/roles.guard';
import { Roles } from '@core/auth/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { WithdrawalStatus } from '@core/database/entities';

// DTO for withdrawal request
class RequestWithdrawalDto {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

// DTO for admin approval
class ApproveWithdrawalDto {
  proofImage: string;
}

// DTO for admin rejection
class RejectWithdrawalDto {
  reason: string;
}

@Controller('store-wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoreWalletController {
  constructor(private readonly storeWalletService: StoreWalletService) {}

  // ============================================================
  // ✅ Store Owner Endpoints
  // ============================================================

  /**
   * ดึงยอดเงินคงเหลือของร้านค้า
   * GET /store-wallet/balance/:storeId
   */
  @Get('balance/:storeId')
  @Roles('SELLER', 'ADMIN')
  async getBalance(@Param('storeId', ParseIntPipe) storeId: number) {
    const wallet = await this.storeWalletService.getWalletBalance(storeId);
    return {
      success: true,
      data: {
        storeId: wallet.storeId,
        balance: wallet.balance,
        walletId: wallet.id,
      },
    };
  }

  /**
   * ดึงประวัติธุรกรรมของร้านค้า
   * GET /store-wallet/transactions/:storeId
   */
  @Get('transactions/:storeId')
  @Roles('SELLER', 'ADMIN')
  async getTransactions(@Param('storeId', ParseIntPipe) storeId: number) {
    const transactions = await this.storeWalletService.getTransactions(storeId);
    return {
      success: true,
      data: transactions,
    };
  }

  /**
   * ร้านค้าขอถอนเงิน
   * POST /store-wallet/withdraw/:storeId
   */
  @Post('withdraw/:storeId')
  @Roles('SELLER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async requestWithdrawal(
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() dto: RequestWithdrawalDto,
  ) {
    const request = await this.storeWalletService.requestWithdrawal(
      storeId,
      dto.amount,
      {
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
      },
    );

    return {
      success: true,
      message: 'คำขอถอนเงินถูกส่งเรียบร้อยแล้ว รอการอนุมัติจากผู้ดูแลระบบ',
      data: request,
    };
  }

  /**
   * ดึงประวัติคำขอถอนเงินของร้านค้า
   * GET /store-wallet/withdrawals/:storeId
   */
  @Get('withdrawals/:storeId')
  @Roles('SELLER', 'ADMIN')
  async getWithdrawalRequests(@Param('storeId', ParseIntPipe) storeId: number) {
    const requests = await this.storeWalletService.getWithdrawalRequests(storeId);
    return {
      success: true,
      data: requests,
    };
  }

  // ============================================================
  // ✅ Admin Endpoints
  // ============================================================

  /**
   * ดึงคำขอถอนเงินทั้งหมด (Admin)
   * GET /store-wallet/admin/withdrawals?status=PENDING
   */
  @Get('admin/withdrawals')
  @Roles('ADMIN')
  async getAllWithdrawalRequests(@Query('status') status?: WithdrawalStatus) {
    const requests = await this.storeWalletService.getAllWithdrawalRequests(status);
    return {
      success: true,
      data: requests,
    };
  }

  /**
   * ดึงคำขอถอนเงินที่รอดำเนินการ (Admin)
   * GET /store-wallet/admin/withdrawals/pending
   */
  @Get('admin/withdrawals/pending')
  @Roles('ADMIN')
  async getPendingWithdrawalRequests() {
    const requests = await this.storeWalletService.getPendingWithdrawalRequests();
    return {
      success: true,
      data: requests,
    };
  }

  /**
   * ดึงรายละเอียดคำขอถอนเงิน (Admin)
   * GET /store-wallet/admin/withdrawal/:id
   */
  @Get('admin/withdrawal/:id')
  @Roles('ADMIN')
  async getWithdrawalRequestById(@Param('id', ParseIntPipe) id: number) {
    const request = await this.storeWalletService.getWithdrawalRequestById(id);
    return {
      success: true,
      data: request,
    };
  }

  /**
   * Admin อนุมัติคำขอถอนเงิน
   * PUT /store-wallet/admin/withdrawal/:id/approve
   */
  @Put('admin/withdrawal/:id/approve')
  @Roles('ADMIN')
  async approveWithdrawal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveWithdrawalDto,
    @CurrentUser() user: any,
  ) {
    const request = await this.storeWalletService.approveWithdrawal(
      id,
      dto.proofImage,
      user.id,
    );

    return {
      success: true,
      message: 'อนุมัติคำขอถอนเงินเรียบร้อยแล้ว',
      data: request,
    };
  }

  /**
   * Admin ปฏิเสธคำขอถอนเงิน
   * PUT /store-wallet/admin/withdrawal/:id/reject
   */
  @Put('admin/withdrawal/:id/reject')
  @Roles('ADMIN')
  async rejectWithdrawal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectWithdrawalDto,
    @CurrentUser() user: any,
  ) {
    const request = await this.storeWalletService.rejectWithdrawal(
      id,
      dto.reason,
      user.id,
    );

    return {
      success: true,
      message: 'ปฏิเสธคำขอถอนเงินเรียบร้อยแล้ว เงินถูกคืนกลับเข้ากระเป๋าร้านค้า',
      data: request,
    };
  }
}
