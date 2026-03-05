## วิธีรันโปรเจค (Quick Start)

**Note:** ครั้งแรกให้รัน `npm install` ในแต่ละโฟลเดอร์ก่อน

### 1. Backend (Server)

```bash
cd Backend
npm run start:dev
```

### 2. ngrok (Public URL)

```bash
cd Backend
ngrok http 3000
```

⚠️ สำคัญ: ทุกครั้งที่รัน ngrok ใหม่ URL จะเปลี่ยน ต้องนำ URL ล่าสุดไปอัปเดตในแอป Automate หรือไฟล์ `.env` ของ Frontend เสมอ

### 3. AI Service

```bash
cd AI_Service
python main.py
# หรือ (Windows)
start.bat
```

### 4. Mobile App (Frontend)

```bash
cd GTXShopApp
npx expo start
```