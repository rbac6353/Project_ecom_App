import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useTheme } from '@app/providers/ThemeContext';

export default function NotificationScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get('/notifications');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const notificationsList = Array.isArray(res) ? res : (res?.data || []);
      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, []),
  );

  const handlePress = async (item: any) => {
    // 1. Mark as read
    if (!item.isRead) {
      try {
        await client.patch(`/notifications/${item.id}/read`);
        // อัปเดต UI ทันที (Optimistic)
        setNotifications((prev) =>
          prev.map((n: any) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }

    // 2. Navigate ตาม Type
    if (item.data?.url) {
      // ถ้ามี Deep Link ให้เปิด (ต้อง Parse URL ก่อน หรือใช้ logic ง่ายๆ)
      // สมมติ url = "boxify://order/123"
      const url = item.data.url;
      if (url.includes('order')) {
        const orderId = url.split('/').pop();
        if (orderId) {
          navigation.navigate('OrderDetail', { orderId: +orderId });
        }
      }
    } else if (item.data?.orderId) {
      // ถ้ามี orderId โดยตรง
      navigation.navigate('OrderDetail', { orderId: item.data.orderId });
    }
  };

  const handleReadAll = async () => {
    try {
      await client.patch('/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const renderItem = ({ item }: any) => {
    // เลือก Icon ตามประเภท
    let iconName: any = 'notifications';
    let iconColor = '#FF9800';
    if (item.type === 'ORDER') {
      iconName = 'cube';
      iconColor = '#2196F3';
    }
    if (item.type === 'PROMOTION') {
      iconName = 'pricetag';
      iconColor = '#E91E63';
    }

    return (
      <TouchableOpacity
        style={[
          styles.item,
          { borderBottomColor: colors.border },
          !item.isRead && { backgroundColor: '#FFF3E0' },
        ]}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              { color: colors.text },
              !item.isRead && styles.unreadText,
            ]}
          >
            {item.title}
          </Text>
          <Text style={[styles.body, { color: colors.subText }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.time, { color: colors.subText }]}>
            {new Date(item.createdAt).toLocaleString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {!item.isRead && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: colors.card,
            paddingTop: insets.top + 8, // ✅ รองรับ Safe Area + padding เพิ่มเติม
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back-outline" size={28} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          การแจ้งเตือน
        </Text>
        <TouchableOpacity onPress={handleReadAll} style={styles.readAllButton}>
          <Ionicons
            name="checkmark-done-outline"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.subText }]}>
              ไม่มีการแจ้งเตือน
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  readAllButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  item: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  body: {
    fontSize: 14,
    marginBottom: 4,
  },
  time: {
    fontSize: 10,
    marginTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5722',
    marginLeft: 10,
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
});

