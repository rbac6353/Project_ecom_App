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
import { OrdersService } from './orders.service';
import { InvoiceService } from './invoice.service'; // ✅ Import InvoiceService
import { UsersService } from '../users/users.service';
import { StoresService } from '../stores/stores.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service'; // ✅ Import CloudinaryService
import { ShipmentsService } from '../shipments/shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

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
  ) { }

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

  // ✅ ลูกค้าขอคืนเงิน
  @Post(':id/refund')
  requestRefund(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.ordersService.requestRefund(+id, req.user.id, body.reason);
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadSlip(
    @Param('id') id: string,
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('กรุณาแนบไฟล์สลิป');
    }

    try {
      // 1. อัปโหลดรูปสลิปขึ้น Cloudinary
      const uploadRes = await this.cloudinaryService.uploadImage(file);

      // 2. อัปเดตออเดอร์ (เปลี่ยนสถานะเป็น VERIFYING)
      return this.ordersService.updateSlip(+id, req.user.id, uploadRes.secure_url);
    } catch (error) {
      console.error('Error uploading slip:', error);
      throw new BadRequestException('ไม่สามารถอัปโหลดสลิปได้');
    }
  }

  // ✅ API แอดมินกดยืนยันยอดเงิน
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/confirm-payment')
  async confirmPayment(@Param('id') id: string) {
    return this.ordersService.confirmPayment(+id);
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

