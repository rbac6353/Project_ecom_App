import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { Banner } from '@core/database/entities';
import { CloudinaryModule } from '@modules/storage/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Banner]),
    CloudinaryModule,
  ],
  controllers: [BannersController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule {}

