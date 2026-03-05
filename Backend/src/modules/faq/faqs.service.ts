import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from '@core/database/entities';

@Injectable()
export class FaqsService {
  constructor(
    @InjectRepository(Faq)
    private faqRepo: Repository<Faq>,
  ) {}

  // ดึงข้อมูลทั้งหมด (เรียงตามหมวดหมู่)
  async findAll() {
    return this.faqRepo.find({
      where: { isActive: true },
      order: { category: 'ASC', id: 'ASC' },
    });
  }

  // สร้าง FAQ ใหม่ (Admin)
  async create(data: any) {
    const faq = this.faqRepo.create(data);
    return this.faqRepo.save(faq);
  }
}

