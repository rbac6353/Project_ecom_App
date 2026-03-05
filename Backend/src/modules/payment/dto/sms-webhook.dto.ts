import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO สำหรับรับ SMS Webhook จาก Mobile App
 */
export class SmsWebhookDto {
  @IsString()
  @IsNotEmpty()
  sender: string; // ชื่อธนาคาร (เช่น "KBANK", "SCB", "BBL")

  @IsString()
  @IsNotEmpty()
  message: string; // ข้อความ SMS (เช่น "คุณได้รับโอนเงิน 500.00 บาท จากนายทดสอบ เวลา 12:00 น.")

  @IsOptional()
  @IsString()
  timestamp?: string; // เวลาที่ได้รับ SMS (optional)

  @IsString()
  @IsOptional()
  receivedAt?: string; // เวลาที่ได้รับ SMS จาก Mobile App (optional)
}
