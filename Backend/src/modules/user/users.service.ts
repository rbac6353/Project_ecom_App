import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@core/database/entities';
import { AdminLogsService } from '@modules/admin/admin-logs.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly adminLogsService: AdminLogsService, // ✅ Inject
  ) {}

  async findOne(id: number): Promise<User> {
    try {
      this.logger.debug(`[findOne] Querying user with id: ${id}`);
      // ✅ ใช้ createQueryBuilder เพื่อ select เฉพาะ fields ที่มีจริงใน database
      // หลีกเลี่ยงปัญหา updatedAt column
      const queryBuilder = this.userRepository
        .createQueryBuilder('user')
        .where('user.id = :id', { id })
        .select([
          'user.id',
          'user.email',
          'user.password',
          'user.name',
          'user.picture',
          'user.role',
          'user.enabled',
          'user.address',
          'user.phone',
          'user.notificationToken',
          'user.resetPasswordToken',
          'user.resetPasswordExpires',
          'user.isEmailVerified',
          'user.verificationToken',
          'user.googleId',
          'user.facebookId',
          'user.points',
          'user.createdAt',
        ]);
      
      const sql = queryBuilder.getSql();
      this.logger.debug(`[findOne] SQL Query: ${sql}`);
      
      const user = await queryBuilder.getOne();
      this.logger.debug(`[findOne] User found: ${user ? `id=${user.id}, email=${user.email}` : 'null'}`);
      return user;
    } catch (error: any) {
      this.logger.error(`[findOne] Error querying user id: ${id}`, error.stack);
      this.logger.error(`[findOne] Error message: ${error.message}`);
      if (error.message?.includes('updatedAt')) {
        this.logger.error(`[findOne] ⚠️ updatedAt column error detected!`);
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User> {
    // ✅ ใช้ createQueryBuilder เพื่อ select เฉพาะ fields ที่มีจริงใน database
    // หลีกเลี่ยงปัญหา updatedAt column
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .select([
        'user.id',
        'user.email',
        'user.password',
        'user.name',
        'user.picture',
        'user.role',
        'user.enabled',
        'user.address',
        'user.phone',
        'user.notificationToken',
        'user.resetPasswordToken',
        'user.resetPasswordExpires',
        'user.isEmailVerified',
        'user.verificationToken',
        'user.googleId',
        'user.facebookId',
        'user.points',
        'user.createdAt',
      ])
      .getOne();
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ถ้ามีการแก้ Password ให้ Hash ใหม่ด้วย
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    // ✅ ใช้ createQueryBuilder เพื่อ update เฉพาะ fields ที่ต้องการ
    // หลีกเลี่ยงปัญหา updatedAt column
    const updateQuery = this.userRepository
      .createQueryBuilder()
      .update(User)
      .set(updateData)
      .where('id = :id', { id });

    await updateQuery.execute();
    
    // ✅ ดึง user ใหม่เพื่อ return
    const updatedUser = await this.findOne(id);
    const { password, ...result } = updatedUser;
    return result as User;
  }

  // ✅ 1. ดึงผู้ใช้ทั้งหมด (รองรับ Search & Pagination)
  async findAll(page: number = 1, limit: number = 20, keyword?: string) {
    const skip = (page - 1) * limit;

    const whereConfig: any = {};
    if (keyword) {
      whereConfig.email = Like(`%${keyword}%`); // ค้นหาจากอีเมล
      // หรือจะค้นจากชื่อด้วยก็ได้: whereConfig.name = Like(`%${keyword}%`)
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: whereConfig,
      skip,
      take: limit,
      order: { id: 'DESC' }, // ใช้ id แทน createdAt
      select: ['id', 'email', 'name', 'role', 'enabled'], // ไม่ดึง password (ลบ createdAt ออก)
    });

    return { data: users, total, page, last_page: Math.ceil(total / limit) };
  }

  // ✅ 2. แบน/ปลดแบน ผู้ใช้
  async toggleBan(id: number, adminId: number) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const newEnabledStatus = !user.enabled; // สลับสถานะ (True <-> False)
    
    // ✅ ใช้ createQueryBuilder เพื่อ update เฉพาะ field enabled โดยตรง
    // หลีกเลี่ยงปัญหา updatedAt column
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ enabled: newEnabledStatus })
      .where('id = :id', { id })
      .execute();
    
    // ✅ อัปเดต user object เพื่อใช้ใน log
    user.enabled = newEnabledStatus;

    // ✅ บันทึก Log
    await this.adminLogsService.logAction(
      adminId,
      newEnabledStatus ? 'UNBAN_USER' : 'BAN_USER',
      'USER',
      id,
      `Email: ${user.email}`,
    );

    // ✅ ดึง user ใหม่เพื่อ return
    const updatedUser = await this.findOne(id);
    return updatedUser;
  }

  // ✅ 3. เปลี่ยน Role (แต่งตั้ง Admin / ลดขั้น)
  async changeRole(id: number, role: string, adminId: number) {
    try {
      this.logger.log(`[changeRole] Starting - userId: ${id}, newRole: ${role}, adminId: ${adminId}`);
      
      this.logger.log(`[changeRole] Step 1: Finding user with id: ${id}`);
      const user = await this.findOne(id);
      if (!user) {
        this.logger.error(`[changeRole] User not found: ${id}`);
        throw new NotFoundException('User not found');
      }
      this.logger.log(`[changeRole] Step 1: User found - email: ${user.email}, currentRole: ${user.role}`);
      
      const oldRole = user.role;
      
      this.logger.log(`[changeRole] Step 2: Updating role from ${oldRole} to ${role}`);
      // ✅ ใช้ createQueryBuilder เพื่อ update เฉพาะ field role โดยตรง
      // หลีกเลี่ยงปัญหา updatedAt column
      const updateResult = await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ role })
        .where('id = :id', { id })
        .execute();
      
      this.logger.log(`[changeRole] Step 2: Update executed - affected: ${updateResult.affected}`);

      this.logger.log(`[changeRole] Step 3: Logging admin action`);
      // ✅ บันทึก Log
      await this.adminLogsService.logAction(
        adminId,
        'CHANGE_ROLE',
        'USER',
        id,
        `เปลี่ยน Role จาก ${oldRole} เป็น ${role} (Email: ${user.email})`,
      );

      this.logger.log(`[changeRole] Step 4: Fetching updated user`);
      // ✅ ดึง user ใหม่เพื่อ return
      const updatedUser = await this.findOne(id);
      this.logger.log(`[changeRole] Step 4: Updated user fetched - newRole: ${updatedUser?.role}`);
      
      this.logger.log(`[changeRole] Success - userId: ${id}, role changed from ${oldRole} to ${role}`);
      return updatedUser;
    } catch (error: any) {
      this.logger.error(`[changeRole] Error - userId: ${id}, error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`ไม่สามารถเปลี่ยน Role ได้: ${error.message}`);
    }
  }

  // ✅ 4. นับจำนวนผู้ใช้ทั้งหมด (สำหรับ Dashboard)
  async countAll() {
    return this.userRepository.count();
  }

  // ✅ 5. ดึงสถิติผู้ใช้ (สำหรับ Platform Stats)
  async getStats() {
    const totalUsers = await this.userRepository.count();
    const bannedUsers = await this.userRepository.count({
      where: { enabled: false },
    });

    return { totalUsers, bannedUsers };
  }

  // ✅ 6. ดึงรายละเอียด User (Admin Use) - พร้อม Orders และสถิติ
  async findOneWithDetails(id: number) {
    try {
      this.logger.log(`[findOneWithDetails] Starting - userId: ${id}`);
      
      // ✅ ใช้ createQueryBuilder เพื่อ select เฉพาะ fields ที่ต้องการและ join orders
      // ⚠️ สำคัญ: ต้อง select เฉพาะ fields ที่มีจริงใน database
      // User table อาจไม่มี updatedAt column แต่ Order table มี
      const queryBuilder = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.orders', 'orders')
        .where('user.id = :id', { id })
        .select([
          'user.id',
          'user.email',
          'user.name',
          'user.picture',
          'user.role',
          'user.enabled',
          'user.address',
          'user.phone',
          'user.points',
          'user.createdAt',
          // ⚠️ ไม่ select user.updatedAt เพราะอาจไม่มีใน database
          'orders.id',
          'orders.orderStatus',
          'orders.cartTotal',
          'orders.createdAt',
          'orders.updatedAt', // ✅ Order table มี updatedAt column
        ]);
      
      const sql = queryBuilder.getSql();
      this.logger.debug(`[findOneWithDetails] SQL Query: ${sql}`);
      this.logger.debug(`[findOneWithDetails] SQL Parameters: ${JSON.stringify(queryBuilder.getParameters())}`);
      
      const user = await queryBuilder.getOne();
      this.logger.log(`[findOneWithDetails] User found: ${user ? `id=${user.id}, orders=${user.orders?.length || 0}` : 'null'}`);

      if (!user) {
        this.logger.error(`[findOneWithDetails] User not found: ${id}`);
        throw new NotFoundException('User not found');
      }

      this.logger.log(`[findOneWithDetails] Processing orders - count: ${user.orders?.length || 0}`);
      // เรียง orders ตาม id DESC (แทน createdAt)
      const sortedOrders = (user.orders || []).sort(
        (a, b) => b.id - a.id, // ใช้ id แทน createdAt
      );

      // คำนวณสถิติเพิ่มเติม (ยอดซื้อรวม)
      const totalSpent = sortedOrders
        .filter((o) => o.orderStatus !== 'CANCELLED')
        .reduce((sum, order) => sum + Number(order.cartTotal || 0), 0);

      const completedOrders = sortedOrders.filter(
        (o) => o.orderStatus === 'DELIVERED',
      ).length;

      this.logger.log(`[findOneWithDetails] Success - userId: ${id}, orders: ${sortedOrders.length}, totalSpent: ${totalSpent}`);
      // ไม่ส่ง password กลับไป
      const { password, ...userWithoutPassword } = user;

      return {
        ...userWithoutPassword,
        orders: sortedOrders.slice(0, 5), // เอาแค่ 5 ออเดอร์ล่าสุด
        stats: {
          totalSpent,
          totalOrders: sortedOrders.length,
          completedOrders,
        },
      };
    } catch (error: any) {
      this.logger.error(`[findOneWithDetails] Error - userId: ${id}`, error.stack);
      this.logger.error(`[findOneWithDetails] Error message: ${error.message}`);
      if (error.message?.includes('updatedAt')) {
        this.logger.error(`[findOneWithDetails] ⚠️ updatedAt column error detected!`);
        this.logger.error(`[findOneWithDetails] This might be from Order entity join`);
      }
      throw error;
    }
  }

  // ✅ 7. ฟังก์ชันลบบัญชี (Anonymize User - Soft Delete)
  async deleteAccount(userId: number, password: string) {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ✅ เช็ครหัสผ่านก่อนลบ
    if (!user.password) {
      // ถ้าไม่มี password (เช่น login ด้วย Google/Facebook) ให้ข้ามการเช็ค
      // หรือถ้าต้องการให้ยืนยันด้วยวิธีอื่น เช่น OTP
    } else {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new BadRequestException('รหัสผ่านไม่ถูกต้อง');
      }
    }

    // ✅ ใช้ createQueryBuilder เพื่อ update หลาย fields พร้อมกัน
    // หลีกเลี่ยงปัญหา updatedAt column
    const deletedEmail = `deleted_${userId}_${Date.now()}@deleted.com`;
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        email: deletedEmail,
        name: 'Deleted User',
        password: '',
        googleId: null,
        facebookId: null,
        picture: null,
        phone: null,
        notificationToken: null,
        enabled: false,
      })
      .where('id = :userId', { userId })
      .execute();

    // 3. (Optional) ลบข้อมูลอื่นๆ ที่ไม่จำเป็น เช่น Address, Wishlist, Cart
    // await this.addressRepo.delete({ userId });
    // await this.wishlistRepo.delete({ userId });

    // ✅ ดึง user ใหม่เพื่อ return
    const anonymizedUser = await this.findOne(userId);
    return anonymizedUser;
  }
}

