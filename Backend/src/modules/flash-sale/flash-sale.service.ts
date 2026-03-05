import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { FlashSale, FlashSaleItem, Product } from '@core/database/entities';

@Injectable()
export class FlashSaleService {
  constructor(
    @InjectRepository(FlashSale)
    private flashSaleRepo: Repository<FlashSale>,
    @InjectRepository(FlashSaleItem)
    private flashSaleItemRepo: Repository<FlashSaleItem>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  /**
   * ดึง Flash Sale ที่กำลัง Active (สำหรับ Frontend)
   * ถ้าไม่มีรอบปัจจุบัน ให้หา "Coming Soon" (รอบถัดไป)
   */
  async getCurrentFlashSale() {
    const now = new Date();

    // หารอบที่กำลัง Active
    const activeFlashSale = await this.flashSaleRepo.findOne({
      where: {
        isActive: true,
        startTime: LessThanOrEqual(now),
        endTime: MoreThanOrEqual(now),
      },
      relations: ['items', 'items.product', 'items.product.images', 'items.product.store'],
      order: { startTime: 'ASC' },
    });

    if (activeFlashSale) {
      // กรองเฉพาะ items ที่ยังมีสต็อก
      activeFlashSale.items = activeFlashSale.items.filter(
        (item) => item.sold < item.limitStock,
      );
      return {
        type: 'active',
        flashSale: activeFlashSale,
      };
    }

    // ถ้าไม่มีรอบ Active ให้หา "Coming Soon"
    const upcomingFlashSale = await this.flashSaleRepo.findOne({
      where: {
        isActive: true,
        startTime: MoreThanOrEqual(now),
      },
      relations: ['items', 'items.product', 'items.product.images', 'items.product.store'],
      order: { startTime: 'ASC' },
    });

    if (upcomingFlashSale) {
      return {
        type: 'coming_soon',
        flashSale: upcomingFlashSale,
      };
    }

    return null;
  }

  /**
   * ดึง Flash Sale ทั้งหมด (สำหรับ Admin)
   */
  async findAll() {
    return this.flashSaleRepo.find({
      relations: ['items', 'items.product'],
      order: { startTime: 'DESC' },
    });
  }

  /**
   * ดึง Flash Sale ตาม ID (สำหรับ Admin)
   */
  async findOne(id: number) {
    const flashSale = await this.flashSaleRepo.findOne({
      where: { id },
      relations: ['items', 'items.product', 'items.product.images'],
    });

    if (!flashSale) {
      throw new NotFoundException(`Flash Sale with ID ${id} not found`);
    }

    return flashSale;
  }

  /**
   * สร้าง Flash Sale Campaign ใหม่ (Admin Only)
   */
  async create(data: {
    name: string;
    startTime: Date;
    endTime: Date;
    description?: string;
    items?: Array<{
      productId: number;
      discountPrice: number;
      limitStock: number;
    }>;
  }) {
    // Validate time
    if (new Date(data.startTime) >= new Date(data.endTime)) {
      throw new BadRequestException('Start time must be before end time');
    }

    const flashSale = this.flashSaleRepo.create({
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      description: data.description,
      isActive: true,
    });

    const savedFlashSale = await this.flashSaleRepo.save(flashSale);

    // ถ้ามี items ให้สร้าง FlashSaleItem
    if (data.items && data.items.length > 0) {
      const items = await Promise.all(
        data.items.map(async (itemData) => {
          const product = await this.productRepo.findOne({
            where: { id: itemData.productId },
          });

          if (!product) {
            throw new NotFoundException(
              `Product with ID ${itemData.productId} not found`,
            );
          }

          // Validate price
          if (itemData.discountPrice >= product.price) {
            throw new BadRequestException(
              `Discount price must be less than original price for product ${product.title}`,
            );
          }

          // Validate stock
          if (itemData.limitStock > product.quantity) {
            throw new BadRequestException(
              `Flash Sale stock cannot exceed product quantity for product ${product.title}`,
            );
          }

          return this.flashSaleItemRepo.create({
            flashSaleId: savedFlashSale.id,
            productId: itemData.productId,
            discountPrice: itemData.discountPrice,
            limitStock: itemData.limitStock,
            sold: 0,
          });
        }),
      );

      await this.flashSaleItemRepo.save(items);
    }

    return this.findOne(savedFlashSale.id);
  }

  /**
   * เพิ่มสินค้าเข้า Flash Sale (Admin Only)
   */
  async addItem(
    flashSaleId: number,
    data: {
      productId: number;
      discountPrice: number;
      limitStock: number;
    },
  ) {
    const flashSale = await this.findOne(flashSaleId);

    // Check if item already exists
    const existingItem = await this.flashSaleItemRepo.findOne({
      where: {
        flashSaleId,
        productId: data.productId,
      },
    });

    if (existingItem) {
      throw new ConflictException('Product already exists in this Flash Sale');
    }

    const product = await this.productRepo.findOne({
      where: { id: data.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${data.productId} not found`);
    }

    // Validate price
    if (data.discountPrice >= product.price) {
      throw new BadRequestException(
        'Discount price must be less than original price',
      );
    }

    // Validate stock
    if (data.limitStock > product.quantity) {
      throw new BadRequestException(
        'Flash Sale stock cannot exceed product quantity',
      );
    }

    const item = this.flashSaleItemRepo.create({
      flashSaleId,
      productId: data.productId,
      discountPrice: data.discountPrice,
      limitStock: data.limitStock,
      sold: 0,
    });

    return this.flashSaleItemRepo.save(item);
  }

  /**
   * อัปเดต Flash Sale (Admin Only)
   */
  async update(id: number, data: Partial<FlashSale>) {
    const flashSale = await this.findOne(id);

    if (data.startTime && data.endTime) {
      if (new Date(data.startTime) >= new Date(data.endTime)) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    Object.assign(flashSale, data);
    return this.flashSaleRepo.save(flashSale);
  }

  /**
   * ลบ Flash Sale (Admin Only)
   */
  async remove(id: number) {
    const flashSale = await this.findOne(id);
    return this.flashSaleRepo.remove(flashSale);
  }

  /**
   * ตรวจสอบและตัดสต็อก Flash Sale (ใช้ตอน Checkout)
   * ⚠️ สำคัญ: ใช้ Pessimistic Locking เพื่อป้องกัน Overselling
   */
  async reserveFlashSaleStock(
    flashSaleItemId: number,
    quantity: number,
  ): Promise<{ success: boolean; discountPrice?: number; message?: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock row เพื่อป้องกัน concurrent access
      const item = await queryRunner.manager
        .createQueryBuilder(FlashSaleItem, 'item')
        .setLock('pessimistic_write')
        .where('item.id = :id', { id: flashSaleItemId })
        .getOne();

      if (!item) {
        await queryRunner.rollbackTransaction();
        return {
          success: false,
          message: 'Flash Sale item not found',
        };
      }

      // ตรวจสอบเวลา
      const flashSale = await queryRunner.manager.findOne(FlashSale, {
        where: { id: item.flashSaleId },
      });

      if (!flashSale) {
        await queryRunner.rollbackTransaction();
        return {
          success: false,
          message: 'Flash Sale not found',
        };
      }

      const now = new Date();
      if (now < flashSale.startTime || now > flashSale.endTime) {
        await queryRunner.rollbackTransaction();
        return {
          success: false,
          message: 'Flash Sale is not active',
        };
      }

      // ตรวจสอบสต็อก
      if (item.sold + quantity > item.limitStock) {
        await queryRunner.rollbackTransaction();
        return {
          success: false,
          message: 'Flash Sale stock insufficient',
        };
      }

      // อัปเดตสต็อก (Atomic Update)
      await queryRunner.manager
        .createQueryBuilder()
        .update(FlashSaleItem)
        .set({ sold: () => 'sold + :quantity' })
        .setParameter('quantity', quantity)
        .where('id = :id', { id: flashSaleItemId })
        .andWhere('sold + :quantity <= limitStock')
        .execute();

      await queryRunner.commitTransaction();

      return {
        success: true,
        discountPrice: item.discountPrice,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error reserving Flash Sale stock:', error);
      return {
        success: false,
        message: 'Failed to reserve Flash Sale stock',
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * ตรวจสอบว่าสินค้านี้อยู่ใน Flash Sale หรือไม่ (ใช้ตอนแสดงราคา)
   */
  async getFlashSalePrice(productId: number): Promise<number | null> {
    const now = new Date();

    const item = await this.flashSaleItemRepo.findOne({
      where: {
        productId,
      },
      relations: ['flashSale'],
    });

    if (!item) {
      return null;
    }

    const flashSale = item.flashSale;

    // ตรวจสอบเวลาและสต็อก
    if (
      flashSale.isActive &&
      now >= flashSale.startTime &&
      now <= flashSale.endTime &&
      item.sold < item.limitStock
    ) {
      return item.discountPrice;
    }

    return null;
  }

  /**
   * ตรวจสอบว่าผู้ใช้ซื้อสินค้านี้ใน Flash Sale นี้ไปครบโควตาหรือยัง
   */
  async checkUserPurchaseLimit(
    userId: number,
    flashSaleItemId: number,
  ): Promise<{ canPurchase: boolean; purchasedCount: number }> {
    const item = await this.flashSaleItemRepo.findOne({
      where: { id: flashSaleItemId },
    });

    if (!item) {
      return { canPurchase: false, purchasedCount: 0 };
    }

    // TODO: Query จาก Order เพื่อนับจำนวนที่ซื้อไปแล้ว
    // ตอนนี้ return true ชั่วคราว (ต้องเพิ่ม logic ใน OrderService)
    return {
      canPurchase: true,
      purchasedCount: 0,
    };
  }
}
