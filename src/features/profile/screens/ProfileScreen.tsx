// screens/ProfileScreen.tsx
import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Image, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@app/providers/AuthContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '@app/api/client';
import { useTheme } from '@app/providers/ThemeContext';
import * as orderService from '@app/services/orderService';
import { getMyReturns } from '@app/services/returnsService';
import * as walletService from '@app/services/walletService';

// 1. Import Components ใหม่
import ProfileHeader from '@shared/components/profile/ProfileHeader';
import ProfileNavTabs from '@shared/components/profile/ProfileNavTabs';
import ProfileSection, { SectionIconItem } from '@shared/components/profile/ProfileSection'; // 👈 Import Section
import ProductCard from '@shared/components/common/ProductCard';

// Component Loading
const LoadingView = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#FF5722" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Component สำหรับ "กระเป๋าเงิน" (เพื่อความสะอาด)
const WalletContent = ({ navigation }: { navigation: any }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.walletContainer}>
      <TouchableOpacity
        style={styles.walletItem}
        onPress={() => navigation.getParent()?.getParent()?.navigate('CouponsScreen')}
      >
        <Ionicons name="pricetag" size={24} color={colors.primary} />
        <Text style={[styles.walletText, { color: colors.text }]}>คูปอง</Text>
        <Text style={[styles.walletSubtext, { color: colors.subText }]}>รับส่วนลดสูงสุดคุ้ม</Text>
      </TouchableOpacity>
      <View style={[styles.walletSeparator, { backgroundColor: colors.border }]} />
      <TouchableOpacity style={styles.walletItem}>
        <Ionicons name="card" size={24} color={colors.success} />
        <Text style={[styles.walletText, { color: colors.text }]}>การตั้งค่าการชำระเงิน</Text>
        <Text style={[styles.walletSubtext, { color: colors.subText }]}>ช่องทางการชำระเงิน</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function ProfileScreen({ navigation: navProp }: any) {
  const navigation = useNavigation<any>();
  const { user, token, isLoading } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [checkingStore, setCheckingStore] = useState(false);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [points, setPoints] = useState<number>(user?.points || 0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [orderCounts, setOrderCounts] = useState<{ [key: string]: number }>({
    'ที่ต้องชำระ': 0,
    'ที่ต้องจัดส่ง': 0,
    'ที่ต้องได้รับ': 0,
    'ให้คะแนน': 0,
    'การคืนเงิน': 0,
  });
  const fetchingOrderCountsRef = useRef(false); // ป้องกันการเรียก API ซ้ำซ้อน
  const fetchingStoreRef = useRef(false); // ✅ เพิ่ม ref สำหรับ checkUserStore
  const fetchingRecentRef = useRef(false); // ✅ เพิ่ม ref สำหรับ fetchRecent
  const resettingRef = useRef(false); // ✅ เพิ่ม ref เพื่อป้องกัน infinite loop เมื่อ reset

  // ✅ เพิ่ม timestamp เพื่อป้องกันการเรียก API ซ้ำๆ ในช่วงเวลาสั้นๆ (5 วินาที)
  const lastFetchTimeRef = useRef<{ [key: string]: number }>({
    checkUserStore: 0,
    fetchRecent: 0,
    fetchOrderCounts: 0,
    fetchWallet: 0,
  });
  const FETCH_COOLDOWN = 5000; // 5 วินาที

  // ฟังก์ชันตรวจสอบว่า user มี store หรือไม่
  const checkUserStore = useCallback(async () => {
    if (!token || !user || fetchingStoreRef.current) {
      // ✅ ถ้ากำลัง fetch อยู่แล้ว ให้หยุด
      if (!token || !user) {
        setHasStore(false);
      }
      return;
    }

    // ✅ เช็ค cooldown: ถ้าเรียกไปเมื่อไม่นานนี้ (น้อยกว่า 5 วินาที) ให้ข้าม
    const now = Date.now();
    if (now - lastFetchTimeRef.current.checkUserStore < FETCH_COOLDOWN) {
      return;
    }

    fetchingStoreRef.current = true;
    lastFetchTimeRef.current.checkUserStore = now;
    setCheckingStore(true);
    try {
      // เรียก API /auth/profile เพื่อดึงข้อมูล user พร้อม stores
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const userData = await api.get('/auth/profile') as any;

      // อัปเดตสถานะร้านและแต้มล่าสุดจาก backend
      const stores = userData?.stores || [];
      setHasStore(stores.length > 0);
      if (typeof userData?.points === 'number') {
        setPoints(userData.points);
      }
    } catch (error: any) {
      // ✅ Handle 429 error gracefully - ไม่ retry ทันที
      if (error?.response?.status === 429) {
        // ไม่ต้อง log เพราะจะเกิดซ้ำๆ
        // เพิ่ม cooldown เป็น 10 วินาทีเมื่อเกิด 429
        lastFetchTimeRef.current.checkUserStore = now + 5000;
      } else {
        console.error('Failed to check user store:', error);
      }
      // ถ้า error ให้ถือว่าไม่มี store
      setHasStore(false);
    } finally {
      setCheckingStore(false);
      fetchingStoreRef.current = false;
    }
  }, [token, user]);

  // ฟังก์ชันดึงข้อมูลสินค้าที่ดูล่าสุด
  const fetchRecent = useCallback(async () => {
    if (!user || fetchingRecentRef.current) {
      // ✅ ถ้ากำลัง fetch อยู่แล้ว ให้หยุด
      return;
    }

    // ✅ เช็ค cooldown: ถ้าเรียกไปเมื่อไม่นานนี้ (น้อยกว่า 5 วินาที) ให้ข้าม
    const now = Date.now();
    if (now - lastFetchTimeRef.current.fetchRecent < FETCH_COOLDOWN) {
      return;
    }

    fetchingRecentRef.current = true;
    lastFetchTimeRef.current.fetchRecent = now;
    try {
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await api.get('/products/history/recent');
      // API คืนค่า array ของ RecentlyViewed object -> map ให้ได้ product ที่มี imageUrl แน่นอน
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const recentData = Array.isArray(res) ? res : (res?.data || []);
      const products = recentData
        .map((item: any) => item.product)
        .filter((p: any) => p)
        .map((p: any) => {
          // ดึงรูปหลักจาก images ถ้ายังไม่มี imageUrl
          let imageUrl = p.imageUrl;
          if (!imageUrl && Array.isArray(p.images) && p.images.length > 0) {
            const first = p.images[0];
            imageUrl =
              first.secure_url ||
              first.url ||
              (typeof first === 'string' ? first : null);
          }

          return {
            id: p.id,
            title: p.title || p.name || 'สินค้า',
            price: p.price || 0,
            discountPrice: p.discountPrice ?? null,
            imageUrl:
              imageUrl ||
              'https://via.placeholder.com/300x300.png?text=BoxiFY',
            storeName: p.store?.name || 'BoxiFY Mall',
          };
        });

      setRecentProducts(products);
    } catch (e: any) {
      // ✅ Handle 429 error gracefully - ไม่ retry ทันที
      if (e?.response?.status === 429) {
        // ไม่ต้อง log เพราะจะเกิดซ้ำๆ
        // เพิ่ม cooldown เป็น 10 วินาทีเมื่อเกิด 429
        lastFetchTimeRef.current.fetchRecent = now + 5000;
      } else {
        console.log('Error fetching recent products:', e);
      }
      setRecentProducts([]);
    } finally {
      fetchingRecentRef.current = false;
    }
  }, [user]);

  // ฟังก์ชันดึงข้อมูลจำนวนออเดอร์ในแต่ละ status
  const fetchOrderCounts = useCallback(async () => {
    if (!user || fetchingOrderCountsRef.current) return; // ป้องกันการเรียกซ้ำ

    // ✅ เช็ค cooldown: ถ้าเรียกไปเมื่อไม่นานนี้ (น้อยกว่า 5 วินาที) ให้ข้าม
    const now = Date.now();
    if (now - lastFetchTimeRef.current.fetchOrderCounts < FETCH_COOLDOWN) {
      return;
    }

    fetchingOrderCountsRef.current = true;
    lastFetchTimeRef.current.fetchOrderCounts = now;
    try {
      const [orders, returns] = await Promise.all([
        orderService.getMyOrders(),
        getMyReturns().catch(() => []),
      ]);
      // Normalize orders - ดึง refundStatus และ updatedAt มาด้วย
      const normalized = Array.isArray(orders) ? orders.map((order: any) => ({
        status: order.orderStatus || order.status || 'PENDING',
        refundStatus: order.refundStatus || 'NONE',
        updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
        createdAt: order.createdAt || new Date().toISOString(),
      })) : [];

      // คำนวณจำนวนออเดอร์ในแต่ละ status
      const counts = {
        'ที่ต้องชำระ': normalized.filter((o: any) => ['Not Process', 'PENDING', 'VERIFYING'].includes(o.status)).length,
        'ที่ต้องจัดส่ง': normalized.filter((o: any) => ['PENDING_CONFIRMATION', 'PROCESSING', 'READY_FOR_PICKUP'].includes(o.status)).length,
        // ✅ รวม SHIPPED, RIDER_ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED
        'ที่ต้องได้รับ': normalized.filter((o: any) => {
          if (!['SHIPPED', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)) {
            return false;
          }
          // ถ้าสถานะไม่ใช่ DELIVERED ให้นับเป็น "ที่ต้องได้รับ" เสมอ
          if (o.status !== 'DELIVERED') return true;

          // ถ้า Delivered แล้ว เช็คว่ายังไม่ผ่าน 7 วัน (ถ้าผ่านแล้วจะไปแสดงในแท็บ "สำเร็จ" หรือหายไป)
          const shippedDate = o.updatedAt || o.createdAt;
          const daysDiff = (Date.now() - new Date(shippedDate).getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff < 7; // ยังไม่ผ่าน 7 วัน
        }).length,
        'ให้คะแนน': normalized.filter((o: any) => o.status === 'DELIVERED' || o.status === 'COMPLETED').length,
        // ใช้จำนวนคำขอคืนสินค้าจริงจาก order_returns เพื่อให้ตรงกับประวัติการคืน
        'การคืนเงิน': Array.isArray(returns) ? returns.length : 0,
      };
      setOrderCounts(counts);
    } catch (error: any) {
      // ✅ Handle 429 error gracefully - ไม่ retry ทันที
      if (error?.response?.status === 429) {
        // ไม่ต้อง log เพราะจะเกิดซ้ำๆ
        // เพิ่ม cooldown เป็น 10 วินาทีเมื่อเกิด 429
        lastFetchTimeRef.current.fetchOrderCounts = now + 5000;
      } else {
        console.error('Error fetching order counts:', error);
      }
    } finally {
      fetchingOrderCountsRef.current = false;
    }
  }, [user]);

  // ดึงยอดเงินกระเป๋าเงิน
  const fetchWalletBalance = useCallback(async () => {
    if (!user || walletLoading) return;

    const now = Date.now();
    if (now - lastFetchTimeRef.current.fetchWallet < FETCH_COOLDOWN) {
      return;
    }

    setWalletLoading(true);
    lastFetchTimeRef.current.fetchWallet = now;
    try {
      const wallet = await walletService.getMyWallet();
      setWalletBalance(wallet.balance);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
    } finally {
      setWalletLoading(false);
    }
  }, [user, walletLoading]);

  // 2. Logic เช็ค Login (เหมือนเดิม)
  useFocusEffect(
    useCallback(() => {
      // ✅ เพิ่ม delay เพื่อให้แน่ใจว่า auth state อัปเดตแล้ว
      const timer = setTimeout(() => {
        if (!isLoading && !token) {
          // Reset navigation stack และไปที่ AuthScreen
          // ใช้ reset แทน navigate เพื่อให้แน่ใจว่า navigation state ถูกต้อง
          try {
            const state = navigation.getState();
            const currentRoute = state?.routes[state?.index || 0];
            // ✅ ตรวจสอบว่าไม่ได้อยู่ใน AuthScreen อยู่แล้ว
            if (currentRoute?.name !== 'AuthScreen') {
              navigation.reset({
                index: 0,
                routes: [{ name: 'AuthScreen' }],
              });
            }
          } catch (error) {
            console.log('Navigation reset error, trying navigate:', error);
            // Fallback: ลอง navigate ธรรมดา
            try {
              navigation.navigate('AuthScreen');
            } catch (navError) {
              console.log('Navigation navigate error:', navError);
            }
          }
        } else if (!isLoading && token && user) {
          // ✅ ถ้า login แล้ว ให้ตรวจสอบว่า user มี store หรือไม่
          // และ reset navigation stack กลับไปที่ ProfileScreen (ถ้าอยู่ใน AuthScreen)
          try {
            const state = navigation.getState();
            const currentRoute = state?.routes[state?.index || 0];
            // ✅ ตรวจสอบว่าอยู่ใน AuthScreen อยู่แล้วหรือไม่
            if (currentRoute?.name === 'AuthScreen') {
              // Reset กลับไปที่ ProfileScreen
              navigation.reset({
                index: 0,
                routes: [{ name: 'ProfileScreen' }],
              });
            }
          } catch (error) {
            console.log('Reset to ProfileScreen error:', error);
          }

          // ✅ โหลดข้อมูลเมื่อ login แล้ว (เรียกทุกครั้งที่ focus)
          // ✅ เพิ่ม delay ระหว่างการเรียก API เพื่อลดโอกาสเกิด 429
          checkUserStore();
          setTimeout(() => {
            fetchRecent();
          }, 100);
          setTimeout(() => {
            fetchOrderCounts();
          }, 200);
          setTimeout(() => {
            fetchWalletBalance();
          }, 300);
        }
      }, 300); // ✅ เพิ่ม delay เป็น 300ms เพื่อให้แน่ใจว่า auth state อัปเดตแล้ว

      return () => clearTimeout(timer);
    }, [isLoading, token, navigation, user, checkUserStore, fetchRecent, fetchOrderCounts, fetchWalletBalance])
  );

  // 3. แสดง Loading (เฉพาะตอนที่กำลังเช็ค token ครั้งแรก)
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 4. ถ้าไม่มี token หรือ user ให้แสดง Loading (จะถูก redirect ไป AuthScreen ใน useFocusEffect)
  if (!token || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 5. ถ้า Login แล้ว
  if (token && user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 90 }}
        >
          <ProfileHeader navigation={navProp} />

          <ProfileNavTabs navigation={navProp} />
          <ProfileSection title="คำสั่งซื้อของฉัน" navigation={navProp}>
            <SectionIconItem
              icon="wallet-outline"
              title="ที่ต้องชำระ"
              badge={orderCounts['ที่ต้องชำระ']}
              onPress={() =>
                navigation
                  .getParent()
                  ?.getParent()
                  ?.navigate('OrderHistory', { initialTab: 'ที่ต้องชำระ' })
              }
            />
            <SectionIconItem
              icon="cube-outline"
              title="ที่ต้องจัดส่ง"
              badge={orderCounts['ที่ต้องจัดส่ง']}
              onPress={() =>
                navigation
                  .getParent()
                  ?.getParent()
                  ?.navigate('OrderHistory', { initialTab: 'ที่ต้องจัดส่ง' })
              }
            />
            <SectionIconItem
              icon="archive-outline"
              title="ที่ต้องได้รับ"
              badge={orderCounts['ที่ต้องได้รับ']}
              onPress={() =>
                navigation
                  .getParent()
                  ?.getParent()
                  ?.navigate('OrderHistory', { initialTab: 'ที่ต้องได้รับ' })
              }
            />
            <SectionIconItem
              icon="star-outline"
              title="ให้คะแนน"
              badge={orderCounts['ให้คะแนน']}
              onPress={() =>
                navigation
                  .getParent()
                  ?.getParent()
                  ?.navigate('OrderHistory', { initialTab: 'สำเร็จ' })
              }
            />
            <SectionIconItem
              icon="refresh-outline"
              title="การคืนเงิน/คืนสินค้า"
              badge={orderCounts['การคืนเงิน']}
              onPress={() => navigation.getParent()?.getParent()?.navigate('OrderReturnList')}
            />
          </ProfileSection>
          <ProfileSection title="กระเป๋าเงินของฉัน" navigation={navProp}>
            <SectionIconItem
              icon="wallet-outline"
              title={
                walletLoading
                  ? 'กระเป๋าเงินของฉัน (กำลังโหลด...)'
                  : `กระเป๋าเงินของฉัน (฿${(walletBalance ?? 0).toFixed(2)})`
              }
              onPress={() => navigation.navigate('MyWallet')}
            />
          </ProfileSection>
          {/* การ์ดแต้มสะสม / Tier - ย้ายมาไว้ใต้กระเป๋าเงินของฉัน */}
          <TouchableOpacity
            style={[
              styles.loyaltyCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.shadow,
                shadowOpacity: 0.15,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              },
            ]}
            onPress={() => navigation.getParent()?.getParent()?.navigate('MyPoints')}
          >
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name={
                    points > 1000
                      ? 'trophy'
                      : points > 500
                        ? 'medal'
                        : 'ribbon'
                  }
                  size={20}
                  color={
                    points > 1000
                      ? colors.primaryLight
                      : points > 500
                        ? colors.primary
                        : colors.subText
                  }
                />
                <Text
                  style={[
                    styles.tierText,
                    {
                      color:
                        points > 1000
                          ? colors.primaryLight
                          : points > 500
                            ? colors.primary
                            : colors.subText,
                    },
                  ]}
                >
                  {' '}
                  Member{' '}
                  {points > 1000
                    ? 'Platinum'
                    : points > 500
                      ? 'Gold'
                      : 'Silver'}
                </Text>
              </View>
              <Text style={[styles.pointsText, { color: colors.text }]}>{points} Coins</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.redeemText, { color: colors.subText }]}>ดูประวัติ &gt;</Text>
            </View>
          </TouchableOpacity>
          {/* ✅ แยก "เปิดร้านค้า" ออกมาเป็น section ใหม่ (แสดงเสมอ) */}
          <ProfileSection title="เปิดร้านค้า" navigation={navProp}>
            <SectionIconItem
              icon="add-circle-outline"
              title="เปิดร้านค้า"
              onPress={() => navigation.getParent()?.getParent()?.navigate('CreateStore')}
            />
          </ProfileSection>

          {/* โหมดไรเดอร์ / ขนส่ง (เฉพาะ user.role = 'courier') */}
          {user?.role === 'courier' && (
            <ProfileSection title="โหมดไรเดอร์ / ระบบขนส่ง">
              <SectionIconItem
                icon="bicycle-outline"
                title="เข้าสู่โหมดไรเดอร์"
                onPress={() =>
                  navigation
                    .getParent()
                    ?.getParent()
                    ?.navigate('CourierApp')
                }
              />
            </ProfileSection>
          )}

          {/* ✅ ปุ่มสำหรับ Admin เท่านั้น */}
          {user?.role === 'admin' && (
            <View style={styles.adminSection}>
              <TouchableOpacity
                style={[
                  styles.adminButton,
                  {
                    backgroundColor: colors.primaryDark,
                  },
                ]}
                onPress={() =>
                  navigation.getParent()?.getParent()?.navigate('AdminDashboard')
                }
              >
                <Ionicons name="shield-checkmark" size={24} color="#fff" />
                <Text style={[styles.adminButtonText, { color: '#fff' }]}>
                  เข้าสู่ระบบหลังบ้าน (Admin)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ✅ "ศูนย์ผู้ขาย" แยกออกมาไว้ด้านล่าง (แสดงเฉพาะเมื่อมีร้านและ role เป็น seller) */}
          {checkingStore ? (
            <ProfileSection title="ร้านค้าของฉัน" navigation={navProp}>
              <View style={styles.checkingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.checkingText, { color: colors.subText }]}>กำลังตรวจสอบ...</Text>
              </View>
            </ProfileSection>
          ) : hasStore && user?.role === 'seller' ? (
            <ProfileSection title="ร้านค้าของฉัน" navigation={navProp}>
              <SectionIconItem
                icon="storefront-outline"
                title="ศูนย์ผู้ขาย"
                onPress={() => navigation.getParent()?.getParent()?.navigate('SellerCenter')}
              />
            </ProfileSection>
          ) : null}

          {/* ✅ แสดงสินค้าที่ดูล่าสุด – ดีไซน์ใหม่แบบการ์ดเล็กแนวนอน */}
          {recentProducts.length > 0 && (
            <View style={[styles.recentContainer, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {' '}สินค้าที่ดูล่าสุด
                </Text>
              </View>

              <FlatList
                horizontal
                data={recentProducts}
                keyExtractor={(item: any) => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.recentCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation
                        .getParent()
                        ?.getParent()
                        ?.navigate('ProductDetail', { productId: item.id })
                    }
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={[styles.recentImage, { backgroundColor: colors.backgroundSecondary }]}
                      resizeMode="cover"
                    />
                    <Text
                      style={[styles.recentTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.recentPrice, { color: colors.primary }]}>
                      ฿{item.price?.toLocaleString?.() ?? item.price}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <TouchableOpacity style={styles.promoBanner}>
            <View style={[styles.promoPlaceholder, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <Text style={[styles.promoText, { color: colors.subText }]}>Taobao x TrueMoney</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Gradient Fade - ไล่สีจากโปร่งใสด้านบน → ขาวด้านล่าง */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0)', '#FFFFFF']}
          style={[styles.bottomGradient, { height: 90 + insets.bottom }]}
          pointerEvents="none"
        />
      </SafeAreaView>
    );
  }

  // Fallback: ไม่ควรมาถึงจุดนี้ แต่ถ้ามาให้แสดง Loading
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  // Styles for WalletContent
  walletContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  walletItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  walletText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 5,
  },
  walletSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  walletSeparator: {
    width: 1,
    marginVertical: 10,
  },
  // Styles for Admin Button
  adminSection: {
    marginHorizontal: 15,
    marginTop: 15,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    justifyContent: 'center',
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Styles for Promo Banner
  promoBanner: {
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  promoPlaceholder: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoText: {
    fontSize: 14,
  },
  loyaltyCard: {
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  tierText: {
    fontWeight: '900',
    fontSize: 16,
    marginLeft: 6,
  },
  pointsText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 5,
  },
  redeemText: {
    fontSize: 12,
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  checkingText: {
    marginLeft: 10,
    fontSize: 14,
  },
  // Styles for Recent Products Section
  recentContainer: {
    marginTop: 20,
    paddingVertical: 12,
    marginHorizontal: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recentCard: {
    width: 130,
    marginRight: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  recentImage: {
    width: '100%',
    height: 90,
  },
  recentTitle: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  recentPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
