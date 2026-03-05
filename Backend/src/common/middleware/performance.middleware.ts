import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Performance Monitoring Middleware
 * 
 * Logs request duration and can be extended to send metrics to monitoring services
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl } = req;

    // Log when response finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      // Log slow requests (> 1 second)
      if (duration > 1000) {
        this.logger.warn(
          `Slow request: ${method} ${originalUrl} - ${duration}ms - ${statusCode}`,
        );
      }

      // Log all requests in development
      if (process.env.NODE_ENV === 'development') {
        this.logger.log(
          `${method} ${originalUrl} - ${duration}ms - ${statusCode}`,
        );
      }

      // TODO: Send metrics to monitoring service (e.g., DataDog, New Relic)
      // Example:
      // metrics.histogram('http.request.duration', duration, {
      //   method,
      //   route: originalUrl,
      //   status: statusCode,
      // });
    });

    next();
  }
}
