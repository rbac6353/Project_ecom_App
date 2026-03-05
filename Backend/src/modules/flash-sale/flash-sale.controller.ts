import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FlashSaleService } from './flash-sale.service';
import { JwtAuthGuard, RolesGuard } from '@core/auth';
import { Roles } from '@core/auth/decorators/roles.decorator';

@Controller('flash-sales')
export class FlashSaleController {
  constructor(private readonly flashSaleService: FlashSaleService) {}

  /**
   * Public API: ดึง Flash Sale ที่กำลัง Active หรือ Coming Soon
   */
  @Get('current')
  getCurrent() {
    return this.flashSaleService.getCurrentFlashSale();
  }

  /**
   * Admin API: ดึง Flash Sale ทั้งหมด
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  findAll() {
    return this.flashSaleService.findAll();
  }

  /**
   * Admin API: ดึง Flash Sale ตาม ID
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.flashSaleService.findOne(id);
  }

  /**
   * Admin API: สร้าง Flash Sale Campaign ใหม่
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/create')
  create(@Body() body: any) {
    return this.flashSaleService.create(body);
  }

  /**
   * Admin API: เพิ่มสินค้าเข้า Flash Sale
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/:id/items')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.flashSaleService.addItem(id, body);
  }

  /**
   * Admin API: อัปเดต Flash Sale
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.flashSaleService.update(id, body);
  }

  /**
   * Admin API: ลบ Flash Sale
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('admin/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.flashSaleService.remove(id);
  }
}
