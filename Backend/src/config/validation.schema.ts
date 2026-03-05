/**
 * Environment Variables Validation
 * 
 * Note: NestJS ConfigModule doesn't support Joi validation directly in v3.2.0
 * We'll validate manually in app.module.ts or use a custom validation approach
 * 
 * Required Environment Variables:
 * - DB_HOST, DB_USERNAME, DB_PASSWORD (min 8 chars), DB_DATABASE
 * - JWT_SECRET (min 32 chars for security)
 * 
 * Optional:
 * - NODE_ENV (development|production|test)
 * - PORT (default: 3000)
 * - ALLOWED_ORIGINS (comma-separated)
 * - CLOUDINARY_*, MAIL_*
 * - PROMPTPAY_ID (สำหรับเบอร์โทร/เลขบัตรประชาชน)
 * - EASYSLIP_API_KEY (สำหรับ API Key ของ EasySlip)
 * - SMS_SECRET_KEY (สำหรับ SMS Webhook authentication)
 */

export const validateEnv = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  
  const required = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  // In production, throw error for missing variables
  // In development/test, only warn (allows for .env file to be loaded later by ConfigModule)
  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    
    if (isProduction) {
      throw new Error(message);
    } else {
      console.warn(`⚠️  WARNING: ${message}`);
      console.warn('   This is OK in development mode. Make sure to set these in your .env file.');
      console.warn('   The ConfigModule will load .env file when the app starts.');
    }
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security!');
    if (isProduction) {
      throw new Error('JWT_SECRET must be at least 32 characters long in production!');
    }
  }

  // Validate DB_PASSWORD length
  if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.length < 8) {
    console.warn('⚠️  WARNING: DB_PASSWORD should be at least 8 characters long!');
    if (isProduction) {
      throw new Error('DB_PASSWORD must be at least 8 characters long in production!');
    }
  }

  // Validate NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Must be one of: ${validEnvs.join(', ')}`);
  }
};
