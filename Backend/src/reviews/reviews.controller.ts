import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // เขียนรีวิว (ต้อง Login)
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req,
    @Body()
    body: {
      productId: number;
      rating: number;
      comment: string;
      images?: string[];
    },
  ) {
    return this.reviewsService.create(
      req.user.userId,
      body.productId,
      body.rating,
      body.comment,
      body.images,
    );
  }

  // อ่านรีวิวของสินค้านั้นๆ (ไม่ต้อง Login)
  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(+productId);
  }

  // ✅ ดึงรีวิวของ User เอง (ต้อง Login)
  @UseGuards(JwtAuthGuard)
  @Get('my-reviews')
  findMyReviews(@Request() req) {
    return this.reviewsService.findByUser(req.user.id);
  }

  // ดึงคะแนนเฉลี่ย (optional)
  @Get('product/:productId/average')
  getAverageRating(@Param('productId') productId: string) {
    return this.reviewsService.getAverageRating(+productId);
  }

  // ✅ แก้ไขรีวิว
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { rating?: number; comment?: string; images?: string[] },
    @Request() req,
  ) {
    return this.reviewsService.update(+id, req.user.id, body);
  }

  // ✅ ลบรีวิว (Service จะเช็คเองว่าเป็น Admin หรือ User)
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.reviewsService.remove(+id, req.user); // ส่ง user object ไปเช็ค role
  }

  // ✅ ซ่อนรีวิว (Admin Only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/hide')
  hide(@Param('id') id: string) {
    return this.reviewsService.hideReview(+id);
  }

  // ✅ ร้านค้าตอบกลับ (Seller Only)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/reply')
  reply(
    @Param('id') id: string,
    @Body() body: { replyText: string },
    @Request() req,
  ) {
    return this.reviewsService.reply(+id, req.user.id, body.replyText);
  }

  // ✅ Seller ส่งเรื่องร้องเรียน
  @UseGuards(JwtAuthGuard)
  @Post(':id/report')
  report(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    return this.reviewsService.reportReview(+id, req.user.id, body.reason);
  }

  // ✅ Admin ดูคำร้องทั้งหมด
  @UseGuards(JwtAuthGuard, RolesGuard) // Admin Only
  @Get('admin/reports')
  getReports() {
    return this.reviewsService.getReports();
  }

  // ✅ Admin ตัดสินใจ
  @UseGuards(JwtAuthGuard, RolesGuard) // Admin Only
  @Patch('admin/reports/:id/resolve')
  resolveReport(
    @Param('id') id: string,
    @Body() body: { action: 'DELETE_REVIEW' | 'REJECT_REPORT' },
  ) {
    return this.reviewsService.resolveReport(+id, body.action);
  }
}

