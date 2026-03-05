import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler'; // ✅ Import SkipThrottle
import { OrdersService } from './orders.service';
import { InvoiceService } from './invoice.service'; // ✅ Import InvoiceService
import { UsersService } from '@modules/user/users.service';
import { StoresService } from '@modules/store/stores.service';
import { CloudinaryService } from '@modules/storage/cloudinary.service';
import { ShipmentsService } from '@modules/shipment/shipments.service';
import { PaymentsService } from '@modules/payment/payments.service'; // ✅ Import PaymentsService
import { OrderStatus } from '@core/database/entities'; // ✅ Import OrderStatus enum
import { JwtAuthGuard, RolesGuard } from '@core/auth';
import { Roles } from '@core/auth/decorators/roles.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private invoiceService: InvoiceService, // ✅ Inject InvoiceService
    private usersService: UsersService, // ✅ Inject UsersService
    private storesService: StoresService, // ✅ Inject StoresService
    private cloudinaryService: CloudinaryService, // ✅ Inject CloudinaryService
    private shipmentsService: ShipmentsService,
    private paymentsService: PaymentsService, // ✅ Inject PaymentsService
  ) {}

  @Post()
  createOrder(
    @Request() req,
    @Body()
    body: {
      shippingAddress: string;
      shippingPhone: string;
      couponCode?: string;
      paymentMethod?: string; // ✅ เพิ่ม paymentMethod
    },
  ) {
    return this.ordersService.createOrder(
      req.user.id,
      body.shippingAddress,
      body.shippingPhone,
      body.couponCode,
      body.paymentMethod || 'STRIPE', // ✅ Default เป็น STRIPE
    );
  }

  // ✅ API สำหรับ Frontend เรียกดูค่าส่งก่อนกดซื้อ (Preview)
  @UseGuards(JwtAuthGuard)
  @Post('preview-shipping')
  previewShipping(@Body() body: { items: any[] }) {
    // body.items ควรหน้าตาเหมือน items ใน cart [{ product: { price: 100 }, count: 2 }, ...]
    return this.ordersService.getShippingPreview(body.items || []);
  }

  @Get()
  findAll(@Request() req) {
    return this.ordersService.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) // ✅ เพิ่ม RolesGuard
  @Get('admin/all')
  findAllAdmin() {
    return this.ordersService.findAllForAdmin();
  }

  // ✅ Endpoint สำหรับ Seller ดึงออเดอร์ของร้านตัวเอง
  @Get('seller/all')
  findAllSeller(@Request() req) {
    return this.ordersService.findAllForSeller(req.user.id);
  }

  @SkipThrottle() // ✅ ยกเว้น Rate Limit สำหรับการดูรายละเอียดออเดอร์ (ใช้สำหรับ Polling)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Get(':id/tracking')
  getTracking(@Param('id') id: string) {
    return this.shipmentsService.getTrackingTimeline(+id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status: string;
      trackingNumber?: string;
      provider?: string;
    },
  ) {
    // ส่ง trackingData เป็น object หรือ undefined
    const trackingData =
      body.trackingNumber && body.provider
        ? {
            trackingNumber: body.trackingNumber,
            provider: body.provider,
          }
        : undefined;

    return this.ordersService.updateStatus(+id, body.status, trackingData);
  }

  // ✅ เพิ่ม API นี้
  @Get('stats/dashboard') // URL: /orders/stats/dashboard
  getDashboardStats() {
    return this.ordersService.getStoreStats();
  }

  // ✅ Platform Stats (Admin Only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/platform-stats')
  async getPlatformStats() {
    // 1. ดึงยอดขายและออเดอร์ (จาก OrdersService)
    const orderStats = await this.ordersService.getPlatformStats();

    // 2. ดึงสถิติ User
    const userStats = await this.usersService.getStats();

    // 3. ดึงสถิติ Store
    const storeStats = await this.storesService.getStats();

    // 4. รวมร่างส่งกลับไป
    return {
      totalRevenue: orderStats.totalRevenue || 0,
      totalOrders: orderStats.totalOrders || 0,
      completedOrders: orderStats.completedOrders || 0,
      totalUsers: userStats.totalUsers || 0,
      bannedUsers: userStats.bannedUsers || 0,
      totalStores: storeStats.totalStores || 0,
      pendingStores: storeStats.pendingStores || 0,
    };
  }

  // ✅ Time-based Stats สำหรับกราฟ (Admin Only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/time-stats')
  async getTimeStats(@Query('days') days: string) {
    const daysNum = parseInt(days) || 7; // Default 7 วัน
    return this.ordersService.getTimeBasedStats(daysNum);
  }

  // ✅ Analytics: Top Selling Products (Admin Only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/analytics/top-products')
  async getTopProducts(@Query('limit') limit: string, @Query('days') days: string) {
    const limitNum = parseInt(limit) || 10;
    const daysNum = days ? parseInt(days) : undefined;
    return this.ordersService.getTopProducts(limitNum, daysNum);
  }

  // ✅ Analytics: Sales by Category (Admin Only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/analytics/sales-by-category')
  async getSalesByCategory(@Query('days') days: string) {
    const daysNum = days ? parseInt(days) : undefined;
    return this.ordersService.getSalesByCategory(daysNum);
  }

  // ✅ Analytics: Revenue by Period (Admin Only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/analytics/revenue-by-period')
  async getRevenueByPeriod(
    @Query('period') period: 'daily' | 'weekly' | 'monthly',
    @Query('days') days: string,
  ) {
    const periodType = period || 'daily';
    const daysNum = parseInt(days) || 30;
    return this.ordersService.getRevenueByPeriod(periodType, daysNum);
  }

  // ✅ ลูกค้าขอคืนเงิน
  @Post(':id/refund')
  requestRefund(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.ordersService.requestRefund(+id, req.user.id, body.reason);
  }

  // ✅ Smart Cancel Order (ลูกค้ากดยกเลิกเอง)
  @Post(':id/cancel')
  cancelOrder(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.ordersService.cancelOrder(+id, req.user.id, body?.reason);
  }

  // ✅ ร้านค้าตัดสินใจ (Approve/Reject) - ต้องเป็น Seller หรือ Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/refund/decide')
  decideRefund(
    @Param('id') id: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED' },
  ) {
    return this.ordersService.decideRefund(+id, body.decision);
  }

  // ✅ Manual Refund to Wallet (Admin Only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @Post(':id/refund/wallet')
  async refundToWallet(@Param('id') id: string) {
    return this.ordersService.refundToWallet(+id);
  }

  // ✅ ดาวน์โหลดใบเสร็จรับเงิน (PDF)
  @Get(':id/invoice')
  async downloadInvoice(@Param('id') id: string, @Res() res: Response) {
    const order = await this.ordersService.findOne(+id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // สร้าง PDF
    const buffer = await this.invoiceService.generateInvoice(order);

    // ตั้งค่า Header ให้ Browser/App รู้ว่าเป็นไฟล์ PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${id}.pdf`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }

  // ✅ API อัปโหลดสลิปการโอนเงิน
  @UseGuards(JwtAuthGuard)
  @Post(':id/slip')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new BadRequestException('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadSlip(
    @Param('id') id: string,
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('กรุณาแนบไฟล์สลิป');
    }

    try {
      // 1. ค้นหา Order จาก orderId
      const order = await this.ordersService.findOne(+id);

      // ตรวจสอบว่าเป็นเจ้าของออเดอร์
      if (order.orderedById !== req.user.id) {
        throw new BadRequestException('คุณไม่มีสิทธิ์แก้ไขออเดอร์นี้');
      }

      // 2. ตรวจสอบว่า Order status ต้องเป็น PENDING หรือ VERIFYING
      if (order.orderStatus === OrderStatus.CANCELLED) {
        throw new BadRequestException(
          'ออเดอร์นี้ถูกยกเลิกแล้วเนื่องจากหมดเวลาชำระเงิน กรุณาสร้างออเดอร์ใหม่',
        );
      }
      
      if (order.orderStatus !== OrderStatus.PENDING && order.orderStatus !== OrderStatus.VERIFYING) {
        throw new BadRequestException(
          `ออเดอร์นี้ไม่สามารถอัปโหลดสลิปได้ (สถานะปัจจุบัน: ${order.orderStatus})`,
        );
      }

      // 3. อัปโหลดรูปสลิปขึ้น Cloudinary
      const uploadRes = await this.cloudinaryService.uploadImage(file);

      // 4. เรียก verifySlip เพื่อตรวจสอบสลิปทันที
      // ใช้ cartTotal เป็นยอดเงินที่ต้องตรวจสอบ (รวมส่วนลดแล้ว)
      const orderTotal = parseFloat(order.cartTotal.toString()) - parseFloat((order.discountAmount || 0).toString());
      
      const verificationResult = await this.paymentsService.verifySlip(
        file.buffer,
        orderTotal,
      );

      // ✅ 5. Handle Success: ตรวจสอบผ่าน
      if (verificationResult.success) {
        // อัปเดตออเดอร์: บันทึก URL สลิปและเปลี่ยนสถานะเป็น PENDING_CONFIRMATION
        // ⚠️ ใช้ Transaction และ Pessimistic Lock เพื่อป้องกัน Race Condition
        const slipReference =
          verificationResult.details?.reference ||
          verificationResult.details?.transactionId ||
          verificationResult.details?.transferId ||
          null;

        const updatedOrder = await this.ordersService.updateSlipWithVerification(
          +id,
          req.user.id,
          uploadRes.secure_url,
          verificationResult.details,
          slipReference,
        );

        return {
          message: 'ตรวจสอบสลิปและชำระเงินสำเร็จ',
          order: updatedOrder,
          verification: verificationResult.details,
        };
      }

      // ✅ 6. Handle API Error (Fallback): EasySlip API ล่ม/Timeout
      if (verificationResult.isApiError === true) {
        // ✅ Fallback Logic: บันทึกสลิปและตั้งสถานะ VERIFYING (รอเจ้าหน้าที่ตรวจสอบ)
        // ห้าม throw error ให้ User เพื่อไม่ให้ Block การทำรายการ
        const updatedOrder = await this.ordersService.updateSlipWithoutVerification(
          +id,
          req.user.id,
          uploadRes.secure_url,
        );

        return {
          message:
            'อัปโหลดสลิปสำเร็จ ระบบกำลังตรวจสอบสลิป กรุณารอเจ้าหน้าที่ตรวจสอบ',
          order: updatedOrder,
          requiresManualVerification: true, // ✅ Flag เพื่อบอก Frontend ว่าเป็น Manual Verification
        };
      }

      // ✅ 7. Handle Verification Failed: ตรวจสอบแล้วแต่ไม่ผ่าน (สลิปปลอม/ยอดไม่ตรง)
      // ถ้า success === false และ !isApiError แสดงว่า Verification Failed
      throw new BadRequestException(
        verificationResult.error ||
          'ไม่สามารถตรวจสอบสลิปได้ กรุณาตรวจสอบสลิปอีกครั้ง',
      );
    } catch (error: any) {
      console.error('Error uploading and verifying slip:', error);
      
      // ✅ Handle duplicate key errors จาก database unique constraints
      if (error.code === 'ER_DUP_ENTRY' || error.code === 1062) {
        // MySQL duplicate entry error
        throw new BadRequestException('สลิปนี้ถูกใช้งานไปแล้ว');
      }
      
      // ถ้าเป็น BadRequestException จาก verifySlip หรือ updateSlipWithVerification ให้ throw ต่อ
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('ไม่สามารถอัปโหลดและตรวจสอบสลิปได้');
    }
  }

  // ✅ API แอดมินกดยืนยันยอดเงิน
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @Patch(':id/confirm-payment')
  async confirmPayment(@Param('id') id: string) {
    return this.ordersService.confirmPayment(+id);
  }

  // ✅ Admin: อนุมัติสลิป (Manual Verification)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @Patch(':id/admin/approve-slip')
  async approveSlip(@Param('id') id: string, @Request() req) {
    return this.ordersService.approveSlip(+id, req.user.id);
  }

  // ✅ Admin: ปฏิเสธสลิป (Manual Verification)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @Patch(':id/admin/reject-slip')
  async rejectSlip(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { reason: string },
  ) {
    return this.ordersService.rejectSlip(+id, req.user.id, body.reason);
  }

  // ✅ Admin: ดึงออเดอร์ที่สถานะ VERIFYING (รอตรวจสอบ)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @Get('admin/verifying')
  findAllVerifying() {
    return this.ordersService.findAllVerifying();
  }

  // ✅ ลูกค้ายืนยันรับสินค้า (ปิดออเดอร์)
  @Patch(':id/complete')
  completeOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.completeOrder(+id, req.user.id);
  }

  // ✅ Alias เพิ่มเติม: ลูกค้ากด "ฉันได้รับสินค้าแล้ว" (ชื่อ endpoint ตาม UX)
  @Patch(':id/confirm-received')
  confirmReceived(@Param('id') id: string, @Request() req) {
    return this.ordersService.completeOrder(+id, req.user.id);
  }

  // ✅ ซื้ออีกครั้งจากออเดอร์เดิม (ส่งรายการสินค้าให้ frontend ไปเติมตะกร้า)
  @Post(':id/buy-again')
  buyAgain(@Param('id') id: string, @Request() req) {
    return this.ordersService.buyAgain(+id, req.user.id);
  }
}

