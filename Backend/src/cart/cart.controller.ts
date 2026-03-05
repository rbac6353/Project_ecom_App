import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@Request() req) {
    return this.cartService.getOrCreateCart(req.user.id);
  }

  @Post('add')
  addToCart(
    @Request() req,
    @Body() body: { productId: number; count: number; variantId?: number },
  ) {
    return this.cartService.addToCart(
      req.user.id,
      body.productId,
      body.count,
      body.variantId,
    );
  }

  // ✅ เปลี่ยนจาก productId เป็น itemId เพื่อรองรับ variants
  @Delete('remove/:itemId')
  removeFromCart(@Request() req, @Param('itemId') itemId: string) {
    return this.cartService.removeFromCart(req.user.id, +itemId);
  }

  @Put('update')
  updateCartItem(
    @Request() req,
    @Body() body: { itemId: number; count: number }, // ✅ เปลี่ยนจาก productId เป็น itemId
  ) {
    return this.cartService.updateCartItem(
      req.user.id,
      body.itemId,
      body.count,
    );
  }
}

