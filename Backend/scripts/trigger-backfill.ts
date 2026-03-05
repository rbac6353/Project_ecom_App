/**
 * Script ชั่วคราว: Login Admin แล้วยิง Backfill Categories + Products
 * ใช้เฉพาะเครื่อง Dev
 */
import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345678';

async function main() {
  console.log('BASE_URL:', BASE_URL);
  console.log('Login...', ADMIN_EMAIL);

  let token: string;
  try {
    const loginRes = await axios.post<{ access_token?: string }>(
      `${BASE_URL}/auth/login`,
      { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    const body = loginRes.data as any;
    token = body?.data?.access_token || body?.access_token || body?.token;
    if (!token) {
      console.error('ไม่มี token ใน response:', loginRes.data);
      process.exit(1);
    }
    console.log('Login OK, ได้ Token');
  } catch (e: any) {
    const axiosErr = e as AxiosError;
    console.error('Login ล้มเหลว:');
    console.error('  Status:', axiosErr?.response?.status);
    console.error('  Data:', JSON.stringify(axiosErr?.response?.data, null, 2));
    console.error('  Message:', e.message);
    console.error('  Code:', axiosErr?.code);
    process.exit(1);
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  console.log('\n--- Backfill Categories ---');
  try {
    const catRes = await axios.post(
      `${BASE_URL}/categories/admin/backfill-slugs`,
      {},
      { headers, timeout: 60000 }
    );
    console.log('ผลลัพธ์ Categories:', JSON.stringify(catRes.data, null, 2));
  } catch (e: any) {
    console.error('Categories Backfill ล้มเหลว:', (e as AxiosError)?.response?.data || e.message);
  }

  console.log('\n--- Backfill Products ---');
  try {
    const prodRes = await axios.post(
      `${BASE_URL}/products/admin/backfill-slugs`,
      {},
      { headers, timeout: 120000 }
    );
    console.log('ผลลัพธ์ Products:', JSON.stringify(prodRes.data, null, 2));
  } catch (e: any) {
    console.error('Products Backfill ล้มเหลว:', (e as AxiosError)?.response?.data || e.message);
    process.exit(1);
  }

  console.log('\nเสร็จสิ้น');
}

main();
