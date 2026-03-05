# Monitoring & Error Tracking Setup Guide

## 📊 Sentry Error Tracking

Sentry provides real-time error tracking and performance monitoring for your application.

### Setup Steps

1. **Create a Sentry Account**
   - Go to https://sentry.io/signup/
   - Create a new project (select Node.js/NestJS)

2. **Get Your DSN**
   - After creating the project, copy your DSN
   - It looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

3. **Add DSN to Environment Variables**
   ```bash
   # Backend/.env
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   APP_VERSION=1.0.0
   ```

4. **Features Enabled**
   - ✅ Error tracking (automatic exception capture)
   - ✅ Performance monitoring (10% sampling in production)
   - ✅ Profiling (10% sampling in production)
   - ✅ Release tracking
   - ✅ Environment tagging

### What Gets Tracked

- **Errors**: All unhandled exceptions and 5xx HTTP errors
- **Performance**: Request duration, database queries
- **Context**: Request URL, method, body, query params
- **User Context**: User ID (if authenticated)

### Filtering

The following errors are filtered out (not sent to Sentry):
- `BadRequestException` (400)
- `UnauthorizedException` (401)
- `NotFoundException` (404)
- Test environment errors

## 📈 Performance Monitoring

### Built-in Middleware

The `PerformanceMiddleware` logs:
- Request duration
- Slow requests (> 1 second)
- All requests in development mode

### Integration with Monitoring Services

To integrate with external monitoring services (DataDog, New Relic, etc.):

1. **Install the monitoring SDK**
   ```bash
   npm install --save datadog-metrics
   # or
   npm install --save newrelic
   ```

2. **Update `performance.middleware.ts`**
   ```typescript
   import * as metrics from 'datadog-metrics';
   
   // In the middleware
   metrics.histogram('http.request.duration', duration, {
     method,
     route: originalUrl,
     status: statusCode,
   });
   ```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Test Coverage

Current coverage targets:
- Services: 80%+
- Controllers: 70%+
- Critical paths: 90%+

## 📝 Logging

### Structured Logging

Use the `AppLogger` service for structured logging:

```typescript
import { AppLogger } from '@common/logger/logger.service';

constructor(private readonly logger: AppLogger) {}

this.logger.log('User created', 'UsersService');
this.logger.error('Failed to create user', error.stack, 'UsersService');
this.logger.warn('Low stock', 'ProductsService');
```

### Log Levels

- `log`: General information
- `error`: Errors and exceptions
- `warn`: Warnings
- `debug`: Debug information (development only)
- `verbose`: Verbose information (development only)

## 🔍 Health Checks

Health check endpoints are available at:
- `GET /health` - Full health check (database, memory, disk)
- `GET /health/liveness` - Liveness probe (simple check)
- `GET /health/readiness` - Readiness probe (database check)

Use these endpoints for:
- Kubernetes liveness/readiness probes
- Load balancer health checks
- Monitoring system checks

## 📊 Metrics to Monitor

### Application Metrics
- Request rate (requests/second)
- Error rate (errors/second)
- Response time (p50, p95, p99)
- Active connections

### Database Metrics
- Query duration
- Connection pool usage
- Slow queries (> 1 second)

### System Metrics
- CPU usage
- Memory usage
- Disk usage
- Network I/O

## 🚨 Alerting

### Recommended Alerts

1. **Error Rate**
   - Alert if error rate > 1% for 5 minutes

2. **Response Time**
   - Alert if p95 response time > 2 seconds for 5 minutes

3. **Database**
   - Alert if connection pool > 80% full
   - Alert if slow queries > 10/minute

4. **System**
   - Alert if CPU > 80% for 5 minutes
   - Alert if memory > 90%
   - Alert if disk > 85%

## 📚 Resources

- [Sentry Documentation](https://docs.sentry.io/platforms/node/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
