import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage, User, Store } from '@core/database/entities';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ChatMessage)
        private chatRepo: Repository<ChatMessage>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(Store)
        private storeRepo: Repository<Store>,
    ) { }

    async getMessages(roomId: string) {
        return this.chatRepo.find({
            where: { roomId },
            relations: ['sender'],
            order: { createdAt: 'ASC' },
        });
    }

    async saveMessage(
        roomId: string,
        senderId: number,
        message: string,
        type: string = 'text',
        imageUrl: string = null,
    ) {
        const newChat = this.chatRepo.create({
            roomId,
            senderId,
            message,
            type,
            imageUrl,
        });
        return this.chatRepo.save(newChat);
    }

    async markAsRead(roomId: string, userId: number) {
        // Mark messages as read where user is NOT the sender
        await this.chatRepo
            .createQueryBuilder()
            .update(ChatMessage)
            .set({ isRead: true })
            .where('roomId = :roomId', { roomId })
            .andWhere('senderId != :userId', { userId })
            .execute();
    }

    async findOneWithSender(id: number) {
        return this.chatRepo.findOne({
            where: { id },
            relations: ['sender'],
        });
    }

    // Method นี้อาจถูกเรียกจาก Controller ที่ลูกค้าลบทิ้งไป แต่เราใส่ไว้กัน error
    async getConversations(currentUser: any) {
        // 1. ดึงข้อความล่าสุดของแต่ละห้อง
        let query = this.chatRepo
            .createQueryBuilder('chat')
            .select('chat.roomId', 'roomId')
            .addSelect('MAX(chat.createdAt)', 'maxDate')
            .groupBy('chat.roomId')
            .orderBy('maxDate', 'DESC');

        // ✅ ถ้าเป็น User ทั่วไป (ไม่ใช่ Admin/Seller) ให้เห็นเฉพาะแชทของตัวเอง
        if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'seller') {
            // Pattern: chat_store_{storeId}_user_{userId}
            query.where('chat.roomId LIKE :pattern', { pattern: `%_user_${currentUser.id}` });
        }

        const rawData = await query.getRawMany();

        // 2. วนลูปดึงรายละเอียด
        const conversations = await Promise.all(
            rawData.map(async (item) => {
                let user = null;
                let store = null;

                try {
                    const parts = item.roomId.split('_');
                    // Format: chat_store_{storeId}_user_{userId}
                    if (parts.length >= 5) {
                        const storeId = parseInt(parts[2]); // index 2 is storeId
                        const userId = parseInt(parts[4]);  // index 4 is userId

                        // Case 1: Fetch User info (for Admin/Seller view)
                        // Or if currentUser is Store, show User info
                        if (!currentUser || currentUser.role === 'admin' || currentUser.role === 'seller') {
                            if (!isNaN(userId)) {
                                user = await this.userRepo.findOne({
                                    where: { id: userId },
                                    select: ['id', 'name', 'picture']
                                });
                            }
                        }
                        // Case 2: Fetch Store info (for Customer view)
                        else {
                            if (!isNaN(storeId)) {
                                store = await this.storeRepo.findOne({
                                    where: { id: storeId },
                                    select: ['id', 'name', 'logo']
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error parsing room detail:', e);
                }

                const lastMessage = await this.chatRepo.findOne({
                    where: { roomId: item.roomId },
                    order: { createdAt: 'DESC' },
                    relations: ['sender']
                });

                return {
                    roomId: item.roomId,
                    lastMessage: lastMessage?.message || '',
                    lastMessageDate: lastMessage?.createdAt || item.maxDate,
                    type: lastMessage?.type || 'text',
                    sender: lastMessage?.sender || null,
                    // Return User or Store based on context
                    user: user ? { ...user, avatar: user.picture } : null,
                    store: store ? { ...store, avatar: store.logo } : null
                };
            })
        );

        return conversations;
    }
}
