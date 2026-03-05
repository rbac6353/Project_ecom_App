import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '@core/auth';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get() // GET /notifications
  findAll(@Request() req) {
    return this.service.findAll(req.user.id);
  }

  @Get('unread') // GET /notifications/unread
  async countUnread(@Request() req) {
    const count = await this.service.countUnread(req.user.id);
    return count;
  }

  @Patch(':id/read') // PATCH /notifications/1/read
  markAsRead(@Param('id') id: string, @Request() req) {
    return this.service.markAsRead(+id, req.user.id);
  }

  @Patch('read-all') // PATCH /notifications/read-all
  markAllAsRead(@Request() req) {
    return this.service.markAllAsRead(req.user.id);
  }
}

