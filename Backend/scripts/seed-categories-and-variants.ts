/**
 * สร้าง Category + Subcategory (สัมพันธ์กัน) และเพิ่ม Variants (เลือกสี/ไซส์) + SKU ให้สินค้าของ seller1
 *
 * รัน: npm run seed:categories-variants
 */

import 'dotenv/config';
import * as mysql from 'mysql2/promise';

const SELLER_EMAIL = 'seller1@gmail.com';

// หมวดหมู่หลัก หมวดย่อย และไอคอน (แอปหน้า Home แสดงจาก image JSON field)
const CATEGORIES_WITH_SUBS: { name: string; icon: string; subcategories: string[] }[] = [
  { name: 'เสื้อผ้า', icon: '👕', subcategories: ['เสื้อยืด', 'กางเกง', 'แจ็คเก็ต'] },
  { name: 'รองเท้าและกระเป๋า', icon: '👜', subcategories: ['รองเท้าผ้าใบ', 'กระเป๋าสะพาย', 'กระเป๋าเป้'] },
  { name: 'อิเล็กทรอนิกส์', icon: '📱', subcategories: ['หูฟัง', 'นาฬิกา', 'สายชาร์จ'] },
  { name: 'ของใช้ส่วนตัว', icon: '🧴', subcategories: ['กระบอกน้ำ', 'หมวก', 'สายคล้องมือถือ'] },
  { name: 'เครื่องเขียน', icon: '✏️', subcategories: ['ชุดเครื่องเขียน', 'สมุด', 'ปากกา'] },
];

// สี และ ไซส์ ใช้สำหรับสร้าง variants (สินค้าที่มีทั้งสีและไซส์)
const COLORS = ['ขาว', 'ดำ', 'แดง', 'น้ำเงิน'];
const SIZES = ['S', 'M', 'L', 'XL'];

const COLOR_CODE: Record<string, string> = {
  ขาว: 'WH',
  ดำ: 'BL',
  แดง: 'RD',
  น้ำเงิน: 'BU',
};

