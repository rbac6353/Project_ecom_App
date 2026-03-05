import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, ProductOnOrder, Cart, ProductOnCart, Coupon, User, Product } from '@core/database/entities';
import { NotificationsService } from '@modules/notification/notifications.service';
import { CouponsService } from '@modules/coupon/coupons.service';
import { NotificationSettingsService } from '@modules/notification-setting/notification-settings.service';
import { StoresService } from '@modules/store/stores.service';
import { ShipmentsService } from '@modules/shipment/shipments.service';
import { MailerService } from '@nestjs-modules/mailer';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: any;
  let dataSource: any;

  const mockOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        decrement: jest.fn(),
        delete: jest.fn(),
      },
    })),
  };

  const mockNotificationsService = {
    sendAndSave: jest.fn(),
  };

  const mockCouponsService = {
    validateCoupon: jest.fn(),
  };

  const mockNotificationSettingsService = {
    shouldSendNotification: jest.fn(),
  };

  const mockStoresService = {
    findOne: jest.fn(),
  };

  const mockShipmentsService = {
    create: jest.fn(),
  };

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(ProductOnOrder),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Cart),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ProductOnCart),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Coupon),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: CouponsService,
          useValue: mockCouponsService,
        },
        {
          provide: NotificationSettingsService,
          useValue: mockNotificationSettingsService,
        },
        {
          provide: StoresService,
          useValue: mockStoresService,
        },
        {
          provide: ShipmentsService,
          useValue: mockShipmentsService,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return order when found', async () => {
      const mockOrder = {
        id: 1,
        cartTotal: 1000,
        orderStatus: 'PENDING',
        orderedById: 1,
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: expect.any(Array),
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestRefund', () => {
    it('should throw BadRequestException when order status is not COMPLETED', async () => {
      const mockOrder = {
        id: 1,
        orderStatus: 'PENDING',
        orderedById: 1,
        refundStatus: 'NONE',
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(
        service.requestRefund(1, 1, 'Product damaged'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when refund already requested', async () => {
      const mockOrder = {
        id: 1,
        orderStatus: 'COMPLETED',
        orderedById: 1,
        refundStatus: 'REQUESTED',
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(
        service.requestRefund(1, 1, 'Product damaged'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not order owner', async () => {
      const mockOrder = {
        id: 1,
        orderStatus: 'COMPLETED',
        orderedById: 1,
        refundStatus: 'NONE',
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(
        service.requestRefund(1, 999, 'Product damaged'), // Different user ID
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
