import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category, Subcategory, Product } from '@core/database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Subcategory, Product])], // ✅ เพิ่ม Product สำหรับ auto-assign
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}

