import { SetMetadata } from '@nestjs/common';

// ใช้กำหนด role ที่ต้องการบน Controller/Handler
// ตัวอย่าง: @Roles('admin')
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);


