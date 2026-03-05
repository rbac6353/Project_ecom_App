import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart } from '../entities/cart.entity';
import { ProductOnCart } from '../entities/product-on-cart.entity';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, ProductOnCart, Product, ProductVariant]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}

