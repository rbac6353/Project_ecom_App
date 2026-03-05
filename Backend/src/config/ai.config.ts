import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  /** ชื่อโมเดล (เช่น gemini-2.0-flash). ว่างไว้จะดึงจาก List Models อัตโนมัติ */
  geminiModel: process.env.GEMINI_MODEL || '',
}));
