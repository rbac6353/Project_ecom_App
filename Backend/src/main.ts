import { join } from 'path';
import { existsSync } from 'fs';
// ✅ โหลด .env ก่อนทุกอย่าง — รันจาก dist/src → Backend/.env อยู่ที่ ../..
const envPaths = [
  join(__dirname, '..', '..', '.env'),
  join(__dirname, '..', '.env'),
  join(process.cwd(), '.env'),
];
const envPath = envPaths.find(existsSync) || envPaths[2];
require('dotenv').config({ path: envPath });
if (process.env.STRIPE_SECRET_KEY) {
  console.log('💳 Stripe: API key loaded (payments enabled)');
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not found in .env — ชำระเงินบัตรเครดิตจะล้มเหลว');
}

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter, AllExceptionsFilter } from '@core/shared/filters';
import { TransformInterceptor } from '@core/shared/interceptors';
import { createValidationPipe } from '@core/shared/pipes';
import { initSentry } from '@config/sentry.config';
import { SentryInterceptor } from '@common/interceptors/sentry.interceptor';

// ✅ Initialize Sentry before creating the app
initSentry();

async function bootstrap() {
  // เปลี่ยนเป็น NestExpressApplication เพื่อใช้ static assets
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // เปิดใช้งาน Helmet เพื่อความปลอดภัย
  app.use(helmet({
    crossOriginResourcePolicy: false, // อนุญาตให้โหลดรูปภาพข้าม Domain ได้ (จำเป็นสำหรับ Mobile App)
  }));

  // Enable CORS for React Native (ปรับให้ปลอดภัยขึ้น)
  const configService = app.get(ConfigService);
  const allowedOrigins = configService.get<string[]>('app.allowedOrigins') || ['http://localhost:8081'];
  const nodeEnv = configService.get<string>('app.nodeEnv') || 'development';
  
  app.enableCors({
    origin: nodeEnv === 'production' 
      ? allowedOrigins // ใน Production ใช้ whitelist
      : true, // ใน Development อนุญาตทั้งหมด (เพื่อความสะดวกในการพัฒนา)
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global Exception Filters (order matters - AllExceptionsFilter should be last)
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Interceptors
  app.useGlobalInterceptors(
    new SentryInterceptor(), // ✅ Sentry error tracking (should be first)
    new TransformInterceptor(), // Transform responses
  );

  // Global Validation Pipe
  app.useGlobalPipes(createValidationPipe());

  // เปิดให้เข้าถึงโฟลเดอร์ /uploads ผ่าน URL http://localhost:3000/uploads/...
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // พอร์ตจาก Render (process.env.PORT) หรือ config / 3000 — รับแขกที่ 0.0.0.0 เพื่อให้ Cloud ผ่าน
  const port = parseInt(process.env.PORT || '0', 10) || configService.get<number>('app.port') || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 NestJS application is running on port ${port}`);
  console.log(`📸 Visual Search endpoint: POST http://localhost:${port}/products/visual-search`);
  console.log(`📁 Static files available at: http://localhost:${port}/uploads/`);
}

bootstrap();

