import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { OrderReturn } from '../entities/order-return.entity';
import { OrderReturnItem } from '../entities/order-return-item.entity';
import { Order } from '../entities/order.entity';
import { User } from '../entities/user.entity';
import { ProductOnOrder } from '../entities/product-on-order.entity';
import { Store } from '../entities/store.entity';

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


