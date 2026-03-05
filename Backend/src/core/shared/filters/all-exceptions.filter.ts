import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get error message
    const message =
      exception instanceof HttpException
        ? (typeof exception.getResponse() === 'string'
            ? exception.getResponse()
            : (exception.getResponse() as any).message) || exception.message
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    // Log the error for debugging
    console.error('❌ Unhandled Exception:', {
      status,
      message,
      path: request.url,
      method: request.method,
      userId: (request as any).user?.id,
      error: exception instanceof Error ? exception.stack : exception,
    });

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    response.status(status).json(errorResponse);
  }
}

