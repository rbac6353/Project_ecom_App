import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Sentry Interceptor
 * 
 * Captures exceptions and sends them to Sentry for error tracking
 */
@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Only capture non-HTTP exceptions or 5xx errors
        if (
          !(error instanceof HttpException) ||
          error.getStatus() >= HttpStatus.INTERNAL_SERVER_ERROR
        ) {
          // Try to capture exception with Sentry (if installed)
          try {
            const Sentry = require('@sentry/node');
            Sentry.captureException(error, {
              tags: {
                path: context.switchToHttp().getRequest().url,
                method: context.switchToHttp().getRequest().method,
              },
              extra: {
                body: context.switchToHttp().getRequest().body,
                query: context.switchToHttp().getRequest().query,
                params: context.switchToHttp().getRequest().params,
              },
            });
          } catch (sentryError) {
            // Sentry not installed or not configured, ignore
          }
        }

        return throwError(() => error);
      }),
    );
  }
}
