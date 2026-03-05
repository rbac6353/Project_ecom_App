import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { FaqsService } from './faqs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Get() // Public API ใครก็ดูได้
  findAll() {
    return this.faqsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) // Admin Only
  @Post()
  create(@Body() body: any) {
    return this.faqsService.create(body);
  }
}

