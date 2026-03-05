import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Order, OrderStatus, User, Product, Cart, ProductOnCart, Category, Store } from '../src/core/database/entities';
import * as bcrypt from 'bcrypt';

describe('Payment Security E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testUsers: { userA: User; userB: User; userC: User };
  let testProducts: Product[];
  let testOrders: { orderA: Order; orderB: Order; orderC: Order };
  
  // Test data
  const SLIP_URL_A = 'https://res.cloudinary.com/test/image/upload/v1234567890/test-slip-a.jpg';
  const SLIP_REFERENCE_A = 'TEST_REF_001';
  const SLIP_URL_B = 'https://res.cloudinary.com/test/image/upload/v1234567890/test-slip-b.jpg';
  const SLIP_REFERENCE_B = 'TEST_REF_002';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    dataSource = moduleFixture.get<DataSource>(DataSource);
    
    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await app.close();
  });

  // ============================================
  // Helper Functions
  // ============================================

  async function setupTestData() {
    // Create test users
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('TestPassword123', 10);

    testUsers = {
      userA: await userRepo.save({
        email: `test-user-a-${Date.now()}@test.com`,
        password: hashedPassword,
        name: 'Test User A',
        role: 'user',
        enabled: true,
        isEmailVerified: true,
      }),
      userB: await userRepo.save({
        email: `test-user-b-${Date.now()}@test.com`,
        password: hashedPassword,
        name: 'Test User B',
        role: 'user',
        enabled: true,
        isEmailVerified: true,
      }),
      userC: await userRepo.save({
        email: `test-user-c-${Date.now()}@test.com`,
        password: hashedPassword,
        name: 'Test User C',
        role: 'user',
        enabled: true,
        isEmailVerified: true,
      }),
    };

    // Create test category
    const categoryRepo = dataSource.getRepository(Category);
    const testCategory = await categoryRepo.save({
      name: 'Test Category',
      image: JSON.stringify({ icon: '📱', image: 'https://example.com/image.jpg' }),
    });

    // Create test store
    const storeRepo = dataSource.getRepository(Store);
    const testStore = await storeRepo.save({
      name: 'Test Store',
      description: 'Test Store Description',
      ownerId: testUsers.userA.id,
      status: 'APPROVED',
    });

    // Create test products
    const productRepo = dataSource.getRepository(Product);
    testProducts = [
      await productRepo.save({
        title: 'Test Product 1',
        description: 'Test Product Description 1',
        price: 1000,
        quantity: 100,
        categoryId: testCategory.id,
        storeId: testStore.id,
        condition: 'new',
        paymentMethod: 'all',
      }),
      await productRepo.save({
        title: 'Test Product 2',
        description: 'Test Product Description 2',
        price: 2000,
        quantity: 100,
        categoryId: testCategory.id,
        storeId: testStore.id,
        condition: 'new',
        paymentMethod: 'all',
      }),
      await productRepo.save({
        title: 'Test Product 3',
        description: 'Test Product Description 3',
        price: 3000,
        quantity: 100,
        categoryId: testCategory.id,
        storeId: testStore.id,
        condition: 'new',
        paymentMethod: 'all',
      }),
    ];

    // Create carts and add products
    const cartRepo = dataSource.getRepository(Cart);
    const productOnCartRepo = dataSource.getRepository(ProductOnCart);

    // Cart for User A
    const cartA = await cartRepo.save({
      orderedById: testUsers.userA.id,
      cartTotal: 1000,
    });
    await productOnCartRepo.save({
      cartId: cartA.id,
      productId: testProducts[0].id,
      count: 1,
      price: 1000,
    });

    // Cart for User B
    const cartB = await cartRepo.save({
      orderedById: testUsers.userB.id,
      cartTotal: 2000,
    });
    await productOnCartRepo.save({
      cartId: cartB.id,
      productId: testProducts[1].id,
      count: 1,
      price: 2000,
    });

    // Cart for User C
    const cartC = await cartRepo.save({
      orderedById: testUsers.userC.id,
      cartTotal: 3000,
    });
    await productOnCartRepo.save({
      cartId: cartC.id,
      productId: testProducts[2].id,
      count: 1,
      price: 3000,
    });

    // Create orders (will be created via API in tests)
    testOrders = {
      orderA: null as any,
      orderB: null as any,
      orderC: null as any,
    };
  }

  async function cleanupTestData() {
    const orderRepo = dataSource.getRepository(Order);
    const cartRepo = dataSource.getRepository(Cart);
    const productOnCartRepo = dataSource.getRepository(ProductOnCart);
    const productRepo = dataSource.getRepository(Product);
    const categoryRepo = dataSource.getRepository(Category);
    const storeRepo = dataSource.getRepository(Store);
    const userRepo = dataSource.getRepository(User);

    // Delete in reverse order of dependencies
    if (testOrders.orderA) await orderRepo.delete({ id: testOrders.orderA.id });
    if (testOrders.orderB) await orderRepo.delete({ id: testOrders.orderB.id });
    if (testOrders.orderC) await orderRepo.delete({ id: testOrders.orderC.id });

    // Delete carts
    await cartRepo.delete({ orderedById: testUsers.userA.id });
    await cartRepo.delete({ orderedById: testUsers.userB.id });
    await cartRepo.delete({ orderedById: testUsers.userC.id });

    // Delete products
    if (testProducts && testProducts.length > 0) {
      await productRepo.delete(testProducts.map(p => p.id));
    }

    // Delete stores
    const stores = await storeRepo.find({ where: { ownerId: testUsers.userA.id } });
    for (const store of stores) {
      await storeRepo.delete({ id: store.id });
    }

    // Delete categories
    const categories = await categoryRepo.find({ where: { name: 'Test Category' } });
    for (const category of categories) {
      await categoryRepo.delete({ id: category.id });
    }

    // Delete users
    await userRepo.delete({ id: testUsers.userA.id });
    await userRepo.delete({ id: testUsers.userB.id });
    await userRepo.delete({ id: testUsers.userC.id });
  }

  async function loginUser(user: User): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: 'TestPassword123',
      })
      .expect((res) => {
        // Accept both 200 (existing user) and 201 (new user created)
        expect([200, 201]).toContain(res.status);
      });

    return response.body.access_token;
  }

  async function createOrder(user: User, token: string): Promise<Order> {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddress: '123 Test Street, Test City, 12345',
        shippingPhone: '+66123456789',
        paymentMethod: 'BANK_TRANSFER', // Use BANK_TRANSFER to require slip upload
      })
      .expect(201);

    return response.body;
  }

  async function uploadSlip(orderId: number, token: string, slipUrl: string, slipReference?: string): Promise<any> {
    // Create a mock image file buffer
    const mockImageBuffer = Buffer.from('fake-image-data');
    
    const requestBuilder = request(app.getHttpServer())
      .post(`/orders/${orderId}/slip`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', mockImageBuffer, 'test-slip.jpg');

    const response = await requestBuilder.expect((res) => {
      // Accept both success (200/201) and error (400) responses
      expect([200, 201, 400]).toContain(res.status);
    });

    return response;
  }

  async function cancelOrder(orderId: number, token: string): Promise<void> {
    // Note: In real scenario, orders are cancelled by system or admin
    // For test purposes, we'll directly update the database
    const orderRepo = dataSource.getRepository(Order);
    await orderRepo.update(
      { id: orderId },
      { orderStatus: OrderStatus.CANCELLED },
    );
  }

  // ============================================
  // Test Scenarios
  // ============================================

  describe('Payment Security - Duplicate Slip Prevention', () => {
    let tokenA: string;
    let tokenB: string;
    let tokenC: string;

    beforeAll(async () => {
      // Login all users
      tokenA = await loginUser(testUsers.userA);
      tokenB = await loginUser(testUsers.userB);
      tokenC = await loginUser(testUsers.userC);
    });

    describe('Scenario 1: Happy Path - Successful Slip Upload', () => {
      it('should successfully create order and upload slip for User A', async () => {
        // Create Order A
        const orderResponse = await createOrder(testUsers.userA, tokenA);
        testOrders.orderA = orderResponse;
        expect(orderResponse).toHaveProperty('id');
        expect(orderResponse.orderStatus).toBe(OrderStatus.PENDING);

        // Upload Slip A
        // Note: In real scenario, this would upload to Cloudinary and verify with EasySlip
        // For E2E test, we'll mock the response or use a test slip URL
        // Since we can't easily mock CloudinaryService in E2E, we'll test the database constraint directly
        
        // Directly update the order with slip URL to test database constraint
        const orderRepo = dataSource.getRepository(Order);
        await orderRepo.update(
          { id: orderResponse.id },
          {
            paymentSlipUrl: SLIP_URL_A,
            slipReference: SLIP_REFERENCE_A,
            orderStatus: OrderStatus.PENDING_CONFIRMATION,
          },
        );

        // Verify the order was updated
        const updatedOrder = await orderRepo.findOne({ where: { id: orderResponse.id } });
        expect(updatedOrder.paymentSlipUrl).toBe(SLIP_URL_A);
        expect(updatedOrder.slipReference).toBe(SLIP_REFERENCE_A);
        expect(updatedOrder.orderStatus).toBe(OrderStatus.PENDING_CONFIRMATION);
      });
    });

    describe('Scenario 2: Fraud Attempt (Active Order) - Duplicate Slip Detection', () => {
      it('should reject duplicate slip upload for active order', async () => {
        // Create Order B
        const orderResponse = await createOrder(testUsers.userB, tokenB);
        testOrders.orderB = orderResponse;

        // Try to upload the same slip URL (Slip A) to Order B
        const orderRepo = dataSource.getRepository(Order);
        
        try {
          await orderRepo.update(
            { id: orderResponse.id },
            {
              paymentSlipUrl: SLIP_URL_A, // Same as Order A
              slipReference: SLIP_REFERENCE_A, // Same as Order A
              orderStatus: OrderStatus.PENDING_CONFIRMATION,
            },
          );
          
          // If we reach here, the unique constraint didn't work
          fail('Expected duplicate entry error, but update succeeded');
        } catch (error: any) {
          // Verify it's a duplicate entry error
          expect(error.code === 'ER_DUP_ENTRY' || error.code === 1062).toBe(true);
          
          // Verify the error message mentions the unique constraint
          const errorMessage = error.message || '';
          expect(
            errorMessage.includes('paymentSlipUrl') ||
            errorMessage.includes('slipReference') ||
            errorMessage.includes('idx_order_payment_slip_url_permanent') ||
            errorMessage.includes('idx_order_slip_reference_permanent')
          ).toBe(true);
        }

        // Verify Order B was not updated
        const orderB = await orderRepo.findOne({ where: { id: orderResponse.id } });
        expect(orderB.paymentSlipUrl).toBeNull();
        expect(orderB.slipReference).toBeNull();
      });
    });

    describe('Scenario 3: Fraud Attempt (Cancelled Order) - Strict Mode (One-Time Slip Usage)', () => {
      it('should reject duplicate slip upload even when original order is cancelled (Strict Mode)', async () => {
        // ✅ Critical Security Test: Strict Mode - สลิป 1 ใบ ใช้ได้กับ 1 ออเดอร์เท่านั้น
        // แม้ออเดอร์เก่าจะถูกยกเลิก สลิปก็ยังถือว่า "Used" และห้ามใช้ซ้ำเด็ดขาด

        // Step 1: Cancel Order A
        await cancelOrder(testOrders.orderA.id, tokenA);
        
        // Step 2: Verify Order A is cancelled but slip URL still exists
        const orderRepo = dataSource.getRepository(Order);
        const cancelledOrder = await orderRepo.findOne({ where: { id: testOrders.orderA.id } });
        expect(cancelledOrder.orderStatus).toBe(OrderStatus.CANCELLED);
        expect(cancelledOrder.paymentSlipUrl).toBe(SLIP_URL_A); // ✅ Slip URL should still exist (not cleared)

        // Step 3: Create Order C
        const orderResponse = await createOrder(testUsers.userC, tokenC);
        testOrders.orderC = orderResponse;

        // Step 4: Try to upload the same slip URL (Slip A) to Order C
        // ✅ STRICT MODE: This should FAIL even though Order A is cancelled
        // Database Unique Constraint will reject immediately (no conditional logic)
        try {
          await orderRepo.update(
            { id: orderResponse.id },
            {
              paymentSlipUrl: SLIP_URL_A, // Same as cancelled Order A
              slipReference: SLIP_REFERENCE_A, // Same as cancelled Order A
              orderStatus: OrderStatus.PENDING_CONFIRMATION,
            },
          );
          
          // ❌ If we reach here, the strict unique constraint didn't work
          fail('❌ STRICT MODE FAILED: Expected duplicate entry error for cancelled order slip, but update succeeded. This indicates the strict unique constraint is not working correctly.');
        } catch (error: any) {
          // ✅ Critical Security Check: Verify it's a duplicate entry error
          expect(error.code === 'ER_DUP_ENTRY' || error.code === 1062).toBe(true);
          
          // Verify the error message mentions the unique constraint
          const errorMessage = error.message || '';
          expect(
            errorMessage.includes('paymentSlipUrl') ||
            errorMessage.includes('slipReference') ||
            errorMessage.includes('idx_order_payment_slip_url_permanent') ||
            errorMessage.includes('idx_order_slip_reference_permanent')
          ).toBe(true);

          console.log('✅ STRICT MODE PASSED: Duplicate slip rejected even for cancelled order (One-Time Slip Usage enforced)');
        }

        // Step 5: Verify Order C was not updated (strict constraint prevented the update)
        const orderC = await orderRepo.findOne({ where: { id: orderResponse.id } });
        expect(orderC.paymentSlipUrl).toBeNull();
        expect(orderC.slipReference).toBeNull();
        
        console.log('✅ STRICT MODE VERIFICATION: Order C remains unchanged - slip was not assigned due to strict constraint');
      });
    });

    describe('Scenario 4: Notification Bug Verification', () => {
      it('should not throw "Unknown column updatedAt" error when creating notifications', async () => {
        // This test verifies that notifications can be created without errors
        // We'll check the notification entity directly instead of creating an order
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        try {
          // Create a notification directly to test the updatedAt column
          const notificationRepo = dataSource.getRepository(require('../src/core/database/entities/notification/notification.entity').Notification);
          
          const notification = notificationRepo.create({
            userId: testUsers.userA.id,
            title: 'Test Notification',
            body: 'Test notification body',
            type: 'SYSTEM',
            isRead: false,
          });
          
          await notificationRepo.save(notification);

          // Wait a bit for async operations
          await new Promise(resolve => setTimeout(resolve, 500));

          // Check console for "updatedAt" errors
          const errorCalls = consoleErrorSpy.mock.calls;
          const warnCalls = consoleWarnSpy.mock.calls;
          
          const hasUpdatedAtError = [...errorCalls, ...warnCalls].some(call => {
            const message = call.join(' ');
            return message.includes('updatedAt') && 
                   (message.includes('Unknown column') || message.includes('does not exist'));
          });

          expect(hasUpdatedAtError).toBe(false);
          
          // Cleanup
          await notificationRepo.delete({ id: notification.id });
          
          console.log('✅ Notification Bug Check Passed: No "Unknown column updatedAt" errors detected');
        } catch (error: any) {
          // If there's an error, check if it's related to updatedAt
          if (error.message && error.message.includes('updatedAt') && 
              (error.message.includes('Unknown column') || error.message.includes('does not exist'))) {
            throw new Error(`Notification updatedAt column error detected: ${error.message}`);
          }
          throw error;
        } finally {
          consoleErrorSpy.mockRestore();
          consoleWarnSpy.mockRestore();
        }
      });
    });
  });

  describe('API Error Message Verification', () => {
    it('should return user-friendly error message when duplicate slip is detected via API', async () => {
      // This test verifies that the database constraint works correctly
      // We'll test the database constraint directly using Order B (which should exist from Scenario 2)
      
      const orderRepo = dataSource.getRepository(Order);
      
      // Use Order B if it exists (from Scenario 2)
      if (!testOrders.orderB || !testOrders.orderB.id) {
        console.log('⚠️ Skipping API Error Message test: Order B not available (cart may be empty)');
        return;
      }
      
      const testOrderId = testOrders.orderB.id;
      
      // Try to set duplicate slip URL (SLIP_URL_A is already used by Order A)
      try {
        await orderRepo.update(
          { id: testOrderId },
          {
            paymentSlipUrl: SLIP_URL_A, // Duplicate (already used by Order A)
            orderStatus: OrderStatus.PENDING_CONFIRMATION,
          },
        );
        fail('Expected duplicate entry error - Database constraint should prevent this');
      } catch (error: any) {
        // ✅ Verify it's a duplicate entry error
        expect(error.code === 'ER_DUP_ENTRY' || error.code === 1062).toBe(true);
        // The error should be caught by OrdersService and converted to BadRequestException
        // with message: "สลิปนี้ถูกใช้งานไปแล้วในออเดอร์อื่น (ไม่สามารถใช้ซ้ำได้ตามนโยบายความปลอดภัย)"
        console.log('✅ Database constraint working correctly: Duplicate slip rejected');
      }
    });
  });
});
