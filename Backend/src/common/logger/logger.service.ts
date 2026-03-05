import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { Logger } from '@nestjs/common';

/**
 * Structured Logging Service
 * 
 * Provides consistent logging format across the application
 * with context, timestamps, and log levels
 */
@Injectable()
export class AppLogger implements NestLoggerService {
  private readonly logger: Logger;

  constructor(context?: string) {
    this.logger = new Logger(context || 'App');
  }

  /**
   * Log informational message
   */
  log(message: string, context?: string) {
    this.logger.log(message, context);
  }

  /**
   * Log error with stack trace
   */
  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, trace, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: string) {
    this.logger.warn(message, context);
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: string) {
    this.logger.debug(message, context);
  }

  /**
   * Log verbose message
   */
  verbose(message: string, context?: string) {
    this.logger.verbose(message, context);
  }

  /**
   * Log with structured data
   */
  logWithData(
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    data?: Record<string, any>,
    context?: string,
  ) {
    const logMessage = data
      ? `${message} ${JSON.stringify(data)}`
      : message;
    
    switch (level) {
      case 'error':
        this.error(logMessage, undefined, context);
        break;
      case 'warn':
        this.warn(logMessage, context);
        break;
      case 'debug':
        this.debug(logMessage, context);
        break;
      case 'verbose':
        this.verbose(logMessage, context);
        break;
      default:
        this.log(logMessage, context);
    }
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): AppLogger {
  return new AppLogger(context);
}
