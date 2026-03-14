import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import client from '@app/api/client';
import * as RootNavigation from '@navigation/RootNavigation';

// ตั้งค่าการแสดงผลตอนเปิดแอปอยู่ (foreground handler)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface PushNotificationState {
  expoPushToken?: string;
  notification?: Notifications.Notification;
}

// รับ user เพื่อจะ sync token ไป backend หลัง login แล้ว
export const usePushNotifications = (user: any) => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] =
    useState<Notifications.Notification | undefined>();

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // ขอ permission + token
  const registerForPushNotificationsAsync = async () => {
    let token: string | undefined;

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'แจ้งเตือน',
          'ไม่สามารถรับการแจ้งเตือนได้ กรุณาอนุญาตการแจ้งเตือนใน Settings',
        );
        return;
      }

      // ดึง projectId (สำหรับ SDK ใหม่ / Development build)
      const projectId =
        // @ts-ignore
        Constants?.expoConfig?.extra?.eas?.projectId ??
        // @ts-ignore
        Constants?.easConfig?.projectId;

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined as any,
        );
        token = tokenData.data;
        console.log('My Push Token:', token);
      } catch (error: any) {
        console.warn('Error getting push token:', error?.message || error);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    // Android ต้องตั้ง channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  };

  // ลงทะเบียน token ครั้งแรก
  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
      }
    });

    // Listener: ได้ notification ขณะเปิดแอป
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        setNotification(notif);
      });

    // Listener: ผู้ใช้กดที่ notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data: any =
          response.notification.request.content.data || {};
        console.log('Notification Clicked:', data);

        // รองรับทั้ง data.screen + orderId และ data.url แบบ boxify://order/123
        if (data.screen === 'OrderDetail' && data.orderId) {
          setTimeout(() => {
            RootNavigation.navigate('OrderDetail', { orderId: data.orderId });
          }, 500);
        } else if (typeof data.url === 'string' && data.url.includes('order')) {
          const orderId = data.url.split('/').pop();
          if (orderId) {
            setTimeout(() => {
              RootNavigation.navigate('OrderDetail', { orderId: +orderId });
            }, 500);
          }
        }
      });

    return () => {
      // Expo Notifications SDK ใหม่ให้เรียก .remove() จาก subscription แทนฟังก์ชัน global
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // เมื่อมีทั้ง user และ token ให้ sync ไป backend
  useEffect(() => {
    const syncToken = async () => {
      if (user && expoPushToken) {
        try {
          await client.patch('/users/push-token', { token: expoPushToken });
        } catch (err) {
          console.log('Failed to save push token', err);
        }
      }
    };
    syncToken();
  }, [user, expoPushToken]);

  return {
    expoPushToken,
    notification,
  };
};

