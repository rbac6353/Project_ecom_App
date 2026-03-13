import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useAuth } from '@app/providers/AuthContext';

export default function SellerCenterScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();

  // State เก็บข้อมูลสถิติ (ตั้งค่าเริ่มต้นเป็น 0)
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
  });
  const [pendingReturns, setPendingReturns] = useState(0);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ เพิ่ม ref และ cooldown เพื่อป้องกันการเรียก API ซ้ำซ้อน
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef<{ [key: string]: number }>({
    fetchStore: 0,
    fetchStats: 0,
    fetchPendingReturns: 0,
  });
  const FETCH_COOLDOWN = 3000; // 3 วินาที

  // ฟังก์ชันดึงข้อมูลจาก Backend
  const fetchStats = async () => {
    // ✅ เช็ค cooldown: ถ้าเรียกไปเมื่อไม่นานนี้ (น้อยกว่า 3 วินาที) ให้ข้าม
    const now = Date.now();
    if (now - lastFetchTimeRef.current.fetchStats < FETCH_COOLDOWN) {
      return;
    }
    
    try {
      lastFetchTimeRef.current.fetchStats = now;
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const response = await client.get('/orders/stats/dashboard');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const statsData = response?.data || response || {};
      setStats({
        todayOrders: statsData.todayOrders ?? 0,
        todayRevenue: statsData.todayRevenue ?? 0,
        pendingOrders: statsData.pendingOrders ?? 0,
      });
    } catch (error: any) {
      // ✅ Handle 429 error gracefully
      if (error?.response?.status === 429) {
        // เพิ่ม cooldown เป็น 10 วินาทีเมื่อเกิด 429
        lastFetchTimeRef.current.fetchStats = now + 7000;
      } else {
        console.error('Failed to fetch stats', error);
      }
      // Fallback เป็นค่าเริ่มต้น
      setStats({
        todayOrders: 0,
        todayRevenue: 0,
        pendingOrders: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ฟังก์ชันดึงจำนวนคำขอคืนสินค้า (เฉพาะของร้านตัวเอง)
  const fetchPendingReturns = async () => {
    // ✅ เช็ค cooldown: ถ้าเรียกไปเมื่อไม่นานนี้ (น้อยกว่า 3 วินาที) ให้ข้าม
    const now = Date.now();
    if (now - lastFetchTimeRef.current.fetchPendingReturns < FETCH_COOLDOWN) {
      return;
    }
    
    try {
      lastFetchTimeRef.current.fetchPendingReturns = now;
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get('/seller/returns', {
        params: { status: 'REQUESTED' },
      });
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setPendingReturns(list.length);
    } catch (error: any) {
      // ✅ Handle 429 error gracefully
      if (error?.response?.status === 429) {
        // เพิ่ม cooldown เป็น 10 วินาทีเมื่อเกิด 429
        lastFetchTimeRef.current.fetchPendingReturns = now + 7000;
      } else {
        console.error('Failed to fetch pending returns', error);
      }
      setPendingReturns(0);
    }
  };

  // ฟังก์ชันดึงข้อมูลร้านค้า
  const fetchStore = async () => {
    // ✅ เช็ค cooldown: ถ้าเรียกไปเมื่อไม่นานนี้ (น้อยกว่า 3 วินาที) ให้ข้าม
    const now = Date.now();
    if (now - lastFetchTimeRef.current.fetchStore < FETCH_COOLDOWN) {
      // ✅ ถ้ามี user.stores อยู่แล้ว ให้ใช้ข้อมูลนั้นแทน
      if (user?.stores && user.stores.length > 0) {
        setStore(user.stores[0]);
      }
      return;
    }
    
    // ✅ ป้องกันการเรียก API ซ้ำซ้อน
    if (fetchingRef.current) {
      return;
    }
    
    try {
      fetchingRef.current = true;
      lastFetchTimeRef.current.fetchStore = now;
      
      // ✅ ใช้ user.stores จาก context ก่อน (ไม่ต้องเรียก API ถ้ามีอยู่แล้ว)
      if (user?.stores && user.stores.length > 0) {
        setStore(user.stores[0]);
        console.log('🏪 Store found from context:', user.stores[0]);
        return;
      }
      
      // ✅ ถ้าไม่มี stores ใน context ให้เรียก API เพียงครั้งเดียว
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const userData = await client.get('/auth/profile');
      
      // ตรวจสอบว่า user มี stores หรือไม่ (ใช้ optional chaining)
      const stores = userData?.stores || [];
      if (stores.length > 0) {
        setStore(stores[0]); // ใช้ร้านแรก (ถ้ามีหลายร้าน)
        console.log('🏪 Store found from API:', stores[0]);
      } else {
        setStore(null);
        console.log('⚠️ No store found for user');
      }
    } catch (error: any) {
      // ✅ Handle 429 error gracefully
      if (error?.response?.status === 429) {
        // เพิ่ม cooldown เป็น 10 วินาทีเมื่อเกิด 429
        lastFetchTimeRef.current.fetchStore = now + 7000;
        // ✅ ถ้ามี user.stores อยู่แล้ว ให้ใช้ข้อมูลนั้นแทน
        if (user?.stores && user.stores.length > 0) {
          setStore(user.stores[0]);
        }
      } else {
        console.error('❌ Error fetching store:', error);
      }
      setStore(null);
    } finally {
      fetchingRef.current = false;
    }
  };

  // ✅ ฟังก์ชันปิด-เปิดร้านค้า
  const handleToggleStoreStatus = async () => {
    if (!store) return;

    const action = store.isActive ? 'ปิด' : 'เปิด';
    Alert.alert(
      `ยืนยัน${action}ร้านค้า`,
      `คุณต้องการ${action}ร้านค้า "${store.name}" ใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: action,
          onPress: async () => {
            try {
              // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
              const response = await client.patch('/stores/me/toggle-status');
              const message = response?.message || response?.data?.message || 'เปลี่ยนสถานะร้านค้าสำเร็จ';
              Alert.alert('สำเร็จ', message);
              // ✅ Refresh user data แทนการเรียก fetchStore() ซ้ำ
              await refreshUser();
              // ✅ ใช้ user.stores จาก context ที่ refresh แล้ว
              if (user?.stores && user.stores.length > 0) {
                setStore(user.stores[0]);
              }
            } catch (error: any) {
              console.error('Toggle store status error:', error);
              Alert.alert(
                'ผิดพลาด',
                error.response?.data?.message || 'ไม่สามารถเปลี่ยนสถานะร้านค้าได้',
              );
            }
          },
        },
      ],
    );
  };

  // ใช้ useFocusEffect เพื่อให้โหลดข้อมูลใหม่ทุกครั้งที่กลับมาหน้านี้
  useFocusEffect(
    useCallback(() => {
      // ✅ ตรวจสอบว่าไม่ใช่การเรียกซ้ำซ้อน
      if (fetchingRef.current) {
        return;
      }
      
      setLoading(true);
      
      // ✅ เรียก API แบบ parallel แต่มี cooldown
      Promise.all([
        fetchStats(),
        fetchStore(),
        fetchPendingReturns(),
      ]).finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
    }, [user]), // ✅ เพิ่ม user เป็น dependency เพื่อให้ refresh เมื่อ user เปลี่ยน
  );

  // ปุ่มเมนูแบบ Reusable Component
  const MenuButton = ({
    title,
    icon,
    onPress,
    color = '#FF5722',
    badge = 0,
  }: any) => (
    <TouchableOpacity style={styles.menuBtn} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={30} color={color} />

        {/* แสดงจุดแดงแจ้งเตือนงานค้าง (ถ้ามี) */}
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.menuText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="ศูนย์ผู้ขาย (Seller Center)" />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchStats();
            }}
          />
        }
      >
        {/* ส่วนแสดงข้อมูลร้านค้า */}
        {store ? (
          <View style={styles.storeCard}>
            <View style={styles.storeHeader}>
              <Image
                source={{
                  uri: store.logo || 'https://placekitten.com/60/60',
                }}
                style={styles.storeLogo}
              />
              <View style={styles.storeInfo}>
                <View style={styles.storeNameRow}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  {store.isVerified && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#4CAF50"
                      style={{ marginLeft: 5 }}
                    />
                  )}
                </View>
                <Text style={styles.storeDesc} numberOfLines={1}>
                  {store.description || 'ไม่มีรายละเอียด'}
                </Text>
                <View style={styles.storeBadge}>
                  <Text
                    style={[
                      styles.storeBadgeText,
                      {
                        color: store.isVerified ? '#4CAF50' : '#FF9800',
                        backgroundColor: store.isVerified
                          ? '#E8F5E9'
                          : '#FFF3E0',
                      },
                    ]}
                  >
                    {store.isVerified
                      ? '✅ ร้านค้าอนุมัติแล้ว'
                      : '⚠️ รอการอนุมัติ'}
                  </Text>
                </View>
              </View>
            </View>
            {/* ✅ ปุ่มปิด-เปิดร้านค้า */}
            <TouchableOpacity
              style={[
                styles.toggleStoreBtn,
                { backgroundColor: store.isActive ? '#4CAF50' : '#9E9E9E' },
              ]}
              onPress={handleToggleStoreStatus}
            >
              <Ionicons
                name={store.isActive ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color="#fff"
              />
              <Text style={styles.toggleStoreText}>
                {store.isActive ? 'ร้านค้าเปิดอยู่' : 'ร้านค้าปิดอยู่'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noStoreCard}>
            <Ionicons name="storefront-outline" size={48} color="#ccc" />
            <Text style={styles.noStoreText}>คุณยังไม่มีร้านค้า</Text>
            <TouchableOpacity
              style={styles.createStoreBtn}
              onPress={() => navigation.navigate('CreateStore')}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createStoreBtnText}>สร้างร้านค้าใหม่</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ส่วนแสดงสถิติ (Dashboard) */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            {loading ? (
              <ActivityIndicator color="#FF5722" />
            ) : (
              <Text style={styles.statNumber}>{stats.todayOrders}</Text>
            )}
            <Text style={styles.statLabel}>ออเดอร์วันนี้</Text>
          </View>

          <View style={styles.statBox}>
            {loading ? (
              <ActivityIndicator color="#FF5722" />
            ) : (
              <Text style={styles.statNumber}>
                ฿{stats.todayRevenue.toLocaleString()}
              </Text>
            )}
            <Text style={styles.statLabel}>ยอดขายวันนี้</Text>
          </View>
        </View>

        {/* ส่วนเมนูจัดการร้าน */}
        <Text style={styles.sectionTitle}>จัดการร้านค้า</Text>
        <View style={styles.grid}>
          <MenuButton
            title="จัดการออเดอร์"
            icon="list"
            color="#2196F3"
            badge={stats.pendingOrders} // ส่งยอดค้างไปแสดง Badge
            onPress={() => navigation.navigate('AdminOrderList')}
          />
          <MenuButton
            title="สินค้าของฉัน"
            icon="cube"
            color="#4CAF50"
            onPress={() => navigation.navigate('SellerProductList')}
          />
          <MenuButton
            title="เพิ่มสินค้าใหม่"
            icon="add-circle"
            color="#FF9800"
            onPress={() => navigation.navigate('AddProduct')}
          />
          <MenuButton
            title="ตั้งค่าร้านค้า"
            icon="settings"
            color="#607D8B"
            onPress={() => navigation.navigate('StoreSettings')}
          />
          <MenuButton
            title="คูปองส่วนลด"
            icon="ticket"
            color="#9C27B0"
            onPress={() => navigation.navigate('CouponList')}
          />
          <MenuButton
            title="แชทลูกค้า"
            icon="chatbubbles"
            color="#E91E63"
            onPress={() => navigation.navigate('AdminChatList')}
          />
          <MenuButton
            title="คำขอคืนสินค้า"
            icon="refresh-circle"
            color="#D32F2F"
            badge={pendingReturns}
            onPress={() => navigation.navigate('SellerReturnList')}
          />
          <MenuButton
            title="กระเป๋าเงินร้านค้า"
            icon="wallet"
            color="#00BCD4"
            onPress={() => navigation.navigate('SellerWallet')}
          />
          <MenuButton
            title="Flash Sale ร้านค้า"
            icon="flash"
            color="#FF5722"
            onPress={() => navigation.navigate('SellerFlashSaleInfo')}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 15,
  },
  // Stats Styles
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
  },
  // Menu Styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    marginLeft: 5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuBtn: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuText: {
    fontWeight: '600',
    color: '#444',
    fontSize: 14,
  },
  // Badge Styles
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Store Card Styles
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
    marginRight: 15,
  },
  storeInfo: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  storeDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  storeBadge: {
    alignSelf: 'flex-start',
  },
  storeBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  // No Store Card Styles
  noStoreCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  noStoreText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    marginBottom: 15,
  },
  createStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createStoreBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    gap: 8,
  },
  toggleStoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
