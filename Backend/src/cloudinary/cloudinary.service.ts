import { Injectable, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  constructor() {
    // ตั้งค่า Cloudinary config ใน constructor เพื่อให้แน่ใจว่าถูกเรียกก่อนใช้งาน
    this.configureCloudinary();
  }

  onModuleInit() {
    // ตั้งค่า Cloudinary config อีกครั้งเมื่อ module ถูก initialize (เพื่อความแน่ใจ)
    this.configureCloudinary();
  }

  private configureCloudinary() {
    try {
      if (process.env.CLOUDINARY_URL) {
        // Parse CLOUDINARY_URL เองเพื่อให้แน่ใจว่าถูกต้อง
        // รูปแบบ: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
        console.log('🔧 Configuring Cloudinary with CLOUDINARY_URL');
        const url = process.env.CLOUDINARY_URL;

        // Parse URL: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
        const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
        if (match) {
          const [, apiKey, apiSecret, cloudName] = match;
          cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
          });
          console.log('✅ Cloudinary configured successfully (parsed from URL)');
          console.log(`   Cloud Name: ${cloudName}`);
          console.log(`   API Key: ${apiKey.substring(0, 6)}...`);
        } else {
          // ถ้า parse ไม่ได้ ให้ลองใช้ url parameter ตรงๆ
          console.warn('⚠️ Could not parse CLOUDINARY_URL, trying direct config...');
          cloudinary.config({
            url: url,
          });
          console.log('✅ Cloudinary configured with URL (direct)');
        }
      } else if (
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ) {
        // ใช้แยกเป็น 3 ตัวแปร
        console.log('🔧 Configuring Cloudinary with separate credentials');
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        console.log('✅ Cloudinary configured successfully with separate credentials');
      } else {
        console.error('❌ Cloudinary credentials not found!');
        console.error('   CLOUDINARY_URL:', process.env.CLOUDINARY_URL ? '✅ Set' : '❌ Missing');
        console.error('   CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
        console.error('   CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
        console.error('   CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');
      }

      // ตรวจสอบว่า config ถูกตั้งค่าจริงๆ
      const config = cloudinary.config();
      if (!config.cloud_name || !config.api_key || !config.api_secret) {
        console.error('❌ Cloudinary config is incomplete!');
        console.error('   Config:', {
          cloud_name: config.cloud_name || '❌ Missing',
          api_key: config.api_key || '❌ Missing',
          api_secret: config.api_secret ? '***' : '❌ Missing',
        });
      } else {
        console.log('✅ Cloudinary config verified:', {
          cloud_name: config.cloud_name,
          api_key: config.api_key.substring(0, 6) + '...',
          api_secret: '***',
        });
      }
    } catch (error) {
      console.error('❌ Error configuring Cloudinary:', error);
    }
  }

  async uploadImage(file: any): Promise<any> {
    // ตรวจสอบว่า config ถูกตั้งค่าแล้วหรือไม่
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      // ถ้ายังไม่ได้ config ให้ config อีกครั้ง
      console.warn('⚠️ Cloudinary config not found, reconfiguring...');
      this.configureCloudinary();

      // ตรวจสอบอีกครั้งหลังจาก config
      const newConfig = cloudinary.config();
      if (!newConfig.cloud_name || !newConfig.api_key || !newConfig.api_secret) {
        throw new Error('Cloudinary configuration failed. Please check your CLOUDINARY_URL or credentials in .env file.');
      }
    }

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'gtxshop', // จัดเก็บในโฟลเดอร์ gtxshop
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            return reject(error);
          }
          resolve(result);
        },
      );

      // แปลง Buffer เป็น Stream แล้วส่งไป Cloudinary
      streamifier.createReadStream(file.buffer).pipe(upload);
    });
  }

  // ✅ อัปโหลดรูปภาพจาก Base64 encoded string (สำหรับ Android ที่ไม่สามารถใช้ FormData ได้)
  async uploadBase64Image(base64String: string): Promise<any> {
    // ตรวจสอบว่า config ถูกตั้งค่าแล้วหรือไม่
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      console.warn('⚠️ Cloudinary config not found, reconfiguring...');
      this.configureCloudinary();

      const newConfig = cloudinary.config();
      if (!newConfig.cloud_name || !newConfig.api_key || !newConfig.api_secret) {
        throw new Error('Cloudinary configuration failed. Please check your CLOUDINARY_URL or credentials in .env file.');
      }
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        base64String,
        {
          folder: 'gtxshop',
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary base64 upload error:', error);
            return reject(error);
          }
          console.log('✅ Base64 image uploaded successfully:', result?.secure_url);
          resolve(result);
        },
      );
    });
  }
}

