import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { AppModule } from '../src/app.module';
import {
  User,
  Order,
  OrderStatus,
  RefundStatus,
  Wallet,
  WalletTransaction,
} from '../src/core/database/entities';
import { OrdersService } from '../src/modules/order/orders.service';
import { WalletService } from '../src/modules/wallet/wallet.service';

async function bootstrap() {
  const logger = new Logger('TestRefundFlow');

  let app: any;

  try {
    logger.log('🚀 Bootstrapping NestJS application context for refund flow test...');

    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    const dataSource = app.get(DataSource) as DataSource;
    const ordersService = app.get(OrdersService) as OrdersService;
    const walletService = app.get(WalletService) as WalletService;

    const userRepo: Repository<User> = dataSource.getRepository(User);
    const orderRepo: Repository<Order> = dataSource.getRepository(Order);
    const walletRepo: Repository<Wallet> = dataSource.getRepository(Wallet);
    const walletTxRepo: Repository<WalletTransaction> =
      dataSource.getRepository(WalletTransaction);

    logger.log('🔍 Finding test user (id = 1 or first user)...');

    let user = await userRepo.findOne({ where: { id: 1 } });
    if (!user) {
      user = await userRepo.findOne({ where: {} });
    }

    if (!user) {
      logger.error('❌ No user found in database. Cannot run test.');
      return;
    }

    logger.log(`✅ Using user #${user.id} (${user.email || 'no-email'}) as test user.`);

    // Ensure wallet exists for this user
    logger.log('💼 Ensuring wallet exists for test user...');
    const wallet = await walletService.createWalletForUser(user.id);

    const initialBalance = Number(wallet.balance || 0);
    logger.log(`📊 Initial wallet balance: ${initialBalance.toFixed(2)} THB`);

    // Step 2: Create a mock order that should be auto-refunded
    logger.log('🧪 Creating test order for auto-refund scenario...');

    const now = new Date();
    const pastDeadline = new Date(now.getTime() - 24 * 60 * 60 * 1000); // yesterday

    // ใช้ paymentSlipUrl แบบ unique ทุกครั้ง เพื่อไม่ชน Unique Index
    const uniqueSlipUrl = `test_refund_${Date.now()}.jpg`;

    const testOrder = orderRepo.create({
      orderedById: user.id,
      cartTotal: 500.0,
      orderStatus: OrderStatus.PENDING_CONFIRMATION,
      paymentMethod: 'PROMPTPAY',
      paymentSlipUrl: uniqueSlipUrl,
      confirmationDeadline: pastDeadline,
      refundStatus: RefundStatus.NONE,
    } as Partial<Order>);

    const savedOrder = await orderRepo.save(testOrder);
    logger.log(`✅ Created test order #${savedOrder.id} (cartTotal = 500.00, PENDING_CONFIRMATION).`);

    // Step 3: Execute cron logic (cancelExpiredOrders) which in turn calls processRefund()
    logger.log('⏱  Triggering cancelExpiredOrders() to simulate cron behavior...');
    const cancelResult = await ordersService.cancelExpiredOrders();
    logger.log(
      `📦 cancelExpiredOrders() result: cancelled=${cancelResult.cancelled}, errors=${cancelResult.errors}`,
    );

    // Step 4: Verify results
    logger.log('🔍 Reloading order and wallet to verify results...');

    const updatedOrder = await orderRepo.findOne({
      where: { id: savedOrder.id },
    });

    if (!updatedOrder) {
      logger.error('❌ Test order not found after cancelExpiredOrders()!');
      return;
    }

    const updatedWallet = await walletRepo.findOne({
      where: { userId: user.id },
    });

    if (!updatedWallet) {
      logger.error('❌ Wallet not found for user after refund logic!');
      return;
    }

    const newBalance = Number(updatedWallet.balance || 0);

    const latestTx = await walletTxRepo.findOne({
      where: { walletId: updatedWallet.id },
      order: { createdAt: 'DESC' },
    });

    // Assertions
    const assertions: { label: string; passed: boolean; details?: string }[] = [];

    assertions.push({
      label: 'Order status should be CANCELLED',
      passed: updatedOrder.orderStatus === OrderStatus.CANCELLED,
      details: `Actual: ${updatedOrder.orderStatus}`,
    });

    assertions.push({
      label: 'Refund status should be APPROVED',
      passed: updatedOrder.refundStatus === RefundStatus.APPROVED,
      details: `Actual: ${updatedOrder.refundStatus}`,
    });

    assertions.push({
      label: 'Wallet balance should increase by 500.00 THB',
      passed: Math.abs(newBalance - initialBalance - 500) < 0.001,
      details: `Initial: ${initialBalance.toFixed(
        2,
      )}, New: ${newBalance.toFixed(2)}, Diff: ${(newBalance - initialBalance).toFixed(2)}`,
    });

    assertions.push({
      label: 'Latest wallet transaction should be of type REFUND',
      passed: !!latestTx && latestTx.type === 'REFUND',
      details: latestTx
        ? `Latest tx type: ${latestTx.type}, amount: ${latestTx.amount}`
        : 'No wallet transaction found',
    });

    const allPassed = assertions.every((a) => a.passed);

    logger.log('==================== TEST RESULT ====================');
    assertions.forEach((a) => {
      const status = a.passed ? '✅ PASSED' : '❌ FAILED';
      logger.log(`${status} - ${a.label}${a.details ? ` | ${a.details}` : ''}`);
    });
    logger.log('=====================================================');

    if (allPassed) {
      logger.log('🎉 Auto-refund to wallet flow: PASSED');
    } else {
      logger.error('💥 Auto-refund to wallet flow: FAILED');
    }

    // Optional cleanup: leave order & tx for inspection, or uncomment below to delete
    // await orderRepo.delete({ id: savedOrder.id });
    // logger.log(`🧹 Cleaned up test order #${savedOrder.id}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Test script crashed with error:', error);
  } finally {
    if (app) {
      await app.close();
    }
    // Explicit exit to ensure process ends when run via ts-node
    process.exit(0);
  }
}

bootstrap();

