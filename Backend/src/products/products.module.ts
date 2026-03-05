import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';
import { Image } from '../entities/image.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { RecentlyViewed } from '../entities/recently-viewed.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

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

