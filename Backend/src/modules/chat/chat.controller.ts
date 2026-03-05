import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '@core/auth/guards/jwt-auth.guard';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @UseGuards(JwtAuthGuard)
    @Get('conversations')
    getConversations(@Request() req: any) {
        return this.chatService.getConversations(req.user);
    }
}
