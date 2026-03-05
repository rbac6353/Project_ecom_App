import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminLogsService } from './admin-logs.service';
import { AdminLogsController } from './admin-logs.controller';
import { AdminLog } from '@core/database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([AdminLog])],
  controllers: [AdminLogsController],
  providers: [AdminLogsService],
  exports: [AdminLogsService], // Export เพื่อให้ Module อื่นใช้ได้
})
export class AdminLogsModule {}

