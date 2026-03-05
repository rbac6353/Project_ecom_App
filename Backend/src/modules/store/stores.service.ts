import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThan } from 'typeorm';
import { Store, StoreFollower, Product, Coupon } from '@core/database/entities';
import { AdminLogsService } from '@modules/admin/admin-logs.service';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private storesRepo: Repository<Store>,
    @InjectRepository(StoreFollower)
    private followersRepo: Repository<StoreFollower>,
    @InjectRepository(Product)
    private productsRepo: Repository<Product>,
    @InjectRepository(Coupon)
    private couponsRepo: Repository<Coupon>,
    private readonly adminLogsService: AdminLogsService,
  ) { }

  // สร้างร้านค้า (Admin สร้างให้ หรือ User สร้างเองก็ได้)
  async create(userId: number, data: any) {
    const store = this.storesRepo.create({
      ...data,
      ownerId: userId,
      rating: 0,
      followerCount: 0,
      isVerified: false,
    });
    return this.storesRepo.save(store);
  }

  // ดึงร้านค้าทั้งหมด (สำหรับ Admin ดูภาพรวม)
  async findAll(keyword?: string) {
    const findOptions: any = {
      relations: ['owner'], // ดูว่าใครเป็นเจ้าของ
      order: { id: 'DESC' }, // ใช้ id แทน createdAt
    };

    // ถ้ามี keyword ส่งมา ให้เพิ่มเงื่อนไข WHERE name LIKE %keyword%
    if (keyword) {
      findOptions.where = {
        name: Like(`%${keyword}%`),
      };
    }

    return this.storesRepo.find(findOptions);
  }

  // ✅ ดึงร้านค้า Mall ทั้งหมด (Public - ไม่ต้อง Login)
  async getMallStores() {
    return this.storesRepo.find({
      where: { isMall: true, isVerified: true },
      order: { followerCount: 'DESC' },
    });
  }

  // ลบร้านค้า (เตะออกจากระบบ)
  async remove(id: number, adminId: number) {
    const store = await this.storesRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    await this.storesRepo.remove(store);

    // ✅ บันทึก Log
    await this.adminLogsService.logAction(
      adminId,
      'DELETE_STORE',
      'STORE',
      id,
      `ลบร้านค้าชื่อ: ${store.name}`,
    );

    return { success: true };
  }

  // อนุมัติร้านค้า (Verified)
  async verifyStore(id: number, adminId: number) {
    const store = await this.storesRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    store.isVerified = true;
    await this.storesRepo.save(store);

    // ✅ บันทึก Log
    await this.adminLogsService.logAction(
      adminId,
      'VERIFY_STORE',
      'STORE',
      id,
      `อนุมัติร้านค้าชื่อ: ${store.name}`,
    );

    return store;
  }

  // ✅ ดึงสถิติร้านค้า (สำหรับ Platform Stats)
  async getStats() {
    const totalStores = await this.storesRepo.count();
    const pendingStores = await this.storesRepo.count({
      where: { isVerified: false },
    });

    return { totalStores, pendingStores };
  }

  // ✅ ดึงร้านค้าตาม ownerId
  async findByOwnerId(ownerId: number) {
    return this.storesRepo.findOne({
      where: { ownerId },
    });
  }

  // ✅ ดึงรายละเอียดร้านค้า (Admin Use) - พร้อม Products และสถิติ
  async findOneWithDetails(id: number) {
    const store = await this.storesRepo.findOne({
      where: { id },
      relations: ['owner', 'products', 'products.images'], // ดึงเจ้าของ, สินค้า และรูปภาพสินค้า
      order: {
        products: { id: 'DESC' }, // เรียงสินค้าใหม่สุดขึ้นก่อน (ใช้ id แทน createdAt)
      },
    });

    if (!store) throw new NotFoundException('Store not found');

    // คำนวณสถิติของร้าน (คำนวณสดจากรายการสินค้าที่มี)
    // 1. จำนวนสินค้า
    const totalProducts = store.products?.length || 0;

    // 2. จำนวนชิ้นที่ขายได้ทั้งหมด (Sum of product.sold)
    const totalSoldItems =
      store.products?.reduce((sum, prod) => sum + (prod.sold || 0), 0) || 0;

    // 3. มูลค่าของในคลัง (Inventory Value)
    const inventoryValue =
      store.products?.reduce(
        (sum, prod) => sum + Number(prod.price || 0) * (prod.quantity || 0),
        0,
      ) || 0;

    return {
      ...store,
      stats: {
        totalProducts,
        totalSoldItems,
        inventoryValue,
      },
    };
  }

  // ✅ 1. กดติดตาม / เลิกติดตาม (Toggle)
  async toggleFollow(userId: number, storeId: number) {
    // ✅ ตรวจสอบว่า store มีอยู่จริง
    const store = await this.storesRepo.findOne({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }

    try {
      const existing = await this.followersRepo.findOne({
        where: { userId, storeId },
      });

      if (existing) {
        // ถ้ามีอยู่แล้ว -> ลบ (Unfollow)
        await this.followersRepo.remove(existing);
        // ลดจำนวน follower ใน store
        await this.storesRepo.decrement({ id: storeId }, 'followerCount', 1);
        return { isFollowing: false };
      } else {
        // ถ้ายังไม่มี -> สร้างใหม่ (Follow)
        const follow = this.followersRepo.create({ userId, storeId });
        await this.followersRepo.save(follow);
        // เพิ่มจำนวน follower
        await this.storesRepo.increment({ id: storeId }, 'followerCount', 1);
        return { isFollowing: true };
      }
    } catch (error) {
      console.error('Error in toggleFollow:', error);
      throw error;
    }
  }

  // ✅ 2. เช็คสถานะว่าติดตามอยู่ไหม
  async checkFollowStatus(userId: number, storeId: number) {
    try {
      const count = await this.followersRepo.count({
        where: { userId, storeId },
      });
      return { isFollowing: count > 0 };
    } catch (error) {
      console.error('Error in checkFollowStatus:', error);
      // ถ้าเกิด error ให้ return false (ไม่ติดตาม)
      return { isFollowing: false };
    }
  }

  // ✅ 3. ดึงรายการร้านที่ฉันติดตาม
  async getMyFollowing(userId: number) {
    return this.followersRepo.find({
      where: { userId },
      relations: ['store'], // ดึงข้อมูลร้านมาโชว์
      order: { id: 'DESC' }, // ใช้ id แทน createdAt
    });
  }

  // ✅ 4. ดึงข้อมูลหน้าร้าน (Public View)
  async getStoreProfile(storeId: number, currentUserId?: number) {
    // 1. ดึงข้อมูลร้าน + เจ้าของ
    const store = await this.storesRepo.findOne({
      where: { id: storeId },
      relations: ['owner'],
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // 4. เช็คว่า User ปัจจุบันติดตามร้านนี้หรือยัง
    let isFollowing = false;
    if (currentUserId) {
      const followStatus = await this.checkFollowStatus(currentUserId, storeId);
      isFollowing = followStatus.isFollowing;
    }

    // Security Check: ถ้าขอ inactive แต่ไม่ใช่เจ้าของ -> ignore flag
    // ✅ Fix: ใช้ Number() เพื่อป้องกัน Type Mismatch
    const userIdNum = Number(currentUserId);
    const ownerIdNum = Number(store.ownerId);

    if (currentUserId && userIdNum === ownerIdNum) {
      // เจ้าของร้าน -> อนุญาตให้เห็น Inactive ได้ (ถ้าส่ง currentUserId มา)
    } else {
      // ไม่ใช่เจ้าของ -> บังคับ active only
      // แต่ถ้า request ไม่ได้ขอ inactive ก็ไม่มีผลอะไร (เพราะ query ข้างล่างจัดการแล้ว)
    }

    // 2. ดึงสินค้าในร้าน (เอามาสัก 20 ชิ้นล่าสุด) - filter เฉพาะสินค้าที่ active
    // ⚠️ สำคัญ: ต้องดึง 'store' relation ด้วย เพื่อให้ ProductCard รู้ว่าเป็น Mall
    const whereCondition: any = { storeId: store.id };

    // ถ้าไม่ใช่เจ้าของ หรือเจ้าของไม่ได้ขอ inactive -> filter active=true
    if (!currentUserId || userIdNum !== ownerIdNum) {
      whereCondition.isActive = true;
    }
    // ถ้าเป็นเจ้าของ และขอ inactive (logic นี้ client ต้องส่ง param หรือไม่? ใน code เก่าไม่มี param includeInactive ใน service นี้!)
    // SERVICE นี้ ไม่มี param includeInactive ใน signature!

    const products = await this.productsRepo.find({
      where: whereCondition,
      relations: ['images', 'store'],
      take: 20,
      order: { id: 'DESC' }, // ใช้ id แทน createdAt
    });

    // 3. ดึงคูปองของร้าน (Owner เป็นคนสร้างคูปอง) และยังไม่หมดอายุ
    const now = new Date();
    const coupons = await this.couponsRepo.find({
      where: {
        userId: store.ownerId,
        isUsed: false,
        expiresAt: MoreThan(now),
      },
      take: 5,
      order: { discountAmount: 'DESC' },
    });



    // 5. นับจำนวนสินค้าทั้งหมด (เฉพาะที่ active)
    const totalProducts = await this.productsRepo.count({
      where: { storeId, isActive: true },
    });

    // 6. ✅ นับจำนวนผู้ติดตามจริงจาก store_follower table
    const actualFollowerCount = await this.followersRepo.count({
      where: { storeId },
    });

    // 7. ✅ อัปเดต followerCount ใน store entity ให้ตรงกับจำนวนจริง (ถ้าไม่ตรง)
    if (store.followerCount !== actualFollowerCount) {
      store.followerCount = actualFollowerCount;
      await this.storesRepo.save(store);
    }

    return {
      ...store,
      products,
      coupons,
      isFollowing,
      totalProducts,
      followerCount: actualFollowerCount, // ✅ ส่งจำนวนจริงกลับไป
    };
  }

  // ✅ 5. ปิด-เปิดร้านค้า (Toggle Store Status) - ใช้ ownerId
  async toggleStoreStatusByOwner(ownerId: number) {
    const store = await this.storesRepo.findOne({ where: { ownerId } });
    if (!store) {
      throw new NotFoundException('ไม่พบร้านค้าของคุณ');
    }

    // Toggle สถานะ
    store.isActive = !store.isActive;
    await this.storesRepo.save(store);

    return {
      message: store.isActive ? 'เปิดร้านค้าสำเร็จ' : 'ปิดร้านค้าสำเร็จ',
      isActive: store.isActive,
    };
  }

  // ✅ อัปเดตร้านค้า (Seller Only)
  async updateStore(ownerId: number, data: { name?: string; description?: string; logo?: string }) {
    // 1. หาร้านค้าของ Seller
    const store = await this.storesRepo.findOne({
      where: { ownerId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // 2. อัปเดตข้อมูล
    if (data.name !== undefined) store.name = data.name;
    if (data.description !== undefined) store.description = data.description;
    if (data.logo !== undefined) store.logo = data.logo;

    // 3. บันทึก
    return this.storesRepo.save(store);
  }

  // ✅ 6. ตั้งค่า Mall (Admin Only)
  async toggleMallStatus(id: number, adminId: number) {
    const store = await this.storesRepo.findOne({ where: { id } });

    if (!store) throw new NotFoundException('Store not found');

    // สลับค่า True <-> False
    store.isMall = !store.isMall;

    // Business Logic: ถ้าเป็น Mall แล้ว ต้องถือว่า Verified ด้วยเสมอ
    if (store.isMall) {
      store.isVerified = true;
    }

    await this.storesRepo.save(store);

    // ✅ บันทึก Log
    await this.adminLogsService.logAction(
      adminId,
      store.isMall ? 'SET_MALL' : 'REMOVE_MALL',
      'STORE',
      id,
      `${store.isMall ? 'ตั้งเป็น' : 'ปลด'} Mall: ${store.name}`,
    );

    return store;
  }
}

