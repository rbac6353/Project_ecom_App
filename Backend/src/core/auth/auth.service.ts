import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes, randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { User } from '@core/database/entities';
import { WalletService } from '@modules/wallet/wallet.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private readonly walletService: WalletService,
  ) {
    // Initialize Google OAuth2Client
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      // ✅ เพิ่มการเช็คตรงนี้
      if (!user.enabled) {
        throw new UnauthorizedException(
          'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
        );
      }

      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        picture: user.picture,
      },
    };
  }

  async register(email: string, password: string, name: string) {
    // เช็คอีเมลซ้ำ
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12); // ✅ เพิ่มเป็น 12 rounds สำหรับ security

    // ✅ สร้าง OTP 6 หลัก
    const otp = randomInt(100000, 999999).toString();
    
    // ✅ ตั้งเวลาหมดอายุ OTP (15 นาที)
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 15);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      role: 'user',
      isEmailVerified: false, // ยังไม่ยืนยัน
      verificationToken: otp,
      // Note: verificationTokenExpires จะเพิ่มใน entity ถ้าจำเป็น
    });

    const savedUser = await this.userRepository.save(user);

    // ✅ สร้าง Wallet ให้ผู้ใช้ใหม่ทันที
    try {
      await this.walletService.createWalletForUser(savedUser.id);
    } catch (error) {
      // ไม่ให้การสมัครสมาชิกล้มเพราะสร้างกระเป๋าเงินไม่สำเร็จ
      console.error('Wallet creation error:', error);
    }

    // ✅ ส่งอีเมล OTP
    try {
      await this.mailerService.sendMail({
        to: savedUser.email,
        subject: 'ยืนยันอีเมลของคุณ - GTXShop',
        template: './verify-email',
        context: { 
          otp,
          name: savedUser.name || 'ผู้ใช้',
          expiresIn: '15 นาที',
        },
      });
    } catch (error) {
      console.error('Email sending error:', error);
      // ไม่ throw error เพื่อไม่ให้ registration fail ถ้า email service มีปัญหา
    }

    return {
      message: 'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน',
      email: savedUser.email,
      otpExpiresAt: otpExpires.toISOString(), // ✅ ส่งเวลาหมดอายุกลับไป
    };
  }

  // 2. ฟังก์ชันยืนยันอีเมล
  async verifyEmail(email: string, otp: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('ไม่พบอีเมลนี้ในระบบ');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('อีเมลนี้ยืนยันไปแล้ว');
    }

    if (!user.verificationToken) {
      throw new BadRequestException('ไม่พบรหัส OTP กรุณาขอส่งใหม่');
    }

    if (user.verificationToken !== otp) {
      throw new BadRequestException('รหัส OTP ไม่ถูกต้อง');
    }

    // ✅ TODO: เพิ่มการเช็ค OTP expiration ถ้ามี field verificationTokenExpires

    // ยืนยันสำเร็จ
    user.isEmailVerified = true;
    user.verificationToken = null; // ล้าง Token ทิ้ง
    await this.userRepository.save(user);

    // Auto Login: ส่ง Token กลับไปเลย จะได้ไม่ต้องกรอกรหัสอีกรอบ
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      message: 'ยืนยันอีเมลเรียบร้อย',
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        picture: user.picture,
        isEmailVerified: true,
      },
    };
  }

  // ✅ 3. ส่ง OTP ใหม่ (Resend Verification Email)
  async resendVerificationEmail(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // ✅ Security: ไม่บอกว่า email ไม่มีในระบบ (ป้องกัน email enumeration)
      return {
        message: 'หากอีเมลนี้มีในระบบ เราจะส่งรหัส OTP ไปให้',
      };
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('อีเมลนี้ยืนยันไปแล้ว');
    }

    // ✅ สร้าง OTP ใหม่
    const otp = randomInt(100000, 999999).toString();
    user.verificationToken = otp;
    await this.userRepository.save(user);

    // ✅ ส่งอีเมล OTP ใหม่
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'รหัส OTP ยืนยันอีเมลใหม่ - GTXShop',
        template: './verify-email',
        context: {
          otp,
          name: user.name || 'ผู้ใช้',
          expiresIn: '15 นาที',
        },
      });
    } catch (error) {
      console.error('Email sending error:', error);
      throw new BadRequestException('ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง');
    }

    return {
      message: 'ส่งรหัส OTP ใหม่เรียบร้อยแล้ว กรุณาตรวจสอบอีเมล',
      email: user.email,
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user || !user.enabled) {
        throw new UnauthorizedException();
      }
      return user;
    } catch {
      throw new UnauthorizedException();
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  // ✅ ดึงข้อมูล user profile พร้อม stores relation
  async getUserProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['stores'], // ดึง stores relation
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...result } = user;
    return result;
  }

  // 1. ขอ Reset Password
  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    
    // ✅ Security: ไม่บอกว่า email ไม่มีในระบบ (ป้องกัน email enumeration)
    if (!user) {
      return {
        message: 'หากอีเมลนี้มีในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้',
      };
    }

    // ✅ Rate limiting: ตรวจสอบว่ามี token ที่ยังไม่หมดอายุอยู่หรือไม่
    if (user.resetPasswordToken && user.resetPasswordExpires && user.resetPasswordExpires > new Date()) {
      const minutesLeft = Math.ceil((user.resetPasswordExpires.getTime() - Date.now()) / 60000);
      throw new BadRequestException(
        `คุณได้ขอรีเซ็ตรหัสผ่านไปแล้ว กรุณารอ ${minutesLeft} นาที หรือตรวจสอบอีเมลของคุณ`
      );
    }

    // สร้าง Token 32 ตัวอักษร
    const token = randomBytes(32).toString('hex');

    // บันทึก Token ลง DB (หมดอายุใน 1 ชม.)
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 ชั่วโมง
    await this.userRepository.save(user);

    // ส่งอีเมล
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'รีเซ็ตรหัสผ่าน - GTXShop',
        template: './reset-password',
        context: {
          token,
          name: user.name || 'ผู้ใช้',
          expiresIn: '1 ชั่วโมง',
        },
      });
    } catch (error) {
      console.error('Email sending error:', error);
      throw new BadRequestException('ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง');
    }

    return { message: 'ส่งอีเมลรีเซ็ตรหัสผ่านเรียบร้อยแล้ว' };
  }

  // 2. ตั้งรหัสใหม่
  async resetPassword(token: string, newPassword: string) {
    // หา User ที่มี Token นี้ และยังไม่หมดอายุ
    const user = await this.userRepository.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Token ไม่ถูกต้อง หรือหมดอายุแล้ว');
    }

    // Hash รหัสใหม่
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // ล้าง Token ทิ้ง
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.userRepository.save(user);

    return { message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่' };
  }

  // ✅ เพิ่มฟังก์ชันนี้: ล็อกอินด้วย Google
  async googleLogin(token: string) {
    try {
      // 1. ตรวจสอบ Token กับ Google Server
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      // 2. ได้ข้อมูล User มาแล้ว
      const payload = ticket.getPayload();
      if (!payload) {
        throw new BadRequestException('Invalid Google Token');
      }

      const email = payload.email;
      const googleId = payload.sub;
      const name = payload.name || email?.split('@')[0] || 'User';
      const picture = payload.picture;

      if (!email) {
        throw new BadRequestException('Email not provided by Google');
      }

      // 3. เช็คว่ามี User นี้ในระบบไหม?
      let user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        // 3.1 ถ้าไม่มี -> สมัครสมาชิกให้อัตโนมัติ
        user = this.userRepository.create({
          email,
          name,
          googleId,
          role: 'user',
          password: '', // ไม่ต้องมีรหัสผ่าน
          picture: picture || null,
        });
        await this.userRepository.save(user);
      } else {
        // 3.2 ถ้ามีแล้ว -> อัปเดต googleId (เผื่อ User เก่าพึ่งมาเชื่อม)
        if (!user.googleId) {
          user.googleId = googleId;
          if (picture && !user.picture) {
            user.picture = picture;
          }
          await this.userRepository.save(user);
        }
      }

      // 4. สร้าง JWT Token ของระบบเรา ส่งกลับไปให้ App
      const payloadJwt = {
        email: user.email,
        sub: user.id,
        role: user.role,
      };

      return {
        access_token: this.jwtService.sign(payloadJwt),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          picture: user.picture,
        },
      };
    } catch (error) {
      console.error('Google login error:', error);
      throw new BadRequestException('Invalid Google Token');
    }
  }

  // ✅ ฟังก์ชันล็อกอินด้วย Facebook
  async facebookLogin(accessToken: string) {
    try {
      // 1. ยิงไปขอข้อมูล User จาก Facebook (ตรวจสอบ Token ไปในตัว)
      // หมายเหตุ: Facebook ไม่รองรับ scope 'email' อีกต่อไป แต่ยังสามารถขอ email ได้ถ้า user ให้สิทธิ์
      // ถ้าไม่ได้ email มา จะใช้ facebookId สร้าง email แทน
      const { data } = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`,
      );

      const { id: facebookId, name, email, picture } = data;

      if (!facebookId) {
        throw new BadRequestException('Invalid Facebook Token');
      }

      // 2. เช็คว่ามี User นี้ในระบบเราไหม?
      let user = await this.userRepository.findOne({
        where: [
          { facebookId }, // หาจาก Facebook ID ก่อน
          { email: email || 'NO_EMAIL' }, // ถ้าไม่เจอ หาจาก Email (กันเหนียวเผื่อ FB ไม่ส่ง email มา)
        ],
      });

      if (!user) {
        // 3.1 ถ้าไม่มี -> สร้างใหม่
        user = this.userRepository.create({
          email: email || `fb_${facebookId}@gtxshop.com`, // กรณี Facebook ไม่ให้ email มา (บางคนใช้เบอร์สมัคร)
          name: name || `Facebook User ${facebookId}`,
          facebookId,
          role: 'user',
          password: '', // ไม่ต้องมีรหัสผ่าน
          picture: picture?.data?.url || null, // ถ้ามี field เก็บรูป
        });
        await this.userRepository.save(user);
      } else {
        // 3.2 ถ้ามีแล้ว -> อัปเดต facebookId
        if (!user.facebookId) {
          user.facebookId = facebookId;
          if (picture?.data?.url && !user.picture) {
            user.picture = picture.data.url;
          }
          await this.userRepository.save(user);
        }
      }

      // 4. สร้าง JWT Token ส่งกลับไป
      const payloadJwt = {
        email: user.email,
        sub: user.id,
        role: user.role,
      };

      return {
        access_token: this.jwtService.sign(payloadJwt),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          picture: user.picture,
        },
      };
    } catch (error) {
      console.error('Facebook Login Error:', error.response?.data || error.message);
      throw new BadRequestException('Invalid Facebook Token');
    }
  }
}

