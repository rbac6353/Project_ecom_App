import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AskProductDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุคำถาม' })
  @MaxLength(500, { message: 'คำถามยาวเกินไป (สูงสุด 500 ตัวอักษร)' })
  question: string;
}
