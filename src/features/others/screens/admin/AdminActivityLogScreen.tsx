import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function AdminActivityLogScreen() {
  const { colors } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // ⚠️ สำคัญ: client.get() return data โดยตรง (ไม่ใช่ response object)
      const data = await client.get('/admin-logs');
      console.log('📝 Admin Logs Response:', data);
      if (Array.isArray(data)) {
        setLogs(data);
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        setLogs(data.data);
      } else {
        console.warn('⚠️ Unexpected logs response structure:', data);
        setLogs([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching logs:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, []),
  );

  const getIconAndColor = (action: string) => {
    if (action.includes('BAN')) {
      return { icon: 'ban', color: '#F44336' };
    }
    if (action.includes('DELETE')) {
      return { icon: 'trash', color: '#D32F2F' };
    }
    if (action.includes('VERIFY')) {
      return { icon: 'checkmark-circle', color: '#4CAF50' };
    }
    if (action.includes('CHANGE_ROLE')) {
      return { icon: 'key', color: '#FF9800' };
    }
    return { icon: 'information-circle', color: '#2196F3' };
  };

  const renderItem = ({ item }: any) => {
    const { icon, color } = getIconAndColor(item.action);
    return (
      <View style={styles.card}>
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.content}>
          <Text style={styles.action}>{item.action}</Text>
          <Text style={styles.details}>{item.details}</Text>
          <View style={styles.footer}>
            <Text style={styles.admin}>
              โดย: {item.admin?.name || item.admin?.email || 'Unknown'}
            </Text>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleString('th-TH')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="บันทึกกิจกรรม (Audit Log)" />

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FF5722"
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={styles.empty}>ไม่มีประวัติกิจกรรม</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  action: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  details: { fontSize: 13, color: '#555', marginVertical: 4 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  admin: { fontSize: 11, color: '#888' },
  date: { fontSize: 11, color: '#999' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' },
});

