# 🚀 AI Visual Search Service - Setup Guide (ฉบับสมบูรณ์)

## ขั้นตอนการติดตั้งและรัน

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

### 3. ตั้งค่า Database Configuration

#### วิธีที่ 1: ใช้ Environment Variables (แนะนำ)

สร้างไฟล์ `.env` ในโฟลเดอร์ `AI_Service/` (หรือใช้ Environment Variables ของระบบ):

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
    'database': 'ecom1',  # หรือ gtxshop_db ตามที่คุณใช้
    'port': 3306
}
```

**สำคัญ:** ต้องตรงกับ Backend `.env`:
- Database name ต้องตรงกัน (ecom1 หรือ gtxshop_db)
- Username และ Password ต้องถูกต้อง
- Host และ Port ต้องเข้าถึงได้

### 4. ตรวจสอบ Database

ก่อนรัน Service ตรวจสอบว่า:

1. **MySQL Server กำลังรันอยู่**
2. **Database มีข้อมูลสินค้า:**
   ```sql
   SELECT COUNT(*) FROM product;
   ```
3. **Database มีรูปภาพ:**
   ```sql
   SELECT COUNT(*) FROM image;
   ```
4. **Image URLs ถูกต้อง:**
   ```sql
   SELECT p.id, i.url FROM product p 
   JOIN image i ON p.id = i.productId 
   LIMIT 5;
   ```

### 5. รัน Service

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

### 6. ตรวจสอบ Logs

เมื่อรัน Service คุณควรเห็น:

```
==================================================
🚀 Starting AI Visual Search Service
==================================================
Database: ecom1@localhost
NestJS URL: http://localhost:3000
==================================================

Loading AI Model (MobileNetV3)...
--- Start Indexing Database ---
Connecting to database: ecom1@localhost
Found 150 products with images in database
Indexing Product 1... (0/150)
Indexing Product 2... (10/150)
...
✅ Indexing Complete: 150 products indexed successfully
```

**ถ้าเห็น "❌ Indexing Complete: 0 products indexed":**
- ตรวจสอบ Database connection
- ตรวจสอบ Image URLs
- ตรวจสอบ NESTJS_BASE_URL

## การทำงาน

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

## ทดสอบระบบ

### 1. ตรวจสอบ Health

เปิด Browser ไปที่:
- `http://localhost:8000/` - ตรวจสอบสถานะ
- `http://localhost:8000/health` - Health check

### 2. ทดสอบ Visual Search

**จาก React Native App:**
1. เปิดแอป → ไปที่ Tab "Scan"
2. ถ่ายรูปหรือเลือกรูปจาก Gallery
3. กดค้นหา
4. ดูผลลัพธ์

**จาก Postman/curl:**
```bash
curl -X POST http://localhost:8000/visual-search \
  -F "file=@/path/to/image.jpg"
```

### 3. Re-index เมื่อเพิ่มสินค้าใหม่

เรียก GET `/reindex` endpoint:
```bash
curl http://localhost:8000/reindex
```

## Troubleshooting

### ปัญหา: Database connection error
**แก้ไข:**
1. ตรวจสอบว่า MySQL Server กำลังรันอยู่
2. ตรวจสอบ username, password, database name ใน `DB_CONFIG`
3. ตรวจสอบว่า database มีตาราง `product` และ `image`
4. ทดสอบเชื่อมต่อด้วย MySQL client:
   ```bash
   mysql -u root -p -h localhost ecom1
   ```

### ปัญหา: Indexing ได้ 0 products
**แก้ไข:**
1. ตรวจสอบว่า database มีข้อมูลสินค้า:
   ```sql
   SELECT COUNT(*) FROM product;
   ```
2. ตรวจสอบว่า image URLs ใน database เข้าถึงได้:
   ```sql
   SELECT p.id, i.url FROM product p 
   JOIN image i ON p.id = i.productId 
   LIMIT 5;
   ```
3. ตรวจสอบ `NESTJS_BASE_URL` ว่าถูกต้อง
4. ตรวจสอบ Internet connection (สำหรับ external URLs)
5. ลอง download รูปด้วย browser ดูว่าเข้าถึงได้หรือไม่

### ปัญหา: Image URLs ไม่เข้าถึงได้
**แก้ไข:**
- ถ้า URL เป็น relative path (เช่น `/uploads/image.jpg`):
  - ตรวจสอบ `NESTJS_BASE_URL` ว่าถูกต้อง
  - ตรวจสอบว่า NestJS Backend กำลังรันอยู่
  - ตรวจสอบว่า NestJS serve static files ได้
- ถ้า URL เป็น external URL (เช่น `https://...`):
  - ตรวจสอบ Internet connection
  - ตรวจสอบว่า URL ยังใช้งานได้

### ปัญหา: ModuleNotFoundError
**แก้ไข:** 
1. ตรวจสอบว่า activate virtual environment แล้ว
2. ติดตั้ง requirements.txt อีกครั้ง:
   ```bash
   pip install -r requirements.txt
   ```

### ปัญหา: Port 8000 ถูกใช้งานแล้ว
**แก้ไข:** แก้ไข port ใน `main.py`:
```python
uvicorn.run(app, host="0.0.0.0", port=8001)  # เปลี่ยนเป็น port อื่น
```

### ปัญหา: Model โหลดช้า
**แก้ไข:** ครั้งแรกที่รันจะต้องดาวน์โหลด Model (~100MB) รอให้เสร็จ

### ปัญหา: Timeout เมื่อค้นหา
**แก้ไข:**
1. เพิ่ม timeout ใน NestJS (products.service.ts) - ตอนนี้ตั้งไว้ 30 วินาที
2. ตรวจสอบว่า AI Service ยังรันอยู่
3. ลดจำนวน products ที่ index (ถ้ามีมากเกินไป)

## Performance Tips

1. **Index เฉพาะรูปแรก:** ตอนนี้ใช้ `GROUP BY p.id` เพื่อเอาเฉพาะรูปแรกของแต่ละสินค้า
2. **Cache Vectors:** Feature Vectors เก็บไว้ใน RAM เพื่อความเร็ว
3. **Batch Processing:** สามารถเพิ่ม batch processing สำหรับ indexing หลายรูปพร้อมกัน
4. **Background Re-indexing:** สามารถเพิ่ม scheduled task เพื่อ re-index อัตโนมัติ

## Configuration Options

### Threshold (ความเหมือนขั้นต่ำ)

แก้ไขใน `visual_search()` function:
```python
if score > 0.4 and p_id not in seen_ids:  # เปลี่ยน 0.4 เป็นค่าอื่น
```

- **0.3:** คืนผลลัพธ์มากขึ้น (แต่ความแม่นยำต่ำ)
- **0.5:** คืนผลลัพธ์น้อยลง (แต่ความแม่นยำสูง)
- **0.4:** สมดุล (แนะนำ)

### Top Results

แก้ไขใน `visual_search()` function:
```python
top_indices = np.argsort(scores)[::-1][:10]  # เปลี่ยน 10 เป็นจำนวนอื่น
```

## ขั้นตอนต่อไป

1. **Index ทุกรูป:** แก้ไข query ให้ index ทุกรูปของแต่ละสินค้า (ไม่ใช่แค่รูปแรก)
2. **Background Re-indexing:** เพิ่ม scheduled task เพื่อ re-index อัตโนมัติ
3. **Caching:** เพิ่ม caching สำหรับ Feature Vectors
4. **Monitoring:** เพิ่ม monitoring และ logging
