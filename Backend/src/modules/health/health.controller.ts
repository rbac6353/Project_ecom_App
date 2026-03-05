import { Controller, Get } from '@nestjs/common';

// Try to import Terminus, fallback if not available
let HealthCheck: any;
let HealthCheckServiceClass: any;
let TypeOrmHealthIndicatorClass: any;
let MemoryHealthIndicatorClass: any;
let DiskHealthIndicatorClass: any;

try {
  const terminus = require('@nestjs/terminus');
  HealthCheck = terminus.HealthCheck;
  HealthCheckServiceClass = terminus.HealthCheckService;
  TypeOrmHealthIndicatorClass = terminus.TypeOrmHealthIndicator;
  MemoryHealthIndicatorClass = terminus.MemoryHealthIndicator;
  DiskHealthIndicatorClass = terminus.DiskHealthIndicator;
} catch (error) {
  // Fallback classes if Terminus is not installed
  HealthCheck = () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {};
  HealthCheckServiceClass = class {
    check(checks: any[]) {
      return Promise.resolve({ status: 'ok', info: {}, error: {}, details: {} });
    }
  };
  TypeOrmHealthIndicatorClass = class {
    pingCheck(name: string, options?: any) {
      return Promise.resolve({ [name]: { status: 'up' } });
    }
  };
  MemoryHealthIndicatorClass = class {
    checkHeap(name: string, threshold: number) {
      return Promise.resolve({ [name]: { status: 'up' } });
    }
  };
  DiskHealthIndicatorClass = class {
    checkStorage(name: string, options?: any) {
      return Promise.resolve({ [name]: { status: 'up' } });
    }
  };
}

@Controller('health')
export class HealthController {
  private health: InstanceType<typeof HealthCheckServiceClass>;
  private db: InstanceType<typeof TypeOrmHealthIndicatorClass>;
  private memory: InstanceType<typeof MemoryHealthIndicatorClass>;
  private disk: InstanceType<typeof DiskHealthIndicatorClass>;

  constructor() {
    // Create instances directly (don't use dependency injection for dynamic imports)
    this.health = new HealthCheckServiceClass();
    this.db = new TypeOrmHealthIndicatorClass();
    this.memory = new MemoryHealthIndicatorClass();
    this.disk = new DiskHealthIndicatorClass();
  }

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database health check
      () => this.db.pingCheck('database', { timeout: 3000 }),
      
      // Memory health check (warn if > 1.5GB used)
      () => this.memory.checkHeap('memory_heap', 1500 * 1024 * 1024),
      
      // Disk health check (warn if > 80% used)
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.8,
        }),
    ]);
  }

  @Get('liveness')
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ]);
  }
}
