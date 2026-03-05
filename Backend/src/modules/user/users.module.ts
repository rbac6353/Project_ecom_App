import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '@core/database/entities';
import { AdminLogsModule } from '@modules/admin/admin-logs.module';
import { CloudinaryModule } from '@modules/storage/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AdminLogsModule, // ✅ Import เพื่อใช้ AdminLogsService
    CloudinaryModule, // ✅ Import เพื่อใช้ CloudinaryService
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

