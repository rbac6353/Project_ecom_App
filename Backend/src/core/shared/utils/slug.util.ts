import slugify from 'slugify';
import { Repository } from 'typeorm';

/**
 * แผนที่ภาษาไทย -> ตัวอักษรโรมัน (สำหรับ fallback เมื่อ slugify คืนค่าว่าง)
 */
const THAI_TO_LATIN: Record<string, string> = {
  '\u0E01': 'k', '\u0E02': 'kh', '\u0E04': 'kh', '\u0E07': 'ng', '\u0E08': 'ch', '\u0E09': 'ch', '\u0E0A': 'ch', '\u0E0B': 's', '\u0E0C': 'ch',
  '\u0E0D': 'y', '\u0E0E': 'd', '\u0E0F': 't', '\u0E10': 'th', '\u0E11': 'th', '\u0E12': 'th', '\u0E13': 'n', '\u0E14': 'd', '\u0E15': 't', '\u0E16': 'th',
  '\u0E17': 'th', '\u0E18': 'th', '\u0E19': 'n', '\u0E1A': 'b', '\u0E1B': 'p', '\u0E1C': 'ph', '\u0E1D': 'f', '\u0E1E': 'ph', '\u0E1F': 'f', '\u0E20': 'ph',
  '\u0E21': 'm', '\u0E22': 'y', '\u0E23': 'r', '\u0E25': 'l', '\u0E27': 'w', '\u0E28': 's', '\u0E29': 's', '\u0E2A': 's', '\u0E2B': 'h', '\u0E2C': 'l',
  '\u0E2D': '', '\u0E2E': 'h', '\u0E30': 'a', '\u0E32': 'a', '\u0E33': 'am', '\u0E34': 'i', '\u0E35': 'i', '\u0E36': 'ue', '\u0E37': 'ue', '\u0E38': 'u', '\u0E39': 'u',
  '\u0E40': 'e', '\u0E41': 'ae', '\u0E42': 'o', '\u0E43': 'ai', '\u0E44': 'ai', '\u0E2F': '', '\u0E46': '', '\u0E50': '0', '\u0E51': '1', '\u0E52': '2',
  '\u0E53': '3', '\u0E54': '4', '\u0E55': '5', '\u0E56': '6', '\u0E57': '7', '\u0E58': '8', '\u0E59': '9',
};

function thaiToLatin(text: string): string {
  return text
    .split('')
    .map((char) => THAI_TO_LATIN[char] ?? (char.match(/[a-zA-Z0-9\s\-]/) ? char : ''))
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * สร้าง slug จากข้อความ (รองรับภาษาไทย)
 * - ใช้ slugify ก่อน (lower, strict)
 * - ถ้าได้ค่าว่างหรือสั้นเกินไป ใช้การแปลงภาษาไทยเป็นโรมัน (transliteration แบบ map)
 * - ถ้ายังว่าง ใช้ fallback เป็น 'item' เพื่อไม่ให้ slug เป็นค่าว่าง
 */
export function generateSlugFromText(text: string): string {
  if (!text || typeof text !== 'string') return 'item';
  const trimmed = text.trim();
  if (!trimmed) return 'item';

  let base = slugify(trimmed, {
    lower: true,
    strict: true,
    replacement: '-',
    trim: true,
  });

  if (!base || base.length < 2) {
    const latin = thaiToLatin(trimmed);
    base = slugify(latin || trimmed, {
      lower: true,
      strict: true,
      replacement: '-',
      trim: true,
    });
  }
  if (!base || base.length < 2) base = 'item';
  return base;
}

/**
 * ทำให้ slug ไม่ซ้ำในตาราง
 * - เช็คใน DB ว่ามี slug นี้แล้วหรือยัง (ยกเว้น id ที่ส่งมาในกรณี update)
 * - ถ้าซ้ำ ให้เติม suffix -1, -2, -3 ... จนกว่าจะไม่ซ้ำ (หรือใช้ random string สั้นๆ เป็นทางเลือก)
 */
export async function ensureUniqueSlug(
  repo: Repository<any>,
  slug: string,
  id?: number,
): Promise<string> {
  let candidate = slug;
  let suffix = 0;
  const maxAttempts = 100;

  while (suffix < maxAttempts) {
    const qb = repo.createQueryBuilder('e').where('e.slug = :slug', { slug: candidate });
    if (id != null) {
      qb.andWhere('e.id != :id', { id });
    }
    const existing = await qb.getOne();
    if (!existing) return candidate;
    suffix++;
    candidate = `${slug}-${suffix}`;
  }

  return `${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
