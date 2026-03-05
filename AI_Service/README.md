# AI Visual Search Service

Microservice สำหรับค้นหาสินค้าด้วยภาพ โดยใช้ MobileNetV3 Model และเชื่อมต่อกับ MySQL Database

## 🚀 การติดตั้ง

### 1. สร้าง Virtual Environment (แนะนำ)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python -m venv venv
source venv/bin/activate
```

### 2. ติดตั้ง Dependencies

```bash
pip install -r requirements.txt
```

**หมายเหตุสำคัญ:**
- การติดตั้ง PyTorch อาจใช้เวลานาน (10-30 นาที) และต้องการพื้นที่ประมาณ 2-3 GB
- ต้องมี Python 3.8 ขึ้นไป
- ต้องมี Internet connection เพื่อดาวน์โหลด Model

### 3. ตั้งค่า Configuration

#### วิธีที่ 1: ใช้ Environment Variables (แนะนำ)

สร้างไฟล์ `.env` ในโฟลเดอร์ `AI_Service/`:

```env
DB_USERNAME=root
DB_PASSWORD=your_password_here
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=ecom1
NESTJS_BASE_URL=http://localhost:3000
```

#### วิธีที่ 2: แก้ไขใน main.py โดยตรง

แก้ไข `DB_CONFIG` ใน `main.py`:

```python
DB_CONFIG = {
    'user': 'root',
    'password': '12345678',  # เปลี่ยนเป็นรหัสผ่านของคุณ
    'host': 'localhost',
    'database': 'ecom1',  # หรือ gtxshop_db
    'port': 3306
}
```

### 4. รัน Service

```bash
# Windows
python main.py
# หรือ
start.bat

# Mac/Linux
python main.py
# หรือ
chmod +x start.sh
./start.sh
```

Service จะรันที่ `http://localhost:8000`

## 📋 การทำงาน

### 1. ตอนเริ่ม Service (Startup)

1. **โหลด AI Model:** MobileNetV3 (ใช้เวลาประมาณ 10-30 วินาที)
2. **เชื่อมต่อ Database:** เชื่อมต่อ MySQL เพื่อดึงข้อมูลสินค้า
3. **Index ภาพสินค้า:**
   - ดึงรายการสินค้าและ URL รูปภาพจาก Database
   - Download รูปภาพแต่ละชิ้น
   - แปลงเป็น Feature Vector
   - เก็บไว้ในหน่วยความจำ (RAM)
4. **พร้อมใช้งาน:** เมื่อเห็น "✅ Indexing Complete: X products indexed"

### 2. เมื่อได้รับ Request Visual Search

1. รับภาพจาก NestJS Backend
2. แปลงภาพเป็น Feature Vector
3. คำนวณ Cosine Similarity กับภาพที่มีอยู่
4. คืนค่า Product IDs ที่มีความเหมือนสูงสุด (score > 0.4)

## 🔌 API Endpoints

### GET /
ตรวจสอบสถานะ Service
```json
{
  "status": "AI Service is Running",
  "indexed_count": 150,
  "database": "ecom1"
}
```

### GET /health
Health check endpoint
```json
{
  "status": "healthy",
  "model_loaded": true,
  "indexed_products": 150
}
```

### GET /reindex
สั่งให้ Index ใหม่ (ใช้เมื่อเพิ่มสินค้าใหม่)
```json
{
  "status": "Re-indexing started",
  "current_count": 150
}
```

### POST /visual-search
ค้นหาสินค้าด้วยภาพ

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: `file` (image file)

**Response:**
```json
{
  "results": [
    {
      "id": 100,
      "score": 0.9234
    },
    {
      "id": 99,
      "score": 0.8567
    }
  ],
  "total_indexed": 150
}
```

## ⚙️ Configuration

### Database Configuration

ต้องตรงกับ Backend `.env`:
- `DB_USERNAME`: Username MySQL (default: root)
- `DB_PASSWORD`: Password MySQL
- `DB_HOST`: Host MySQL (default: localhost)
- `DB_PORT`: Port MySQL (default: 3306)
- `DB_DATABASE`: ชื่อฐานข้อมูล (ecom1 หรือ gtxshop_db)

### NestJS Base URL

ใช้สำหรับเข้าถึงรูปภาพที่เก็บเป็น relative path:
- `NESTJS_BASE_URL`: URL ของ NestJS Backend (default: http://localhost:3000)

## 🐛 Troubleshooting

### ปัญหา: ModuleNotFoundError
**แก้ไข:** ตรวจสอบว่า activate virtual environment แล้ว และติดตั้ง requirements.txt แล้ว

### ปัญหา: Database connection error
**แก้ไข:**
1. ตรวจสอบว่า MySQL Server กำลังรันอยู่
2. ตรวจสอบ username, password, database name
3. ตรวจสอบว่า database มีตาราง `product` และ `image`
4. ตรวจสอบว่า image URLs ใน database ถูกต้อง

### ปัญหา: Indexing ได้ 0 products
**แก้ไข:**
1. ตรวจสอบว่า database มีข้อมูลสินค้าและรูปภาพ
2. ตรวจสอบว่า image URLs ใน database เข้าถึงได้
3. ตรวจสอบ `NESTJS_BASE_URL` ว่าถูกต้อง
4. ตรวจสอบ Internet connection (สำหรับ external URLs)

### ปัญหา: Port 8000 ถูกใช้งานแล้ว
**แก้ไข:** แก้ไข port ใน `main.py`:
```python
uvicorn.run(app, host="0.0.0.0", port=8001)  # เปลี่ยนเป็น port อื่น
```

### ปัญหา: Model โหลดช้า
**แก้ไข:** ครั้งแรกที่รันจะต้องดาวน์โหลด Model (~100MB) รอให้เสร็จ

### ปัญหา: Timeout เมื่อค้นหา
**แก้ไข:**
1. เพิ่ม timeout ใน NestJS (products.service.ts)
2. ตรวจสอบว่า AI Service ยังรันอยู่
3. ลดจำนวน products ที่ index (ถ้ามีมากเกินไป)

## 📊 Performance Tips

1. **Index เฉพาะรูปแรก:** ตอนนี้ใช้ `GROUP BY p.id` เพื่อเอาเฉพาะรูปแรกของแต่ละสินค้า
2. **Cache Vectors:** Feature Vectors เก็บไว้ใน RAM เพื่อความเร็ว
3. **Batch Processing:** สามารถเพิ่ม batch processing สำหรับ indexing หลายรูปพร้อมกัน
4. **Background Re-indexing:** สามารถเพิ่ม scheduled task เพื่อ re-index อัตโนมัติ

## 🔄 Re-indexing

เมื่อมีการเพิ่มสินค้าใหม่:

1. **Manual:** เรียก GET `/reindex` endpoint
2. **Automatic:** สามารถตั้ง scheduled task ให้ re-index ทุก X ชั่วโมง

## 📝 Notes

- **Threshold:** ปัจจุบันใช้ 0.4 (40%) สามารถปรับได้ใน `visual_search()` function
- **Top Results:** คืนค่า Top 10 products ที่มีความเหมือนสูงสุด
- **Memory Usage:** Feature Vectors เก็บไว้ใน RAM ดังนั้นต้องมี RAM เพียงพอ
