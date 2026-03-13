import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import client from '@app/api/client';
import { useAuth } from '@app/providers/AuthContext';

export default function AdminCouponListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PLATFORM' | 'SHOP'>('ALL');

  useEffect(() => {
    loadCoupons();
  }, [filter]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      // ⚠️ สำคัญ: client.get() return data โดยตรง (ไม่ใช่ response object)
      const data = await client.get('/coupons');
      console.log('🎫 Coupons API Response:', data);
      
      let allCoupons: any[] = [];
      if (Array.isArray(data)) {
        allCoupons = data;
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        allCoupons = data.data;
      } else {
        console.warn('⚠️ Unexpected coupons response structure:', data);
        allCoupons = [];
      }

      // กรองตาม filter
      if (filter === 'PLATFORM') {
        allCoupons = allCoupons.filter((c: any) => !c.storeId);
      } else if (filter === 'SHOP') {
        allCoupons = allCoupons.filter((c: any) => c.storeId);
      }

      setCoupons(allCoupons);
    } catch (error: any) {
      console.error('❌ Error loading coupons:', error);
      Alert.alert('ผิดพลาด', error?.response?.data?.message || 'ไม่สามารถโหลดคูปองได้');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (couponId: number) => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบคูปองนี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/coupons/${couponId}`);
              Alert.alert('สำเร็จ', 'ลบคูปองเรียบร้อย');
              loadCoupons();
            } catch (error: any) {
              Alert.alert('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถลบคูปองได้');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isPlatform = !item.storeId;
    const now = new Date();
    const expiresAt = new Date(item.expiresAt);
    const isExpired = expiresAt < now;
    const isActive = !item.startDate || new Date(item.startDate) <= now;

    return (
      <View style={[styles.couponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.couponHeader}>
          <View style={styles.couponTitleRow}>
            <Text style={[styles.couponCode, { color: colors.primary }]}>{item.code}</Text>
            <View style={[styles.badge, { backgroundColor: isPlatform ? '#26aa99' : '#ee4d2d' }]}>
              <Text style={styles.badgeText}>
                {isPlatform ? 'Platform' : 'Shop'}
              </Text>
            </View>
          </View>
          {item.storeName && (
            <Text style={[styles.storeName, { color: colors.subText }]}>
              ร้าน: {item.storeName}
            </Text>
          )}
        </View>

        <View style={styles.couponBody}>
          {item.title && (
            <Text style={[styles.couponTitle, { color: colors.text }]}>{item.title}</Text>
          )}
          
          <View style={styles.discountRow}>
            {item.discountAmount > 0 && (
              <Text style={[styles.discountText, { color: colors.text }]}>
                ลด {item.discountAmount.toLocaleString()} บาท
              </Text>
            )}
            {item.discountPercent > 0 && (
              <Text style={[styles.discountText, { color: colors.text }]}>
                ลด {item.discountPercent}%
                {item.maxDiscount && ` (สูงสุด ${item.maxDiscount.toLocaleString()} บาท)`}
              </Text>
            )}
            {item.type === 'SHIPPING' && (
              <Text style={[styles.discountText, { color: colors.text }]}>ฟรีค่าจัดส่ง</Text>
            )}
          </View>

          {item.minPurchase > 0 && (
            <Text style={[styles.conditionText, { color: colors.subText }]}>
              ซื้อขั้นต่ำ {item.minPurchase.toLocaleString()} บาท
            </Text>
          )}

          <View style={styles.infoRow}>
            <Text style={[styles.infoText, { color: colors.subText }]}>
              ใช้แล้ว: {item.usedCount || 0}
              {item.totalQuantity && ` / ${item.totalQuantity}`}
            </Text>
            <Text style={[styles.infoText, { color: isExpired ? '#ff4444' : colors.subText }]}>
              หมดอายุ: {expiresAt.toLocaleDateString('th-TH')}
            </Text>
          </View>

          <View style={styles.statusRow}>
            {!isActive && (
              <View style={[styles.statusBadge, { backgroundColor: '#ffa500' }]}>
                <Text style={styles.statusText}>ยังไม่เริ่ม</Text>
              </View>
            )}
            {isExpired && (
              <View style={[styles.statusBadge, { backgroundColor: '#ff4444' }]}>
                <Text style={styles.statusText}>หมดอายุ</Text>
              </View>
            )}
            {isActive && !isExpired && (
              <View style={[styles.statusBadge, { backgroundColor: '#4caf50' }]}>
                <Text style={styles.statusText}>ใช้งานได้</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.couponActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('AddCoupon', { couponId: item.id })}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>แก้ไข</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ff4444' }]}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>ลบ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="จัดการคูปอง" />
      
      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'ALL' && styles.filterButtonActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
            ทั้งหมด
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'PLATFORM' && styles.filterButtonActive]}
          onPress={() => setFilter('PLATFORM')}
        >
          <Text style={[styles.filterText, filter === 'PLATFORM' && styles.filterTextActive]}>
            Platform
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'SHOP' && styles.filterButtonActive]}
          onPress={() => setFilter('SHOP')}
        >
          <Text style={[styles.filterText, filter === 'SHOP' && styles.filterTextActive]}>
            Shop
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                ยังไม่มีคูปอง
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddCoupon')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterContainer: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  filterButtonActive: {
    backgroundColor: '#26aa99',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
  },
  couponCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  couponHeader: {
    marginBottom: 10,
  },
  couponTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  couponCode: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  storeName: {
    fontSize: 12,
    marginTop: 5,
  },
  couponBody: {
    marginBottom: 10,
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  discountRow: {
    marginBottom: 5,
  },
  discountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ee4d2d',
  },
  conditionText: {
    fontSize: 12,
    marginTop: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  infoText: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  couponActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

