import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function AdminChatListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = async () => {
    try {
      const res = await client.get('/chat/conversations');
      setChats(res);
    } catch (error: any) {
      console.error('❌ Error fetching chats:', error);
      if (error.response?.status === 403) {
        console.error('⚠️ Access denied. Only Admin/Seller can view chat list.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchChats();
    }, []),
  );

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('Chat', { roomId: item.roomId })}
    >
      {/* Avatar ลูกค้า */}
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {item.user?.name?.[0]?.toUpperCase() || '?'}
        </Text>
      </View>

      <View style={styles.chatContent}>
        <View style={styles.topRow}>
          <Text style={styles.userName}>
            {item.user?.name || 'Unknown User'}
          </Text>
          <Text style={styles.time}>{formatTime(item.lastMessageDate)}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage || 'ไม่มีข้อความ'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="รายการแชทลูกค้า" />

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FF5722"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item: any) => item.roomId}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 0 }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchChats();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ยังไม่มีลูกค้าทักมา</Text>
              <Text style={styles.emptySubText}>
                เมื่อมีลูกค้าส่งข้อความมา จะแสดงที่นี่
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  chatContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginLeft: 10,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#bbb',
    fontSize: 14,
  },
});

