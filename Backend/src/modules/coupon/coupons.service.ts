import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In, IsNull, Not } from 'typeorm';
import { Coupon, UserCoupon, User } from '@core/database/entities';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private couponsRepo: Repository<Coupon>,
    @InjectRepository(UserCoupon)
    private userCouponRepo: Repository<UserCoupon>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // ฟังก์ชันคำนวณส่วนลด (รองรับ Shopee-style validation)
  async applyCoupon(code: string, cartTotal: number, userId?: number, cartItems?: any[]) {
    const now = new Date();
    
    // 1. หาคูปองจากโค้ด
    const coupon = await this.couponsRepo.findOne({
      where: {
        code: code.toUpperCase().trim(),
      },
      relations: ['store'],
    });

    if (!coupon) {
      throw new NotFoundException('คูปองไม่ถูกต้อง');
    }

    // 2. เช็ควันเริ่มต้น
    if (coupon.startDate && new Date(coupon.startDate) > now) {
      throw new BadRequestException('คูปองยังไม่สามารถใช้ได้');
    }

    // 3. เช็ควันหมดอายุ
    if (!coupon.expiresAt || new Date(coupon.expiresAt) < now) {
      throw new BadRequestException('คูปองหมดอายุแล้ว');
    }

    // 4. เช็คจำนวนจำกัดทั้งหมด
    if (coupon.totalQuantity && coupon.usedCount >= coupon.totalQuantity) {
      throw new BadRequestException('คูปองหมดแล้ว');
    }

    // 5. เช็คยอดซื้อขั้นต่ำ
    if (coupon.minPurchase && cartTotal < coupon.minPurchase) {
      throw new BadRequestException(
        `ต้องซื้อขั้นต่ำ ${coupon.minPurchase} บาท`,
      );
    }

    // 6. เช็คหมวดหมู่สินค้า (ถ้ามี)
    if (coupon.categoryIds && cartItems && cartItems.length > 0) {
      try {
        const allowedCategoryIds = JSON.parse(coupon.categoryIds);
        if (Array.isArray(allowedCategoryIds) && allowedCategoryIds.length > 0) {
          const cartCategoryIds = cartItems
            .map(item => item.product?.categoryId)
            .filter(id => id);
          const hasAllowedCategory = cartCategoryIds.some(id => 
            allowedCategoryIds.includes(id)
          );
          if (!hasAllowedCategory) {
            throw new BadRequestException('คูปองนี้ใช้ได้เฉพาะสินค้าในหมวดหมู่ที่กำหนด');
          }
        }
      } catch (e) {
        // ถ้า parse ไม่ได้ ให้ข้ามไป
      }
    }

    // 7. คำนวณส่วนลด
    let discount = 0;

    if (coupon.type === 'SHIPPING') {
      // คูปองฟรีค่าจัดส่ง (จะคำนวณใน Order Service)
      discount = 0; // หรือค่าส่งจริง
    } else if (coupon.discountAmount && coupon.discountAmount > 0) {
      // ลดเป็นบาท
      discount = parseFloat(coupon.discountAmount.toString());
    } else if (coupon.discountPercent && coupon.discountPercent > 0) {
      // ลดเป็นเปอร์เซ็นต์
      discount = (cartTotal * parseFloat(coupon.discountPercent.toString())) / 100;

      // ถ้ามีเพดานส่วนลดสูงสุด (Max Discount)
      if (coupon.maxDiscount && coupon.maxDiscount > 0 && discount > parseFloat(coupon.maxDiscount.toString())) {
        discount = parseFloat(coupon.maxDiscount.toString());
      }
    }

    return {
      valid: true,
      discountAmount: discount,
      finalTotal: cartTotal - discount,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
    };
  }

  // ✅ 1. สร้างคูปอง (รองรับ Shopee-style)
  async create(data: any) {
    const {
      code,
      type = 'DISCOUNT',
      discountAmount,
      discountPercent,
      minPurchase,
      maxDiscount,
      title,
      description,
      startDate,
      expiresInDays,
      expiresAt,
      totalQuantity,
      perUserLimit = 1,
      targetUsers = 'ALL',
      categoryIds,
      storeId,
      userId,
    } = data;

    // คำนวณวันเริ่มต้นและหมดอายุ
    let startDateObj: Date | null = null;
    if (startDate) {
      startDateObj = new Date(startDate);
    }

    let expiresAtObj: Date;
    if (expiresAt) {
      expiresAtObj = new Date(expiresAt);
    } else if (expiresInDays) {
      expiresAtObj = new Date();
      expiresAtObj.setDate(expiresAtObj.getDate() + parseInt(expiresInDays));
    } else {
      // Default 30 วัน
      expiresAtObj = new Date();
      expiresAtObj.setDate(expiresAtObj.getDate() + 30);
    }

    // แปลง categoryIds เป็น JSON string ถ้าเป็น array
    let categoryIdsStr: string | null = null;
    if (categoryIds) {
      if (Array.isArray(categoryIds)) {
        categoryIdsStr = JSON.stringify(categoryIds);
      } else if (typeof categoryIds === 'string') {
        categoryIdsStr = categoryIds;
      }
    }

    const coupon = this.couponsRepo.create({
      code: code.toUpperCase().trim(), // บังคับตัวพิมพ์ใหญ่
      type: type || 'DISCOUNT',
      discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
      discountPercent: discountPercent ? parseFloat(discountPercent) : null,
      minPurchase: minPurchase ? parseFloat(minPurchase) : 0,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
      title: title || null,
      description: description || null,
      startDate: startDateObj,
      expiresAt: expiresAtObj,
      totalQuantity: totalQuantity ? parseInt(totalQuantity) : null,
      perUserLimit: perUserLimit ? parseInt(perUserLimit) : 1,
      usedCount: 0,
      targetUsers: targetUsers || 'ALL',
      categoryIds: categoryIdsStr,
      storeId: storeId ? parseInt(storeId) : null,
      userId: userId || 1,
    });

    return this.couponsRepo.save(coupon);
  }

  // ✅ 2. ดึงคูปองทั้งหมด (เรียงตามวันหมดอายุ)
  async findAll() {
    return this.couponsRepo.find({
      order: { expiresAt: 'DESC' },
    });
  }

  // ✅ 3. ลบคูปอง
  async remove(id: number) {
    return this.couponsRepo.delete(id);
  }

  // ✅ 4. เก็บคูปอง (Collect Coupon)
  async collectCoupon(couponId: number, userId: number) {
    const now = new Date();
    
    // 1. หาคูปอง
    const coupon = await this.couponsRepo.findOne({
      where: { id: couponId },
      relations: ['store'],
    });

    if (!coupon) {
      throw new NotFoundException('คูปองไม่พบ');
    }

    // 2. เช็ควันเริ่มต้น
    if (coupon.startDate && new Date(coupon.startDate) > now) {
      throw new BadRequestException('คูปองยังไม่สามารถเก็บได้');
    }

    // 3. เช็ควันหมดอายุ
    if (!coupon.expiresAt || new Date(coupon.expiresAt) < now) {
      throw new BadRequestException('คูปองหมดอายุแล้ว');
    }

    // 4. เช็คจำนวนจำกัดทั้งหมด
    if (coupon.totalQuantity && coupon.usedCount >= coupon.totalQuantity) {
      throw new BadRequestException('คูปองหมดแล้ว');
    }

    // 5. เช็คว่าเก็บไปแล้วหรือยัง
    const existing = await this.userCouponRepo.findOne({
      where: { userId, couponId },
    });

    if (existing) {
      throw new BadRequestException('คุณเก็บคูปองนี้ไว้แล้ว');
    }

    // 6. เช็คจำนวนต่อผู้ใช้
    const userCouponCount = await this.userCouponRepo.count({
      where: { userId, couponId, isUsed: false },
    });

    if (userCouponCount >= coupon.perUserLimit) {
      throw new BadRequestException(`คุณเก็บคูปองนี้ครบ ${coupon.perUserLimit} ใบแล้ว`);
    }

    // 7. เช็คผู้ใช้เป้าหมาย
    if (coupon.targetUsers !== 'ALL') {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('ไม่พบผู้ใช้');
      }

      // นับจำนวนออเดอร์ที่ user เคยสั่ง
      const orderCount = await this.userRepo.manager.count('order', {
        where: { orderedById: userId },
      });

      if (coupon.targetUsers === 'NEW_USER' && orderCount > 0) {
        throw new BadRequestException('คูปองนี้สำหรับลูกค้าใหม่เท่านั้น');
      }

      if (coupon.targetUsers === 'EXISTING_USER' && orderCount === 0) {
        throw new BadRequestException('คูปองนี้สำหรับลูกค้าเก่าเท่านั้น');
      }
    }

    // 8. เก็บคูปอง
    const userCoupon = this.userCouponRepo.create({
      userId,
      couponId,
      isUsed: false,
    });

    return this.userCouponRepo.save(userCoupon);
  }

  // ✅ 5. ดึงคูปองที่ user เก็บไว้ (My Coupons)
  async getMyCoupons(userId: number) {
    const userCoupons = await this.userCouponRepo.find({
      where: { userId },
      relations: ['coupon', 'coupon.store'],
      order: { collectedAt: 'DESC' },
    });

    return userCoupons.map(uc => ({
      ...uc.coupon,
      isUsed: uc.isUsed,
      usedAt: uc.usedAt,
      collectedAt: uc.collectedAt,
      userCouponId: uc.id,
    }));
  }

  // ✅ 6. ดึงคูปองที่ยังเก็บได้ (Available Coupons)
  async getAvailableCoupons(userId?: number) {
    const now = new Date();
    
    // ดึงคูปองทั้งหมด (Platform Voucher และ Shop Voucher)
    // ใช้ find() โดยไม่ระบุ where เพื่อดึงทั้งหมด แล้วกรองใน JavaScript
    const allCoupons = await this.couponsRepo.find({
      relations: ['store'],
      order: { expiresAt: 'DESC' },
    });
    
    console.log(`📋 Total coupons in DB: ${allCoupons.length}`);
    
    // กรองเฉพาะ Platform Voucher และ Shop Voucher (ไม่รวมคูปองที่ไม่มี storeId และไม่มี storeId = 0)
    const coupons = allCoupons.filter(c => c.storeId === null || (c.storeId !== null && c.storeId > 0));
    
    console.log(`📋 Filtered coupons (Platform + Shop): ${coupons.length}`);

    // กรองคูปองที่ยังใช้งานได้
    const availableCoupons = coupons.filter(coupon => {
      // เช็ควันเริ่มต้น
      if (coupon.startDate && new Date(coupon.startDate) > now) {
        console.log(`⏰ Coupon ${coupon.code} not started yet`);
        return false;
      }

      // เช็ควันหมดอายุ
      if (!coupon.expiresAt || new Date(coupon.expiresAt) < now) {
        console.log(`⏰ Coupon ${coupon.code} expired`);
        return false;
      }

      // เช็คจำนวนจำกัดทั้งหมด
      if (coupon.totalQuantity && coupon.usedCount >= coupon.totalQuantity) {
        console.log(`⏰ Coupon ${coupon.code} out of stock`);
        return false;
      }

      return true;
    });
    
    console.log(`✅ Available coupons: ${availableCoupons.length}`);

    // ถ้ามี userId ให้เช็คว่าเก็บไปแล้วหรือยัง
    if (userId) {
      const collectedCouponIds = await this.userCouponRepo.find({
        where: { userId },
        select: ['couponId'],
      });

      const collectedIds = collectedCouponIds.map(uc => uc.couponId);

      return availableCoupons.map(coupon => ({
        ...coupon,
        isCollected: collectedIds.includes(coupon.id),
      }));
    }

    return availableCoupons.map(coupon => ({
      ...coupon,
      isCollected: false,
    }));
  }

  // ✅ 7. ใช้คูปองหลายตัวพร้อมกัน (Apply Multiple Coupons)
  async applyMultipleCoupons(
    couponCodes: string[],
    cartTotal: number,
    userId: number,
    cartItems?: any[],
  ) {
    const results = [];
    let totalDiscount = 0;
    let platformDiscount = 0;
    const shopDiscounts: Map<number, number> = new Map();
    let shippingDiscount = 0;

    // แยกคูปองตามประเภท
    const platformCoupons: Coupon[] = [];
    const shopCoupons: Map<number, Coupon> = new Map();
    const shippingCoupons: Coupon[] = [];

    // 1. Validate และแยกคูปอง
    for (const code of couponCodes) {
      const applyResult = await this.applyCoupon(code, cartTotal, userId, cartItems);
      const coupon = await this.couponsRepo.findOne({
        where: { code: code.toUpperCase().trim() },
        relations: ['store'],
      });

      if (!coupon) continue;

      // เช็คว่า user เก็บคูปองนี้ไว้หรือยัง
      const userCoupon = await this.userCouponRepo.findOne({
        where: { userId, couponId: coupon.id, isUsed: false },
      });

      if (!userCoupon) {
        throw new BadRequestException(`คุณยังไม่ได้เก็บคูปอง ${code}`);
      }

      // แยกตามประเภท
      if (coupon.type === 'SHIPPING') {
        shippingCoupons.push(coupon);
      } else if (coupon.storeId) {
        // Shop Voucher - แต่ละร้านใช้ได้แค่ 1 ใบ
        if (shopCoupons.has(coupon.storeId)) {
          throw new BadRequestException(`คุณใช้ Shop Voucher ของร้าน ${coupon.store?.name || coupon.storeId} ไปแล้ว`);
        }
        shopCoupons.set(coupon.storeId, coupon);
      } else {
        // Platform Voucher - ใช้ได้แค่ 1 ใบ
        if (platformCoupons.length > 0) {
          throw new BadRequestException('คุณใช้ Platform Voucher ไปแล้ว');
        }
        platformCoupons.push(coupon);
      }

      results.push({
        code: coupon.code,
        discountAmount: applyResult.discountAmount,
        type: coupon.type,
        storeId: coupon.storeId,
        storeName: coupon.store?.name,
      });
    }

    // 2. คำนวณส่วนลด
    for (const result of results) {
      if (result.type === 'SHIPPING') {
        shippingDiscount += result.discountAmount;
      } else if (result.storeId) {
        const current = shopDiscounts.get(result.storeId) || 0;
        shopDiscounts.set(result.storeId, current + result.discountAmount);
      } else {
        platformDiscount += result.discountAmount;
      }
      totalDiscount += result.discountAmount;
    }

    return {
      valid: true,
      totalDiscount,
      platformDiscount,
      shopDiscounts: Object.fromEntries(shopDiscounts),
      shippingDiscount,
      finalTotal: Math.max(0, cartTotal - totalDiscount),
      appliedCoupons: results,
    };
  }
}

