import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AdminLogsService } from './admin-logs.service';
import { JwtAuthGuard, RolesGuard } from '@core/auth';

@Controller('admin-logs')
export class AdminLogsController {
  constructor(private readonly logsService: AdminLogsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('adminId') adminId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};

    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);
    if (action) filters.action = action;
    if (targetType) filters.targetType = targetType;
    if (adminId) filters.adminId = parseInt(adminId, 10);
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.logsService.findAll(filters);
  }
}

