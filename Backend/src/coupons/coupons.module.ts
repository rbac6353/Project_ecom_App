import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { Coupon } from '../entities/coupon.entity';
import { UserCoupon } from '../entities/user-coupon.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, UserCoupon, User])],
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService], // Export ให้ Module อื่นเรียกใช้ได้
})
export class CouponsModule {}

