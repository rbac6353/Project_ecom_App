import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from '@core/database/entities';

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

  // อัปเดตแบนเนอร์
  async update(id: number, data: Partial<Banner>) {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    
    Object.assign(banner, data);
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

  // ✅ อัปเดต displayOrder
  async updateDisplayOrder(id: number, displayOrder: number) {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) throw new NotFoundException();
    banner.displayOrder = displayOrder;
    return this.bannerRepo.save(banner);
  }

  // ✅ สลับลำดับ banner (ย้ายขึ้นหรือลง)
  async swapOrder(id1: number, id2: number) {
    const banner1 = await this.bannerRepo.findOne({ where: { id: id1 } });
    const banner2 = await this.bannerRepo.findOne({ where: { id: id2 } });
    
    if (!banner1 || !banner2) {
      throw new NotFoundException('Banner not found');
    }

    // สลับ displayOrder
    const tempOrder = banner1.displayOrder;
    banner1.displayOrder = banner2.displayOrder;
    banner2.displayOrder = tempOrder;

    await this.bannerRepo.save([banner1, banner2]);
    return { banner1, banner2 };
  }
}

