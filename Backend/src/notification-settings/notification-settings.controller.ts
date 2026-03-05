import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationSettingsService } from './notification-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notification-settings')
export class NotificationSettingsController {
  constructor(
    private readonly settingsService: NotificationSettingsService,
  ) {}

  @Get()
  findOne(@Request() req) {
    return this.settingsService.findMySettings(req.user.id);
  }

  @Patch()
  update(@Request() req, @Body() body: any) {
    return this.settingsService.update(req.user.id, body);
  }
}

