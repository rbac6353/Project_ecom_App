import { createNavigationContainerRef } from '@react-navigation/native';

// Global navigation ref ให้เรียก navigate ได้จากนอก component (เช่น จาก push notification handler)
export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    // ใช้ as never เพื่อลด TypeScript noise ในโปรเจคเดิม
    navigationRef.navigate(name as never, params as never);
  }
}


