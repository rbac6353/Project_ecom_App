import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '@core/auth';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';

@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) { }

  /**
   * GET /shipments/tasks?type=ACTIVE|HISTORY
   * ใช้ใน Dashboard ของไรเดอร์: ดูงานที่ต้องทำทั้งหมด / ประวัติ
   */
  @Get('tasks')
  getMyTasks(
    @Request() req,
    @Query('type') type?: 'ACTIVE' | 'HISTORY',
  ) {
    // หมายเหตุ: ใน JwtStrategy เรา return entity User ทั้งตัว => req.user.id
    const courierId = req.user.id;
    return this.shipmentsService.getMyTasks(courierId, type || 'ACTIVE');
  }

  /**
   * ✅ GET /shipments/available-jobs
   * ไรเดอร์: ดึงงานที่พร้อมรับ (PROCESSING orders ที่มี Shipment WAITING_PICKUP)
   */
  @Get('available-jobs')
  getAvailableJobs() {
    return this.shipmentsService.getAvailableJobs();
  }

  /**
   * ✅ GET /shipments/my-active-jobs
   * ไรเดอร์: ดึงงานที่ตัวเองรับแล้ว (SHIPPED, OUT_FOR_DELIVERY)
   */
  @Get('my-active-jobs')
  getMyActiveJobs(@Request() req) {
    const courierId = req.user.id;
    return this.shipmentsService.getMyActiveJobs(courierId);
  }

  /**
   * GET /shipments/orders/:id/preview
   * ใช้ตอนไรเดอร์สแกน QR/บาร์โค้ด แล้วต้องการดูข้อมูลพัสดุก่อนกดรับ/ส่ง
   */
  @Get('orders/:id/preview')
  getOrderPreview(@Param('id') id: string) {
    return this.shipmentsService.getOrderPreviewByOrderId(id); // ✅ ส่ง string ไปให้ service จัดการต่อ
  }

  /**
   * ✅ PATCH /shipments/:id/accept
   * ไรเดอร์กด "รับงาน" - จองงานแต่ยังไม่ได้ไปรับของ (สถานะยังเป็น WAITING_PICKUP)
   */
  @Patch(':id/accept')
  acceptJob(@Param('id') id: string, @Request() req) {
    const courierId = req.user.id;
    return this.shipmentsService.acceptJob(+id, courierId);
  }

  /**
   * PATCH /shipments/:id/pickup
   * ไรเดอร์สแกน QR ที่ร้านเพื่อยืนยันรับของจริง (เปลี่ยนเป็น IN_TRANSIT)
   */
  @Patch(':id/pickup')
  pickup(@Param('id') id: string, @Request() req) {
    const courierId = req.user.id;
    return this.shipmentsService.pickupPackage(+id, courierId);
  }

  /**
   * PATCH /shipments/:id/out-for-delivery
   * ไรเดอร์เริ่มนำจ่ายพัสดุ
   */
  @Patch(':id/out-for-delivery')
  outForDelivery(@Param('id') id: string, @Request() req) {
    const courierId = req.user.id;
    return this.shipmentsService.outForDelivery(+id, courierId);
  }

  /**
   * PATCH /shipments/:id/complete
   * ไรเดอร์ส่งสำเร็จ พร้อมรูปหลักฐาน/สถานะ COD/ลายเซ็น/พิกัด
   */
  @Patch(':id/complete')
  complete(
    @Param('id') id: string,
    @Body() body: {
      proofImage?: string;
      collectedCod?: boolean;
      signatureImage?: string;
      location?: { lat: number; lng: number };
    },
    @Request() req,
  ) {
    const courierId = req.user.id;
    return this.shipmentsService.completeDelivery(+id, courierId, body);
  }

  /**
   * ✅ PATCH /shipments/:id/status
   * ไรเดอร์: อัปเดตสถานะ Shipment พร้อมหลักฐาน (ถ้ามี)
   */
  @Patch(':id/status')
  updateShipmentStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    const courierId = req.user.id;
    return this.shipmentsService.updateShipmentStatus(
      +id,
      courierId,
      dto.status,
      {
        proofImage: dto.proofImage,
        signatureImage: dto.signatureImage,
        location: dto.location,
        collectedCod: dto.collectedCod,
        failedReason: dto.failedReason,
      },
    );
  }

  /**
   * ✅ GET /shipments/orders/:orderId/detail
   * ลูกค้า: ดึงข้อมูล shipment detail พร้อม proofImage และ signatureImage
   * 
   * ⚠️ หมายเหตุ: ถ้ายังไม่มี shipment (ออเดอร์ยังไม่ถึงขั้นตอนจัดส่ง) จะ return null
   */
  @Get('orders/:orderId/detail')
  async getShipmentByOrderId(@Param('orderId') orderId: string, @Request() req) {
    const shipment = await this.shipmentsService.getShipmentByOrderId(+orderId, req.user.id);

    // ✅ ถ้าไม่มี shipment ให้ return null แทน throw error
    if (!shipment) {
      return null;
    }

    return shipment;
  }
}


