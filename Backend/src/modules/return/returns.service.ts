import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import {
  OrderReturn,
  OrderReturnStatus,
  OrderReturnItem,
  Order,
  User,
  ProductOnOrder,
  Store,
} from '@core/database/entities';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(OrderReturn)
    private readonly returnRepo: Repository<OrderReturn>,
    @InjectRepository(OrderReturnItem)
    private readonly returnItemRepo: Repository<OrderReturnItem>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ProductOnOrder)
    private readonly productOnOrderRepo: Repository<ProductOnOrder>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
  ) {}

  // ใช้โดยลูกค้า (POST /orders/:orderId/returns)
  // ลูกค้าส่งคำขอคืนสินค้าใหม่สำหรับออเดอร์ของตัวเอง
  async requestReturn(
    userId: number,
    orderId: number,
    dto: CreateReturnDto,
  ): Promise<OrderReturn> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, orderedById: userId },
      relations: ['productOnOrders'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const returnEntity = new OrderReturn();
    returnEntity.orderId = order.id;
    returnEntity.userId = user.id;
    returnEntity.status = OrderReturnStatus.REQUESTED;
    returnEntity.reasonCode = dto.reasonCode;
    returnEntity.reasonText = dto.reasonText || null;
    returnEntity.images = dto.images ? JSON.stringify(dto.images) : null;
    returnEntity.refundAmount = null;
    returnEntity.adminNote = null;
    returnEntity.resolvedAt = null;

    const savedReturn = await this.returnRepo.save(returnEntity);

    if (dto.items && dto.items.length > 0) {
      const itemsToSave: OrderReturnItem[] = [];

      for (const item of dto.items) {
        const orderItem = await this.productOnOrderRepo.findOne({
          where: { id: item.orderItemId, orderId: order.id },
        });

        if (!orderItem) {
          continue;
        }

        const returnItem = new OrderReturnItem();
        returnItem.orderReturnId = savedReturn.id;
        returnItem.orderItemId = orderItem.id;
        returnItem.quantity = item.quantity;
        returnItem.unitPrice = Number(orderItem.price);

        itemsToSave.push(returnItem);
      }

      if (itemsToSave.length > 0) {
        await this.returnItemRepo.save(itemsToSave);
      }
    }

    return this.returnRepo.findOne({
      where: { id: savedReturn.id },
      relations: ['order', 'user', 'items', 'items.orderItem'],
    });
  }

  // ใช้โดยลูกค้า (GET /me/returns)
  // ดึงคำขอคืนสินค้าทั้งหมดของ user หนึ่งคน
  async getMyReturns(userId: number): Promise<OrderReturn[]> {
    return this.returnRepo.find({
      where: { userId },
      relations: ['order', 'items', 'items.orderItem'],
      order: { createdAt: 'DESC' },
    });
  }

  // ใช้โดยลูกค้า (GET /orders/:orderId/returns)
  // ดึงคำขอคืนทั้งหมดของออเดอร์หนึ่ง (เฉพาะของ user นั้นเอง)
  async getOrderReturnsForUser(
    userId: number,
    orderId: number,
  ): Promise<OrderReturn[]> {
    return this.returnRepo.find({
      where: {
        userId,
        orderId,
      },
      relations: ['order', 'items', 'items.orderItem'],
      order: { createdAt: 'DESC' },
    });
  }

  // ใช้โดย Admin (GET /returns/admin)
  // Admin เรียกดูคำขอคืนสินค้าทั้งระบบ (optionally filter ตาม status)
  async getAllReturnsForAdmin(
    status?: OrderReturnStatus,
  ): Promise<OrderReturn[]> {
    const where: FindOptionsWhere<OrderReturn> = {};
    if (status) {
      where.status = status;
    }

    return this.returnRepo.find({
      where,
      relations: ['order', 'user', 'items', 'items.orderItem'],
      order: { createdAt: 'DESC' },
    });
  }

  // ใช้โดย Admin (PATCH /returns/:id/status)
  // Admin อัปเดตสถานะคำขอคืนสินค้า เช่น APPROVED / REJECTED / REFUNDED
  async updateReturnStatus(
    adminId: number,
    returnId: number,
    dto: UpdateReturnStatusDto,
  ): Promise<OrderReturn> {
    const returnReq = await this.returnRepo.findOne({
      where: { id: returnId },
      relations: ['order', 'user'],
    });

    if (!returnReq) {
      throw new NotFoundException('Return request not found');
    }

    // NOTE: การตรวจ role/adminId จะมาเพิ่มทีหลัง
    returnReq.status = dto.status;

    if (dto.refundAmount !== undefined) {
      returnReq.refundAmount = dto.refundAmount;
    }

    if (dto.note) {
      returnReq.adminNote = dto.note;
    }

    if (
      dto.status === OrderReturnStatus.REJECTED ||
      dto.status === OrderReturnStatus.REFUNDED ||
      dto.status === OrderReturnStatus.CANCELLED
    ) {
      returnReq.resolvedAt = new Date();
    }

    await this.returnRepo.save(returnReq);

    return this.returnRepo.findOne({
      where: { id: returnReq.id },
      relations: ['order', 'user', 'items', 'items.orderItem'],
    });
  }

  // =============================
  // Seller methods
  // =============================

  /**
   * ใช้โดย Seller: ดึงคำขอคืนของออเดอร์ที่มีสินค้าในร้านของตัวเอง
   * GET /seller/returns
   */
  async getSellerReturns(
    sellerId: number,
    status?: OrderReturnStatus,
  ): Promise<OrderReturn[]> {
    // ความสัมพันธ์:
    // OrderReturn -> items (OrderReturnItem) -> orderItem (ProductOnOrder)
    // -> product (Product) -> store (Store) -> ownerId (seller)
    const qb = this.returnRepo
      .createQueryBuilder('ret')
      .leftJoinAndSelect('ret.order', 'order')
      .leftJoinAndSelect('ret.user', 'user')
      .leftJoinAndSelect('ret.items', 'items')
      .leftJoinAndSelect('items.orderItem', 'orderItem')
      .leftJoinAndSelect('orderItem.product', 'product')
      .leftJoinAndSelect('product.store', 'store')
      .where('store.ownerId = :sellerId', { sellerId });

    if (status) {
      qb.andWhere('ret.status = :status', { status });
    }

    qb.orderBy('ret.createdAt', 'DESC');

    return qb.getMany();
  }

  /**
   * ใช้โดย Seller: ดูรายละเอียดคำขอคืน 1 รายการ (ต้องเป็นของร้านตัวเอง)
   * GET /seller/returns/:id
   */
  async getSellerReturnDetail(
    sellerId: number,
    returnId: number,
  ): Promise<OrderReturn> {
    const qb = this.returnRepo
      .createQueryBuilder('ret')
      .leftJoinAndSelect('ret.order', 'order')
      .leftJoinAndSelect('ret.user', 'user')
      .leftJoinAndSelect('ret.items', 'items')
      .leftJoinAndSelect('items.orderItem', 'orderItem')
      .leftJoinAndSelect('orderItem.product', 'product')
      .leftJoinAndSelect('product.store', 'store')
      .where('ret.id = :returnId', { returnId })
      .andWhere('store.ownerId = :sellerId', { sellerId });

    const result = await qb.getOne();

    if (!result) {
      // ไม่เจอ หรือไม่ใช่ของร้านนี้ → ซ่อนรายละเอียด
      throw new NotFoundException('Return request not found');
    }

    return result;
  }

  /**
   * ใช้โดย Seller: อัปเดตสถานะคำขอคืนของร้านตัวเอง
   * PATCH /seller/returns/:id/status
   */
  async updateReturnStatusAsSeller(
    sellerId: number,
    returnId: number,
    dto: UpdateReturnStatusDto,
  ): Promise<OrderReturn> {
    // ดึงคำขอคืนพร้อมตรวจว่าเกี่ยวกับร้านของ sellerId หรือไม่
    const qb = this.returnRepo
      .createQueryBuilder('ret')
      .leftJoinAndSelect('ret.order', 'order')
      .leftJoinAndSelect('ret.user', 'user')
      .leftJoinAndSelect('ret.items', 'items')
      .leftJoinAndSelect('items.orderItem', 'orderItem')
      .leftJoinAndSelect('orderItem.product', 'product')
      .leftJoinAndSelect('product.store', 'store')
      .where('ret.id = :returnId', { returnId })
      .andWhere('store.ownerId = :sellerId', { sellerId });

    const returnReq = await qb.getOne();

    if (!returnReq) {
      throw new NotFoundException('Return request not found');
    }

    // อนุญาตให้ Seller เปลี่ยนสถานะจาก REQUESTED เท่านั้น
    if (returnReq.status !== OrderReturnStatus.REQUESTED) {
      throw new BadRequestException(
        'Cannot change status after request has been processed',
      );
    }

    // ไม่อนุญาตให้ Seller ตั้งสถานะ REFUNDED
    if (dto.status === OrderReturnStatus.REFUNDED) {
      throw new ForbiddenException(
        'Only admin can mark a return as REFUNDED',
      );
    }

    // อนุญาตสถานะ APPROVED / REJECTED / CANCELLED
    if (
      dto.status !== OrderReturnStatus.APPROVED &&
      dto.status !== OrderReturnStatus.REJECTED &&
      dto.status !== OrderReturnStatus.CANCELLED
    ) {
      throw new BadRequestException('Unsupported status for seller');
    }

    returnReq.status = dto.status;

    if (dto.refundAmount !== undefined) {
      returnReq.refundAmount = dto.refundAmount;
    }

    if (dto.note) {
      // ใช้ adminNote เก็บ note จากทั้ง seller / admin ในเวอร์ชันนี้
      returnReq.adminNote = dto.note;
    }

    // ถ้า seller ปฏิเสธหรือยกเลิก → ปิดคำขอเลย
    if (
      dto.status === OrderReturnStatus.REJECTED ||
      dto.status === OrderReturnStatus.CANCELLED
    ) {
      returnReq.resolvedAt = new Date();
    }

    await this.returnRepo.save(returnReq);

    // ดึงกลับมาพร้อม relations ให้ครบเพื่อใช้ฝั่ง frontend
    return this.returnRepo.findOne({
      where: { id: returnReq.id },
      relations: ['order', 'user', 'items', 'items.orderItem'],
    });
  }
}


