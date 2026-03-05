import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminLog } from '../entities/admin-log.entity';

@Injectable()
export class AdminLogsService {
  constructor(
    @InjectRepository(AdminLog)
    private logsRepo: Repository<AdminLog>,
  ) {}

  // ✅ ฟังก์ชันสำหรับบันทึก Log (เรียกใช้จาก Service อื่น)
  async logAction(
    adminId: number,
    action: string,
    targetType: string,
    targetId: number,
    details: string = '',
  ) {
    const log = this.logsRepo.create({
      adminId,
      action,
      targetType,
      targetId,
      details,
    });
    return this.logsRepo.save(log);
  }

  // ✅ ฟังก์ชันดึง Log ทั้งหมด (สำหรับหน้าจอ Frontend)
  async findAll() {
    try {
      return await this.logsRepo.find({
        relations: ['admin'], // ดึงชื่อ Admin มาด้วย
        order: { createdAt: 'DESC' }, // เอาล่าสุดขึ้นก่อน
        take: 50, // ดึงแค่ 50 รายการล่าสุดพอ
      });
    } catch (error) {
      console.error('❌ Error fetching admin logs:', error);
      // ถ้า table ยังไม่มี ให้ return empty array แทน error
      if (error.message?.includes('doesn\'t exist') || error.message?.includes('Unknown table')) {
        console.warn('⚠️ admin_log table does not exist yet. Please run the migration SQL.');
        return [];
      }
      throw error;
    }
  }
}

