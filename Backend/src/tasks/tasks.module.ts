import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../entities/order.entity';
import { OrderTasksService } from './order-cleanup.task';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  providers: [OrderTasksService],
})
export class TasksModule {}

