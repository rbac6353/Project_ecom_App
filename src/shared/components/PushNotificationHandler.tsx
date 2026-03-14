import React from 'react';
import { usePushNotifications } from '@shared/hooks/usePushNotifications';
import { useAuth } from '@app/providers/AuthContext';

export default function PushNotificationHandler() {
  const { user } = useAuth();
  usePushNotifications(user); // เรียกใช้ Hook
  return null; // Component นี้ไม่แสดงอะไร
}

