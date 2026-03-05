import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { Store } from '../entities/store.entity';
import { StoreFollower } from '../entities/store-follower.entity';
import { Product } from '../entities/product.entity';
import { Coupon } from '../entities/coupon.entity';
import { AdminLogsModule } from '../admin-logs/admin-logs.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, StoreFollower, Product, Coupon]),
    AdminLogsModule,
    CloudinaryModule, // เพิ่ม CloudinaryModule เพื่ออัปโหลดรูปโลโก้
  ],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}