function generateSku(prefix: string, color: string, size: string): string {
  const c = COLOR_CODE[color] ?? color.slice(0, 2).toUpperCase();
  return `${prefix}-${c}-${size}`;
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
    // ----- 1. สร้าง Categories -----
    console.log('--- สร้างหมวดหมู่ (Category) ---');
    const categoryIds: number[] = [];
    for (const cat of CATEGORIES_WITH_SUBS) {
      const [existing] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT id FROM category WHERE name = ? LIMIT 1',
        [cat.name],
      );
      let id: number;
      if (existing?.length) {
        id = existing[0].id;
        categoryIds.push(id);
        console.log(`  มีอยู่แล้ว: ${cat.name} (id: ${id})`);
      } else {
        await conn.execute('INSERT INTO category (name) VALUES (?)', [cat.name]);
        const [res] = await conn.execute<mysql.RowDataPacket[]>(
          'SELECT LAST_INSERT_ID() as id',
        );
        id = Number(res?.[0]?.id ?? 0);
        categoryIds.push(id);
        console.log(`  สร้างใหม่: ${cat.name} (id: ${id})`);
      }
      // อัปเดตไอคอนสำหรับแสดงในแอป (หน้า Home ใช้ category.image เป็น JSON { icon: '...' })
      try {
        await conn.execute('UPDATE category SET image = ? WHERE id = ?', [
          JSON.stringify({ icon: cat.icon }),
          id,
        ]);
      } catch (_) {
        // ถ้าตารางไม่มีคอลัมน์ image จะข้าม
      }
    }

    // ----- 2. สร้าง Subcategories (ผูกกับ Category) -----
    console.log('\n--- สร้างหมวดย่อย (Subcategory) ---');
    const subcategoryIdsByCat: number[][] = [];
    for (let c = 0; c < CATEGORIES_WITH_SUBS.length; c++) {
      const categoryId = categoryIds[c];
      const subs = CATEGORIES_WITH_SUBS[c].subcategories;
      const subIds: number[] = [];
      for (const subName of subs) {
        const [ex] = await conn.execute<mysql.RowDataPacket[]>(
          'SELECT id FROM subcategory WHERE name = ? AND categoryId = ? LIMIT 1',
          [subName, categoryId],
        );
        if (ex?.length) {
          subIds.push(ex[0].id);
          console.log(`    มีอยู่แล้ว: ${subName} (categoryId: ${categoryId})`);
        } else {
          await conn.execute(
            'INSERT INTO subcategory (name, iconType, categoryId) VALUES (?, ?, ?)',
            [subName, 'emoji', categoryId],
          );
          const [r] = await conn.execute<mysql.RowDataPacket[]>(
            'SELECT LAST_INSERT_ID() as id',
          );
          const id = Number(r?.[0]?.id ?? 0);
          subIds.push(id);
          console.log(`    สร้างใหม่: ${subName} (id: ${id}, categoryId: ${categoryId})`);
        }
      }
      subcategoryIdsByCat.push(subIds);
    }

    // ----- 3. หาร้าน seller1 และสินค้าที่มี -----
    const [userRows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM user WHERE email = ? LIMIT 1',
      [SELLER_EMAIL],
    );
    if (!userRows?.length) {
      console.error('\nไม่พบ user seller1@gmail.com กรุณารัน seed:test-accounts ก่อน');
      process.exit(1);
    }
    const sellerUserId = userRows[0].id;

    const [storeRows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM store WHERE ownerId = ? LIMIT 1',
      [sellerUserId],
    );
    if (!storeRows?.length) {
      console.error('\nไม่พบร้านของ seller1 กรุณารัน seed:seller1-products ก่อน');
      process.exit(1);
    }
    const storeId = storeRows[0].id;

    const [products] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id, title, price FROM product WHERE storeId = ? ORDER BY id',
      [storeId],
    );
    if (!products?.length) {
      console.error('\nไม่พบสินค้าในร้าน seller1 กรุณารัน seed:seller1-products ก่อน');
      process.exit(1);
    }

    // แมปสินค้า -> categoryIndex, subcategoryIndex (ให้สัมพันธ์กับหมวด)
    const productCategoryMap: { catIndex: number; subIndex: number }[] = [
      { catIndex: 0, subIndex: 0 }, // เสื้อยืด -> เสื้อผ้า / เสื้อยืด
      { catIndex: 0, subIndex: 1 }, // กางเกง -> เสื้อผ้า / กางเกง
      { catIndex: 1, subIndex: 0 }, // รองเท้า -> รองเท้าและกระเป๋า / รองเท้าผ้าใบ
      { catIndex: 1, subIndex: 1 }, // กระเป๋า -> รองเท้าและกระเป๋า / กระเป๋าสะพาย
      { catIndex: 2, subIndex: 1 }, // นาฬิกา -> อิเล็กทรอนิกส์ / นาฬิกา
      { catIndex: 2, subIndex: 0 }, // หูฟัง -> อิเล็กทรอนิกส์ / หูฟัง
      { catIndex: 3, subIndex: 0 }, // กระบอกน้ำ -> ของใช้ส่วนตัว / กระบอกน้ำ
      { catIndex: 3, subIndex: 1 }, // หมวก -> ของใช้ส่วนตัว / หมวก
      { catIndex: 3, subIndex: 2 }, // สายคล้องมือถือ -> ของใช้ส่วนตัว / สายคล้องมือถือ
      { catIndex: 4, subIndex: 0 }, // ชุดเครื่องเขียน -> เครื่องเขียน / ชุดเครื่องเขียน
    ];

    // ----- 4. อัปเดต product ให้ชี้ category + subcategory -----
    console.log('\n--- ผูกสินค้ากับ Category / Subcategory ---');
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const map = productCategoryMap[i] ?? productCategoryMap[0];
      const categoryId = categoryIds[map.catIndex];
      const subcategoryId = subcategoryIdsByCat[map.catIndex][map.subIndex];
      await conn.execute(
        'UPDATE product SET categoryId = ?, subcategoryId = ? WHERE id = ?',
        [categoryId, subcategoryId, p.id],
      );
      console.log(`  product id ${p.id} -> categoryId ${categoryId}, subcategoryId ${subcategoryId}`);
    }

    // ----- 5. สร้าง Variants (สี + ไซส์) + SKU ให้แต่ละสินค้า (SKU ขึ้นต้นด้วยรหัสร้าน S{storeId}) -----
    console.log('\n--- สร้าง Variants (เลือกสี / ไซส์) + SKU ตรงร้าน ---');
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      // SKU ตรงกับร้าน: S{storeId}-P{productId}-{สี}-{ไซส์} เช่น S1-P001-WH-S
      const prefix = `S${storeId}-P${String(p.id).padStart(3, '0')}`;

      // ลบ variants เดิมของสินค้านี้ (ถ้ามี)
      await conn.execute('DELETE FROM product_variant WHERE productId = ?', [p.id]);

      let totalStock = 0;
      const variants: { name: string; sku: string; attributes: string; stock: number }[] = [];
      for (const color of COLORS) {
        for (const size of SIZES) {
          const name = `สี${color} / ไซส์${size}`;
          const sku = generateSku(prefix, color, size);
          const attributes = JSON.stringify({ สี: color, ไซส์: size });
          const stock = 5 + Math.floor(Math.random() * 10);
          totalStock += stock;
          variants.push({ name, sku, attributes, stock });
        }
      }

      for (const v of variants) {
        await conn.execute(
          `INSERT INTO product_variant (productId, name, sku, price, stock, attributes)
           VALUES (?, ?, ?, NULL, ?, ?)`,
          [p.id, v.name, v.sku, v.stock, v.attributes],
        );
      }

      await conn.execute('UPDATE product SET quantity = ? WHERE id = ?', [
        totalStock,
        p.id,
      ]);
      console.log(
        `  product id ${p.id} (${p.title}): ${variants.length} variants, total stock ${totalStock}, SKU ตัวอย่าง ${variants[0].sku}`,
      );
    }

    console.log('\nเสร็จสิ้น: Category / Subcategory สัมพันธ์กันแล้ว และทุกสินค้ามี Variants (สี+ไซส์) + SKU');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
