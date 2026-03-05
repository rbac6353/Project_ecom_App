/**
 * สร้างสินค้า 10 รายการให้ร้าน seller1 พร้อม slug และรูปภาพ
 *
 * รัน: npm run seed:seller1-products
 */

import 'dotenv/config';
import * as mysql from 'mysql2/promise';
import slugify from 'slugify';

const SELLER_EMAIL = 'seller1@gmail.com';

const PRODUCTS = [
  { title: 'เสื้อยืดคอกลม Cotton 100% สีขาว', price: 299, quantity: 50 },
  { title: 'กางเกงยีนส์ขายาว สไตล์สลิมฟิต', price: 899, quantity: 30 },
  { title: 'รองเท้าผ้าใบ Unisex สีดำ', price: 599, quantity: 40 },
  { title: 'กระเป๋าสะพายหนัง PU ขนาดกลาง', price: 449, quantity: 25 },
  { title: 'นาฬิกาข้อมือดิจิทัล กันน้ำ', price: 1299, quantity: 20 },
  { title: 'หูฟังบลูทูธไร้สาย น้ำหนักเบา', price: 699, quantity: 35 },
  { title: 'กระบอกน้ำสแตนเลส 500ml เก็บความเย็น', price: 349, quantity: 60 },
  { title: 'หมวกแก๊ปกันแดด ผ้าคอตตอน', price: 199, quantity: 45 },
  { title: 'สายคล้องมือถือแบบสวมคอ', price: 149, quantity: 80 },
  { title: 'ชุดเครื่องเขียน 6 ชิ้น สำหรับนักเรียน', price: 189, quantity: 100 },
];

function generateSlug(title: string, suffix: string): string {
  const base = slugify(title, { lower: true, strict: true, replacement: '-' }) || 'product';
  return `${base}-${suffix}`;
}

async function getConnectionConfig(): Promise<mysql.ConnectionOptions> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const match = url.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
    if (match) {
      const [, user, password, host, port, database] = match;
      return {
        host: host || 'localhost',
        port: parseInt(port || '3306', 10),
        user: user || 'root',
        password: password || '',
        database: database || 'ecom1',
      };
    }
  }
  return { host: 'localhost', user: 'root', password: '', database: 'ecom1' };
}

async function seedSeller1Products() {
  const config = await getConnectionConfig();
  const conn = await mysql.createConnection(config);

  try {
    // 1. หา user id ของ seller1
    const [userRows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM user WHERE email = ? LIMIT 1',
      [SELLER_EMAIL],
    );
    if (!userRows?.length) {
      console.error('ไม่พบ user seller1@gmail.com กรุณารัน seed:test-accounts ก่อน');
      process.exit(1);
    }
    const sellerUserId = userRows[0].id;

    // 2. หาหรือสร้างร้านของ seller1
    let [storeRows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM store WHERE ownerId = ? LIMIT 1',
      [sellerUserId],
    );
    let storeId: number;
    if (storeRows?.length) {
      storeId = storeRows[0].id;
      console.log('ใช้ร้านที่มีอยู่แล้ว storeId:', storeId);
    } else {
      await conn.execute(
        `INSERT INTO store (name, description, ownerId)
         VALUES (?, ?, ?)`,
        ['ร้าน Seller1', 'ร้านทดสอบสำหรับ seller1', sellerUserId],
      );
      const [lastIdRows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT LAST_INSERT_ID() as id',
      );
      storeId = Number((lastIdRows as mysql.RowDataPacket[])?.[0]?.id ?? 0);
      console.log('สร้างร้านใหม่ storeId:', storeId);
    }

    // 3. หาหรือสร้าง category แรก
    let [catRows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM category ORDER BY id LIMIT 1',
    );
    let categoryId: number;
    if (catRows?.length) {
      categoryId = catRows[0].id;
      console.log('ใช้ categoryId:', categoryId);
    } else {
      await conn.execute('INSERT INTO category (name) VALUES (?)', ['สินค้าทั่วไป']);
      const [lastCat] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT LAST_INSERT_ID() as id',
      );
      categoryId = Number((lastCat as mysql.RowDataPacket[])?.[0]?.id ?? 0);
      console.log('สร้าง category "สินค้าทั่วไป" categoryId:', categoryId);
    }
    console.log('');

    // 4. สร้างสินค้า 10 รายการ + รูป 1 รูปต่อสินค้า
    const usedSlugs = new Set<string>();
    for (let i = 0; i < PRODUCTS.length; i++) {
      const p = PRODUCTS[i];
      const slugSuffix = `${Date.now().toString(36)}-${i}`;
      let slug = generateSlug(p.title, slugSuffix);
      while (usedSlugs.has(slug)) {
        slug = `${slug}-${i}`;
      }
      usedSlugs.add(slug);

      const description = `รายละเอียดสินค้า: ${p.title}. คุณภาพดี ราคาพิเศษ`;

      await conn.execute(
        `INSERT INTO product (title, description, price, sold, quantity, slug, isActive, categoryId, storeId)
         VALUES (?, ?, ?, 0, ?, ?, 1, ?, ?)`,
        [p.title, description, p.price, p.quantity, slug, categoryId, storeId],
      );

      const [lastIdRes] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT LAST_INSERT_ID() as id',
      );
      const productId = Number(lastIdRes?.[0]?.id ?? 0);

      // รูป placeholder (ลิงก์รูปจริงใช้ได้)
      const imageUrl = `https://picsum.photos/400/400?random=${productId}`;
      const assetId = `seed-${productId}-0`;
      const publicId = `seed-${productId}-0`;

      await conn.execute(
        `INSERT INTO image (asset_id, public_id, secure_url, url, productId)
         VALUES (?, ?, ?, ?, ?)`,
        [assetId, publicId, imageUrl, imageUrl, productId],
      );

      console.log(`  ✓ [${i + 1}/10] ${p.title} | slug: ${slug}`);
    }

    console.log('\nเสร็จสิ้น: สร้างสินค้า 10 รายการพร้อม slug และรูปภาพให้ร้าน seller1 แล้ว');
  } finally {
    await conn.end();
  }
}

seedSeller1Products().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
