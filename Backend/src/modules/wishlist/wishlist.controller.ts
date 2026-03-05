import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '@core/auth';

@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async findAll(@Request() req) {
    try {
      console.log('WishlistController.findAll - userId:', req.user.id);
      const result = await this.wishlistService.findAll(req.user.id);
      return result;
    } catch (error) {
      console.error('WishlistController.findAll error:', error);
      throw error;
    }
  }

  @Get('check/:productId')
  check(@Request() req, @Param('productId') productId: string) {
    return this.wishlistService.check(req.user.id, +productId);
  }

  @Post(':productId')
  async add(@Request() req, @Param('productId') productId: string) {
    try {
      console.log('WishlistController.add - userId:', req.user.id, 'productId:', productId);
      const result = await this.wishlistService.add(req.user.id, +productId);
      return result;
    } catch (error) {
      console.error('WishlistController.add error:', error);
      throw error;
    }
  }

  @Delete(':productId')
  remove(@Request() req, @Param('productId') productId: string) {
    return this.wishlistService.remove(req.user.id, +productId);
  }
}

