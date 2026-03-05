import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // อนุญาตให้ทุกที่เชื่อมต่อได้ (สำหรับ Mobile App)
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // 1. เมื่อ Client เชื่อมต่อเข้ามา ให้พาเข้าห้อง (Room)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;
    client.join(roomId); // เข้าห้องตาม ID (เช่น 'chat_user_1')

    this.logger.log(`Client ${client.id} joined room: ${roomId}`);

    // ดึงประวัติเก่าส่งกลับไปให้
    const history = await this.chatService.getMessages(roomId);
    client.emit('history', history);

    // ถ้ามี userId ส่งมา ให้ mark ข้อความที่ยังไม่อ่านเป็นอ่านแล้ว
    if (userId) {
      await this.chatService.markAsRead(roomId, userId);
    }
  }

  // 2. เมื่อ Client ส่งข้อความมา
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: {
      roomId: string;
      senderId: number;
      message: string;
      type?: string;
      imageUrl?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Message received in room ${data.roomId} from user ${data.senderId}`,
    );

    // บันทึกลง DB
    const savedMsg = await this.chatService.saveMessage(
      data.roomId,
      data.senderId,
      data.message,
      data.type || 'text',
      data.imageUrl || null,
    );

    // ดึงข้อมูล sender ด้วย
    const messageWithSender = await this.chatService.findOneWithSender(
      savedMsg.id,
    );

    // ส่งข้อความไปหา "ทุกคนในห้องนั้น" (รวมถึงคนส่งด้วย เพื่อให้ UI อัปเดต)
    this.server
      .to(data.roomId)
      .emit('newMessage', messageWithSender || savedMsg);
  }

  // 3. Mark messages as read
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { roomId: string; userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    await this.chatService.markAsRead(data.roomId, data.userId);
    this.server.to(data.roomId).emit('messagesRead', { roomId: data.roomId });
  }
}

