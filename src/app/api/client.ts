// api/client.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL - ใช้ IP address สำหรับ device/emulator
// สำหรับ Android Emulator: ใช้ http://10.0.2.2:3000
// สำหรับ iOS Simulator: ใช้ http://localhost:3000
// สำหรับ Physical Device: ใช้ IP address ของคอมพิวเตอร์ (เช่น http://192.168.43.230:3000)
import { Platform } from 'react-native';

export const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development mode
    if (Platform.OS === 'android') {
      // Android Emulator ใช้ 10.0.2.2 แทน localhost
      return 'http://10.0.2.2:3000';
    } else {
      // iOS Simulator หรือ Physical Device
      // ถ้าใช้ Physical Device ให้เปลี่ยนเป็น IP address ของคอมพิวเตอร์
      return 'http://192.168.43.230:3000'; // เปลี่ยนเป็น IP ของคอมพิวเตอร์ของคุณ
    }
  }
  // Production mode - ใช้ production API URL
  return 'https://api.yourdomain.com';
};

const API_BASE_URL = getApiBaseUrl();

// Log API URL ใน development mode
if (__DEV__) {
  console.log('🔗 API Base URL:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // ✅ 60 seconds timeout (เพิ่มจาก 30 เป็น 60 เพื่อรองรับการอัปโหลดไฟล์และ EasySlip API retry)
});

// 🚀 Interceptor สำหรับ "แนบ Token" (ตาม PROMPT)
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('ultra_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // ✅ ถ้าเป็น FormData ไม่ต้องตั้ง Content-Type (ให้ React Native ตั้งให้อัตโนมัติ)
    if (config.data instanceof FormData) {
      // ลบ Content-Type header เพื่อให้ React Native ตั้งให้อัตโนมัติพร้อม boundary
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🚀 Interceptor สำหรับ "Unwrap Response Data" และ Error Handling
api.interceptors.response.use(
  (response) => {
    // ✅ Backend มี Global TransformInterceptor ที่ wrap response เป็น:
    // { success: true, message: 'Success', data: <actual data>, timestamp: '...' }
    // 1. ถ้า Backend ส่ง { success: true, data: [...] } มา (มี property 'data')
    if (response.data && typeof response.data === 'object' && 'data' in response.data && response.data.data !== undefined) {
      // ส่งกลับเฉพาะ data property (Array หรือ Object) ข้างใน
      return response.data.data;
    }
    // 2. ถ้า Backend ส่ง Array มาตรงๆ หรือ Object ธรรมดา (ไม่มี wrapping)
    return response.data;
  },
  async (error) => {
    // จัดการ 401 Unauthorized - Token หมดอายุหรือไม่ถูกต้อง
    if (error.response?.status === 401) {
      // ลบ token ที่หมดอายุ
      await AsyncStorage.removeItem('ultra_token');
      console.log('⚠️ Token expired or invalid. Please login again.');
      // ไม่ต้อง throw error เพื่อไม่ให้แอป crash
      // แต่ให้ component จัดการเอง
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout:', error.config?.url);
      console.error('💡 Suggestions:');
      console.error('   1. Check if backend server is running');
      console.error('   2. Verify network connection');
      console.error('   3. Check if IP address is correct:', API_BASE_URL);
      console.error('   4. Try increasing timeout if network is slow');
    } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      console.error('🌐 Network Error - Check if backend is running at:', API_BASE_URL);
      console.error('💡 Make sure:');
      console.error('   1. Backend server is running (npm start in Backend folder)');
      console.error('   2. Device and computer are on the same network');
      console.error('   3. Firewall allows connections on port 3000');
      console.error('   4. IP address is correct:', API_BASE_URL);
    }
    return Promise.reject(error);
  }
);

export default api;

