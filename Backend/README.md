# GTXShop Backend API

Backend API สำหรับ GTXShop E-commerce Application พัฒนาด้วย NestJS 11.0.1 + TypeScript + MySQL

## 📋 Prerequisites

ก่อนเริ่มต้นใช้งาน โปรดตรวจสอบว่าคุณได้ติดตั้งเครื่องมือเหล่านี้แล้ว:

- **Node.js**: LTS Version (แนะนำ v18.x หรือสูงกว่า)
- **MySQL Server**: รันอยู่บน localhost:3306
- **npm** หรือ **yarn**

## 🚀 การติดตั้งและตั้งค่า

### 1. ติดตั้ง Dependencies

```bash
cd Backend
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` จาก `.env.example` และแก้ไขค่าตามที่เหมาะสม:

```env
# Server Configuration
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password  # 👈 เปลี่ยนเป็นรหัสผ่าน MySQL ของคุณ
DB_DATABASE=gtxshop_db

# JWT Secret Key
JWT_SECRET=LINKUPSHOP_SECRET_KEY_12345

# Cloudinary (Required for image uploads)
# วิธีที่ 1: ใช้ CLOUDINARY_URL (แนะนำ - ง่ายกว่า)
# รูปแบบ: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name

# วิธีที่ 2: ใช้แยกเป็น 3 ตัวแปร (ถ้าไม่ใช้ CLOUDINARY_URL)
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret

# หมายเหตุ: ต้องมี Cloudinary credentials อย่างใดอย่างหนึ่ง (CLOUDINARY_URL หรือทั้ง 3 ตัวแปร)
# สมัคร Cloudinary ฟรีได้ที่: https://cloudinary.com/users/register/free

# Stripe (Optional)
STRIPE_SECRET_KEY=
```

### 3. สร้างและนำเข้าฐานข้อมูล

#### 3.1 สร้างฐานข้อมูล

เข้าสู่ MySQL และสร้างฐานข้อมูล:

