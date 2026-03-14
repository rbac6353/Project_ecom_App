import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function AdminReviewReportsScreen() {
  const { colors } = useTheme();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // ⚠️ สำคัญ: client.get() return data โดยตรง (ไม่ใช่ response object)
      const data = await client.get('/reviews/admin/reports');
      console.log('🚩 Review Reports Response:', data);
      if (Array.isArray(data)) {
        setReports(data);
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        setReports(data.data);
      } else {
        console.warn('⚠️ Unexpected reports response structure:', data);
        setReports([]);
      }
    } catch (error: any) {
      console.error('❌ Fetch reports error:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      if (error.response?.status === 403) {
        Alert.alert('แจ้งเตือน', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
      } else {
        Alert.alert('ผิดพลาด', error?.response?.data?.message || 'ไม่สามารถโหลดข้อมูลได้');
      }
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, []),
  );

  const handleResolve = (
    reportId: number,
    action: 'DELETE_REVIEW' | 'REJECT_REPORT',
  ) => {
    const actionText =
      action === 'DELETE_REVIEW'
        ? 'ลบรีวิวนี้'
        : 'ยกเลิกคำร้อง (เก็บรีวิวไว้)';

    Alert.alert('ตัดสินใจ', `คุณต้องการ ${actionText} ใช่หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ยืนยัน',
        onPress: async () => {
          try {
            await client.patch(`/reviews/admin/reports/${reportId}/resolve`, {
              action,
            });
            Alert.alert('สำเร็จ', 'ดำเนินการเรียบร้อยแล้ว');
            fetchReports(); // Refresh
          } catch (e: any) {
            console.error('Resolve report error:', e);
            Alert.alert(
              'ผิดพลาด',
              e.response?.data?.message || 'ทำรายการไม่สำเร็จ',
            );
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="flag" size={20} color="#FF5722" />
        <Text style={styles.reasonLabel}>เหตุผลการแจ้ง:</Text>
      </View>
      <Text style={styles.reason}>{item.reason}</Text>

      <View style={styles.reviewBox}>
        <Text style={styles.reviewLabel}>รีวิวที่ถูกแจ้ง:</Text>
        <Text style={styles.reviewText}>"{item.review?.comment || 'ไม่มีข้อความ'}"</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.rating}>⭐ {item.review?.rating || 0}/5</Text>
          <Text style={styles.productName}>
            สินค้า: {item.review?.product?.title || 'Unknown Product'}
          </Text>
        </View>
      </View>

      <View style={styles.reporterBox}>
        <Ionicons name="person-outline" size={14} color="#666" />
        <Text style={styles.reporter}>
          ผู้แจ้ง: {item.reporter?.name || 'Unknown'} (Store Owner)
        </Text>
      </View>

      <Text style={styles.date}>
        วันที่แจ้ง: {new Date(item.createdAt).toLocaleString('th-TH')}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => handleResolve(item.id, 'REJECT_REPORT')}
          style={styles.rejectBtn}
        >
          <Ionicons name="close-circle-outline" size={18} color="#333" />
          <Text style={styles.rejectBtnText}>ยกเลิกคำร้อง</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleResolve(item.id, 'DELETE_REVIEW')}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.deleteBtnText}>ลบรีวิวนี้</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="คำร้องเรียนรีวิว" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5722" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="คำร้องเรียนรีวิว" />
      <FlatList
        data={reports}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#4CAF50" />
            <Text style={styles.empty}>ไม่มีคำร้องเรียนใหม่</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchReports} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: 12,
    color: '#FF5722',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  reason: {
    fontSize: 14,
    color: '#333',
    marginBottom: 15,
    lineHeight: 20,
  },
  reviewBox: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  reviewLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  reviewText: {
    fontStyle: 'italic',
    color: '#555',
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  productName: {
    fontSize: 11,
    color: '#666',
  },
  reporterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  reporter: {
    fontSize: 11,
    color: '#999',
    marginLeft: 5,
  },
  date: {
    fontSize: 10,
    color: '#999',
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 5,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
  },
  rejectBtnText: {
    marginLeft: 5,
    color: '#333',
    fontSize: 13,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#D32F2F',
    borderRadius: 6,
  },
  deleteBtnText: {
    marginLeft: 5,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  empty: {
    textAlign: 'center',
    marginTop: 15,
    color: '#999',
    fontSize: 16,
  },
});

