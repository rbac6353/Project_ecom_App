/**
 * Script ทดสอบ Slug Backfill API
 * - Login Admin เพื่อขอ Token
 * - ยิง POST /categories/admin/backfill-slugs
 * - ยิง POST /products/admin/backfill-slugs
 * - แสดงผลลัพธ์ (จำนวนรายการที่อัปเดต)
 *
 * วิธีรัน:
 *   npx ts-node scripts/test-slug-backfill.ts
 *   หรือใส่ env: BASE_URL=http://localhost:3000 ADMIN_EMAIL=admin@gmail.com ADMIN_PASSWORD=your_password npx ts-node scripts/test-slug-backfill.ts
 *   หรือใช้ Token ตรงๆ: ADMIN_TOKEN=eyJhbGc... npx ts-node scripts/test-slug-backfill.ts
 */

import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password_from_db';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // ถ้ามีจะข้าม Login

async function main() {
  console.log('========================================');
  console.log('  Slug Backfill Test Script');
  console.log('========================================');
  console.log('BASE_URL:', BASE_URL);
  console.log('');

  let token: string;

  if (ADMIN_TOKEN) {
    console.log('[1] ใช้ ADMIN_TOKEN จาก env (ข้าม Login)');
    token = ADMIN_TOKEN;
  } else {
    console.log('[1] Login Admin...');
    try {
      const loginRes = await axios.post<{ access_token?: string; token?: string }>(
        `${BASE_URL}/auth/login`,
        { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      token = loginRes.data?.access_token || (loginRes.data as any)?.token || (loginRes.data as any)?.accessToken;
      if (!token) {
        console.error('❌ Login response ไม่มี token. Response:', JSON.stringify(loginRes.data, null, 2));
        process.exit(1);
      }
      console.log('✅ Login สำเร็จ ได้ Token แล้ว');
    } catch (e: any) {
      const err = e as AxiosError<{ message?: string }>;
      const msg = err.response?.data?.message || err.message || 'Unknown error';
      console.error('❌ Login ล้มเหลว:', msg);
      if (err.response?.status === 401) {
        console.error('   หมายเหตุ: ตรวจสอบ ADMIN_EMAIL และ ADMIN_PASSWORD (หรือใช้ ADMIN_TOKEN ใส่ Token ตรงๆ)');
      }
      process.exit(1);
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  console.log('');
  console.log('[2] Backfill Categories (POST /categories/admin/backfill-slugs)...');
  try {
    const catRes = await axios.post<{ updated: number; total: number; details?: any[] }>(
      `${BASE_URL}/categories/admin/backfill-slugs`,
      {},
      { headers, timeout: 60000 }
    );
    const data = catRes.data;
    console.log('✅ Categories Backfill สำเร็จ');
    console.log('   ผลลัพธ์:', JSON.stringify(data, null, 2));
    console.log('   อัปเดตไปแล้ว:', data.updated, 'รายการ (จากทั้งหมด', data.total, 'รายการที่ slug เป็น NULL)');
  } catch (e: any) {
    const err = e as AxiosError<{ message?: string }>;
    console.error('❌ Categories Backfill ล้มเหลว:', err.response?.data?.message || err.message);
    if (err.response?.status === 403) console.error('   หมายเหตุ: ผู้ใช้อาจไม่มี role admin');
  }

  console.log('');
  console.log('[3] Backfill Products (POST /products/admin/backfill-slugs)...');
  try {
    const prodRes = await axios.post<{ updated: number; total: number; details?: any[] }>(
      `${BASE_URL}/products/admin/backfill-slugs`,
      {},
      { headers, timeout: 120000 }
    );
    const data = prodRes.data;
    console.log('✅ Products Backfill สำเร็จ');
    console.log('   ผลลัพธ์:', JSON.stringify(data, null, 2));
    console.log('   อัปเดตไปแล้ว:', data.updated, 'รายการ (จากทั้งหมด', data.total, 'รายการที่ slug เป็น NULL)');
  } catch (e: any) {
    const err = e as AxiosError<{ message?: string }>;
    console.error('❌ Products Backfill ล้มเหลว:', err.response?.data?.message || err.message);
    if (err.response?.status === 403) console.error('   หมายเหตุ: ผู้ใช้อาจไม่มี role admin');
    process.exit(1);
  }

  console.log('');
  console.log('========================================');
  console.log('  เสร็จสิ้น');
  console.log('========================================');
}

main();
