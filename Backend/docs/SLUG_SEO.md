# ระบบ Auto-generate Slug สำหรับ SEO

## ภาพรวม

- **Product**: สร้าง slug อัตโนมัติจาก `title` (รองรับภาษาไทย)
- **Category**: สร้าง slug อัตโนมัติจาก `name` (รองรับภาษาไทย)
- รองรับความ **ไม่ซ้ำ** (Uniqueness): ถ้า slug ซ้ำจะต่อท้ายด้วย timestamp ฐาน 36 หรือ random string สั้นๆ

## การติดตั้ง

### 1. Package `slugify`

โปรเจกต์มี `slugify` อยู่แล้วใน `package.json`:

```bash
# ถ้ายังไม่ได้ติดตั้ง
cd Backend
npm install
```

### 2. Database: เพิ่ม column `slug` ให้ตาราง Category

ตาราง `product` มี column `slug` อยู่แล้ว  
ตาราง `category` ต้องรัน migration ด้านล่าง (ถ้ายังไม่มี column `slug`):

```bash
# รัน SQL (MySQL)
mysql -u your_user -p your_database < sql/add_slug_to_category.sql
```

หรือรันใน HeidiSQL / MySQL Workbench:

```sql
ALTER TABLE category
ADD COLUMN slug VARCHAR(255) NULL UNIQUE AFTER name;

CREATE INDEX idx_category_slug ON category(slug);
```

## การทำงาน

### Product

- **สร้างสินค้า**: ถ้าไม่ส่ง `slug` มา จะสร้างจาก `title` อัตโนมัติ และตรวจสอบไม่ให้ซ้ำ
- **แก้ไขสินค้า**: ถ้า `slug` เป็นค่าว่าง หรือมีการส่ง `title` ใหม่ จะสร้าง/อัปเดต slug ใหม่

### Category

- **สร้างหมวดหมู่**: ถ้าไม่ส่ง `slug` มา จะสร้างจาก `name` อัตโนมัติ และตรวจสอบไม่ให้ซ้ำ
- **แก้ไขหมวดหมู่**: ถ้า `slug` เป็นค่าว่าง หรือมีการส่ง `name` ใหม่ จะสร้าง/อัปเดต slug ใหม่

### ภาษาไทย

- ใช้ `slugify` สำหรับข้อความภาษาอังกฤษ/ตัวเลข
- ถ้าข้อความเป็นภาษาไทยล้วน (slugify ให้ค่าว่าง) จะใช้การแปลงภาษาไทยเป็นโรมันแบบง่าย (transliteration) แล้วค่อย slugify
- ถ้ายังได้ค่าว่าง จะใช้ fallback เป็น `item` แล้วต่อด้วย suffix เพื่อความไม่ซ้ำ

### ความไม่ซ้ำ (Uniqueness)

- ก่อน save จะตรวจสอบว่า `slug` มีอยู่ในตารางแล้วหรือไม่ (ยกเว้น entity ตัวปัจจุบัน)
- ถ้าซ้ำ จะต่อท้ายด้วย `-{timestamp ฐาน 36}` หรือ random string สั้นๆ (เช่น `iphone-15-pro-lxyz123`)

## Backfill (อัปเดตข้อมูลเก่า)

สำหรับรายการที่ `slug` ยังเป็น `NULL` — เรียกผ่าน Postman / API หรือ Script ได้

### รัน Script ทดสอบ (Backend โฟลเดอร์)

```bash
# ใช้ password จริง (ถ้าใน DB เป็น hash ใช้รหัสก่อน hash)
ADMIN_EMAIL=admin@gmail.com ADMIN_PASSWORD=your_password npm run slug-backfill

# หรือใช้ Token ตรงๆ (ข้าม Login)
ADMIN_TOKEN=eyJhbGc... npm run slug-backfill

# หรือรันแบบ default (จะลอง Login ด้วย admin@gmail.com / password_from_db)
npm run slug-backfill
```

หรือรันด้วย `npx ts-node` โดยตรง:

```bash
npx ts-node scripts/test-slug-backfill.ts
```

Script จะ: Login Admin → Backfill Categories → Backfill Products แล้วแสดงผลลัพธ์ JSON (updated, total, details)

### เรียก API ตรง (Postman / Admin only)

### Product

| รายการ | ค่า |
|--------|-----|
| Method | `POST` |
| URL | `{BASE_URL}/products/admin/backfill-slugs` |
| Headers | `Authorization: Bearer <admin_jwt>` |

(ต้องเป็นผู้ใช้ role **admin**)

Response ตัวอย่าง:

```json
{
  "updated": 10,
  "total": 10,
  "details": [
    { "id": 1, "title": "iPhone 15 Pro", "slug": "iphone-15-pro" },
    { "id": 2, "title": "โทรศัพท์มือถือ", "slug": "tho-ra-sap-mue-thue" }
  ]
}
```

### Category

| รายการ | ค่า |
|--------|-----|
| Method | `POST` |
| URL | `{BASE_URL}/categories/admin/backfill-slugs` |
| Headers | `Authorization: Bearer <admin_jwt>` |

(ต้องเป็นผู้ใช้ role **admin**)

Response ตัวอย่าง:

```json
{
  "updated": 5,
  "total": 5,
  "details": [
    { "id": 1, "name": "โทรศัพท์มือถือ", "slug": "tho-ra-sap-mue-thue" }
  ]
}
```

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | คำอธิบาย |
|------|----------|
| `src/core/shared/utils/slug.util.ts` | ฟังก์ชัน `generateSlugFromText`, `ensureUniqueSlug` (รองรับไทย + ความไม่ซ้ำ) |
| `src/core/database/entities/product/product.entity.ts` | Product มี column `slug` อยู่แล้ว |
| `src/core/database/entities/category/category.entity.ts` | Category เพิ่ม column `slug` |
| `src/modules/product/products.service.ts` | สร้าง/อัปเดต slug ตอน create/update + `backfillProductSlugs()` |
| `src/modules/category/categories.service.ts` | สร้าง/อัปเดต slug ตอน create/update + `backfillCategorySlugs()` |
| `sql/add_slug_to_category.sql` | Migration เพิ่ม column `slug` ให้ตาราง `category` |
