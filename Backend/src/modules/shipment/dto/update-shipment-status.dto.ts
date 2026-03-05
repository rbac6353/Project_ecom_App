import { IsEnum, IsOptional, IsString, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ShipmentStatus } from '@core/database/entities';

class LocationDto {
  @Type(() => Number)
  lat: number;

  @Type(() => Number)
  lng: number;
}

export class UpdateShipmentStatusDto {
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;

  @IsOptional()
  @IsString()
  proofImage?: string;

  @IsOptional()
  @IsString()
  signatureImage?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsBoolean()
  collectedCod?: boolean;

  @IsOptional()
  @IsString()
  failedReason?: string;
}

