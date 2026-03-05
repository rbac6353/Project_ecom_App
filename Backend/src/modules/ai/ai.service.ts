import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `คุณคือผู้ช่วยขายของอัจฉริยะ ตอบคำถามลูกค้าเกี่ยวกับสินค้านี้โดยใช้ข้อมูลที่ให้ หากข้อมูลไม่เพียงพอ สามารถใช้ความรู้ทั่วไปเกี่ยวกับสินค้านั้นได้ (เช่น แคลอรี่, วิธีใช้) แต่ต้องแจ้งลูกค้าว่าเป็นการประมาณการ ตอบสั้นๆ กระชับ และเป็นมิตร`;

export interface ProductForAi {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  discountPrice?: number | null;
  quantity?: number;
  category?: { name: string } | null;
  variants?: Array<{
    name: string;
    price?: number | null;
    stock?: number;
    attributes?: Record<string, string> | null;
  }> | null;
}

/** โมเดลที่ลองตามลำดับ ถ้า GEMINI_MODEL ไม่ได้ตั้ง หรือใช้แล้ว 404 */
const FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-pro'];

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string = '';
  private resolvedModel: string | null = null;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ai.geminiApiKey');
    if (key && key.trim()) {
      this.apiKey = key.trim();
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  /** ดึงชื่อโมเดลตัวแรกที่รองรับ generateContent จาก API */
  private async fetchAvailableModel(): Promise<string> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.apiKey)}`,
    );
    if (!res.ok) throw new Error(`List models failed: ${res.status}`);
    const json = (await res.json()) as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
    const models = json.models || [];
    const forGenerate = models.find(
      (m) => m.supportedGenerationMethods?.includes('generateContent'),
    );
    if (!forGenerate?.name) throw new Error('No model with generateContent found');
    // name เป็น "models/gemini-2.0-flash" -> ใช้แค่ "gemini-2.0-flash"
    return forGenerate.name.replace(/^models\//, '');
  }

  private buildProductContext(product: ProductForAi): string {
    const lines: string[] = [
      `ชื่อสินค้า: ${product.title}`,
      `ราคา: ${product.price} บาท`,
    ];
    if (product.discountPrice != null) {
      lines.push(`ราคาพิเศษ: ${product.discountPrice} บาท`);
    }
    if (product.description) {
      lines.push(`รายละเอียด: ${product.description}`);
    }
    if (product.category?.name) {
      lines.push(`หมวดหมู่: ${product.category.name}`);
    }
    if (product.variants && product.variants.length > 0) {
      const variantLines = product.variants.map((v) => {
        let s = `- ${v.name}`;
        if (v.price != null) s += ` ราคา ${v.price} บาท`;
        if (v.stock != null) s += ` สต็อก ${v.stock}`;
        if (v.attributes && Object.keys(v.attributes).length > 0) {
          s += ` (${JSON.stringify(v.attributes)})`;
        }
        return s;
      });
      lines.push('ตัวเลือก/รุ่น:', ...variantLines);
    }
    return lines.join('\n');
  }

  async askAboutProduct(product: ProductForAi, question: string): Promise<string> {
    if (!this.genAI) {
      throw new BadRequestException(
        'AI Product Assistant ยังไม่ได้ตั้งค่า (ไม่มี GEMINI_API_KEY) กรุณาติดต่อผู้ดูแลระบบ',
      );
    }

    const productContext = this.buildProductContext(product);
    const userPrompt = `[ข้อมูลสินค้า]\n${productContext}\n\n[คำถามลูกค้า]\n${question}`;

    const configModel = this.configService.get<string>('ai.geminiModel')?.trim();
    let modelName = configModel || this.resolvedModel;

    try {
      if (!modelName) {
        try {
          modelName = await this.fetchAvailableModel();
          this.resolvedModel = modelName;
          console.log('[AiService] Using model from API list:', modelName);
        } catch (e) {
          console.warn('[AiService] List models failed, trying fallbacks:', (e as Error)?.message);
          modelName = FALLBACK_MODELS[0];
        }
      }

      const model = this.genAI!.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
      });
      const result = await model.generateContent(userPrompt);
      const response = result.response;
      const rawText = typeof response.text === 'function' ? response.text() : response.text;
      const text = (rawText ?? '').toString().trim();
      if (!text) {
        return 'ขออภัย ตอนนี้ตอบคำถามไม่ได้ กรุณาลองใหม่อีกครั้ง';
      }
      return text;
    } catch (err: any) {
      const is404 = String(err?.message || '').includes('404') || String(err?.message || '').includes('not found');
      if (is404 && modelName) {
        this.resolvedModel = null;
        const fallbacks = configModel ? [] : FALLBACK_MODELS.filter((m) => m !== modelName);
        for (const next of fallbacks) {
          try {
            const model = this.genAI!.getGenerativeModel({ model: next, systemInstruction: SYSTEM_PROMPT });
            const result = await model.generateContent(userPrompt);
            const response = result.response;
            const rawText = typeof response.text === 'function' ? response.text() : response.text;
            const text = (rawText ?? '').toString().trim();
            if (text) {
              this.resolvedModel = next;
              console.log('[AiService] Using fallback model:', next);
              return text;
            }
          } catch {
            continue;
          }
        }
        try {
          modelName = await this.fetchAvailableModel();
          this.resolvedModel = modelName;
          const model = this.genAI!.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });
          const result = await model.generateContent(userPrompt);
          const response = result.response;
          const rawText = typeof response.text === 'function' ? response.text() : response.text;
          const text = (rawText ?? '').toString().trim();
          if (text) return text;
        } catch {
          // fall through to user-friendly error
        }
      }
      console.error('[AiService] askAboutProduct error:', err?.message ?? err);
      const msg = (err?.message || String(err)).toLowerCase();
      // ไม่ส่งข้อความเทคนิค (URL, stack) ให้ผู้ใช้ เหลือแค่ข้อความที่เข้าใจได้
      if (msg.includes('api_key') || msg.includes('403') || msg.includes('401') || msg.includes('invalid')) {
        throw new BadRequestException(
          'AI Product Assistant ตั้งค่า API ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ',
        );
      }
      if (
        msg.includes('fetch') ||
        msg.includes('econnrefused') ||
        msg.includes('etimedout') ||
        msg.includes('network') ||
        msg.includes('generativelanguage')
      ) {
        throw new BadRequestException(
          'เชื่อมต่อบริการ AI ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตหรือลองใหม่ในภายหลัง',
        );
      }
      throw new BadRequestException(
        'บริการ AI ขณะนี้ไม่พร้อม กรุณาลองใหม่ในภายหลัง',
      );
    }
  }
}
