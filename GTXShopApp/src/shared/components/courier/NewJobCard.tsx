import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NewJobCardProps {
  shipment: any;
  onAccept: (shipmentId: number) => void;
  isAccepting?: boolean;
}

export default function NewJobCard({
  shipment,
  onAccept,
  isAccepting = false,
}: NewJobCardProps) {
  const order = shipment.order || {};
  const firstItem = order.productOnOrders?.[0];
  const storeName = firstItem?.product?.store?.name || 'ร้านค้า';
  // Mock address - ในระบบจริงควรดึงจาก store address
  const pickupAddress = 'จุดรับ: คลังสินค้า / ร้านค้า (Mock Address)';
  const distance = '2.5 km'; // Mock distance
  
  // ✅ ฟังก์ชันแสดงเวลาออเดอร์
  const formatOrderTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // ✅ คำนวณเวลาที่ผ่านไป
  const getTimeAgo = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} วันที่แล้ว`;
    if (diffHours > 0) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffMins > 0) return `${diffMins} นาทีที่แล้ว`;
    return 'เมื่อสักครู่';
  };

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      pickupAddress,
    )}`;
    Linking.openURL(url);
  };

  const handleAccept = () => {
    Alert.alert(
      'ยืนยันรับงาน',
      `คุณต้องการรับงาน Order #${order.id || shipment.orderId} จาก ${storeName} หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          onPress: () => onAccept(shipment.id),
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={16} color="#FF9800" />
          <Text style={styles.badgeText}>งานใหม่</Text>
        </View>
        <Text style={styles.orderId}>Order #{order.id || shipment.orderId}</Text>
      </View>

      {/* ✅ แสดงเวลาออเดอร์ */}
      <View style={styles.timeContainer}>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.timeLabel}>สั่งซื้อเมื่อ:</Text>
          <Text style={styles.timeValue}>{formatOrderTime(order.createdAt)}</Text>
        </View>
        <Text style={styles.timeAgo}>({getTimeAgo(order.createdAt)})</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Ionicons name="storefront" size={20} color="#FF9800" />
          <View style={styles.infoContainer}>
            <Text style={styles.storeName}>{storeName}</Text>
            <Text style={styles.label}>จุดรับสินค้า</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Ionicons name="location" size={20} color="#666" />
          <View style={styles.infoContainer}>
            <Text style={styles.address} numberOfLines={2}>
              {pickupAddress}
            </Text>
            <View style={styles.distanceRow}>
              <Ionicons name="navigate" size={14} color="#999" />
              <Text style={styles.distance}>{distance}</Text>
            </View>
          </View>
        </View>

        {/* Order Items Summary */}
        {order.productOnOrders && order.productOnOrders.length > 0 && (
          <View style={styles.itemsContainer}>
            <Text style={styles.itemsLabel}>
              {order.productOnOrders.length} รายการ
            </Text>
            <Text style={styles.itemsText} numberOfLines={2}>
              {order.productOnOrders
                .slice(0, 2)
                .map((item: any) => item.product?.title || 'สินค้า')
                .join(', ')}
              {order.productOnOrders.length > 2 && ' ...'}
            </Text>
          </View>
        )}

        {/* Total Amount */}
        {order.cartTotal && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ยอดรวม:</Text>
            <Text style={styles.totalAmount}>
              ฿{Number(order.cartTotal).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={handleNavigate}
        >
          <Ionicons name="map-outline" size={18} color="#4285F4" />
          <Text style={styles.mapBtnText}>แผนที่</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptBtn, isAccepting && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <Text style={styles.acceptBtnText}>กำลังรับงาน...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.acceptBtnText}>รับงาน</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FF9800',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  orderId: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 10,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: '#999',
  },
  address: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 4,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distance: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  itemsContainer: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  itemsLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  itemsText: {
    fontSize: 13,
    color: '#666',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4285F4',
    flex: 1,
  },
  mapBtnText: {
    color: '#4285F4',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    flex: 2,
  },
  acceptBtnDisabled: {
    backgroundColor: '#BDBDBD',
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  // ✅ Styles สำหรับเวลาออเดอร์
  timeContainer: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  timeAgo: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
});

