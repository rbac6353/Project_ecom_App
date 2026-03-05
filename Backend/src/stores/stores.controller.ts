import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoresService } from './stores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  // ✅ ดึงร้านค้า Mall ทั้งหมด (Public - ไม่ต้อง Login)
  @Get('mall') // GET /stores/mall
  getMallStores() {
    return this.storesService.getMallStores();
  }

  // ดูร้านค้าทั้งหมด (Admin Only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/all')
  findAll(@Query('keyword') keyword: string) {
    return this.storesService.findAll(keyword);
  }

  // ✅ ดึงรายละเอียดร้านค้า (Admin Only) - ต้องมาก่อน route ที่ใช้ :id
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/:id') // GET /stores/admin/1
  findOneAdmin(@Param('id') id: string) {
    return this.storesService.findOneWithDetails(+id);
  }

  // สร้างร้านค้า (User ทั่วไปขอเปิดร้าน)
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() body: any) {
    return this.storesService.create(req.user.id, body);
  }

  // ✅ ตั้งค่า Mall (Admin Only) - ต้องอยู่ก่อน route :id อื่นๆ เพื่อให้ match ถูกต้อง
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/mall') // PATCH /stores/1/mall
  toggleMall(@Param('id') id: string, @Request() req) {
    return this.storesService.toggleMallStatus(+id, req.user.id);
  }

  // อนุมัติร้านค้า (Admin Only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/verify')
  verify(@Param('id') id: string, @Request() req) {
    return this.storesService.verifyStore(+id, req.user.id);
  }

  // ลบร้านค้า (Admin Only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.storesService.remove(+id, req.user.id);
  }

  // --- Specific Routes (ต้องอยู่ก่อน route :id) ---

  @UseGuards(JwtAuthGuard)
  @Get('user/following') // GET /stores/user/following (รายการที่ฉันตาม)
  getMyFollowing(@Request() req) {
    return this.storesService.getMyFollowing(req.user.id);
  }

  // ✅ ปิด-เปิดร้านค้า (Seller Only) - ต้องอยู่ก่อน route :id
  @UseGuards(JwtAuthGuard)
  @Patch('me/toggle-status') // PATCH /stores/me/toggle-status
  toggleStoreStatus(@Request() req) {
    // หาร้านค้าของ Seller คนนี้
    return this.storesService.toggleStoreStatusByOwner(req.user.id);
  }

  // ✅ อัปเดตร้านค้า (Seller Only)
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @UseInterceptors(FileInterceptor('logo'))
  async updateStore(@Request() req, @Body() body: any, @UploadedFile() file: any) {
    let logoUrl = body.logo;

    // ถ้ามีไฟล์แนบมา ให้อัปโหลดขึ้น Cloudinary
    if (file) {
      try {
        const uploadResult = await this.cloudinaryService.uploadImage(file);
        logoUrl = uploadResult.secure_url;
        console.log('✅ Logo uploaded from file:', logoUrl);
      } catch (error) {
        console.error('Error uploading logo to Cloudinary:', error);
        // ถ้าอัปโหลดไม่สำเร็จ ให้ใช้ URL เดิม (ถ้ามี)
      }
    }
    // ✅ รองรับ Base64 encoded image (สำหรับ Android ที่ไม่สามารถใช้ FormData ได้)
    else if (body.logoBase64 && body.logoBase64.startsWith('data:image')) {
      try {
        console.log('📷 Uploading base64 image to Cloudinary...');
        const uploadResult = await this.cloudinaryService.uploadBase64Image(body.logoBase64);
        logoUrl = uploadResult.secure_url;
        console.log('✅ Logo uploaded from base64:', logoUrl);
      } catch (error) {
        console.error('Error uploading base64 logo to Cloudinary:', error);
        // ถ้าอัปโหลดไม่สำเร็จ ให้ใช้ URL เดิม (ถ้ามี)
      }
    }

    return this.storesService.updateStore(req.user.id, {
      name: body.name,
      description: body.description,
      logo: logoUrl,
    });
  }

  // --- Routes with :id (ต้องเรียงลำดับให้ route ที่เฉพาะเจาะจงมาก่อน) ---

  // ✅ หน้าร้านค้า (Public - ไม่บังคับ Login แต่ถ้ามี Token ก็เช็ค Follow Status)
  // ต้องอยู่ก่อน route :id อื่นๆ เพื่อให้ NestJS match ถูกต้อง
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/profile') // GET /stores/1/profile
  async getStoreProfile(@Param('id') id: string, @Request() req, @Query('includeInactive') includeInactive?: string) {
    // ถ้ามี user จาก token ใช้ userId, ถ้าไม่มีก็ส่ง undefined
    const userId = req.user?.id;
    // แปลง string 'true' เป็น boolean
    const showInactive = includeInactive === 'true';

    console.log(`[DEBUG_CTRL] getStoreProfile: ID=${id}, UserID=${userId}, IncludeInactive=${includeInactive} (Parsed=${showInactive})`);

    return this.storesService.getStoreProfile(+id, userId, showInactive);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/is-following') // GET /stores/1/is-following
  checkFollow(@Param('id') storeId: string, @Request() req) {
    return this.storesService.checkFollowStatus(req.user.id, +storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow') // POST /stores/1/follow (Toggle)
  toggleFollow(@Param('id') storeId: string, @Request() req) {
    return this.storesService.toggleFollow(req.user.id, +storeId);
  }
}
