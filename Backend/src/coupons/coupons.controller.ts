import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('apply')
  apply(@Body() body: { code: string; cartTotal: number }, @Request() req: any) {
    return this.couponsService.applyCoupon(
      body.code,
      body.cartTotal,
      req.user?.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('apply-multiple')
  applyMultiple(
    @Body() body: { codes: string[]; cartTotal: number; cartItems?: any[] },
    @Request() req: any,
  ) {
    return this.couponsService.applyMultipleCoupons(
      body.codes,
      body.cartTotal,
      req.user?.id,
      body.cartItems,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('collect/:couponId')
  collect(@Param('couponId') couponId: string, @Request() req: any) {
    return this.couponsService.collectCoupon(+couponId, req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyCoupons(@Request() req: any) {
    return this.couponsService.getMyCoupons(req.user?.id);
  }

  @Get('available')
  getAvailableCoupons(@Request() req: any) {
    // ไม่ต้อง login ก็ดึงคูปองได้ แต่ถ้า login แล้วจะได้ isCollected flag
    const userId = req.user?.id;
    console.log(`🔍 Getting available coupons for userId: ${userId || 'anonymous'}`);
    return this.couponsService.getAvailableCoupons(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get() // GET /coupons
  findAll() {
    return this.couponsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'seller')
  @Post() // POST /coupons
  create(@Body() body: any, @Request() req: any) {
    return this.couponsService.create({ ...body, userId: req.user?.id });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'seller')
  @Delete(':id') // DELETE /coupons/:id
  remove(@Param('id') id: string) {
    return this.couponsService.remove(+id);
  }
}