```sql
CREATE DATABASE gtxshop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 3.2 นำเข้า SQL Script

ใช้ไฟล์ `GTXShopApp/sql/ecom1.sql` เพื่อนำเข้าตารางและข้อมูลตัวอย่าง:

**วิธีที่ 1: ผ่าน MySQL Command Line**
```bash
mysql -u root -p gtxshop_db < ../GTXShopApp/sql/ecom1.sql
```

**วิธีที่ 2: ผ่าน phpMyAdmin หรือ MySQL Workbench**
- เปิดไฟล์ `GTXShopApp/sql/ecom1.sql`
- เลือกฐานข้อมูล `gtxshop_db`
- รัน SQL Script

**หมายเหตุ:** ไฟล์ SQL ใช้ชื่อฐานข้อมูล `ecom1` แต่ในโปรเจคนี้ใช้ `gtxshop_db` ดังนั้นคุณอาจต้องแก้ไขชื่อฐานข้อมูลใน SQL Script หรือสร้างฐานข้อมูลชื่อ `ecom1` แล้วเปลี่ยนชื่อใน `.env` เป็น `ecom1`

### 4. รัน NestJS Server

```bash
npm run start:dev
```

🟢 **ผลลัพธ์ที่คาดหวัง:** Terminal ควรแสดงข้อความว่า:
```
🚀 NestJS application is running on: http://localhost:3000
```

## 📡 API Endpoints

### Authentication
- `POST /auth/login` - เข้าสู่ระบบ
- `POST /auth/register` - สมัครสมาชิก
- `GET /auth/profile` - ดูข้อมูลโปรไฟล์ (ต้องมี Token)

### Products
- `GET /products` - ดูสินค้าทั้งหมด
- `GET /products?categoryId=1` - ดูสินค้าตามหมวดหมู่
- `GET /products/search?keyword=iphone` - ค้นหาสินค้า
- `GET /products/:id` - ดูรายละเอียดสินค้า

### Categories
- `GET /categories` - ดูหมวดหมู่ทั้งหมด
- `GET /categories/:id` - ดูหมวดหมู่ตาม ID

### Cart (ต้องมี Token)
- `GET /cart` - ดูตะกร้าสินค้า
- `POST /cart/add` - เพิ่มสินค้าเข้าตะกร้า
- `DELETE /cart/remove/:productId` - ลบสินค้าออกจากตะกร้า
- `PUT /cart/update` - อัปเดตจำนวนสินค้าในตะกร้า

### Orders (ต้องมี Token)
- `POST /orders` - สร้างออเดอร์
- `GET /orders` - ดูออเดอร์ทั้งหมดของฉัน
- `GET /orders/:id` - ดูรายละเอียดออเดอร์

### Users (ต้องมี Token)
- `GET /users/me` - ดูข้อมูลผู้ใช้ปัจจุบัน
- `PUT /users/me` - อัปเดตข้อมูลผู้ใช้

## 🔐 Authentication

API endpoints ที่ต้องมี Token จะใช้ **Bearer Token** ใน Header:

```
Authorization: Bearer <your_token>
```

Token จะได้รับหลังจาก Login สำเร็จ

## 🛠️ Development

### รันในโหมด Development
```bash
npm run start:dev
```

### Build สำหรับ Production
```bash
npm run build
npm run start:prod
```

### Linting
```bash
npm run lint
```

## 📁 โครงสร้างโปรเจค

```
Backend/
├── src/
│   ├── entities/          # TypeORM Entities
│   ├── auth/              # Authentication Module
│   ├── users/             # Users Module
│   ├── products/          # Products Module
│   ├── categories/        # Categories Module
│   ├── cart/              # Cart Module
│   ├── orders/            # Orders Module
│   ├── app.module.ts      # Root Module
│   └── main.ts            # Application Entry Point
├── .env                   # Environment Variables
├── .env.example           # Environment Variables Template
├── package.json
├── tsconfig.json
└── README.md
```

## ⚠️ หมายเหตุสำคัญ

1. **Database Name:** ไฟล์ SQL ใช้ชื่อฐานข้อมูล `ecom1` แต่โปรเจคนี้ตั้งค่าให้ใช้ `gtxshop_db` ใน `.env` คุณอาจต้อง:
   - แก้ไขชื่อฐานข้อมูลใน SQL Script จาก `ecom1` เป็น `gtxshop_db`
   - หรือเปลี่ยน `DB_DATABASE` ใน `.env` เป็น `ecom1`

2. **TypeORM Synchronize:** ใน `app.module.ts` ตั้งค่า `synchronize: false` เพื่อความปลอดภัย ควรใช้ Migration แทน

3. **CORS:** เปิดใช้งาน CORS เพื่อให้ React Native App สามารถเรียก API ได้

## 🐛 Troubleshooting

### ปัญหา: ไม่สามารถเชื่อมต่อฐานข้อมูลได้
- ตรวจสอบว่า MySQL Server กำลังรันอยู่
- ตรวจสอบ username, password, และ database name ใน `.env`
- ตรวจสอบว่าได้สร้างฐานข้อมูลและนำเข้า SQL Script แล้ว

### ปัญหา: Port 3000 ถูกใช้งานแล้ว
- เปลี่ยน PORT ใน `.env` เป็นพอร์ตอื่น (เช่น 3001)
- หรือปิดโปรแกรมที่ใช้พอร์ต 3000 อยู่

### ปัญหา: Error uploading to Cloudinary - Must supply api_key
- ตรวจสอบว่ามีการตั้งค่า Cloudinary credentials ในไฟล์ `.env` แล้ว
- ต้องมี `CLOUDINARY_URL` หรือทั้ง 3 ตัวแปร (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
- สมัคร Cloudinary ฟรีได้ที่: https://cloudinary.com/users/register/free
- หลังจากตั้งค่าแล้ว ต้อง restart NestJS server

## 📝 License

Private Project

