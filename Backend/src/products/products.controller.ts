import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  UseGuards,
  Body,
  Request,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService, // Inject CloudinaryService
  ) { }

  @SkipThrottle() // ยกเว้น Rate Limit สำหรับการดูสินค้า
  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('keyword') keyword?: string,
    @Query('sortBy') sortBy?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('subcategory') subcategory?: string, // ✅ เพิ่ม subcategory
  ) {
    // ส่งเป็น object ไปให้ service จัดการ
    return this.productsService.findAll({
      categoryId,
      subcategory, // ✅ ส่งต่อให้ service
      page,
      limit,
      keyword,
      sortBy,
      minPrice,
      maxPrice,
    });
  }

  @SkipThrottle() // ยกเว้น Rate Limit สำหรับการค้นหาสินค้า
  @Get('search')
  search(@Query('keyword') keyword: string) {
    return this.productsService.search(keyword);
  }

  // ✅ Static routes ที่มี path ยาวกว่า ต้องอยู่ก่อน path สั้นกว่า
  @UseGuards(JwtAuthGuard)
  @Get('recommendations/personal') // GET /products/recommendations/personal (ต้องอยู่ก่อน recommendations)
  getPersonalRecommendations(@Request() req) {
    return this.productsService.getPersonalRecommendations(req.user.id);
  }

  @SkipThrottle() // ยกเว้น Rate Limit สำหรับสินค้าแนะนำ
  @Get('recommendations') // GET /products/recommendations?categoryId=1
  getRecommendations(
    @Query('categoryId') categoryId?: string,
    @Query('limit') limit: number = 6,
  ) {
    return this.productsService.getRecommendations(
      categoryId ? Number(categoryId) : undefined,
      limit,
    );
  }

  @SkipThrottle() // ยกเว้น Rate Limit สำหรับสินค้าแนะนำ
  @Get('recommended')
  getRecommended(
    @Query('categoryId') categoryId?: string,
    @Query('excludeProductId') excludeProductId?: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.productsService.getRecommendedProducts(
      categoryId ? Number(categoryId) : undefined,
      excludeProductId ? Number(excludeProductId) : undefined,
      limit,
    );
  }

  @SkipThrottle() // ยกเว้น Rate Limit สำหรับ Flash Sale
  @Get('flash-sale')
  getFlashSale(@Query('limit') limit: number = 10) {
    return this.productsService.getFlashSaleProducts(limit);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor({ limits: { files: 50 } })) // รองรับหลายไฟล์ (images) สูงสุด 50 รูป
  async createProduct(@Body() body: any, @UploadedFiles() files: any[]) {
    try {
      console.log('📦 Create Product Request Body:', {
        name: body.name,
        price: body.price,
        stock: body.stock,
        categoryId: body.categoryId,
        variants: body.variants,
        filesCount: files?.length || 0,
      });

      let mainImageUrl: string | null = null;
      const extraImageUrls: string[] = [];

      // 1. ถ้ามีไฟล์แนบมา ให้อัปโหลดขึ้น Cloudinary (รองรับหลายรูป)
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const uploadResult = await this.cloudinaryService.uploadImage(file);
            const url = uploadResult.secure_url;
            if (!mainImageUrl) {
              mainImageUrl = url;
            } else {
              extraImageUrls.push(url);
            }
          } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw new BadRequestException('Failed to upload image');
          }
        }
      }

      // 2. Validate required fields
      if (!body.name && !body.title) {
        throw new BadRequestException('Product name is required');
      }
      if (!body.price) {
        throw new BadRequestException('Product price is required');
      }

      // 3. Parse variants (ถ้ามี) - FormData ส่ง JSON เป็น string
      let parsedVariants = null;
      if (body.variants) {
        try {
          if (typeof body.variants === 'string') {
            parsedVariants = JSON.parse(body.variants);
            console.log('✅ Parsed variants in controller:', parsedVariants);
          } else if (Array.isArray(body.variants)) {
            parsedVariants = body.variants;
          }
        } catch (e) {
          console.error('❌ Failed to parse variants:', e);
          console.error('Variants value:', body.variants);
          // ไม่ throw error เพื่อให้สร้าง product ได้แม้ variants parse ไม่ได้
        }
      }

      // 4. ส่ง URL ที่ได้ไปบันทึกใน Database ผ่าน Service เดิม
      const result = await this.productsService.createProduct({
        title: body.name || body.title,
        description: body.description || '',
        price: parseFloat(body.price),
        quantity: parseInt(body.stock || body.quantity || '100'),
        categoryId: parseInt(body.categoryId || '1'),
        imagePath: mainImageUrl, // ส่ง URL จาก Cloudinary แทน path ในเครื่อง
        extraImagePaths: extraImageUrls,
        variants: parsedVariants, // ✅ ส่ง variants ที่ parse แล้ว
        subcategory: body.subcategory, // ✅ รับค่า subcategory จาก body
      });

      console.log('✅ Product created successfully:', result.id);
      return result;
    } catch (error: any) {
      console.error('❌ Create Product Error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Failed to create product',
      );
    }
  }

  @Post('visual-search')
  @UseInterceptors(FileInterceptor('image'))
  async visualSearch(@UploadedFile() file: any) {
    console.log('📸 Visual Search endpoint called');
    console.log('File received:', file ? {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    } : 'No file');

    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // ตรวจสอบประเภทไฟล์
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    return this.productsService.visualSearch(file);
  }

  // ✅ Static routes ต้องอยู่ก่อน dynamic routes (:id)
  @UseGuards(JwtAuthGuard)
  @Get('history/recent') // GET /products/history/recent
  getRecent(@Request() req) {
    return this.productsService.getRecentlyViewed(req.user.id);
  }

  // ✅ Dynamic routes ที่มี path ต่อท้าย ต้องอยู่ก่อน :id
  @Get(':id/related') // GET /products/1/related?categoryId=5
  getRelatedProducts(
    @Param('id') id: string,
    @Query('categoryId') categoryId: string,
    @Query('limit') limit: number = 6,
  ) {
    return this.productsService.getRelatedProducts(+id, +categoryId, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/view') // POST /products/1/view
  logView(@Param('id') id: string, @Request() req) {
    return this.productsService.logView(req.user.id, +id);
  }

  // ✅ อัปเดตสินค้า
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UseInterceptors(AnyFilesInterceptor({ limits: { files: 50 } }))
  async updateProduct(
    @Param('id') id: string,
    @Request() req,
    @Body() body: any,
    @UploadedFiles() files: any[],
  ) {
    try {
      // 1. อัปโหลดรูปใหม่ (ถ้ามี)
      const uploadedUrls: string[] = [];
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const uploadResult = await this.cloudinaryService.uploadImage(file);
            const url = uploadResult.secure_url;
            uploadedUrls.push(url);
          } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw new BadRequestException('Failed to upload image');
          }
        }
      }

      // 2. รวมรูปเดิมที่ต้องการเก็บ + รูปใหม่
      let existingImageUrls: string[] = [];
      if (body.existingImages) {
        try {
          if (typeof body.existingImages === 'string') {
            existingImageUrls = JSON.parse(body.existingImages);
          } else if (Array.isArray(body.existingImages)) {
            existingImageUrls = body.existingImages;
          }
        } catch (e) {
          console.error('❌ Failed to parse existingImages:', e);
        }
      } else if (body.existingImage || body.imagePath) {
        // fallback เก่า: single existing image
        existingImageUrls = [body.existingImage || body.imagePath];
      }

      const allImageUrls = [...existingImageUrls, ...uploadedUrls].filter(Boolean);
      let mainImageUrl: string | undefined = undefined;
      let extraImageUrls: string[] = [];
      if (allImageUrls.length > 0) {
        mainImageUrl = allImageUrls[0];
        extraImageUrls = allImageUrls.slice(1);
      }

      // 3. Parse variants (ถ้ามี)
      let parsedVariants = undefined;
      if (body.variants) {
        try {
          if (typeof body.variants === 'string') {
            parsedVariants = JSON.parse(body.variants);
          } else if (Array.isArray(body.variants)) {
            parsedVariants = body.variants;
          }
        } catch (e) {
          console.error('❌ Failed to parse variants:', e);
        }
      }

      // 4. สร้าง update data object
      const updateData: any = {};
      if (body.name || body.title) updateData.title = body.name || body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.price !== undefined) updateData.price = parseFloat(body.price);
      if (body.stock !== undefined || body.quantity !== undefined)
        updateData.quantity = parseInt(body.stock || body.quantity || '0');
      if (body.categoryId !== undefined) updateData.categoryId = parseInt(body.categoryId);
      if (body.subcategory !== undefined) updateData.subcategory = body.subcategory;
      // ✅ อัปเดตรูปภาพเฉพาะถ้ามีรูปใหม่หรือส่ง imagePath มา
      if (mainImageUrl !== undefined && mainImageUrl !== null) {
        updateData.imagePath = mainImageUrl;
        updateData.extraImagePaths = extraImageUrls;
      }
      // ถ้า mainImageUrl เป็น undefined แสดงว่าไม่ต้องการอัปเดตรูปภาพ
      if (parsedVariants !== undefined) updateData.variants = parsedVariants;

      // 5. อัปเดตสินค้า
      const result = await this.productsService.updateProduct(+id, req.user.id, updateData);
      console.log('✅ Product updated successfully:', result.id);
      return result;
    } catch (error: any) {
      console.error('❌ Update Product Error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to update product');
    }
  }

  // ✅ ลบสินค้า
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProduct(@Param('id') id: string, @Request() req) {
    try {
      await this.productsService.deleteProduct(+id, req.user.id);
      return { success: true, message: 'Product deleted successfully' };
    } catch (error: any) {
      console.error('❌ Delete Product Error:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to delete product');
    }
  }

  // ⚠️ ต้องวาง route นี้ไว้หลังสุด เพราะ :id จะ match ทุก string
  @SkipThrottle() // ยกเว้น Rate Limit สำหรับการดูรายละเอียดสินค้า
  @Get(':id')
  findOne(@Param('id') id: string) {
    // ตรวจสอบว่าไม่ใช่ 'search' หรือ 'visual-search' หรือ 'history' หรือ 'recommendations'
    if (id === 'search' || id === 'visual-search' || id === 'history' || id === 'recommendations') {
      throw new BadRequestException('Invalid product ID');
    }
    return this.productsService.findOne(+id);
  }
}

