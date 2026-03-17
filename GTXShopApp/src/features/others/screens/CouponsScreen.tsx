// screens/CouponsScreen.tsx (VoucherCenterScreen - เก็บคูปอง)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CouponCard } from '@shared/components/coupon/CouponCard';
import { Coupon } from '@shared/interfaces/coupon';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useTheme } from '@app/providers/ThemeContext';
import { useAuth } from '@app/providers/AuthContext';
import { useCoupon } from '@app/providers/CouponContext';
import * as couponService from '@app/services/couponService';
import client from '@app/api/client';

const Tab = createMaterialTopTabNavigator();

// Tab: Platform Voucher (คูปองแพลตฟอร์ม)
const PlatformVoucherTab = ({ 
  availableCoupons, 
  onCollect, 
  onUse,
  myCoupons 
}: { 
  availableCoupons: Coupon[]; 
  onCollect: (coupon: Coupon) => void;
  onUse: (coupon: Coupon) => void;
  myCoupons: Coupon[];
}) => {
  const { colors } = useTheme();
  const [sortBy, setSortBy] = useState<'discount' | 'expiry' | 'newest'>('discount');

  // กรอง Platform Voucher (storeId = null) และยังไม่หมดอายุ
  let platformCoupons = availableCoupons.filter(c => {
    const isPlatform = !c.storeId;
    const isExpired = new Date(c.expiresAt) < new Date();
    return isPlatform && !isExpired;
  });

  // จัดเรียงตาม sortBy
  platformCoupons = [...platformCoupons].sort((a, b) => {
    if (sortBy === 'discount') {
      const discountA = a.discountAmount || a.maxDiscount || (a.discountPercent ? (a.minPurchase || 0) * (a.discountPercent / 100) : 0);
      const discountB = b.discountAmount || b.maxDiscount || (b.discountPercent ? (b.minPurchase || 0) * (b.discountPercent / 100) : 0);
      return discountB - discountA; // เรียงจากมากไปน้อย
    } else if (sortBy === 'expiry') {
      return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(); // เรียงจากใกล้หมดอายุ
    } else {
      // newest - เรียงตาม id (ถ้ามี createdAt ให้ใช้ createdAt)
      return (b.id || 0) - (a.id || 0);
    }
  });

  if (platformCoupons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="ticket-outline" size={64} color={colors.subText} />
        <Text style={[styles.emptyText, { color: colors.text }]}>ไม่มี Platform Voucher</Text>
        <Text style={[styles.emptySubText, { color: colors.subText }]}>Admin ยังไม่ได้สร้างคูปองแพลตฟอร์ม</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContainer}>
      {/* Sort Options */}
      <View style={[styles.sortContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.sortLabel, { color: colors.subText }]}>เรียงตาม:</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'discount' && { backgroundColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setSortBy('discount')}
          >
            <Text style={[
              styles.sortButtonText,
              sortBy === 'discount' && { color: '#FFFFFF' },
              { color: colors.text }
            ]}>
              ส่วนลดสูงสุด
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'expiry' && { backgroundColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setSortBy('expiry')}
          >
            <Text style={[
              styles.sortButtonText,
              sortBy === 'expiry' && { color: '#FFFFFF' },
              { color: colors.text }
            ]}>
              ใกล้หมดอายุ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'newest' && { backgroundColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setSortBy('newest')}
          >
            <Text style={[
              styles.sortButtonText,
              sortBy === 'newest' && { color: '#FFFFFF' },
              { color: colors.text }
            ]}>
              ใหม่ล่าสุด
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Coupon List */}
      <FlatList
        data={platformCoupons}
        keyExtractor={(item) => `platform-${item.id}`}
        renderItem={({ item }) => {
          const isCollected = myCoupons.some(c => c.code === item.code || c.id === item.id);
          return (
            <CouponCard
              coupon={item}
              status={isCollected ? 'COLLECTED' : 'COLLECTIBLE'}
              onPress={isCollected ? () => onUse(item) : () => onCollect(item)}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Tab: Shop Voucher (คูปองร้านค้า)
const ShopVoucherTab = ({ 
  availableCoupons, 
  onCollect,
  onUse,
  myCoupons 
}: { 
  availableCoupons: Coupon[]; 
  onCollect: (coupon: Coupon) => void;
  onUse: (coupon: Coupon) => void;
  myCoupons: Coupon[];
}) => {
  // กรอง Shop Voucher (storeId != null) และยังไม่หมดอายุ
  const shopCoupons = availableCoupons.filter(c => {
    const isShop = c.storeId != null;
    const isExpired = new Date(c.expiresAt) < new Date();
    return isShop && !isExpired;
  });

  if (shopCoupons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>ไม่มี Shop Voucher</Text>
        <Text style={styles.emptySubText}>ร้านค้ายังไม่ได้สร้างคูปอง</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={shopCoupons}
      keyExtractor={(item) => `shop-${item.id}`}
      renderItem={({ item }) => {
        const isCollected = (item as any).isCollected === true;
        return (
          <CouponCard
            coupon={item}
            status={isCollected ? 'COLLECTED' : 'COLLECTIBLE'}
            onPress={isCollected ? undefined : () => onCollect(item)}
            actionLabel={isCollected ? 'เก็บแล้ว' : 'เก็บ'}
          />
        );
      }}
      contentContainerStyle={styles.listContent}
    />
  );
};

// Tab: โค้ดส่งฟรี
const FreeShippingTab = ({ 
  availableCoupons, 
  onCollect,
  onUse,
  myCoupons 
}: { 
  availableCoupons: Coupon[]; 
  onCollect: (coupon: Coupon) => void;
  onUse: (coupon: Coupon) => void;
  myCoupons: Coupon[];
}) => {
  const shippingCoupons = availableCoupons.filter(c => {
    const isShipping = c.type === 'SHIPPING';
    const isExpired = new Date(c.expiresAt) < new Date();
    return isShipping && !isExpired;
  });

  if (shippingCoupons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>ไม่มีโค้ดส่งฟรี</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={shippingCoupons}
      keyExtractor={(item) => `shipping-${item.id}`}
      renderItem={({ item }) => {
        const isCollected = myCoupons.some(c => c.code === item.code || c.id === item.id);
        return (
          <CouponCard
            coupon={item}
            status={isCollected ? 'COLLECTED' : 'COLLECTIBLE'}
            onPress={isCollected ? () => onUse(item) : () => onCollect(item)}
          />
        );
      }}
      contentContainerStyle={styles.listContent}
    />
  );
};

export default function CouponsScreen({ navigation: navProp }: any) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { availableCoupons, myCoupons, collectCoupon, refreshCoupons, selectCoupon } = useCoupon();
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ ฟังก์ชันเช็คว่าคูปองถูกเก็บแล้วหรือไม่ (เช็คจาก myCoupons)
  const isCouponCollected = (coupon: Coupon): boolean => {
    return myCoupons.some(c => c.code === coupon.code || c.id === coupon.id);
  };

  // ✅ ฟังก์ชันใช้คูปอง (นำไปใช้ในหน้าสั่งซื้อ)
  const handleUseCoupon = (coupon: Coupon) => {
    // หาคูปองที่เก็บแล้วจาก myCoupons
    const collectedCoupon = myCoupons.find(c => c.code === coupon.code || c.id === coupon.id);
    if (collectedCoupon) {
      selectCoupon(collectedCoupon);
      navigation.navigate('Checkout');
    } else {
      Alert.alert('แจ้งเตือน', 'ไม่พบคูปองที่เก็บไว้');
    }
  };

  // ฟังก์ชันเก็บคูปอง
  const handleCollectCoupon = async (coupon: Coupon) => {
    if (!user) {
      Alert.alert(
        'กรุณาเข้าสู่ระบบ',
        'คุณต้องเข้าสู่ระบบก่อนจึงจะเก็บคูปองได้',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'เข้าสู่ระบบ',
            onPress: () => navigation.getParent()?.getParent()?.navigate('Profile', { screen: 'LoginScreen' })
          }
        ]
      );
      return;
    }

    // เช็คว่าเก็บแล้วหรือยัง
    if (isCouponCollected(coupon)) {
      // ถ้าเก็บแล้ว ให้ใช้คูปองแทน
      handleUseCoupon(coupon);
      return;
    }

    try {
      setLoading(true);
      await collectCoupon(coupon);
      // รีเฟรชข้อมูลเพื่อให้ UI อัปเดต
      await refreshCoupons();
      Alert.alert('สำเร็จ', 'เก็บคูปองสำเร็จแล้ว!');
    } catch (error: any) {
      const message = error.message || 'ไม่สามารถเก็บคูปองได้';
      Alert.alert('แจ้งเตือน', message);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันรีเฟรชข้อมูล
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshCoupons();
    } catch (error) {
      console.error('Error refreshing coupons:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleApplyCode = async () => {
    if (!inputCode.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกรหัสคูปอง');
      return;
    }

    if (!user) {
      Alert.alert(
        'กรุณาเข้าสู่ระบบ',
        'คุณต้องเข้าสู่ระบบก่อนจึงจะใช้โค้ดส่วนลดได้',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'เข้าสู่ระบบ',
            onPress: () => navigation.getParent()?.getParent()?.navigate('Profile', { screen: 'LoginScreen' })
          }
        ]
      );
      return;
    }

    try {
      setLoading(true);
      // เรียก API เพื่อใช้โค้ด (อาจจะต้องส่ง cartTotal ด้วย)
      // สำหรับตอนนี้ใช้ cartTotal = 0 เพื่อทดสอบ
      const result = (await couponService.applyCouponCode(inputCode.trim().toUpperCase(), 0)) as unknown as {
        valid: boolean;
        discountAmount: number;
        finalTotal: number;
        couponId: number;
        code: string;
        type: string;
      };

      Alert.alert('สำเร็จ', `ใช้โค้ดส่วนลดลดไป ฿${result.discountAmount?.toLocaleString() || 0}`);
      setInputCode('');
    } catch (error: any) {
      // Handle 401 - User not authenticated
      if (error.response?.status === 401) {
        Alert.alert(
          'กรุณาเข้าสู่ระบบ',
          'คุณต้องเข้าสู่ระบบก่อนจึงจะใช้โค้ดส่วนลดได้',
          [
            { text: 'ยกเลิก', style: 'cancel' },
            {
              text: 'เข้าสู่ระบบ',
              onPress: () => navigation.getParent()?.getParent()?.navigate('Profile', { screen: 'LoginScreen' })
            }
          ]
        );
        return;
      }

      const msg = error.response?.data?.message || 'โค้ดไม่ถูกต้อง';
      Alert.alert('ใช้โค้ดไม่ได้', msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScreenHeader title="ส่งฟรี* + โค้ดลดทั้งแอป" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary || '#ee4d2d'} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScreenHeader title="ส่งฟรี* + โค้ดลดทั้งแอป" />

      {/* Input Section */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border || '#e0e0e0'
            }]}
            placeholder="กรอกโค้ดส่วนลด"
            placeholderTextColor={colors.subText || '#999'}
            value={inputCode}
            onChangeText={setInputCode}
          />
          <TouchableOpacity
            style={[
              styles.applyButton,
              !inputCode && styles.disabledButton
            ]}
            disabled={!inputCode}
            onPress={handleApplyCode}
          >
            <Text style={styles.applyText}>ใช้โค้ด</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: colors.primary || '#ee4d2d' }]}>
        <Text style={styles.bannerText}>เก็บโค้ดลดเพิ่ม คุ้มกว่าเดิม!</Text>
      </View>

      {/* ปุ่ม "ดูคูปองของฉัน" */}
      <View style={[styles.myCouponButtonContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.myCouponButton}
          onPress={() => {
            // Navigate ไปยัง MainTabs -> Profile -> VouchersScreen
            navigation.navigate('MainTabs', { screen: 'Profile', params: { screen: 'VouchersScreen' } });
          }}
        >
          <Ionicons name="ticket-outline" size={20} color={colors.primary} />
          <Text style={[styles.myCouponText, { color: colors.primary }]}>ดูคูปองของฉัน</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.subText} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#26aa99',
          tabBarInactiveTintColor: '#666',
          tabBarIndicatorStyle: { backgroundColor: '#26aa99', height: 3 },
          tabBarStyle: { backgroundColor: colors.card },
        }}
      >
        <Tab.Screen
          name="PlatformVoucher"
          options={{ title: 'Platform Voucher' }}
        >
          {() => (
            <PlatformVoucherTab
              availableCoupons={availableCoupons}
              onCollect={handleCollectCoupon}
              onUse={handleUseCoupon}
              myCoupons={myCoupons}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="ShopVoucher"
          options={{ title: 'Shop Voucher' }}
        >
          {() => (
            <ShopVoucherTab
              availableCoupons={availableCoupons}
              onCollect={handleCollectCoupon}
              onUse={handleUseCoupon}
              myCoupons={myCoupons}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="FreeShipping"
          options={{ title: 'โค้ดส่งฟรี*' }}
        >
          {() => (
            <FreeShippingTab
              availableCoupons={availableCoupons}
              onCollect={handleCollectCoupon}
              onUse={handleUseCoupon}
              myCoupons={myCoupons}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  inputWrapper: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 44,
  },
  applyButton: {
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#ffcdd2',
  },
  applyText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 5,
  },
  emptySubText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
  banner: {
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  bannerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  myCouponButtonContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  myCouponButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myCouponText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabContainer: {
    flex: 1,
  },
  sortContainer: {
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 14,
    marginRight: 12,
    fontWeight: '600',
  },
  sortButtons: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

