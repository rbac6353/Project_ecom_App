import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { OrderReturn, OrderReturnItem, Order, User, ProductOnOrder, Store } from '@core/database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderReturn,
      OrderReturnItem,
      Order,
      User,
      ProductOnOrder,
      Store,
    ]),
  ],
  providers: [ReturnsService],
  controllers: [ReturnsController],
  exports: [ReturnsService],
})
export class ReturnsModule {}


