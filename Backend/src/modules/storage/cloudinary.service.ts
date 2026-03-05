import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  constructor(private configService: ConfigService) {
    // ตั้งค่า Cloudinary config ใน constructor เพื่อให้แน่ใจว่าถูกเรียกก่อนใช้งาน
    this.configureCloudinary();
  }

  onModuleInit() {
    // ตั้งค่า Cloudinary config อีกครั้งเมื่อ module ถูก initialize (เพื่อความแน่ใจ)
    this.configureCloudinary();
  }

  private configureCloudinary() {
    try {
      const cloudName = this.configService.get<string>('cloudinary.cloudName');
      const apiKey = this.configService.get<string>('cloudinary.apiKey');
      const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

      if (cloudName && apiKey && apiSecret) {
        console.log('🔧 Configuring Cloudinary with separate credentials');
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        });
        console.log('✅ Cloudinary configured successfully with separate credentials');
      } else {
        console.error('❌ Cloudinary credentials not found!');
        console.error('   cloudinary.cloudName:', cloudName ? '✅ Set' : '❌ Missing');
        console.error('   cloudinary.apiKey:', apiKey ? '✅ Set' : '❌ Missing');
        console.error('   cloudinary.apiSecret:', apiSecret ? '✅ Set' : '❌ Missing');
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
        throw new Error('Cloudinary configuration failed. Please check your cloudinary config in .env file.');
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

  /** อัปโหลดรูปจาก Base64 (ใช้เมื่อแอปส่ง logoBase64 แทนไฟล์) */
  async uploadBase64Image(base64String: string): Promise<any> {
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      this.configureCloudinary();
      const newConfig = cloudinary.config();
      if (!newConfig.cloud_name || !newConfig.api_key || !newConfig.api_secret) {
        throw new Error('Cloudinary configuration failed. Check .env cloudinary settings.');
      }
    }
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        base64String,
        { folder: 'gtxshop' },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary base64 upload error:', error);
            return reject(error);
          }
          console.log('✅ Base64 image uploaded:', result?.secure_url);
          resolve(result);
        },
      );
    });
  }
}

