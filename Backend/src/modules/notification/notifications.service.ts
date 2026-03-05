import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expo } from 'expo-server-sdk';
import { Notification, User } from '@core/database/entities';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private expo = new Expo();

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway, // ✅ Inject Gateway for real-time updates
  ) {}

  // ✅ ฟังก์ชันส่งและบันทึก (ใช้แทนอันเก่า)
  async sendAndSave(
    user: User,
    title: string,
    body: string,
    type: string = 'SYSTEM',
    data: any = {},
  ) {
    // 1. บันทึกลง Database
    // ✅ TypeORM จะจัดการ createdAt และ updatedAt อัตโนมัติผ่าน @CreateDateColumn และ @UpdateDateColumn
    // ✅ updatedAt จะถูกอัปเดตอัตโนมัติเมื่อมีการ save entity (ON UPDATE CURRENT_TIMESTAMP)
    const notif = this.notificationRepo.create({
      userId: user.id,
      title,
      body,
      type,
      data,
      isRead: false,
    });
    await this.notificationRepo.save(notif);

    // 2. ส่ง Push Notification (ถ้ามี Token)
    if (user.notificationToken && Expo.isExpoPushToken(user.notificationToken)) {
      try {
        await this.expo.sendPushNotificationsAsync([
          {
            to: user.notificationToken,
            sound: 'default',
            title,
            body,
            data: { ...data, notificationId: notif.id }, // แนบ ID ไปด้วยเผื่อใช้
          },
        ]);
      } catch (error) {
        console.error('Push error:', error);
      }
    }

    // 3. ✅ Broadcast via WebSocket (Real-time update)
    // Use optional chaining to safely access gateway
    try {
      if (this.notificationsGateway) {
        await this.notificationsGateway.broadcastToUser(user.id, notif);
      }
    } catch (error) {
      // Gateway might not be initialized yet, ignore error
      console.warn('WebSocket broadcast error:', error);
    }

    return notif;
  }

  // ✅ ฟังก์ชันเดิม (เก็บไว้เพื่อ backward compatibility)
  async sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data: any = {},
  ) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      return;
    }

    const messages = [
      {
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data, // ส่ง data ไปด้วย (เช่น orderId เพื่อทำ Deep Link)
      },
    ];

    try {
      // ส่งไปให้ Expo (Expo จะส่งต่อให้ Apple/Google อีกที)
      await this.expo.sendPushNotificationsAsync(messages as any);
      console.log('Notification sent!');
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // ✅ ดึงรายการแจ้งเตือนของ User
  async findAll(userId: number) {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50, // เอาแค่ 50 อันล่าสุด
    });
  }

  // ✅ นับจำนวนที่ยังไม่อ่าน
  async countUnread(userId: number) {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  // ✅ อ่านแล้ว
  async markAsRead(id: number, userId: number) {
    return this.notificationRepo.update({ id, userId }, { isRead: true });
  }

  // ✅ อ่านทั้งหมด
  async markAllAsRead(userId: number) {
    return this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }
}

