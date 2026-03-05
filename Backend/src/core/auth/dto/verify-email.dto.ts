import { IsString, IsEmail, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'กรุณากรอกอีเมลที่ถูกต้อง' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'รหัส OTP ต้องมี 6 หลัก' })
  @Matches(/^\d{6}$/, { message: 'รหัส OTP ต้องเป็นตัวเลข 6 หลัก' })
  otp: string;
}
