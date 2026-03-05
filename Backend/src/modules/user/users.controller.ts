import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CloudinaryService } from '@modules/storage/cloudinary.service';
import { JwtAuthGuard, RolesGuard } from '@core/auth';
import { ChangeRoleDto } from './dto/change-role.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Get('me')
  getMe(@Request() req) {
    return req.user;
  }

  @Put('me')
  updateMe(@Request() req, @Body() updateData: any) {
    return this.usersService.update(req.user.id, updateData);
  }

  // ✅ Step 109: ลบบัญชีผู้ใช้ (PDPA Compliance)
  // ใช้ POST แทน DELETE เพราะบาง HTTP client ไม่รองรับ body ใน DELETE request
  @Post('me/delete') // POST /users/me/delete
  deleteAccount(@Request() req, @Body() body: { password: string }) {
    if (!body.password) {
      throw new BadRequestException('กรุณากรอกรหัสผ่านเพื่อยืนยันการลบบัญชี');
    }
    return this.usersService.deleteAccount(req.user.id, body.password);
  }

  @Patch('push-token') // PATCH /users/push-token
  updatePushToken(@Request() req, @Body() body: { token: string }) {
    return this.usersService.update(req.user.id, { notificationToken: body.token });
  }

  // ✅ Step 90: อัปโหลดรูปโปรไฟล์
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file')) // รับไฟล์ชื่อ field ว่า 'file'
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('กรุณาเลือกไฟล์รูปภาพ');
    }

    // 1. อัปโหลดขึ้น Cloudinary
    const uploadResult = await this.cloudinaryService.uploadImage(file);
    const imageUrl = uploadResult.secure_url;

    // 2. อัปเดต URL ลงในตาราง User (Field 'picture')
    await this.usersService.update(req.user.id, { picture: imageUrl });

    // 3. ส่ง URL กลับไปให้ Frontend อัปเดตหน้าจอ
    return {
      message: 'อัปเดตรูปโปรไฟล์สำเร็จ',
      url: imageUrl,
    };
  }

  // --- Admin Zone ---

  @UseGuards(JwtAuthGuard, RolesGuard) // ต้องเป็น Admin เท่านั้น
  @Get('admin/all')
  findAll(@Query('page') page: number, @Query('keyword') keyword: string) {
    return this.usersService.findAll(page || 1, 20, keyword);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('admin/:id/ban')
  toggleBan(@Param('id') id: string, @Request() req) {
    if (+id === req.user.id) {
      throw new BadRequestException('คุณไม่สามารถแบนตัวเองได้!');
    }
    return this.usersService.toggleBan(+id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('admin/:id/role')
  changeRole(
    @Param('id') id: string,
    @Body() body: ChangeRoleDto,
    @Request() req,
  ) {
    if (+id === req.user.id) {
      throw new BadRequestException('คุณไม่สามารถเปลี่ยน Role ตัวเองได้!');
    }
    return this.usersService.changeRole(+id, body.role, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/:id') // GET /users/admin/123
  findOneAdmin(@Param('id') id: string) {
    return this.usersService.findOneWithDetails(+id);
  }
}

