import { Controller, Get, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard) // Admin/Seller Only
  @Get('conversations')
  getConversations(@Request() req) {
    // อนุญาตให้ Admin และ Seller เข้าถึงได้
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'seller') {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (Admin/Seller Only)');
    }
    return this.chatService.getConversations();
  }
}

