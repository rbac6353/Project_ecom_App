import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * File Upload Validation Configuration
 * 
 * Security Best Practices:
 * - Limit file size (5MB per file)
 * - Validate MIME types (only images)
 * - Limit number of files
 */
export const fileUploadOptions: MulterOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 50, // Maximum 50 files
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    // ✅ Only allow image files
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          `File type ${file.mimetype} not allowed. Only images (JPEG, PNG, GIF, WebP) are allowed.`
        ),
        false
      );
    }

    // ✅ Check file extension as additional security
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = file.originalname.toLowerCase().match(/\.[0-9a-z]+$/)?.[0];
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return cb(
        new BadRequestException(
          `File extension not allowed. Only ${allowedExtensions.join(', ')} are allowed.`
        ),
        false
      );
    }

    cb(null, true);
  },
};

/**
 * Custom File Upload Interceptor with Validation
 * 
 * Usage:
 * @UseInterceptors(FileUploadInterceptor)
 * @Post('upload')
 */
@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const files = request.files || request.file ? [request.file] : [];

    // ✅ Additional validation after multer processing
    if (files && files.length > 0) {
      for (const file of files) {
        // Check file size (additional check)
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('File size exceeds 5MB limit');
        }

        // Check MIME type (additional check)
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          throw new BadRequestException(`Invalid file type: ${file.mimetype}`);
        }
      }
    }

    return next.handle();
  }
}
