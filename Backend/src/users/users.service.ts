import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { AdminLogsService } from '../admin-logs/admin-logs.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly adminLogsService: AdminLogsService, // ✅ Inject
  ) {}

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ถ้ามีการแก้ Password ให้ Hash ใหม่ด้วย
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    Object.assign(user, updateData);
    const savedUser = await this.userRepository.save(user);
    
    // ไม่ส่ง password กลับไป
    const { password, ...result } = savedUser;
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
      order: { createdAt: 'DESC' },
      select: ['id', 'email', 'name', 'role', 'enabled', 'createdAt'], // ไม่ดึง password
    });

    return { data: users, total, page, last_page: Math.ceil(total / limit) };
  }

  // ✅ 2. แบน/ปลดแบน ผู้ใช้
  async toggleBan(id: number, adminId: number) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.enabled = !user.enabled; // สลับสถานะ (True <-> False)
    await this.userRepository.save(user);

    // ✅ บันทึก Log
    await this.adminLogsService.logAction(
      adminId,
      user.enabled ? 'UNBAN_USER' : 'BAN_USER',
      'USER',
      id,
      `Email: ${user.email}`,
    );

    return user;
  }

  // ✅ 3. เปลี่ยน Role (แต่งตั้ง Admin / ลดขั้น)
  async changeRole(id: number, role: string, adminId: number) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const oldRole = user.role;
    user.role = role;
    await this.userRepository.save(user);

    // ✅ บันทึก Log
    await this.adminLogsService.logAction(
      adminId,
      'CHANGE_ROLE',
      'USER',
      id,
      `เปลี่ยน Role จาก ${oldRole} เป็น ${role} (Email: ${user.email})`,
    );

    return user;
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
    // ดึง User พร้อม Orders (เอาแค่ 5 ออเดอร์ล่าสุดพอ เพื่อไม่ให้หนัก)
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['orders'],
      order: {
        createdAt: 'DESC',
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // เรียง orders ตาม createdAt DESC
    const sortedOrders = (user.orders || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // คำนวณสถิติเพิ่มเติม (ยอดซื้อรวม)
    const totalSpent = sortedOrders
      .filter((o) => o.orderStatus !== 'CANCELLED')
      .reduce((sum, order) => sum + Number(order.cartTotal || 0), 0);

    const completedOrders = sortedOrders.filter(
      (o) => o.orderStatus === 'DELIVERED',
    ).length;

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

    // 1. เปลี่ยนข้อมูลระบุตัวตนเป็นค่าสุ่ม (เพื่อไม่ให้รู้ว่าเป็นใคร แต่ ID เดิมยังอยู่กับออเดอร์)
    user.email = `deleted_${userId}_${Date.now()}@deleted.com`;
    user.name = 'Deleted User';
    user.password = ''; // ลบรหัสผ่าน
    user.googleId = null;
    user.facebookId = null;
    user.picture = null;
    user.phone = null;
    user.notificationToken = null;

    // 2. ปิดการใช้งาน
    user.enabled = false;

    // 3. (Optional) ลบข้อมูลอื่นๆ ที่ไม่จำเป็น เช่น Address, Wishlist, Cart
    // await this.addressRepo.delete({ userId });
    // await this.wishlistRepo.delete({ userId });

    return this.userRepository.save(user);
  }
}

