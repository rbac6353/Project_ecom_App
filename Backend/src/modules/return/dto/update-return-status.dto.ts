import { IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';
import { OrderReturnStatus } from '@core/database/entities';

export class UpdateReturnStatusDto {
  @IsEnum(OrderReturnStatus)
  status: OrderReturnStatus;

  @IsOptional()
  @IsNumber()
  refundAmount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}


