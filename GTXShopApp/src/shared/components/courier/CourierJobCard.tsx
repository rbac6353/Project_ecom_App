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
import { useNavigation } from '@react-navigation/native';
import client from '@app/api/client';
import { getCourierStatusConfig } from '@shared/utils/orderStatusUtils';
import { useTheme } from '@app/providers/ThemeContext';

interface JobCardProps {
  shipment: any;
  type: 'PICKUP' | 'DELIVER' | 'HISTORY';
  onAction: () => void;
  onRefresh?: () => void; // ✅ เพิ่ม callback สำหรับ refresh
}

export default function CourierJobCard({
  shipment,
  type,
  onAction,
  onRefresh,
}: JobCardProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const order = shipment.order || {};
  
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
  
  // ✅ ตรวจสอบว่าออเดอร์ถูกยืนยันการรับของแล้วหรือไม่
  // ✅ ตรวจสอบทั้งจาก order status และ shipment status
  const isCompleted = 
    order.orderStatus === 'COMPLETED' || 
    order.status === 'COMPLETED' ||
    shipment.status === 'DELIVERED'; // ✅ ถ้า shipment เป็น DELIVERED แสดงว่าส่งสำเร็จแล้ว
  
  // ✅ ใช้ข้อมูลจาก parent (shipment.latestTracking) แทนการเรียก API
  const latestTracking = shipment.latestTracking
    ? {
        title: shipment.latestTracking.title || '',
        description: shipment.latestTracking.description || '',
      }
    : null;

  // ✅ ใช้ utility functions สำหรับสถานะ
  // ✅ ตรวจสอบสถานะจาก shipment.status ก่อน (เพราะมันอัปเดตเร็วกว่า order.status)
  // ถ้า shipment.status เป็น DELIVERED แสดงว่าส่งสำเร็จแล้ว
  const effectiveStatus = shipment.status === 'DELIVERED' 
    ? 'DELIVERED' 
    : (order.orderStatus || order.status || 'PENDING');
  
  const statusConfig = getCourierStatusConfig(
    effectiveStatus,
    shipment.status,
  );

  let title: string;
  let name: string;
  let address: string;
  let phone: string | undefined;
  let iconName: string;
  let badgeColor: string;

  if (type === 'PICKUP') {
    title = '📦 งานรับสินค้า (Pick up)';
    const firstItem = order.productOnOrders?.[0];
    name = firstItem?.product?.store?.name || 'ร้านค้า';
    // ในระบบจริงควรใช้ address ของร้านค้า ตอนนี้ mock ไปก่อน
    address = 'จุดรับ: คลังสินค้า / ร้านค้า (Mock)';
    phone = undefined;
    iconName = 'storefront';
    badgeColor = '#FF9800';
  } else {
    title = type === 'DELIVER' ? '🚚 งานส่งสินค้า (Deliver)' : '✅ ส่งสำเร็จ';
    name = order.orderedBy?.name || 'ลูกค้า';
    address = order.shippingAddress || '-';
    phone = order.shippingPhone;
    iconName = 'person';
    badgeColor = type === 'DELIVER' ? '#2196F3' : '#4CAF50';
  }

  const handleCall = () => {
    if (!phone) {
      Alert.alert('ไม่มีเบอร์โทรของลูกค้า');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigate = () => {
    if (!address) {
      Alert.alert('ไม่มีที่อยู่สำหรับนำทาง');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address,
    )}`;
    Linking.openURL(url);
  };

  return (
    <View style={[styles.card, type === 'HISTORY' && styles.historyCard]}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} style={{ marginRight: 4 }} />
          <Text style={[styles.typeBadge, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
        <Text style={styles.orderId}>Order #{order.id || shipment.orderId}</Text>
      </View>

      {/* ✅ Status Description */}
      {statusConfig.description && (
        <View style={[styles.statusDescriptionBox, { backgroundColor: statusConfig.bgColor }]}>
          <Text style={[styles.statusDescriptionText, { color: statusConfig.color }]}>
            {statusConfig.description}
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <Ionicons name={iconName as any} size={18} color="#666" />
        <Text style={styles.name}>{name}</Text>
      </View>

      <View style={styles.row}>
        <Ionicons name="location" size={18} color="#666" />
        <Text style={styles.address} numberOfLines={2}>
          {address}
        </Text>
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

      {type !== 'HISTORY' && (
        <>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleCall}>
              <Ionicons name="call" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#4285F4' }]}
              onPress={handleNavigate}
            >
              <Ionicons name="map" size={20} color="#fff" />
            </TouchableOpacity>

            {/* ✅ ปุ่มหลักเดียว - เปลี่ยนตามสถานะ */}
            {(() => {
              // สถานะ 1: รอรับของ (WAITING_PICKUP) → สแกน QR ยืนยันรับของ
              if (shipment.status === 'WAITING_PICKUP') {
                return (
                  <TouchableOpacity
                    style={[styles.mainBtn, { backgroundColor: '#FF9800' }]}
                    onPress={() => {
                      navigation.navigate('CourierScan', {
                        shipmentId: shipment.id,
                        orderId: order.id || shipment.orderId,
                      });
                    }}
                  >
                    <View style={styles.mainBtnContent}>
                      <Ionicons name="qr-code-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.mainBtnText}>สแกน QR ยืนยันรับของ</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
              
              // สถานะ 2: รับของแล้ว (IN_TRANSIT) → เริ่มนำจ่าย
              if (shipment.status === 'IN_TRANSIT') {
                return (
                  <TouchableOpacity
                    style={[styles.mainBtn, { backgroundColor: '#2196F3' }]}
                    onPress={async () => {
                      try {
                        await client.patch(`/shipments/${shipment.id}/out-for-delivery`);
                        Alert.alert('สำเร็จ', 'เริ่มนำจ่ายแล้ว');
                        if (onRefresh) onRefresh();
                      } catch (error: any) {
                        Alert.alert('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถเปลี่ยนสถานะได้');
                      }
                    }}
                  >
                    <View style={styles.mainBtnContent}>
                      <Ionicons name="car" size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.mainBtnText}>🚚 เริ่มนำจ่าย</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
              
              // สถานะ 3: กำลังนำจ่าย (OUT_FOR_DELIVERY) → ไปหน้าถ่ายรูป + ลายเซ็น
              if (shipment.status === 'OUT_FOR_DELIVERY') {
                return (
                  <TouchableOpacity
                    style={[styles.mainBtn, { backgroundColor: '#4CAF50' }]}
                    onPress={() => {
                      // ✅ ไปหน้า DeliveryProof เพื่อถ่ายรูปและเซ็นรับ
                      navigation.navigate('DeliveryProof', {
                        orderId: order.id || shipment.orderId,
                        shipmentId: shipment.id,
                      });
                    }}
                  >
                    <View style={styles.mainBtnContent}>
                      <Ionicons name="camera" size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.mainBtnText}>📸 ถ่ายรูป/ลายเซ็น</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
              
              // สถานะ 4: ส่งสำเร็จแล้ว (DELIVERED)
              if (shipment.status === 'DELIVERED' || isCompleted) {
                return (
                  <View style={[styles.mainBtn, styles.mainBtnDisabled]}>
                    <View style={styles.mainBtnContent}>
                      <Ionicons name="checkmark-done" size={18} color="#666" style={{ marginRight: 6 }} />
                      <Text style={styles.mainBtnTextDisabled}>✅ ส่งสำเร็จแล้ว</Text>
                    </View>
                  </View>
                );
              }
              
              // Default: ใช้ onAction
              return (
                <TouchableOpacity
                  style={[styles.mainBtn, type === 'DELIVER' && { backgroundColor: '#4CAF50' }]}
                  onPress={onAction}
                >
                  <View style={styles.mainBtnContent}>
                    <Text style={styles.mainBtnText}>
                      {type === 'PICKUP' ? 'ยืนยันรับของ' : 'ปิดงาน'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })()}
          </View>
        </>
      )}

      {/* ✅ แสดงสถานะ Tracking ล่าสุด */}
      {latestTracking && (
        <View style={styles.trackingBox}>
          <View style={styles.trackingHeader}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.trackingTitle}>สถานะล่าสุด</Text>
          </View>
          <Text style={styles.trackingText}>{latestTracking.title}</Text>
          {latestTracking.description && (
            <Text style={styles.trackingDesc}>{latestTracking.description}</Text>
          )}
        </View>
      )}

      {type === 'HISTORY' && shipment.updatedAt && (
        <Text style={styles.historyDate}>
          อัปเดตเมื่อ:{' '}
          {new Date(shipment.updatedAt).toLocaleString('th-TH')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
  },
  historyCard: { opacity: 0.85, backgroundColor: '#f9f9f9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadge: { fontWeight: 'bold', fontSize: 14 },
  orderId: { color: '#999' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  name: { fontWeight: 'bold', marginLeft: 8, fontSize: 16, color: '#333' },
  address: { marginLeft: 8, color: '#555', flex: 1, lineHeight: 20 },
  actionRow: { flexDirection: 'row', marginTop: 10, columnGap: 10 },
  iconBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBtn: {
    flex: 1,
    backgroundColor: '#FF9800',
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  mainBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  mainBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  mainBtnTextDisabled: { color: '#666' },
  historyDate: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    marginTop: 5,
  },
  trackingBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trackingTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
  trackingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  trackingDesc: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusDescriptionBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    marginTop: 8,
  },
  statusDescriptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // ✅ Styles สำหรับเวลาออเดอร์
  timeContainer: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
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


