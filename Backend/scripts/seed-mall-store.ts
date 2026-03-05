/**
 * สร้างร้าน Mall (sellermall1@gmail.com) พร้อมสินค้า 10 รายการ
 *
 * รัน: npm run seed:test-accounts ก่อน (สร้างบัญชี sellermall1)
 * แล้ว: npm run seed:mall-store
 */

import 'dotenv/config';
import * as mysql from 'mysql2/promise';
import slugify from 'slugify';

const SELLER_EMAIL = 'sellermall1@gmail.com';

type MallVariant = {
  name: string;
  skuPart: string;
  attributes: Record<string, string>;
  price?: number;
  stock: number;
};

type MallProductDef = {
  title: string;
  productCode: string;
  basePrice: number;
  imageUrl?: string;
  variants: MallVariant[];
};

const MALL_PRODUCTS: MallProductDef[] = [
  {
    title: 'iPhone 15 Pro Max',
    productCode: 'IP15PM',
    basePrice: 42900,
    variants: [
      { name: '256GB สีเทาทิตาเนียม', skuPart: '256-TITANIUM', attributes: { ความจุ: '256GB', สี: 'เทาทิตาเนียม' }, stock: 4 },
      { name: '256GB สีน้ำเงิน', skuPart: '256-BLUE', attributes: { ความจุ: '256GB', สี: 'น้ำเงิน' }, stock: 3 },
      { name: '256GB สีขาว', skuPart: '256-WHITE', attributes: { ความจุ: '256GB', สี: 'ขาว' }, stock: 4 },
      { name: '256GB สีดำ', skuPart: '256-BLACK', attributes: { ความจุ: '256GB', สี: 'ดำ' }, stock: 4 },
      { name: '512GB สีเทาทิตาเนียม', skuPart: '512-TITANIUM', attributes: { ความจุ: '512GB', สี: 'เทาทิตาเนียม' }, price: 48900, stock: 2 },
    ],
  },
  {
    title: 'MacBook Air M3 13 นิ้ว',
    productCode: 'MBAIR3',
    basePrice: 35900,
    variants: [
      { name: '256GB Midnight', skuPart: '256-MIDNIGHT', attributes: { ความจุ: '256GB', สี: 'Midnight' }, stock: 3 },
      { name: '256GB Starlight', skuPart: '256-STARLIGHT', attributes: { ความจุ: '256GB', สี: 'Starlight' }, stock: 2 },
      { name: '256GB Space Gray', skuPart: '256-SPACE', attributes: { ความจุ: '256GB', สี: 'Space Gray' }, stock: 3 },
      { name: '512GB Midnight', skuPart: '512-MIDNIGHT', attributes: { ความจุ: '512GB', สี: 'Midnight' }, price: 42900, stock: 2 },
    ],
  },
  {
    title: 'AirPods Pro 2 รุ่นล่าสุด',
    productCode: 'AIRPOD2',
    basePrice: 7990,
    variants: [
      { name: 'สีขาว', skuPart: 'WHITE', attributes: { สี: 'ขาว' }, stock: 15 },
      { name: 'สีดำ', skuPart: 'BLACK', attributes: { สี: 'ดำ' }, stock: 15 },
    ],
  },
  {
    title: 'iPad Air 10.9 นิ้ว Wi-Fi',
    productCode: 'IPADAIR',
    basePrice: 19900,
    variants: [
      { name: '64GB สีบลู', skuPart: '64-BLUE', attributes: { ความจุ: '64GB', สี: 'บลู' }, stock: 5 },
      { name: '64GB สีพิงค์', skuPart: '64-PINK', attributes: { ความจุ: '64GB', สี: 'พิงค์' }, stock: 5 },
      { name: '64GB สีม่วง', skuPart: '64-PURPLE', attributes: { ความจุ: '64GB', สี: 'ม่วง' }, stock: 5 },
      { name: '64GB Starlight', skuPart: '64-STARLIGHT', attributes: { ความจุ: '64GB', สี: 'Starlight' }, stock: 5 },
      { name: '256GB สีบลู', skuPart: '256-BLUE', attributes: { ความจุ: '256GB', สี: 'บลู' }, price: 23900, stock: 3 },
    ],
  },
  {
    title: 'Apple Watch Series 9 GPS',
    productCode: 'AW9',
    basePrice: 12900,
    variants: [
      { name: '41mm สีพิงค์', skuPart: '41-PINK', attributes: { ขนาด: '41mm', สี: 'พิงค์' }, stock: 5 },
      { name: '41mm Starlight', skuPart: '41-STARLIGHT', attributes: { ขนาด: '41mm', สี: 'Starlight' }, stock: 5 },
      { name: '41mm Midnight', skuPart: '41-MIDNIGHT', attributes: { ขนาด: '41mm', สี: 'Midnight' }, stock: 5 },
      { name: '45mm สีพิงค์', skuPart: '45-PINK', attributes: { ขนาด: '45mm', สี: 'พิงค์' }, price: 13900, stock: 5 },
      { name: '45mm Starlight', skuPart: '45-STARLIGHT', attributes: { ขนาด: '45mm', สี: 'Starlight' }, price: 13900, stock: 5 },
    ],
  },
  {
    title: 'Samsung Galaxy S24 Ultra',
    productCode: 'S24U',
    basePrice: 44900,
    variants: [
      { name: '256GB Titanium Gray', skuPart: '256-GRAY', attributes: { ความจุ: '256GB', สี: 'Titanium Gray' }, stock: 3 },
      { name: '256GB Black', skuPart: '256-BLACK', attributes: { ความจุ: '256GB', สี: 'ดำ' }, stock: 3 },
      { name: '256GB Violet', skuPart: '256-VIOLET', attributes: { ความจุ: '256GB', สี: 'ม่วง' }, stock: 2 },
      { name: '512GB Titanium Gray', skuPart: '512-GRAY', attributes: { ความจุ: '512GB', สี: 'Titanium Gray' }, price: 49900, stock: 2 },
      { name: '512GB Black', skuPart: '512-BLACK', attributes: { ความจุ: '512GB', สี: 'ดำ' }, price: 49900, stock: 2 },
    ],
  },
  {
    title: 'Sony WH-1000XM5 หูฟังไร้สาย',
    productCode: 'WH1KX5',
    basePrice: 11990,
    variants: [
      { name: 'สีดำ', skuPart: 'BLACK', attributes: { สี: 'ดำ' }, stock: 10 },
      { name: 'สีซิลเวอร์', skuPart: 'SILVER', attributes: { สี: 'ซิลเวอร์' }, stock: 8 },
    ],
  },
  {
    title: 'Dyson V15 Detect สายรุ่นล่าสุด',
    productCode: 'DYSON15',
    basePrice: 24900,
    variants: [
      { name: 'สีทอง/นิกเกิล', skuPart: 'GOLD-NICKEL', attributes: { สี: 'ทอง/นิกเกิล' }, stock: 4 },
      { name: 'สีม่วง/นิกเกิล', skuPart: 'PURPLE-NICKEL', attributes: { สี: 'ม่วง/นิกเกิล' }, stock: 4 },
    ],
  },
  {
    title: 'Nintendo Switch OLED',
    productCode: 'NSOLED',
    basePrice: 12990,
    variants: [
      { name: 'สีขาว', skuPart: 'WHITE', attributes: { สี: 'ขาว' }, stock: 12 },
      { name: 'สีแดง/น้ำเงิน (Joy-Con)', skuPart: 'RED-BLUE', attributes: { สี: 'แดง/น้ำเงิน' }, stock: 10 },
    ],
  },
  {
    title: 'Kindle Paperwhite 11th Gen',
    productCode: 'KNDL11',
    basePrice: 5990,
    imageUrl: 'https://groov.store/cdn/shop/files/ppsn.png?v=1732000490&width=800',
    variants: [
      { name: '8GB สีดำ', skuPart: '8-BLACK', attributes: { ความจุ: '8GB', สี: 'ดำ' }, stock: 12 },
      { name: '16GB สีดำ', skuPart: '16-BLACK', attributes: { ความจุ: '16GB', สี: 'ดำ' }, price: 6990, stock: 10 },
      { name: '16GB Denim', skuPart: '16-DENIM', attributes: { ความจุ: '16GB', สี: 'Denim' }, price: 6990, stock: 6 },
      { name: '16GB Agave Green', skuPart: '16-GREEN', attributes: { ความจุ: '16GB', สี: 'Agave Green' }, price: 6990, stock: 7 },
    ],
  },
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

async function run() {
  const config = await getConnectionConfig();
  const conn = await mysql.createConnection(config);

  try {
    const [userRows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM user WHERE email = ? LIMIT 1',
      [SELLER_EMAIL],
    );
    if (!userRows?.length) {
      console.error('ไม่พบ user sellermall1@gmail.com กรุณารัน npm run seed:test-accounts ก่อน');
      process.exit(1);
    }
    const ownerId = userRows[0].id;

    let storeId: number;
    const [storeRows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM store WHERE ownerId = ? LIMIT 1',
      [ownerId],
    );
    if (storeRows?.length) {
      storeId = storeRows[0].id;
      await conn.execute(
        'UPDATE store SET name = ?, description = ?, isMall = 1, isActive = 1 WHERE id = ?',
        ['GTXShop Mall', 'ร้าน Mall สินค้าแบรนด์เนม รับประกันของแท้', storeId],
      );
      console.log('อัปเดตร้าน Mall แล้ว storeId:', storeId);
    } else {
      await conn.execute(
        `INSERT INTO store (name, description, ownerId, isMall, isActive)
         VALUES (?, ?, ?, 1, 1)`,
        ['GTXShop Mall', 'ร้าน Mall สินค้าแบรนด์เนม รับประกันของแท้', ownerId],
      );
      const [lastId] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT LAST_INSERT_ID() as id',
      );
      storeId = Number((lastId as mysql.RowDataPacket[])?.[0]?.id ?? 0);
      console.log('สร้างร้าน Mall ใหม่ storeId:', storeId);
    }

    const [catRows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM category WHERE name = ? LIMIT 1',
      ['อิเล็กทรอนิกส์'],
    );
    const categoryId = catRows?.length ? catRows[0].id : 1;
    const [subRows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM subcategory WHERE categoryId = ? ORDER BY id LIMIT 1',
      [categoryId],
    );
    const subcategoryId = subRows?.length ? subRows[0].id : null;

    // Backfill: สินค้า Mall ที่มีอยู่แล้วแต่ไม่มี variant -> สร้าง variant + SKU ให้
    const [existingMallProducts] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT p.id, p.title, p.price, p.quantity
       FROM product p
       INNER JOIN store s ON s.id = p.storeId AND s.isMall = 1
       WHERE NOT EXISTS (SELECT 1 FROM product_variant pv WHERE pv.productId = p.id)
       ORDER BY p.id`,
    );
    if (existingMallProducts?.length) {
      console.log(`Backfill variants+SKU ให้สินค้า Mall ที่ยังไม่มี ${existingMallProducts.length} รายการ...`);
      for (const row of existingMallProducts) {
        const sku = `MALL-${String(row.id).padStart(4, '0')}-1`;
        await conn.execute(
          `INSERT INTO product_variant (productId, name, sku, price, stock, attributes)
           VALUES (?, ?, ?, ?, ?, NULL)`,
          [row.id, 'รุ่นมาตรฐาน', sku, row.price, row.quantity ?? 0],
        );
        console.log(`  ✓ backfill product ${row.id} | SKU: ${sku}`);
      }
      console.log('');
    }

    console.log('สร้างสินค้า 10 รายการ (พร้อม variants สี/ความจุ + SKU)...\n');
    const usedSlugs = new Set<string>();

    for (let i = 0; i < MALL_PRODUCTS.length; i++) {
      const p = MALL_PRODUCTS[i];
      const totalQty = p.variants.reduce((s, v) => s + v.stock, 0);
      const slugSuffix = `mall-${Date.now().toString(36)}-${i}`;
      let slug = generateSlug(p.title, slugSuffix);
      while (usedSlugs.has(slug)) slug = `${slug}-${i}`;
      usedSlugs.add(slug);

      const description = `[Mall] ${p.title}. สินค้าแบรนด์เนม รับประกันของแท้`;

      if (subcategoryId != null) {
        await conn.execute(
          `INSERT INTO product (title, description, price, sold, quantity, slug, isActive, categoryId, subcategoryId, storeId)
           VALUES (?, ?, ?, 0, ?, ?, 1, ?, ?, ?)`,
          [p.title, description, p.basePrice, totalQty, slug, categoryId, subcategoryId, storeId],
        );
      } else {
        await conn.execute(
          `INSERT INTO product (title, description, price, sold, quantity, slug, isActive, categoryId, storeId)
           VALUES (?, ?, ?, 0, ?, ?, 1, ?, ?)`,
          [p.title, description, p.basePrice, totalQty, slug, categoryId, storeId],
        );
      }

      const [lastIdRes] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT LAST_INSERT_ID() as id',
      );
      const productId = Number(lastIdRes?.[0]?.id ?? 0);
      const imageUrl = p.imageUrl ?? `https://picsum.photos/400/400?random=${productId + 1000}`;
      const assetId = `mall-${productId}-0`;
      const publicId = `mall-${productId}-0`;

      await conn.execute(
        `INSERT INTO image (asset_id, public_id, secure_url, url, productId)
         VALUES (?, ?, ?, ?, ?)`,
        [assetId, publicId, imageUrl, imageUrl, productId],
      );

      for (let vIdx = 0; vIdx < p.variants.length; vIdx++) {
        const v = p.variants[vIdx];
        const sku = `MALL-${p.productCode}-${v.skuPart}`;
        const price = v.price ?? p.basePrice;
        const attrsJson = JSON.stringify(v.attributes);
        await conn.execute(
          `INSERT INTO product_variant (productId, name, sku, price, stock, attributes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [productId, v.name, sku, price, v.stock, attrsJson],
        );
      }

      const skuSample = p.variants[0] ? `MALL-${p.productCode}-${p.variants[0].skuPart}` : '-';
      console.log(`  ✓ [${i + 1}/10] ${p.title} | ${p.variants.length} variants | SKU ตัวอย่าง: ${skuSample}`);
    }

    console.log('\nเสร็จสิ้น: ร้าน Mall (sellermall1@gmail.com) พร้อมสินค้า 10 รายการ');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
