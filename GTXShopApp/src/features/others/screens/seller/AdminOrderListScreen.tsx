import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import AdminOrderCard from '@shared/components/order/AdminOrderCard';
import * as orderService from '@app/services/orderService';
import { Order } from '@shared/interfaces/order';

export default function AdminOrderListScreen() {
  const { colors } = useTheme();
  const [orders, setOrders] = useState<(Order & { orderedBy?: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getAllOrders();
      // แปลงข้อมูลจาก backend ให้ตรงกับ interface
      const normalizedOrders = data.map((order: any) => ({
        ...order,
        status: order.orderStatus || order.status || 'PENDING',
        total: order.cartTotal || 0,
        items: order.productOnOrders || [],
        createdAt: order.createdAt,
        orderedBy: order.orderedBy || null,
        // ✅ เพิ่ม refund fields
        refundStatus: order.refundStatus || 'NONE',
        refundReason: order.refundReason || '',
        // ✅ เพิ่ม paymentSlipUrl
        paymentSlipUrl: order.paymentSlipUrl || null,
      }));
      setOrders(normalizedOrders);
    } catch (error: any) {
      console.error('Fetch orders error:', error);
      if (error.response?.status === 401) {
        // Unauthorized - อาจจะต้อง login ใหม่
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, []),
  );

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      // Optimistic Update (อัปเดตหน้าจอทันทีไม่ต้องรอ)
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );

      // ยิง API
      await orderService.updateOrderStatus(orderId, newStatus);
    } catch (error: any) {
      console.error('Update status error:', error);
      alert('อัปเดตสถานะไม่สำเร็จ: ' + (error.response?.data?.message || error.message));
      fetchOrders(); // โหลดใหม่ถ้าพลาด
    }
  };

  // ✅ ฟังก์ชันตัดสินใจ refund
  const handleRefundDecision = async (
    orderId: number,
    decision: 'APPROVED' | 'REJECTED',
  ) => {
    try {
      await orderService.decideRefund(orderId, decision);
      fetchOrders(); // Reload
    } catch (error: any) {
      console.error('Decide refund error:', error);
      alert(
        'ตัดสินใจไม่สำเร็จ: ' + (error.response?.data?.message || error.message),
      );
    }
  };

  // ✅ ฟังก์ชันยืนยันการชำระเงิน (สำหรับโอนเงินธนาคาร)
  const handleConfirmPayment = async (orderId: number) => {
    try {
      await orderService.confirmPayment(orderId);
      fetchOrders(); // Reload
    } catch (error: any) {
      console.error('Confirm payment error:', error);
      alert(
        'ยืนยันการชำระเงินไม่สำเร็จ: ' + (error.response?.data?.message || error.message),
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="จัดการออเดอร์ (Admin)" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="จัดการออเดอร์ (Admin)" />
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.subText }]}>ยังไม่มีออเดอร์</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="จัดการออเดอร์ (Admin)" />

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <AdminOrderCard
            order={item}
            onUpdateStatus={(status) => handleUpdateStatus(item.id, status)}
            onRefundDecision={(decision) =>
              handleRefundDecision(item.id, decision)
            }
            onConfirmPayment={() => handleConfirmPayment(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchOrders();
            }}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});

