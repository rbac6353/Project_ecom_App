import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';
import {
  ReviewReport,
  ReportStatus,
} from '../entities/review-report.entity'; // ✅ Import

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    @InjectRepository(ReviewReport) // ✅ Inject ReviewReport Repository
    private reportRepository: Repository<ReviewReport>,
  ) {}

  async create(
    userId: number,
    productId: number,
    rating: number,
    comment: string,
    images?: string[],
  ) {
    // ตรวจสอบว่า user เคยรีวิวสินค้านี้แล้วหรือยัง (optional - ถ้าต้องการให้รีวิวได้แค่ครั้งเดียว)
    // const existing = await this.reviewsRepository.findOne({
    //   where: { userId, productId },
    // });
    // if (existing) {
    //   throw new Error('You have already reviewed this product');
    // }

    const review = this.reviewsRepository.create({
      userId,
      productId,
      rating,
      comment,
      images: images && images.length > 0 ? JSON.stringify(images) : null,
    });

    return this.reviewsRepository.save(review);
  }

  async findByProduct(productId: number) {
    return this.reviewsRepository.find({
      where: { productId, isHidden: false }, // ✅ กรองที่โดนซ่อนออก
      relations: ['user'], // ดึงชื่อคนรีวิวมาด้วย
      order: { createdAt: 'DESC' },
    });
  }

  // ✅ ดึงรีวิวของ User เอง
  async findByUser(userId: number) {
    return this.reviewsRepository.find({
      where: { userId, isHidden: false }, // ✅ กรองที่โดนซ่อนออก
      relations: ['product', 'product.images'], // ดึงข้อมูลสินค้ามาด้วย
      order: { createdAt: 'DESC' },
    });
  }

  // ✅ 1. แก้ไขรีวิว (Customer Only - Edit Once)
  async update(
    id: number,
    userId: number,
    data: { rating?: number; comment?: string; images?: string[] },
  ) {
    const review = await this.reviewsRepository.findOne({ where: { id } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขรีวิวนี้');
    }

    // 🛑 เงื่อนไข: แก้ไขได้แค่ครั้งเดียว
    if (review.isEdited) {
      throw new ForbiddenException(
        'คุณได้แก้ไขรีวิวนี้ไปแล้ว ไม่สามารถแก้ไขได้อีก',
      );
    }

    if (data.rating) review.rating = data.rating;
    if (data.comment) review.comment = data.comment;
    if (data.images) {
      review.images = data.images.length > 0 ? JSON.stringify(data.images) : null;
    }

    // ปักธงว่าแก้แล้ว
    review.isEdited = true;

    return this.reviewsRepository.save(review);
  }

  // ✅ 2. ลบรีวิว (Customer Own & Admin Only)
  async remove(id: number, user: any) {
    // รับ user object ทั้งก้อนเพื่อเช็ค role
    const review = await this.reviewsRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // กฎ: เจ้าของลบได้ หรือ Admin ลบได้ (Seller ลบไม่ได้)
    const isOwner = review.userId === user.id || review.userId === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'คุณไม่มีสิทธิ์ลบรีวิวนี้ (ร้านค้าไม่สามารถลบรีวิวได้)',
      );
    }

    return this.reviewsRepository.remove(review);
  }

  // ✅ 3. ซ่อนรีวิว (Admin Only)
  async hideReview(id: number) {
    return this.reviewsRepository.update(id, { isHidden: true });
  }

  // ✅ 4. ร้านค้าตอบกลับ (Seller Only)
  async reply(id: number, sellerId: number, replyText: string) {
    const review = await this.reviewsRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // (ควรเช็คว่าเป็นเจ้าของร้านของสินค้านี้ไหม ในที่นี้ละไว้)
    review.sellerReply = replyText;
    return this.reviewsRepository.save(review);
  }

  async getAverageRating(productId: number): Promise<number> {
    const reviews = await this.reviewsRepository.find({
      where: { productId, isHidden: false }, // ✅ กรองที่โดนซ่อนออก
      select: ['rating'],
    });

    if (reviews.length === 0) {
      return 0;
    }

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  }

  // ✅ 1. ร้านค้าส่งคำร้อง (Seller Report)
  async reportReview(
    reviewId: number,
    reporterId: number,
    reason: string,
  ) {
    // เช็คก่อนว่าเคยแจ้งไปหรือยังที่ยัง PENDING อยู่
    const existing = await this.reportRepository.findOne({
      where: { reviewId, reporterId, status: ReportStatus.PENDING },
    });

    if (existing) {
      throw new BadRequestException(
        'คุณได้ส่งคำร้องสำหรับรีวิวนี้ไปแล้ว',
      );
    }

    // เช็คว่ารีวิวมีอยู่จริง
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const report = this.reportRepository.create({
      reviewId,
      reporterId,
      reason,
      status: ReportStatus.PENDING,
    });
    return this.reportRepository.save(report);
  }

  // ✅ 2. Admin ดูคำร้องทั้งหมด
  async getReports() {
    return this.reportRepository.find({
      where: { status: ReportStatus.PENDING },
      relations: [
        'review',
        'review.product',
        'review.user', // ดึงข้อมูลคนรีวิว
        'reporter',
      ], // ดึงข้อมูลรีวิวและคนแจ้ง
      order: { createdAt: 'ASC' }, // เอาอันที่รอนานสุดขึ้นก่อน
    });
  }

  // ✅ 3. Admin ตัดสินใจ (Resolve/Reject)
  async resolveReport(
    reportId: number,
    action: 'DELETE_REVIEW' | 'REJECT_REPORT',
  ) {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['review'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (action === 'DELETE_REVIEW') {
      // ลบรีวิวทิ้ง (ใช้ logic ลบเดิมที่มีอยู่)
      // หมายเหตุ: เมื่อลบ review, report จะถูกลบด้วยถ้าตั้ง onDelete: CASCADE
      await this.reviewsRepository.remove(report.review);
      // อัปเดต status เป็น RESOLVED (ถ้า report ยังไม่ถูกลบ)
      report.status = ReportStatus.RESOLVED;
      await this.reportRepository.save(report);
      return { message: 'Review deleted successfully' };
    } else {
      // ปฏิเสธคำร้อง (รีวิวอยู่ต่อ)
      report.status = ReportStatus.REJECTED;
      await this.reportRepository.save(report);
      return { message: 'Report rejected' };
    }
  }
}

