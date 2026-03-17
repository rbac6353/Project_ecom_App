import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import OrderListTab from './OrderListTab';
import { useTheme } from '@app/providers/ThemeContext';
import { OrderHistoryProvider, useOrderHistory } from '../context/OrderHistoryContext';

const Tab = createMaterialTopTabNavigator();

function OrderHistoryTabs() {
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { refresh } = useOrderHistory()!;

  const initialTab = route.params?.initialTab;

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const getInitialRouteName = () => {
    if (initialTab === 'ที่ต้องชำระ') return 'ToPayTab';
    if (initialTab === 'ที่ต้องจัดส่ง') return 'ToShipTab';
    if (initialTab === 'ที่ต้องได้รับ') return 'ToReceiveTab';
    if (initialTab === 'สำเร็จ') return 'CompletedTab';
    if (initialTab === 'ยกเลิกแล้ว') return 'CancelledTab';
    return 'AllTab';
  };

  return (
    <Tab.Navigator
        initialRouteName={getInitialRouteName()}
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.subText,
          tabBarIndicatorStyle: { backgroundColor: colors.primary },
          tabBarStyle: { backgroundColor: colors.card },
          tabBarScrollEnabled: true, // ✅ เปิดใช้งาน scroll เมื่อแท็บเยอะ
          tabBarItemStyle: { width: 'auto', minWidth: 90 }, // ✅ ปรับขนาดแท็บให้พอดี
        }}
      >
        {/* แท็บ 1: ทั้งหมด — แสดงออเดอร์ทั้งหมด (หน้าประวัติการสั่งซื้อเดิม) */}
        <Tab.Screen 
          name="AllTab" 
          component={OrderListTab}
          options={{ title: 'ทั้งหมด' }}
          initialParams={{ filterStatus: 'ALL' }}
        />
        
        {/* แท็บ 2: ที่ต้องชำระ — PENDING, VERIFYING */}
        <Tab.Screen 
          name="ToPayTab" 
          component={OrderListTab}
          options={{ title: 'ที่ต้องชำระ' }}
          initialParams={{ filterStatus: 'TO_PAY' }}
        />
        
        {/* แท็บ 3: ที่ต้องจัดส่ง — PENDING_CONFIRMATION, PROCESSING, READY_FOR_PICKUP */}
        <Tab.Screen 
          name="ToShipTab" 
          component={OrderListTab}
          options={{ title: 'ที่ต้องจัดส่ง' }}
          initialParams={{ filterStatus: 'TO_SHIP' }}
        />
        
        {/* แท็บ 4: ที่ต้องได้รับ — RIDER_ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED */}
        <Tab.Screen 
          name="ToReceiveTab" 
          component={OrderListTab}
          options={{ title: 'ที่ต้องได้รับ' }}
          initialParams={{ filterStatus: 'TO_RECEIVE' }}
        />
        
        {/* แท็บ 5: สำเร็จ — COMPLETED */}
        <Tab.Screen 
          name="CompletedTab" 
          component={OrderListTab}
          options={{ title: 'สำเร็จ' }}
          initialParams={{ filterStatus: 'COMPLETED' }}
        />
        
        {/* แท็บ 6: การคืนเงิน/คืนสินค้า — REFUND_REQUESTED, REFUND_APPROVED, REFUNDED */}
        <Tab.Screen 
          name="RefundTab" 
          component={OrderListTab}
          options={{ title: 'การคืนเงิน/คืนสินค้า' }}
          initialParams={{ filterStatus: 'REFUND' }}
        />
        
        {/* แท็บ 7: ยกเลิกแล้ว — CANCELLED */}
        <Tab.Screen 
          name="CancelledTab" 
          component={OrderListTab}
          options={{ title: 'ยกเลิกแล้ว' }}
          initialParams={{ filterStatus: 'CANCELLED' }}
        />
      </Tab.Navigator>
  );
}

export default function OrderHistoryScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="ประวัติการสั่งซื้อ" />
      <OrderHistoryProvider>
        <OrderHistoryTabs />
      </OrderHistoryProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 10 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 },
});

