// screens/VouchersScreen.tsx (MyCouponsScreen - คูปองของฉัน)
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { CouponCard } from '@shared/components/coupon/CouponCard';
import { Coupon } from '@shared/interfaces/coupon';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';
import { useCoupon } from '@app/providers/CouponContext';

// --- Tab Screens ---
const UnusedTab = ({ myCoupons, navigation }: { myCoupons: Coupon[]; navigation: any }) => {
  const unusedCoupons = myCoupons.filter(c => !c.isUsed && new Date(c.expiresAt) > new Date());
  
  if (unusedCoupons.length === 0) {
    return (
      <View style={styles.tabContainer}>
        <Text style={styles.emptyText}>ไม่มีคูปองที่ยังไม่ได้ใช้</Text>
        <Text style={styles.emptySubText}>ไปเก็บที่หน้า "ส่งฟรี* + โค้ดลดทั้งแอป" สิ!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={unusedCoupons}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <CouponCard 
          coupon={item} 
          status="COLLECTED"
          onPress={() => {
            // Navigate ไปหน้า checkout หรือหน้าแรก
            navigation.navigate('Checkout');
          }}
        />
      )}
      contentContainerStyle={styles.listContent}
    />
  );
};

const UsedTab = ({ myCoupons }: { myCoupons: Coupon[] }) => {
  const usedCoupons = myCoupons.filter(c => c.isUsed);
  
  if (usedCoupons.length === 0) {
    return (
      <View style={styles.tabContainer}>
        <Text style={styles.emptyText}>ไม่มีคูปองที่ใช้แล้ว</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={usedCoupons}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <CouponCard 
          coupon={item} 
          status="USED"
          onPress={() => {}}
        />
      )}
      contentContainerStyle={styles.listContent}
    />
  );
};

const ExpiredTab = ({ myCoupons }: { myCoupons: Coupon[] }) => {
  const expiredCoupons = myCoupons.filter(c => new Date(c.expiresAt) <= new Date() && !c.isUsed);
  
  if (expiredCoupons.length === 0) {
    return (
      <View style={styles.tabContainer}>
        <Text style={styles.emptyText}>ไม่มีคูปองที่หมดอายุ</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={expiredCoupons}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <CouponCard 
          coupon={item} 
          status="USED"
          onPress={() => {}}
        />
      )}
      contentContainerStyle={styles.listContent}
    />
  );
};
// -------------------

const Tab = createMaterialTopTabNavigator();

export default function VouchersScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { myCoupons, refreshCoupons } = useCoupon();
  const [loading, setLoading] = useState(false);
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="คูปองของฉัน" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary || '#ee4d2d'} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="คูปองของฉัน" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#26aa99',
          tabBarInactiveTintColor: 'gray',
          tabBarIndicatorStyle: { backgroundColor: '#26aa99', height: 3 },
          tabBarStyle: { backgroundColor: colors.card },
        }}
      >
        <Tab.Screen name="Unused" options={{ title: 'ยังไม่ได้ใช้' }}>
          {() => <UnusedTab myCoupons={myCoupons} navigation={navigation} />}
        </Tab.Screen>
        <Tab.Screen name="Used" options={{ title: 'ใช้แล้ว' }}>
          {() => <UsedTab myCoupons={myCoupons} />}
        </Tab.Screen>
        <Tab.Screen name="Expired" options={{ title: 'หมดอายุ' }}>
          {() => <ExpiredTab myCoupons={myCoupons} />}
        </Tab.Screen>
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  tabContainer: { 
    flex: 1, 
    backgroundColor: '#f4f4f4', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  emptyText: { 
    textAlign: 'center', 
    color: 'gray', 
    marginTop: 50,
    fontSize: 16,
  },
  emptySubText: {
    textAlign: 'center',
    color: 'gray',
    marginTop: 10,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

