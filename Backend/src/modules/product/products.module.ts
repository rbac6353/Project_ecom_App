import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product, Image, ProductVariant, RecentlyViewed } from '@core/database/entities';
import { CloudinaryModule } from '@modules/storage/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Image, ProductVariant, RecentlyViewed]),
    CloudinaryModule, // เพิ่ม CloudinaryModule
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

