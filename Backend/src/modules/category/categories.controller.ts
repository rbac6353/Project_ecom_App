import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard, RolesGuard } from '@core/auth';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @SkipThrottle() // ยกเว้น Rate Limit สำหรับการดูหมวดหมู่
  @Get()
  findAll(@Query('storeId') storeId?: string) {
    // ✅ storeId = null → Marketplace (แสดงเฉพาะ Global subcategories)
    // ✅ storeId = number → Store Shop (แสดง Global + Shop-specific)
    const parsedStoreId = storeId ? parseInt(storeId, 10) : null;
    return this.categoriesService.findAll(parsedStoreId);
  }

  @SkipThrottle() // ยกเว้น Rate Limit สำหรับการดูหมวดหมู่
  @Get(':id')
  findOne(@Param('id') id: string, @Query('storeId') storeId?: string) {
    const parsedStoreId = storeId ? parseInt(storeId, 10) : null;
    return this.categoriesService.findOne(+id, parsedStoreId);
  }

  // ✅ Endpoint สำหรับดึง Subcategories ของ Category (สำหรับ Seller สร้างสินค้า)
  @SkipThrottle()
  @Get(':id/subcategories')
  getSubcategories(
    @Param('id') id: string,
    @Query('storeId') storeId?: string,
  ) {
    const parsedStoreId = storeId ? parseInt(storeId, 10) : null;
    return this.categoriesService.getSubcategoriesByCategory(+id, parsedStoreId);
  }

  // --- Admin Zone ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() body: any) {
    return this.categoriesService.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.categoriesService.update(+id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }

  // ✅ Admin API: Auto-assign subcategoryId ให้สินค้าที่ยังเป็น NULL
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('admin/fix-products')
  async fixProductsSubcategory() {
    return this.categoriesService.autoAssignSubcategoryToProducts();
  }

  // ✅ Admin API: Backfill slug สำหรับหมวดหมู่ที่ slug เป็น NULL (SEO)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('admin/backfill-slugs')
  async backfillCategorySlugs() {
    return this.categoriesService.backfillCategorySlugs();
  }
}

