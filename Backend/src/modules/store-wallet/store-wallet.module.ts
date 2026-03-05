import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  StoreWallet,
  StoreWalletTransaction,
  StoreWithdrawalRequest,
} from '@core/database/entities';
import { StoreWalletService } from './store-wallet.service';
import { StoreWalletController } from './store-wallet.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreWallet,
      StoreWalletTransaction,
      StoreWithdrawalRequest,
    ]),
  ],
  controllers: [StoreWalletController],
  providers: [StoreWalletService],
  exports: [StoreWalletService],
})
export class StoreWalletModule {}
