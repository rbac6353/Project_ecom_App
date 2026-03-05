import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannersService } from './banners.service';
import { CloudinaryService } from '@modules/storage/cloudinary.service';
import { JwtAuthGuard, RolesGuard } from '@core/auth';

@Controller('banners')
export class BannersController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @SkipThrottle() // ยกเว้น rate limit สำหรับการดูแบนเนอร์ (ป้องกัน 429)
  @Get() // Public
  findActive() {
    return this.bannersService.findActive();
  }

  // --- Admin ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/all')
  findAll() {
    return this.bannersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new BadRequestException('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    try {
      console.log('📸 Create Banner Request:', {
        hasFile: !!file,
        fileName: file?.originalname,
        fileSize: file?.size,
        fileMimeType: file?.mimetype,
        hasBuffer: !!file?.buffer,
        title: body.title,
        link: body.link,
      });

      // 1. Validate file
      if (!file) {
        throw new BadRequestException('Image file is required');
      }

      if (!file.buffer) {
        throw new BadRequestException('File buffer is missing. Please ensure the file is properly uploaded.');
      }

      // 2. Upload รูป
      let uploadRes;
      try {
        uploadRes = await this.cloudinaryService.uploadImage(file);
        console.log('✅ Banner image uploaded:', uploadRes.secure_url);
      } catch (error) {
        console.error('❌ Error uploading to Cloudinary:', error);
        throw new BadRequestException('Failed to upload image to Cloudinary');
      }

      // 3. Save DB
      return this.bannersService.create({
        imageUrl: uploadRes.secure_url,
        title: body.title || null,
        link: body.link || null,
      });
    } catch (error) {
      console.error('❌ Error creating banner:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to create banner');
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.bannersService.toggleActive(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new BadRequestException('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    try {
      const updateData: any = {};

      // ถ้ามีไฟล์ใหม่ ให้อัปโหลด
      if (file) {
        if (!file.buffer) {
          throw new BadRequestException('File buffer is missing. Please ensure the file is properly uploaded.');
        }

        try {
          const uploadRes = await this.cloudinaryService.uploadImage(file);
          updateData.imageUrl = uploadRes.secure_url;
          console.log('✅ Banner image updated:', uploadRes.secure_url);
        } catch (error) {
          console.error('❌ Error uploading to Cloudinary:', error);
          throw new BadRequestException('Failed to upload image to Cloudinary');
        }
      }

      // อัปเดต title และ link ถ้ามี
      if (body.title !== undefined) {
        updateData.title = body.title || null;
      }
      if (body.link !== undefined) {
        updateData.link = body.link || null;
      }

      return this.bannersService.update(+id, updateData);
    } catch (error) {
      console.error('❌ Error updating banner:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to update banner');
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bannersService.remove(+id);
  }

  // ✅ อัปเดต displayOrder
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/order')
  updateOrder(
    @Param('id') id: string,
    @Body() body: { displayOrder: number },
  ) {
    return this.bannersService.updateDisplayOrder(+id, body.displayOrder);
  }

  // ✅ สลับลำดับ banner (ย้ายขึ้นหรือลง)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('swap-order')
  swapOrder(@Body() body: { id1: number; id2: number }) {
    return this.bannersService.swapOrder(body.id1, body.id2);
  }
}

