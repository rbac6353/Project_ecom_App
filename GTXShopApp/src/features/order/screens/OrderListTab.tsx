import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as orderService from '@app/services/orderService';
import OrderCard from '@shared/components/order/OrderCard';
import { Order } from '@shared/interfaces/order';
import { useOrderHistory } from '../context/OrderHistoryContext';

// ฟังก์ชัน normalize response จาก backend ให้ตรงกับ interface Order เดิม
const normalizeOrder = (apiOrder: any): Order => {
  const items = (apiOrder.productOnOrders || []).map((item: any) => {
    const product = item.product || {};
    let imageUrl = 'https://via.placeholder.com/150';
    if (product.images && product.images.length > 0) {
      imageUrl = product.images[0].url || product.images[0] || imageUrl;
    }

    return {
      id: item.id,
      count: item.count,
      price: item.price,
      product: {
        id: product.id || item.productId,
        title: product.title || product.name || 'Unknown Product',
        price: item.price || product.price || 0,
        discountPrice: product.discountPrice || null,
        imageUrl,
        storeName: product.store?.name || 'BoxiFY Mall',
      },
    };
  });

  return {
    id: apiOrder.id,
    userId: apiOrder.orderedById || apiOrder.userId,
    total: apiOrder.cartTotal || apiOrder.total || 0,
    status: apiOrder.orderStatus || apiOrder.status || 'PENDING',
    shippingAddress: apiOrder.shippingAddress || '',
    shippingPhone: apiOrder.shippingPhone || '',
    createdAt: apiOrder.createdAt || new Date().toISOString(),
    updatedAt: apiOrder.updatedAt || apiOrder.deliveredTime || apiOrder.createdAt,
    trackingNumber: apiOrder.trackingNumber || null, // ✅ เพิ่ม trackingNumber
    logisticsProvider: apiOrder.logisticsProvider || null, // ✅ เพิ่ม logisticsProvider
    confirmationDeadline: apiOrder.confirmationDeadline || null, // ✅ เพิ่ม confirmationDeadline
    isAutoCancelled: apiOrder.isAutoCancelled || false, // ✅ เพิ่ม isAutoCancelled
    items,
  };
};

// กรองออเดอร์ดิบตาม filterStatus (ใช้ทั้งจาก context และจาก fetch เอง)
function filterByStatus(list: any[], filterStatus: string): any[] {
  return list.filter((o: any) => {
    const status = (o.orderStatus || o.status || 'PENDING') as string;
    const refundStatus = (o.refundStatus || 'NONE') as string;

    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'TO_PAY') return status === 'PENDING' || status === 'VERIFYING';
    if (filterStatus === 'TO_SHIP') return status === 'PENDING_CONFIRMATION' || status === 'PROCESSING' || status === 'READY_FOR_PICKUP';
    if (filterStatus === 'TO_RECEIVE') return status === 'RIDER_ASSIGNED' || status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED';
    if (filterStatus === 'COMPLETED') return status === 'COMPLETED';
    if (filterStatus === 'REFUND') return status === 'REFUND_REQUESTED' || status === 'REFUND_APPROVED' || status === 'REFUNDED' || (refundStatus && refundStatus !== 'NONE');
    if (filterStatus === 'CANCELLED') return status === 'CANCELLED';
    return false;
  });
}

interface OrderListTabProps {
  route: {
    params?: {
      filterStatus?: string;
    };
  };
}

export default function OrderListTab({ route }: OrderListTabProps) {
  const navigation = useNavigation<any>();
  const filterStatus = route.params?.filterStatus || 'ALL';
  const orderHistory = useOrderHistory();

  // โหมดใช้ context: ดึงออเดอร์ครั้งเดียวที่หน้าประวัติ → ไม่ยิง API ซ้ำทุกแท็บ (ลด 429)
  const ordersFromContext = useMemo(() => {
    if (!orderHistory?.orders) return [];
    const filtered = filterByStatus(orderHistory.orders, filterStatus);
    const normalized = filtered.map(normalizeOrder);
    return normalized.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [orderHistory?.orders, filterStatus]);

  // โหมดไม่มี context (ใช้ที่อื่น): fetch เอง
  const [ordersLocal, setOrdersLocal] = useState<Order[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      if (!refreshing) setLoadingLocal(true);
      const data = await orderService.getMyOrders();
      const list = Array.isArray(data) ? data : [];
      const filtered = filterByStatus(list, filterStatus);
      const normalized = filtered.map(normalizeOrder);
      const sorted = normalized.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setOrdersLocal(sorted);
    } catch (error) {
      console.error('Error fetching orders for tab:', filterStatus, error);
      setOrdersLocal([]);
    } finally {
      setLoadingLocal(false);
      setRefreshing(false);
    }
  }, [filterStatus, refreshing]);

  useFocusEffect(
    useCallback(() => {
      if (!orderHistory) fetchOrders();
    }, [filterStatus, orderHistory, fetchOrders]),
  );

  const useContext = !!orderHistory;
  const orders = useContext ? ordersFromContext : ordersLocal;
  const loading = useContext ? orderHistory.loading : loadingLocal;
  const onRefresh = useContext ? orderHistory.refresh : () => { setRefreshing(true); fetchOrders(); };

  if (loading && orders.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() =>
              navigation.navigate('OrderDetail', { orderId: item.id })
            }
            navigation={navigation}
            filterStatus={filterStatus}
            onRefresh={onRefresh}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>ไม่มีรายการคำสั่งซื้อ</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={useContext ? orderHistory.loading : refreshing}
            onRefresh={onRefresh}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 10 },
  emptyBox: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999' },
});


