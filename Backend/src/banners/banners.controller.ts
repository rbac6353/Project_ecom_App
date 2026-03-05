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
import { FileInterceptor } from '@nestjs/platform-express';
import { BannersService } from './banners.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('banners')
export class BannersController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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
  @UseInterceptors(FileInterceptor('file'))
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
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bannersService.remove(+id);
  }
}

