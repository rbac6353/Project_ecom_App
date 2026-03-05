import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { Store, StoreFollower, Product, Coupon } from '@core/database/entities';
import { AdminLogsModule } from '@modules/admin/admin-logs.module';
import { CloudinaryModule } from '@modules/storage/cloudinary.module';

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

