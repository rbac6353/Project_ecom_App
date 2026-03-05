import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSetting } from '../entities/notification-setting.entity';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @InjectRepository(NotificationSetting)
    private settingsRepo: Repository<NotificationSetting>,
  ) {}

  // ดึงการตั้งค่า (ถ้ายังไม่มีให้สร้าง Default ทันที)
  async findMySettings(userId: number) {
    let settings = await this.settingsRepo.findOne({ where: { userId } });

    if (!settings) {
      settings = this.settingsRepo.create({
        userId,
        orderUpdate: true,
        promotion: true,
        chat: true,
      });
      await this.settingsRepo.save(settings);
    }

    return settings;
  }

  // อัปเดตการตั้งค่า
  async update(userId: number, data: Partial<NotificationSetting>) {
    let settings = await this.findMySettings(userId); // หาของเดิมก่อน
    Object.assign(settings, data);
    return this.settingsRepo.save(settings);
  }
}

