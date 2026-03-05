# วิธีอัปโหลดโปรเจกต์ขึ้น GitHub ให้คนอื่นดู/ดาวน์โหลดได้

---

> **สำคัญ (Cursor / Terminal ใหม่)**  
> ถ้าใส่ `git` แล้วขึ้นว่า *"git is not recognized"* ให้**รันบรรทัดนี้ก่อนทุกครั้ง**ที่เปิดเทอร์มินัล แล้วค่อยรันคำสั่ง git อื่น ๆ:
> ```powershell
> $env:Path = "C:\Program Files\Git\cmd;" + $env:Path
> ```

---

## ขั้นที่ 1: ติดตั้ง Git (ทำครั้งเดียวต่อเครื่อง)

- **ดาวน์โหลด**: https://git-scm.com/download/win  
- ติดตั้งแล้ว **ปิดแล้วเปิด Terminal/Cursor ใหม่**  
- **เช็ค**: `git --version` ต้องมีเลขเวอร์ชัน  

ถ้า git ใช้ไม่ได้ใน Cursor ให้รันก่อนใช้ Git **ทุกครั้งที่เปิดเทอร์มินัลใหม่**:

```powershell
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path
```

---

## ขั้นที่ 2: สร้าง Repository บน GitHub

1. เข้า https://github.com → ล็อกอิน  
2. กด **New** (ปุ่มสีเขียว)  
3. ตั้งค่า:
   - **Repository name**: ชื่อโปรเจกต์ (เช่น `GTXShop` หรือ `my-app`)
   - **Public** หรือ **Private**
   - **ไม่ต้อง** เลือก Add README / .gitignore ถ้าโฟลเดอร์โปรเจกต์มีไฟล์อยู่แล้ว
4. กด **Create repository**  
5. **จำ URL** ที่ GitHub แสดง เช่น `https://github.com/username/my-app.git`  

---

## ขั้นที่ 3: เตรียมโปรเจกต์บนเครื่อง

เปิด Terminal/PowerShell แล้วไปที่โฟลเดอร์โปรเจกต์ (รากโปรเจกต์ — โฟลเดอร์ที่มี Backend, GTXShopApp, AI_Service):

```powershell
cd "d:\Development\mobile\Projects_React_Native"
```

---

## ขั้นที่ 4: ตั้งค่า Git (ครั้งแรกต่อเครื่อง)

```powershell
git config --global user.name "ชื่อคุณหรือชื่อใน GitHub"
git config --global user.email "อีเมลที่ใช้กับ GitHub"
```

---

## ขั้นที่ 5: เริ่มใช้ Git ในโปรเจกต์

```powershell
git init
```

(ถ้ามีโฟลเดอร์ `.git` อยู่แล้ว ข้ามขั้นนี้)

---

## ขั้นที่ 6: กันไฟล์ลับ/ไฟล์ที่ไม่ต้องอัปโหลด

โปรเจกต์นี้มี **.gitignore ที่ราก** อยู่แล้ว ครอบคลุมอย่างน้อย:

- `node_modules/`
- `.env`, `.env.local`, `.env.*.local`
- `venv/`, `.venv/`, `__pycache__/`
- `Backend/uploads/`, `Backend/dist/`
- `GTXShopApp/.expo/`, `ios/`, `android/`
- `*.log`, `.DS_Store` ฯลฯ

**สำคัญ**: อย่าใส่รหัสผ่าน / API key / OAuth secret ใน repo — ใช้ไฟล์ `.env` และให้แน่ใจว่า `.env` อยู่ใน `.gitignore` (มีอยู่แล้ว)

---

## ขั้นที่ 7: Add และ Commit

```powershell
git add .
git status
git commit -m "Initial commit"
```

ถ้า Git บอกให้ตั้งชื่อ/อีเมล ให้กลับไปทำ **ขั้นที่ 4** ก่อน

---

## ขั้นที่ 8: เชื่อมกับ GitHub แล้ว Push

แทนที่ `username` และ `ชื่อrepo` ด้วยของจริง:

```powershell
git remote add origin https://github.com/username/ชื่อrepo.git
git branch -M main
git push -u origin main
```

**ถ้าขึ้นว่า remote origin already exists** แทนที่จะ add ให้ใช้:

```powershell
git remote set-url origin https://github.com/username/ชื่อrepo.git
git push -u origin main
```

**ถ้า GitHub บล็อกเพราะมี secrets** (รหัส OAuth, API key ฯลฯ):

1. ลบหรือย้ายรหัสออกจากไฟล์ที่ commit  
2. ใส่ชื่อไฟล์นั้นใน `.gitignore`  
3. ลบออกจาก Git: `git rm --cached ชื่อไฟล์`  
4. แก้ commit: `git add .` แล้ว `git commit --amend --no-edit`  
5. จากนั้น `git push -u origin main` อีกครั้ง  

---

## ขั้นที่ 9: ให้คนอื่นดู/ดาวน์โหลด

Repo เป็น **Public** อยู่แล้ว → ส่งลิงก์ให้ได้เลย:

- **ดู repo**: `https://github.com/username/ชื่อrepo`  
- **ดูไฟล์**: เปิดลิงก์แล้วคลิกเข้าโฟลเดอร์/ไฟล์  
- **ดาวน์โหลด ZIP**: ในหน้า repo กด **Code** → **Download ZIP**  
- **Clone**: `git clone https://github.com/username/ชื่อrepo.git`  

---

## สรุปคำสั่งแบบรวด (โปรเจกต์ใหม่)

**ถ้า git ยังไม่รู้จัก** — รันบรรทัดแรกก่อน แล้วค่อยรันที่เหลือ:

```powershell
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path
cd "d:\Development\mobile\Projects_React_Native"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/ชื่อrepo.git
git branch -M main
git push -u origin main
```

---

## อัปเดตโปรเจกต์ในครั้งถัดไป

```powershell
git add .
git commit -m "อธิบายสิ่งที่แก้"
git push
```

---

เก็บข้อความนี้ไว้ใช้กับโปรเจกต์อื่นได้เลย — แค่เปลี่ยน `username`, `ชื่อrepo` และเส้นทางโฟลเดอร์ตามโปรเจกต์นั้น ๆ
