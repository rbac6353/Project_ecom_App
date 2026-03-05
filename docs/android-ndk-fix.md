# แก้ error: NDK did not have a source.properties file

เมื่อรัน `npx expo run:android` แล้วเจอ:

```
[CXX1101] NDK at C:\Users\GF63\AppData\Local\Android\Sdk\ndk\27.1.12297006 did not have a source.properties file
```

หมายความว่าโฟลเดอร์ NDK ที่โปรเจกต์ใช้ (27.1.12297006) ไม่สมบูรณ์ หรือติดตั้งไม่ครบ

---

## วิธีที่ 1: สร้างไฟล์ source.properties (ถ้าโฟลเดอร์ NDK มีอยู่แล้ว)

ถ้าโฟลเดอร์ `C:\Users\GF63\AppData\Local\Android\Sdk\ndk\27.1.12297006` มีอยู่และมีไฟล์อื่นๆ ครบ แค่ขาด `source.properties`:

1. เปิด Notepad สร้างไฟล์ใหม่
2. วางข้อความด้านล่างนี้ (บรรทัดเดียวหรือสองบรรทัดก็ได้):

   ```
   Pkg.Revision=27.1.12297006
   ```

3. บันทึกเป็นชื่อ **source.properties** (ไม่มี .txt)
4. วางไฟล์นี้ในโฟลเดอร์:
   `C:\Users\GF63\AppData\Local\Android\Sdk\ndk\27.1.12297006\`
5. รัน `npx expo run:android` อีกครั้ง

---

## วิธีที่ 2: ติดตั้ง/ติดตั้งใหม่ NDK ผ่าน Android Studio (แนะนำ)

1. เปิด **Android Studio**
2. ไปที่ **Settings / Preferences** → **Languages & Frameworks** → **Android SDK**
3. แท็บ **SDK Tools** → ติ๊ก **Show Package Details**
4. หา **NDK (Side by side)** แล้วขยาย
5. เลือกเวอร์ชัน **27.1.12297006**:
   - ถ้ายังไม่มี: กด **Apply** เพื่อติดตั้ง
   - ถ้ามีแล้วแต่ build ยัง error: เอาเครื่องหมายออก (Uninstall) แล้วกด **Apply** จากนั้นติ๊กติดตั้งใหม่อีกครั้ง
6. รอให้ติดตั้งเสร็จ แล้วรัน `npx expo run:android` อีกครั้ง

---

## วิธีที่ 3: ติดตั้ง NDK ผ่าน Command Line

ถ้าใช้ Android SDK command-line tools แล้ว:

```bash
# ดู path ของ sdkmanager (ปรับตามที่ติดตั้ง)
"%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" --install "ndk;27.1.12297006"
```

จากนั้นรัน `npx expo run:android` อีกครั้ง
