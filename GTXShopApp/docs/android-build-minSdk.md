# Android build: minSdk 24 and prefab (CXX1214)

## ปัญหา

Build Android ล้มกับ:

```
[CXX1214] User has minSdkVersion 22 but library was built for 24 [//ReactAndroid/hermestooling]
```

เกิดกับโมดูลที่ใช้ native (CMake/prefab): `react-native-worklets`, `expo-modules-core`, `react-native-screens`

## สิ่งที่ตั้งไว้แล้วในโปรเจกต์

- **android/settings.gradle**
  - `gradle.projectsLoaded { gradle.rootProject.ext.set("minSdkVersion", 24) }` (ก่อน configure โปรเจกต์)
- **android/build.gradle**
  - บรรทัดบนสุด: `project.ext.minSdkVersion = 24`
  - บังคับ subproject: `sub.android.defaultConfig.minSdkVersion 24` ใน `afterEvaluate`
- **android/gradle.properties**
  - `android.minSdkVersion=24`
- **android/app/build.gradle**
  - `minSdkVersion 24` (literal)
- **node_modules** (แพตช์แล้ว)
  - react-native-worklets, react-native-screens, expo-modules-core ใช้ `minSdkVersion 24` ใน build.gradle
- **Expo** แสดง `minSdk: 24` ตอน configure

แต่ขั้นตอน prefab ของ AGP ยังเห็นค่า "user" เป็น 22 จึง reject hermestooling (ที่ build ด้วย 24). ค่า 22 น่าจะมาจาก internal ของ AGP/NDK ไม่ใช่จาก Gradle ของโปรเจกต์

## ทางเลือกที่ทำได้

### 1) ใช้ patch-package บังคับ minSdk 24 ในไลบรารี

ถ้าต้องการให้ build ผ่านโดยไม่รอ fix จาก upstream:

1. ติดตั้ง patch-package:
   ```bash
   npm i -D patch-package
   ```
2. ใน `package.json` เพิ่มใน `"scripts"`:
   ```json
   "postinstall": "patch-package"
   ```
3. แก้ใน `node_modules` แล้วสร้าง patch:
   - **react-native-worklets**: ใน `android/build.gradle` เปลี่ยน
     `minSdkVersion safeExtGet("minSdkVersion", 23)` เป็น `minSdkVersion 24`
   - **react-native-screens**: ใน `android/build.gradle` เปลี่ยน
     `minSdkVersion safeExtGet(['minSdkVersion', 'minSdk'], rnsDefaultMinSdkVersion)` เป็น `minSdkVersion 24`
   - **expo-modules-core**: ใน `android/ExpoModulesCorePlugin.gradle` เปลี่ยน
     `minSdkVersion project.ext.safeExtGet("minSdkVersion", 24)` เป็น `minSdkVersion 24`
4. สร้าง patch:
   ```bash
   npx patch-package react-native-worklets
   npx patch-package react-native-screens
   npx patch-package expo-modules-core
   ```

หลัง `npm install` patch จะถูก apply อัตโนมัติ

### 2) รออัปเดตจาก React Native / Expo

อาจเป็น bug หรือการ resolve ค่า minSdk ของ AGP กับ prefab ใน composite build (เช่น กับ Expo version catalog / includeBuild) ถ้าไม่เร่ง สามารถรออัปเดตและลอง build ใหม่หลังอัป dependency

### 3) ตรวจสอบว่าไม่มีที่อื่นบังคับ 22

- ตรวจใน `android/` ว่าไม่มี `minSdkVersion = 22` หรือ `ext.minSdkVersion = 22`
- ตรวจ `buildscript { ext { ... } }` ว่าไม่มี minSdk 22

### 4) ลอง NDK เวอร์ชันอื่น (ทดลอง)

ใน **android/gradle.properties** หรือผ่าน **local.properties** ลองกำหนด `ndkVersion` เป็น 26.x (ถ้ามีติดตั้ง) แล้ว clean + build ใหม่ เผื่อ code path ของ prefab เปลี่ยนตาม NDK

### 5) รายงาน bug ไปที่ upstream

- React Native: https://github.com/facebook/react-native/issues  
- Expo: https://github.com/expo/expo/issues  

แจ้งว่า: ตั้ง minSdk 24 ทุกที่ (root, app, gradle.properties, แพตช์ 3 libs) และ Expo แสดง minSdk 24 แล้ว แต่ prefab ยังรายงาน "User has minSdkVersion 22" (React Native 0.81.x, Expo 54, AGP 8.x, NDK 27).

## อ้างอิง

- [Stack Overflow: Build fails after lowering minSdkVersion to 22](https://stackoverflow.com/questions/79805907/build-fails-after-lowering-minsdkversion-to-22-user-has-minsdkversion-22-but-l)
- React Native hermestooling build ด้วย minSdk 24 (จาก `react-native/gradle/libs.versions.toml`)
