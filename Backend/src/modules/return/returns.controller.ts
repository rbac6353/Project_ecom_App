import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { JwtAuthGuard, RolesGuard } from '@core/auth';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';
import { OrderReturnStatus } from '@core/database/entities';
import { Roles } from '@core/auth';

@Controller()
@UseGuards(JwtAuthGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  // ===== Customer endpoints =====
  // POST /orders/:orderId/returns
  // ลูกค้าขอคืนสินค้าจากออเดอร์ของตัวเอง
  @Post('orders/:orderId/returns')
  async requestReturn(
    @Request() req,
    @Param('orderId') orderId: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returnsService.requestReturn(
      req.user.id,
      Number(orderId),
      dto,
    );
  }

  // ===== Seller endpoints =====
  // ใช้โดย "ร้านค้า" ที่มี role = seller เท่านั้น

  // GET /seller/returns
  // Seller ดูคำขอคืนสินค้าของออเดอร์ที่มีสินค้าในร้านของตัวเอง
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Get('seller/returns')
  async getSellerReturns(
    @Request() req,
    @Query('status') status?: OrderReturnStatus,
  ) {
    return this.returnsService.getSellerReturns(req.user.id, status);
  }

  // GET /seller/returns/:id
  // Seller ดูรายละเอียดคำขอคืน 1 รายการ (ต้องเป็นของร้านตัวเองเท่านั้น)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Get('seller/returns/:id')
  async getSellerReturnDetail(@Request() req, @Param('id') id: string) {
    return this.returnsService.getSellerReturnDetail(
      req.user.id,
      Number(id),
    );
  }

  // PATCH /seller/returns/:id/status
  // Seller อัปเดตสถานะคำขอคืนในขอบเขตที่กำหนด (REQUESTED → APPROVED / REJECTED / CANCELLED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Patch('seller/returns/:id/status')
  async updateSellerReturnStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateReturnStatusDto,
  ) {
    return this.returnsService.updateReturnStatusAsSeller(
      req.user.id,
      Number(id),
      dto,
    );
  }

  // GET /me/returns
  // ลูกค้าดูประวัติคำขอคืนสินค้าของตัวเองทั้งหมด
  @Get('me/returns')
  async getMyReturns(@Request() req) {
    return this.returnsService.getMyReturns(req.user.id);
  }

  // GET /orders/:orderId/returns
  // ลูกค้าดูคำขอคืนเฉพาะออเดอร์ของตัวเอง
  @Get('orders/:orderId/returns')
  async getOrderReturnsForUser(
    @Request() req,
    @Param('orderId') orderId: string,
  ) {
    return this.returnsService.getOrderReturnsForUser(
      req.user.id,
      Number(orderId),
    );
  }

  // ===== Admin endpoints =====
  // ใช้โดย "Admin เจ้าของระบบ" เท่านั้น
  // GET /returns/admin
  // Admin ดูคำขอคืนสินค้าทั้งหมดในระบบ (รองรับ filter ตาม status)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('returns/admin')
  async getAllReturnsForAdmin(
    @Query('status') status?: OrderReturnStatus,
  ) {
    return this.returnsService.getAllReturnsForAdmin(status);
  }

  // PATCH /returns/:id/status
  // Admin เปลี่ยนสถานะคำขอคืนสินค้า เช่น REJECTED, REFUNDED, APPROVED
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('returns/:id/status')
  async updateReturnStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateReturnStatusDto,
  ) {
    return this.returnsService.updateReturnStatus(
      req.user.id,
      Number(id),
      dto,
    );
  }
}


