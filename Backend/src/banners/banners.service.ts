import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from '../entities/banner.entity';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private bannerRepo: Repository<Banner>,
  ) {}

  // สำหรับ User: ดึงเฉพาะที่ Active
  async findActive() {
    return this.bannerRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  // สำหรับ Admin: ดึงทั้งหมด
  async findAll() {
    return this.bannerRepo.find({
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  // สร้างแบนเนอร์
  async create(data: any) {
    const banner = this.bannerRepo.create(data);
    return this.bannerRepo.save(banner);
  }

  // ลบ
  async remove(id: number) {
    return this.bannerRepo.delete(id);
  }

  // เปิด/ปิด
  async toggleActive(id: number) {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) throw new NotFoundException();
    banner.isActive = !banner.isActive;
    return this.bannerRepo.save(banner);
  }
}

