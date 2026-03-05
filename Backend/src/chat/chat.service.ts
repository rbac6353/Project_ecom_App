import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '@core/database/entities';
import { UsersService } from '../users/users.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatRepo: Repository<ChatMessage>,
    private usersService: UsersService, // ✅ Inject เพื่อดึงข้อมูลลูกค้า
  ) { }

  // บันทึกข้อความ (รองรับทั้ง text และ image)
  async saveMessage(
    roomId: string,
    senderId: number,
    message: string,
    type: string = 'text',
    imageUrl: string | null = null,
  ): Promise<ChatMessage> {
    const chat = this.chatRepo.create({
      roomId,
      senderId,
      message: message || '',
      type,
      imageUrl: imageUrl || null,
    });
    return this.chatRepo.save(chat);
  }

  // ดึงประวัติแชท
  async getMessages(roomId: string): Promise<ChatMessage[]> {
    return this.chatRepo.find({
      where: { roomId },
      order: { createdAt: 'ASC' }, // ข้อความเก่าอยู่บน
      relations: ['sender'],
    });
  }

  // อัปเดตสถานะอ่าน
  async markAsRead(roomId: string, userId: number): Promise<void> {
    // อัปเดตข้อความที่ยังไม่อ่านและไม่ได้ส่งโดย userId
    await this.chatRepo
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ isRead: true })
      .where('roomId = :roomId', { roomId })
      .andWhere('isRead = :isRead', { isRead: false })
      .andWhere('senderId != :userId', { userId })
      .execute();
  }

  // ดึงข้อความเดียวพร้อม sender
  async findOneWithSender(id: number): Promise<ChatMessage | null> {
    return this.chatRepo.findOne({
      where: { id },
      relations: ['sender'],
    });
  }

  // ✅ ฟังก์ชันดึงรายการห้องแชทล่าสุด
  async getConversations() {
    // 1. ดึงข้อความล่าสุดของแต่ละห้อง (ใช้ SQL QueryBuilder)
    // หมายเหตุ: Query นี้ขึ้นอยู่กับ Database (MySQL) อาจต้องปรับถ้าใช้ DB อื่น
    const rawData = await this.chatRepo
      .createQueryBuilder('chat')
      .select('chat.roomId', 'roomId')
      .addSelect('MAX(chat.createdAt)', 'maxDate')
      .groupBy('chat.roomId')
      .orderBy('maxDate', 'DESC')
      .getRawMany();

    // 2. วนลูปดึงรายละเอียด (ข้อความล่าสุด + ข้อมูลลูกค้า)
    const conversations = await Promise.all(
      rawData.map(async (item) => {
        // ดึงข้อความเต็มๆ ของเวลานั้น
        const lastMessage = await this.chatRepo.findOne({
          where: { roomId: item.roomId },
          order: { createdAt: 'DESC' },
        });

        // แกะ userId จาก roomId (Format: "chat_user_123")
        const userIdStr = item.roomId.split('_')[2];
        let user = null;
        if (userIdStr) {
          try {
            user = await this.usersService.findOne(+userIdStr); // ดึงข้อมูล User
          } catch (error) {
            console.error(`Error fetching user ${userIdStr}:`, error);
          }
        }

        return {
          roomId: item.roomId,
          lastMessage: lastMessage?.message || '',
          lastMessageDate: lastMessage?.createdAt || item.maxDate,
          user: user
            ? { id: user.id, name: user.name, email: user.email }
            : null,
        };
      }),
    );

    return conversations;
  }
}

