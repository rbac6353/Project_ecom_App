import { IsEnum, IsNotEmpty } from 'class-validator';

// กำหนดค่าที่ยอมรับได้
export enum UserRole {
  USER = 'user',
  SELLER = 'seller',
  ADMIN = 'admin',
  COURIER = 'courier', // ✅ เพิ่ม courier role
}

export class ChangeRoleDto {
  @IsNotEmpty({ message: 'กรุณาระบุ Role' })
  @IsEnum(UserRole, {
    message: 'Role ต้องเป็น user, seller, admin หรือ courier เท่านั้น',
  })
  role: UserRole;
}

