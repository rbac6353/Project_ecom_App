import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review, ReviewReport } from '@core/database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Review, ReviewReport])], // ✅ เพิ่ม ReviewReport
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}

