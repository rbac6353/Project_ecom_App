import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { Coupon, UserCoupon, User } from '@core/database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, UserCoupon, User])],
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService], // Export ให้ Module อื่นเรียกใช้ได้
})
export class CouponsModule {}

