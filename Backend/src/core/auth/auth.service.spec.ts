import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { Repository } from 'typeorm';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '@core/database/entities';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let mailerService: MailerService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    mailerService = module.get<MailerService>(MailerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Test User',
        role: 'user',
        enabled: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBeUndefined(); // Password should be excluded
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('notfound@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: await bcrypt.hash('correctpassword', 10),
        enabled: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when user is disabled', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        enabled: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.validateUser('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const email = 'newuser@example.com';
      const password = 'password123';
      const name = 'New User';

      mockUserRepository.findOne.mockResolvedValue(null); // No existing user
      mockUserRepository.create.mockReturnValue({
        email,
        password: 'hashedPassword',
        name,
        role: 'user',
        isEmailVerified: false,
        verificationToken: '123456',
      });
      mockUserRepository.save.mockResolvedValue({
        id: 1,
        email,
        name,
        role: 'user',
        isEmailVerified: false,
        verificationToken: '123456',
      });
      mockMailerService.sendMail.mockResolvedValue(true);

      const result = await service.register(email, password, name);

      expect(result).toBeDefined();
      expect(result.message).toContain('สมัครสมาชิกสำเร็จ');
      expect(result.email).toBe(email);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockMailerService.sendMail).toHaveBeenCalled();
    });

    it('should throw BadRequestException when email already exists', async () => {
      const existingUser = {
        id: 1,
        email: 'existing@example.com',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await expect(
        service.register('existing@example.com', 'password123', 'User'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const mockUser = {
        id: 1,
        email,
        name: 'Test User',
        role: 'user',
        isEmailVerified: false,
        verificationToken: otp,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        isEmailVerified: true,
        verificationToken: null,
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.verifyEmail(email, otp);

      expect(result).toBeDefined();
      expect(result.message).toContain('ยืนยันอีเมลเรียบร้อย');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.verifyEmail('notfound@example.com', '123456'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when email already verified', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        isEmailVerified: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.verifyEmail('test@example.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OTP is incorrect', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        isEmailVerified: false,
        verificationToken: '123456',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.verifyEmail('test@example.com', 'wrongotp'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    it('should send reset password email successfully', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 1,
        email,
        name: 'Test User',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        resetPasswordToken: 'mock-token',
        resetPasswordExpires: new Date(),
      });
      mockMailerService.sendMail.mockResolvedValue(true);

      const result = await service.forgotPassword(email);

      expect(result).toBeDefined();
      expect(result.message).toContain('ส่งอีเมลรีเซ็ตรหัสผ่าน');
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockMailerService.sendMail).toHaveBeenCalled();
    });

    it('should not reveal if email exists (security)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('notfound@example.com');

      expect(result).toBeDefined();
      expect(result.message).toContain('หากอีเมลนี้มีในระบบ');
    });
  });
});
