import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // อ่าน roles ที่กำหนดใน @Roles decorator
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    // ถ้าไม่มี @Roles decorator = อนุญาตทุกคน (แต่ต้องผ่าน JwtAuthGuard ก่อน)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // เช็คว่า User มี role ตรงกับที่กำหนดหรือไม่
    if (!user) {
      throw new ForbiddenException('คุณต้องเข้าสู่ระบบก่อน');
    }

    if (!user.role) {
      throw new ForbiddenException('คุณไม่มี role ที่ถูกต้อง');
    }

    // เช็คว่า user.role อยู่ใน requiredRoles หรือไม่ (case-insensitive)
    const userRole = user.role.toUpperCase();
    const hasRole = requiredRoles.some(
      (role) => role.toUpperCase() === userRole,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (ต้องมี role: ${requiredRoles.join(', ')})`,
      );
    }

    return true;
  }
}

