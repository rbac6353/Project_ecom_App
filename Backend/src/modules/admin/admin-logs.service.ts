import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminLog } from '@core/database/entities';

@Injectable()
export class AdminLogsService {
  private readonly logger = new Logger(AdminLogsService.name);

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
    try {
      this.logger.debug(`[logAction] Creating log - adminId: ${adminId}, action: ${action}, targetType: ${targetType}, targetId: ${targetId}`);
      
      // ✅ ใช้ .save() ตามปกติได้แล้ว (เพราะ Entity ไม่มี updatedAt แล้ว)
      const log = this.logsRepo.create({
        adminId,
        action,
        targetType,
        targetId,
        details,
      });
      
      const savedLog = await this.logsRepo.save(log);
      this.logger.debug(`[logAction] Log created successfully - id: ${savedLog.id}`);
      
      return savedLog;
    } catch (error: any) {
      this.logger.error(`[logAction] Error creating log`, error.stack);
      throw error;
    }
  }

  // ✅ ฟังก์ชันดึง Log ทั้งหมด (สำหรับหน้าจอ Frontend)
  // รองรับ Pagination และ Filtering
  async findAll(filters?: {
    page?: number;
    limit?: number;
    action?: string;
    targetType?: string;
    adminId?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = Math.min(filters?.limit || 50, 100); // Max 100 per page
      const skip = (page - 1) * limit;

      const queryBuilder = this.logsRepo
        .createQueryBuilder('log')
        .leftJoinAndSelect('log.admin', 'admin')
        .orderBy('log.createdAt', 'DESC');

      // Filter by action
      if (filters?.action) {
        queryBuilder.andWhere('log.action = :action', { action: filters.action });
      }

      // Filter by targetType
      if (filters?.targetType) {
        queryBuilder.andWhere('log.targetType = :targetType', {
          targetType: filters.targetType,
        });
      }

      // Filter by adminId
      if (filters?.adminId) {
        queryBuilder.andWhere('log.adminId = :adminId', {
          adminId: filters.adminId,
        });
      }

      // Filter by date range
      if (filters?.startDate) {
        queryBuilder.andWhere('log.createdAt >= :startDate', {
          startDate: filters.startDate,
        });
      }
      if (filters?.endDate) {
        queryBuilder.andWhere('log.createdAt <= :endDate', {
          endDate: filters.endDate,
        });
      }

      // Pagination
      queryBuilder.skip(skip).take(limit);

      // Select specific fields (optimize query)
      queryBuilder.select([
        'log.id',
        'log.adminId',
        'log.action',
        'log.targetType',
        'log.targetId',
        'log.details',
        'log.createdAt',
        'admin.id',
        'admin.email',
        'admin.name',
      ]);

      const [logs, total] = await queryBuilder.getManyAndCount();

      return {
        data: logs,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      this.logger.error('❌ Error fetching admin logs:', error);
      // ถ้า table ยังไม่มี ให้ return empty array แทน error
      if (
        error.message?.includes("doesn't exist") ||
        error.message?.includes('Unknown table')
      ) {
        this.logger.warn(
          '⚠️ admin_log table does not exist yet. Please run the migration SQL.',
        );
        return {
          data: [],
          meta: {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
          },
        };
      }
      throw error;
    }
  }
}

