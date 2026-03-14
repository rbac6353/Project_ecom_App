// screens/checkout/SelectCouponScreen.tsx
import React, { useMemo } from 'react';
import { SafeAreaView, FlatList, StyleSheet, View, Text, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCoupon } from '@app/providers/CouponContext';
import { useCart } from '@app/providers/CartContext';
import { CouponCard } from '@shared/components/coupon/CouponCard';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useTheme } from '@app/providers/ThemeContext';

export default function SelectCouponScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { myCoupons, selectCoupon, refreshCoupons } = useCoupon();
  const { totalPrice } = useCart();
  const hasRefreshedRef = React.useRef(false);

  // Refresh เมื่อ focus หน้าจอ (ครั้งเดียว)
  useFocusEffect(
    React.useCallback(() => {
      if (!hasRefreshedRef.current) {
        hasRefreshedRef.current = true;
        refreshCoupons();
      }
      // Reset flag เมื่อ unfocus
      return () => {
        hasRefreshedRef.current = false;
      };
    }, [refreshCoupons])
  );

  // กรองคูปองที่ใช้ได้ (ยังไม่ใช้ และ ยอดถึงขั้นต่ำ)
  const usableCoupons = useMemo(() => {
    return myCoupons.filter(c => 
      !c.isUsed && 
      new Date(c.expiresAt) > new Date() &&
      totalPrice >= c.minPurchase
    );
  }, [myCoupons, totalPrice]);
  
  // คูปองที่ใช้ไม่ได้ (ยอดไม่ถึง)
  const disabledCoupons = useMemo(() => {
    return myCoupons.filter(c => 
      !c.isUsed && 
      new Date(c.expiresAt) > new Date() &&
      totalPrice < c.minPurchase
    );
  }, [myCoupons, totalPrice]);

  const handleSelectCoupon = (coupon: any) => {
    if (totalPrice < coupon.minPurchase) {
      Alert.alert('แจ้งเตือน', `ต้องมียอดซื้อขั้นต่ำ ฿${coupon.minPurchase.toLocaleString()} บาท`);
      return;
    }

    selectCoupon(coupon);
    navigation.goBack();
  };

  if (usableCoupons.length === 0 && disabledCoupons.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="เลือกโค้ดส่วนลด" />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.subText }]}>
            คุณยังไม่มีคูปองที่ใช้ได้
          </Text>
          <Text style={[styles.emptySubText, { color: colors.subText }]}>
            ไปเก็บที่หน้า "ส่งฟรี* + โค้ดลดทั้งแอป" สิ!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="เลือกโค้ดส่วนลด" />
      
      {usableCoupons.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>คูปองที่ใช้ได้</Text>
        </View>
      )}
      
      <FlatList
        data={[...usableCoupons, ...disabledCoupons]}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isUsable = totalPrice >= item.minPurchase;
          return (
            <CouponCard 
              coupon={item}
              status={item.isUsed ? 'USED' : 'COLLECTED'}
              actionLabel={isUsable ? 'เลือกใช้' : `ยอดไม่ถึง (ขั้นต่ำ ฿${item.minPurchase.toLocaleString()})`}
              onPress={() => {
                if (isUsable) {
                  handleSelectCoupon(item);
                } else {
                  Alert.alert('แจ้งเตือน', `ต้องมียอดซื้อขั้นต่ำ ฿${item.minPurchase.toLocaleString()} บาท`);
                }
              }}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

