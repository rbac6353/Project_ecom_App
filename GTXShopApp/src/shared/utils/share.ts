// src/utils/share.ts
import { Share, Alert, Platform } from 'react-native';

export const shareContent = async (title: string, message: string, path: string) => {
  try {
    // สร้าง Deep Link (เช่น boxify://product/123)
    // หมายเหตุ: ใน Production จริงมักใช้ Firebase Dynamic Links หรือ Universal Links
    // แต่แบบ Custom Scheme นี้ใช้ได้ดีสำหรับการเรียนรู้และใช้งานภายใน
    const url = `boxify://${path}`;
    
    const shareMessage = `${title}\n\n${message}\n\nดูรายละเอียดที่นี่: ${url}`;

    const result = await Share.share({
      title: title, // สำหรับ Android
      message: Platform.OS === 'android' ? shareMessage : title, // Android เอา url ใส่ใน message
      url: Platform.OS === 'ios' ? url : undefined, // สำหรับ iOS
    });

    if (result.action === Share.sharedAction) {
      if (result.activityType) {
        // shared with activity type of result.activityType
        console.log('Shared via', result.activityType);
      } else {
        // shared
        console.log('Shared successfully');
      }
    } else if (result.action === Share.dismissedAction) {
      // dismissed
      console.log('Share dismissed');
    }
  } catch (error: any) {
    Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถแชร์ได้');
  }
};

