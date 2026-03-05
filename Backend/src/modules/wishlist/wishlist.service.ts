import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '@core/database/entities';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private wishlistRepo: Repository<Wishlist>,
  ) {}

  // เพิ่มสินค้าลง Wishlist
  async add(userId: number, productId: number) {
    try {
      console.log(`WishlistService.add - userId: ${userId}, productId: ${productId}`);
      
      // เช็คก่อนว่ามีอยู่แล้วไหม
      const existing = await this.wishlistRepo.findOne({
        where: { userId, productId },
      });
      if (existing) {
        console.log('Wishlist item already exists:', existing.id);
        return existing;
      }

      const item = this.wishlistRepo.create({ userId, productId });
      const saved = await this.wishlistRepo.save(item);
      console.log('Wishlist item created successfully:', saved.id);
      return saved;
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // ลบออกจาก Wishlist
  async remove(userId: number, productId: number) {
    return this.wishlistRepo.delete({ userId, productId });
  }

  // ดึงรายการทั้งหมดของ user
  async findAll(userId: number) {
    try {
      console.log(`WishlistService.findAll - userId: ${userId}`);
      const result = await this.wishlistRepo.find({
        where: { userId },
        relations: ['product', 'product.images', 'product.category', 'product.store'],
        order: { createdAt: 'DESC' },
      });
      console.log(`WishlistService.findAll - found ${result.length} items`);
      return result;
    } catch (error: any) {
      console.error('Error fetching wishlist:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // เช็คว่า user ชอบสินค้านี้ไหม (เอาไว้แสดงสีปุ่มหัวใจ)
  async check(userId: number, productId: number) {
    const item = await this.wishlistRepo.findOne({
      where: { userId, productId },
    });
    return { isLiked: !!item };
  }
}

