import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

// Try to import TerminusModule, fallback if not available
let TerminusModule: any;
try {
  const terminus = require('@nestjs/terminus');
  TerminusModule = terminus.TerminusModule;
} catch (error) {
  console.warn('⚠️  @nestjs/terminus not installed. Health checks will be limited.');
  TerminusModule = class TerminusModule {};
}

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule.forFeature([]), // Required for TypeOrmHealthIndicator (if Terminus is installed)
  ],
  controllers: [HealthController],
})
export class HealthModule {}
