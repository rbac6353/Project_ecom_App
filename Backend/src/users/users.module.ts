import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { AdminLogsModule } from '../admin-logs/admin-logs.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module'; // ✅ Import CloudinaryModule

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

