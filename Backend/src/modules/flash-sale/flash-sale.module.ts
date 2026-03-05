import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlashSaleController } from './flash-sale.controller';
import { FlashSaleService } from './flash-sale.service';
import { FlashSale, FlashSaleItem, Product } from '@core/database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([FlashSale, FlashSaleItem, Product]),
  ],
  controllers: [FlashSaleController],
  providers: [FlashSaleService],
  exports: [FlashSaleService],
})
export class FlashSaleModule {}
