// services/searchService.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 💡 Base URL จาก api/client.ts
const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    } else {
      return 'http://192.168.43.230:3000'; // เปลี่ยนเป็น IP ของคอมพิวเตอร์ของคุณ
    }
  }
  return 'https://api.yourdomain.com';
};

const API_BASE_URL = getApiBaseUrl();

export const visualSearch = async (imageUri: string) => {
  const token = await AsyncStorage.getItem('ultra_token');
  const formData = new FormData();

  // 1. กำหนดชื่อไฟล์และประเภท (สำคัญมากสำหรับ RN/iOS)
  const filename = imageUri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename || '');
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
    type: type,
    name: filename || 'visual_search_photo.jpg',
  } as any); // ✅ field ชื่อ 'file' ให้ตรงกับ Backend + AI Service

  try {
    console.log('🔍 Sending visual search request to:', `${API_BASE_URL}/products/visual-search`);
    console.log('📷 Image URI:', imageUri);
    console.log('📦 FormData prepared');

    // 2. เรียกใช้ Axios ธรรมดา (ไม่ใช่ Instance)
    // ⚠️ ใช้ axios ตรงๆ ไม่ผ่าน client instance ดังนั้นต้อง unwrap response.data เอง
    const response = await axios.post(`${API_BASE_URL}/products/visual-search`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // 👈 Header ที่สำคัญ
        'Authorization': token ? `Bearer ${token}` : '',
      },
      timeout: 30000, // เพิ่ม timeout เป็น 30 วินาที เพราะ AI Service ต้องประมวลผลภาพ
    });

    const responseData = response.data;
    const data = responseData?.data ?? responseData;
    let products: any[] = [];
    let otherProducts: any[] = [];
    if (Array.isArray(data)) {
      products = data;
    } else if (data && typeof data === 'object') {
      products = Array.isArray(data.products) ? data.products : [];
      otherProducts = Array.isArray(data.otherProducts) ? data.otherProducts : [];
    }

    console.log('✅ Visual search: relevant=', products.length, 'others=', otherProducts.length);
    return { products, otherProducts };
  } catch (error: any) {
    console.error('❌ Visual Search Failed:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });

    if (error.response) {
      const errorMessage = error.response.data?.message ||
        error.response.data?.error ||
        `Server error: ${error.response.status} ${error.response.statusText}`;
      throw new Error(errorMessage);
    }
    throw new Error(error.message || 'ไม่สามารถประมวลผลรูปภาพได้');
  }
};

