import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

export const createValidationPipe = (
  options?: ValidationPipeOptions,
): ValidationPipe => {
  return new ValidationPipe({
    whitelist: true, // Strip properties that don't have decorators
    forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
    transform: true, // Automatically transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true, // Enable implicit type conversion
    },
    ...options, // Allow override of default options
  });
};

