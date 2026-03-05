import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { ChatMessage } from '@core/database/entities';
import { UsersModule } from '../users/users.module'; // ✅ Import เพื่อใช้ UsersService

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    UsersModule, // ✅ Import เพื่อใช้ UsersService
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule { }

