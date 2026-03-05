import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipment, Order, User, TrackingHistory } from '@core/database/entities';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { NotificationsModule } from '@modules/notification/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shipment, Order, User, TrackingHistory]),
    NotificationsModule,
  ],
  providers: [ShipmentsService],
  controllers: [ShipmentsController],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}


