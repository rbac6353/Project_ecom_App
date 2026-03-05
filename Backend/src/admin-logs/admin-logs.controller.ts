import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminLogsService } from './admin-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin-logs')
export class AdminLogsController {
  constructor(private readonly logsService: AdminLogsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findAll() {
    return this.logsService.findAll();
  }
}

