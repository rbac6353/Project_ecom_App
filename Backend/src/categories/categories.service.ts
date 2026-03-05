import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      relations: ['products'],
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Category> {
    return this.categoryRepository.findOne({
      where: { id },
      relations: ['products', 'products.images'],
    });
  }

  // ✅ สร้างหมวดหมู่ใหม่
  async create(data: any): Promise<Category> {
    const category = this.categoryRepository.create(data);
    const saved = await this.categoryRepository.save(category);
    return saved as unknown as Category;
  }

  // ✅ แก้ไขหมวดหมู่
  async update(id: number, data: any): Promise<Category> {
    const category = await this.findOne(id);
    if (!category) throw new NotFoundException('Category not found');

    Object.assign(category, data);
    const saved = await this.categoryRepository.save(category);
    return saved as unknown as Category;
  }

  // ✅ ลบหมวดหมู่
  async remove(id: number): Promise<{ success: boolean }> {
    const category = await this.findOne(id);
    if (!category) throw new NotFoundException('Category not found');

    // Optional: เช็คก่อนว่ามีสินค้าในหมวดหมู่นี้ไหม ถ้ามีห้ามลบ
    if (category.products && category.products.length > 0) {
      throw new BadRequestException(
        `ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากยังมีสินค้า ${category.products.length} รายการอยู่ในหมวดหมู่นี้`,
      );
    }

    await this.categoryRepository.remove(category);
    return { success: true };
  }
}

