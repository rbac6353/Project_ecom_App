import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override canActivate เพื่อไม่ throw error ถ้าไม่มี token
  canActivate(context: ExecutionContext) {
    // เรียก parent canActivate แต่ไม่ throw error ถ้าไม่มี token
    return super.canActivate(context) as Promise<boolean>;
  }

  // Override handleRequest เพื่อไม่ throw error ถ้าไม่มี token
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // ถ้ามี error หรือไม่มี user ก็ return undefined (ไม่ throw error)
    // ไม่ throw error แม้ว่าจะไม่มี token หรือ token หมดอายุ
    if (err || !user || info) {
      return undefined;
    }
    return user;
  }
}

