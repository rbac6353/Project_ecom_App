import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart, ProductOnCart, Product, ProductVariant } from '@core/database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, ProductOnCart, Product, ProductVariant]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}

