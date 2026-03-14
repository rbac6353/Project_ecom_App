import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import { Order } from '@shared/interfaces/order';
import * as orderService from '@app/services/orderService';
import client from '@app/api/client';
import ShippingLabel from './ShippingLabel';
import { apiCache } from '@shared/utils/apiCache';
import useDebouncedValue from '@shared/hooks/useDebouncedValue';
import { getStoreStatusConfig, getRemainingTime, formatTimeRemaining, OrderStatus } from '@shared/utils/orderStatusUtils';
import OrderTimeline from './OrderTimeline';

interface AdminOrderCardProps {
  order: Order & { orderedBy?: { name: string; email?: string }; paymentSlipUrl?: string };
  onUpdateStatus: (status: string) => void;
  onRefundDecision?: (decision: 'APPROVED' | 'REJECTED') => void; // ✅ เพิ่ม prop
  onConfirmPayment?: () => void; // ✅ เพิ่ม prop สำหรับยืนยันการชำระเงิน
}

const AdminOrderCard: React.FC<AdminOrderCardProps> = ({
  order,
  onUpdateStatus,
  onRefundDecision,
  onConfirmPayment,
}) => {
  const { colors } = useTheme();
  const customerName = order.orderedBy?.name || 'ลูกค้าทั่วไป';
  const [showShipModal, setShowShipModal] = useState(false);
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [trackingNo, setTrackingNo] = useState('');
  const [provider, setProvider] = useState('Kerry Express');
  const [isSubmittingShipment, setIsSubmittingShipment] = useState(false);

  // ✅ ฟังก์ชันสุ่มเลขพัสดุ
  const generateTrackingNumber = (providerName: string): string => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // สุ่ม prefix ตามบริษัทขนส่ง
    const prefixMap: { [key: string]: string } = {
      'Kerry Express': 'KEX',
      'Flash Express': 'TH',
      'J&T Express': 'JT',
      'ไปรษณีย์ไทย': 'EMS',
      'Ninja Van': 'NV',
      'SCG Express': 'SCG',
      'Best Express': 'BEST',
    };
    
    const prefix = prefixMap[providerName] || 'TRK';
    return `${prefix}${timestamp}${random}`;
  };
  const [latestTracking, setLatestTracking] = useState<{ title: string; description?: string } | null>(null);
  const [isReadyToShipLoading, setIsReadyToShipLoading] = useState(false);
  const [slaRemaining, setSlaRemaining] = useState<number | null>(null); // เวลาที่เหลือจาก SLA (milliseconds)
  const [isAccepted, setIsAccepted] = useState(false); // Track ว่ายอมรับออเดอร์แล้วหรือยัง

  // เก็บ previous order state เพื่อตรวจสอบการเปลี่ยนแปลง
  const previousOrderRef = useRef<{ id: number; status: string } | null>(null);

  // Debounce order.id ด้วย delay 500ms
  const debouncedOrderId = useDebouncedValue(order.id, 500);

  // ดึง Tracking Status ล่าสุด
  useEffect(() => {
    const fetchTracking = async () => {
      // ตรวจสอบว่า order.id เปลี่ยนจริงๆ หรือไม่
      const orderIdChanged = previousOrderRef.current?.id !== order.id;

      // ตรวจสอบว่า order.status เปลี่ยนเป็นสถานะที่เกี่ยวข้องกับการจัดส่งหรือไม่
      const statusChanged = previousOrderRef.current?.status !== order.status;
      const deliveryStatuses = ['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
      const isDeliveryStatus = deliveryStatuses.includes(order.status);
      const wasDeliveryStatus = previousOrderRef.current?.status && deliveryStatuses.includes(previousOrderRef.current.status);
      const statusBecameDelivery = !wasDeliveryStatus && isDeliveryStatus;

      // เรียก API เฉพาะเมื่อ:
      // 1. order.id เปลี่ยนจริงๆ (ใช้ debounced value)
      // 2. order.status เปลี่ยนเป็นสถานะการจัดส่ง
      if (!orderIdChanged && !statusBecameDelivery && !statusChanged) {
        // ไม่มีการเปลี่ยนแปลงที่สำคัญ ไม่ต้อง fetch
        return;
      }

      // อัปเดต previous order state
      previousOrderRef.current = {
        id: order.id,
        status: order.status,
      };

      try {
        // ใช้ apiCache.get() แทนการ fetch ตรงๆ
        // Cache TTL = 5 วินาที
        const timeline = await apiCache.get<any[]>(
          client,
          `/orders/${order.id}/tracking`,
          undefined,
          5000 // 5 seconds cache
        );

        if (Array.isArray(timeline) && timeline.length > 0) {
          // เรียงจากเก่าไปใหม่ (ASC) ดังนั้นรายการสุดท้ายคือล่าสุด
          const latest = timeline[timeline.length - 1];
          setLatestTracking({
            title: latest.title || '',
            description: latest.description || '',
          });
        } else {
          setLatestTracking(null);
        }
      } catch (error: any) {
        // Handle error
        // ถ้าเป็น AbortError หรือ Request was cancelled ไม่ต้องทำอะไร
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || error.message === 'Request was cancelled') {
          return;
        }

        // ✅ Handle 429 (Rate Limit) - Silent fail ไม่ต้อง log error
        if (error?.response?.status === 429) {
          // Rate limit exceeded - ไม่ต้อง log error เพื่อไม่ให้รบกวน user
          // apiCache จะจัดการ retry เอง
          return;
        }

        // Handle error อื่นๆ - log เฉพาะ error ที่ไม่ใช่ 429
        console.error('Error fetching tracking:', error);
        // ไม่ต้อง set latestTracking เป็น null เพราะอาจมีข้อมูลเก่าอยู่
      }
    };

    // ใช้ debouncedOrderId แทน order.id โดยตรง
    // แต่ยังต้องตรวจสอบ order.status ด้วย
    fetchTracking();
  }, [debouncedOrderId, order.status]);

  // ✅ คำนวณ SLA Timer แบบ real-time (อัปเดตทุก 1 นาที) - ใช้ updatedAt เมื่อร้านยอมรับออเดอร์
  useEffect(() => {
    if ((order.status === 'PROCESSING' || order.status === 'READY_FOR_PICKUP') && isOrderAccepted && order.updatedAt) {
      const calculateRemaining = () => {
        // ใช้ updatedAt เมื่อร้านยอมรับออเดอร์ (ไม่ใช่ createdAt)
        const acceptedTime = new Date(order.updatedAt!).getTime();
        const now = Date.now();
        const slaDuration = 48 * 60 * 60 * 1000; // 48 ชั่วโมง
        const deadline = acceptedTime + slaDuration;
        const remaining = deadline - now;
        setSlaRemaining(remaining);
      };

      // คำนวณทันที
      calculateRemaining();

      // อัปเดตทุก 1 นาที
      const interval = setInterval(calculateRemaining, 60 * 1000);

      return () => clearInterval(interval);
    } else {
      setSlaRemaining(null);
    }
  }, [order.status, order.updatedAt, isOrderAccepted]);

  // ✅ ใช้ utility functions สำหรับสถานะ
  const statusConfig = getStoreStatusConfig(order.status as OrderStatus, order.refundStatus);
  const remainingTime = order.paymentExpiredAt ? getRemainingTime(order.paymentExpiredAt) : null;

  // ✅ ตรวจสอบว่าร้านยอมรับออเดอร์แล้วหรือยัง (updatedAt ต่างจาก createdAt มากกว่า 1 วินาที)
  const isOrderAcceptedFromData = order.updatedAt && order.createdAt &&
    (new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime() > 1000);

  // ✅ ใช้ state เพื่อ track ว่ายอมรับออเดอร์แล้วหรือยัง (อัปเดตทันทีเมื่อกดปุ่ม)
  const isOrderAccepted = isAccepted || isOrderAcceptedFromData;

  // ✅ อัปเดต isAccepted เมื่อ order.id เปลี่ยน (ออเดอร์ใหม่)
  useEffect(() => {
    setIsAccepted(isOrderAcceptedFromData);
  }, [order.id, isOrderAcceptedFromData]);

  // ✅ ฟังก์ชันดูสลิปการโอนเงิน
  const viewSlip = () => {
    if (order.paymentSlipUrl) {
      Alert.alert(
        'ตรวจสอบสลิป',
        'คุณต้องการยืนยันยอดเงินหรือไม่?',
        [
          { text: 'ดูรูปสลิป', onPress: () => Linking.openURL(order.paymentSlipUrl!) },
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: '✅ ยืนยันยอดเงิน',
            onPress: () => {
              if (onConfirmPayment) {
                Alert.alert(
                  'ยืนยัน',
                  'ต้องการยืนยันการชำระเงินและเปลี่ยนสถานะเป็น "เตรียมจัดส่ง" หรือไม่?',
                  [
                    { text: 'ยกเลิก', style: 'cancel' },
                    {
                      text: 'ยืนยัน',
                      onPress: onConfirmPayment,
                    },
                  ],
                );
              }
            },
          },
        ],
      );
    } else {
      Alert.alert('ไม่พบสลิป', 'ลูกค้ายังไม่ได้อัปโหลดสลิปการโอนเงิน');
    }
  };

  // ✅ ฟังก์ชันเมื่อกดปุ่ม "พร้อมจัดส่ง / เรียกไรเดอร์"
  const handleReadyToShip = async () => {
    Alert.alert(
      'พร้อมจัดส่ง',
      'คุณต้องการเปลี่ยนสถานะเป็น "เตรียมจัดส่ง" และเรียกไรเดอร์หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          onPress: async () => {
            try {
              setIsReadyToShipLoading(true);
              await orderService.updateOrderStatus(order.id, 'PROCESSING');
              Alert.alert('สำเร็จ', 'เปลี่ยนสถานะเป็น "เตรียมจัดส่ง" แล้ว\nQR Code สำหรับไรเดอร์พร้อมใช้งาน');
              onUpdateStatus('PROCESSING');
              setShowShippingLabel(true); // แสดง Shipping Label
            } catch (error: any) {
              console.error('Ready to ship error:', error);
              Alert.alert('ผิดพลาด', error.response?.data?.message || 'อัปเดตไม่สำเร็จ');
            } finally {
              setIsReadyToShipLoading(false);
            }
          },
        },
      ],
    );
  };

  // ✅ ฟังก์ชันเมื่อกดปุ่ม "แจ้งจัดส่งสินค้า" (รวมการจัดเตรียมการจัดส่งด้วย)
  const onShipPress = () => {
    // สุ่มเลขพัสดุอัตโนมัติ
    const newTrackingNo = generateTrackingNumber(provider);
    setTrackingNo(newTrackingNo);
    // เปิด Modal กรอกเลขพัสดุ (จะเปลี่ยนสถานะเป็น READY_FOR_PICKUP เมื่อกรอกเลขพัสดุเสร็จ)
    setShowShipModal(true);
  };

  // ✅ ฟังก์ชันยืนยันการจัดส่ง (กรอกเลขพัสดุ)
  const confirmShipment = async () => {
    if (!trackingNo.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกเลขพัสดุ');
      return;
    }

    try {
      setIsSubmittingShipment(true);
      // ✅ อัปเดตสถานะเป็น READY_FOR_PICKUP พร้อมเลขพัสดุ (ถ้ายังไม่เป็น READY_FOR_PICKUP)
      // ถ้าเป็น READY_FOR_PICKUP อยู่แล้ว แค่เพิ่มเลขพัสดุ
      await orderService.updateOrderStatus(order.id, 'READY_FOR_PICKUP', trackingNo, provider);
      setShowShipModal(false);
      setTrackingNo('');
      // เรียก onUpdateStatus เพื่อให้ parent component refresh
      onUpdateStatus('READY_FOR_PICKUP');

      Alert.alert('สำเร็จ', `แจ้งจัดส่งสินค้าเรียบร้อยแล้ว\nเลขพัสดุ: ${trackingNo}\nสถานะ: กำลังรอไรเดอร์มารับ`);

      // ✅ แสดง QR Code popup พร้อมปริ้น หลังจากบันทึกเลขพัสดุสำเร็จ
      setShowShippingLabel(true);
    } catch (error: any) {
      console.error('Ship order error:', error);
      Alert.alert('ผิดพลาด', error.response?.data?.message || 'อัปเดตไม่สำเร็จ');
    } finally {
      setIsSubmittingShipment(false);
    }
  };

  const handleAction = () => {
    Alert.alert(
      'จัดการออเดอร์',
      `ออเดอร์ #${order.id} ของ ${customerName}`,
      [
        { text: 'พร้อมจัดส่ง (Ready)', onPress: () => onUpdateStatus('READY_FOR_PICKUP') },
        { text: 'ไรเดอร์รับงาน (Rider Assigned)', onPress: () => onUpdateStatus('RIDER_ASSIGNED') },
        { text: 'ไรเดอร์รับสินค้าแล้ว (Picked Up)', onPress: () => onUpdateStatus('PICKED_UP') },
        { text: 'สำเร็จ (Delivered)', onPress: () => onUpdateStatus('DELIVERED') },
        { text: 'ยกเลิก (Cancel)', onPress: () => onUpdateStatus('CANCELLED'), style: 'destructive' },
        { text: 'ปิด', style: 'cancel' },
      ],
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.orderId, { color: colors.text }]}>Order #{order.id}</Text>
        <View style={[styles.badge, { backgroundColor: statusConfig.color }]}>
          <Ionicons name={statusConfig.icon as any} size={12} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.badgeText}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* ✅ Status Description Box */}
      <View style={[styles.statusDescriptionBox, { backgroundColor: statusConfig.bgColor }]}>
        <Text style={[styles.statusDescriptionText, { color: statusConfig.color }]}>
          {statusConfig.description}
        </Text>
      </View>

      {/* ✅ Payment Timer - แสดงเฉพาะตอนรอลูกค้าชำระเงิน (ไม่แสดงสำหรับ COD) */}
      {order.status === 'PENDING' && order.paymentMethod !== 'COD' && order.paymentExpiredAt && remainingTime && (
        <View style={[styles.paymentTimerBox, { backgroundColor: '#FFF9C4', borderColor: '#FFC107' }]}>
          <View style={styles.paymentTimerHeader}>
            <Ionicons name="time-outline" size={16} color="#FF9800" />
            <Text style={[styles.paymentTimerLabel, { color: '#FF9800' }]}>เหลือเวลา:</Text>
            <Text style={[styles.paymentTimerValue, { color: '#FF9800' }]}>
              {formatTimeRemaining(remainingTime)}
            </Text>
          </View>
        </View>
      )}

      {/* ✅ SLA Timer - แสดงเฉพาะเมื่อ status === 'PROCESSING' หรือ 'READY_FOR_PICKUP' (หลังจากร้านยอมรับออเดอร์แล้ว) */}
      {(order.status === 'PROCESSING' || order.status === 'READY_FOR_PICKUP') && isOrderAccepted && slaRemaining !== null && (
        <>
          {slaRemaining <= 0 ? (
            <View style={[styles.slaBox, { backgroundColor: '#FFEBEE', borderColor: '#F44336' }]}>
              <View style={styles.slaHeader}>
                <Ionicons name="alert-circle" size={16} color="#F44336" />
                <Text style={[styles.slaLabel, { color: '#F44336' }]}>
                  ⚠️ เกินเวลา SLA แล้ว กรุณาจัดส่งด่วน!
                </Text>
              </View>
            </View>
          ) : (
            (() => {
              const hours = Math.floor(slaRemaining / (60 * 60 * 1000));
              const minutes = Math.floor((slaRemaining % (60 * 60 * 1000)) / (60 * 1000));
              const isUrgent = slaRemaining < 24 * 60 * 60 * 1000; // น้อยกว่า 24 ชม.

              return (
                <View style={[styles.slaBox, {
                  backgroundColor: isUrgent ? '#FFEBEE' : '#FFF3E0',
                  borderColor: isUrgent ? '#F44336' : '#FF9800'
                }]}>
                  <View style={styles.slaHeader}>
                    <Ionicons name="time-outline" size={16} color={isUrgent ? '#F44336' : '#FF9800'} />
                    <Text style={[styles.slaLabel, { color: isUrgent ? '#F44336' : '#FF9800' }]}>
                      SLA: ต้องจัดส่งภายใน {hours} ชม. {minutes} นาที
                    </Text>
                  </View>
                </View>
              );
            })()
          )}
        </>
      )}

      <Text style={[styles.customer, { color: colors.text }]}>ลูกค้า: {customerName}</Text>
      <Text style={[styles.date, { color: colors.subText }]}>วันที่: {new Date(order.createdAt).toLocaleString('th-TH')}</Text>
      <Text style={[styles.total, { color: colors.primary }]}>ยอดรวม: ฿{order.total.toLocaleString()}</Text>

      {order.shippingAddress && (
        <Text style={[styles.address, { color: colors.subText }]} numberOfLines={2}>
          ที่อยู่: {order.shippingAddress}
        </Text>
      )}

      {/* ✅ แสดงสถานะ Tracking ล่าสุด */}
      {latestTracking && (
        <View style={[styles.trackingStatusBox, { backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' }]}>
          <View style={styles.trackingStatusHeader}>
            <Ionicons name="location-outline" size={16} color="#1565C0" />
            <Text style={[styles.trackingStatusTitle, { color: '#1565C0' }]}>
              สถานะการจัดส่ง
            </Text>
          </View>
          <Text style={[styles.trackingStatusText, { color: '#333' }]}>
            {latestTracking.title}
          </Text>
          {latestTracking.description && (
            <Text style={[styles.trackingStatusDesc, { color: '#666' }]}>
              {latestTracking.description}
            </Text>
          )}
        </View>
      )}

      {/* ✅ แสดงสถานะการคืนเงิน (ถ้ามี) */}
      {order.refundStatus && order.refundStatus !== 'NONE' && (
        <View
          style={[
            styles.refundBox,
            order.refundStatus === 'REQUESTED' && styles.refundBoxWarning,
            order.refundStatus === 'APPROVED' && styles.refundBoxSuccess,
            order.refundStatus === 'REJECTED' && styles.refundBoxDanger,
          ]}
        >
          <View style={styles.refundHeader}>
            <Ionicons
              name={
                order.refundStatus === 'APPROVED'
                  ? 'checkmark-circle'
                  : order.refundStatus === 'REJECTED'
                    ? 'close-circle'
                    : 'alert-circle'
              }
              size={20}
              color={
                order.refundStatus === 'APPROVED'
                  ? '#4CAF50'
                  : order.refundStatus === 'REJECTED'
                    ? '#F44336'
                    : '#FF9800'
              }
            />
            <Text style={[styles.refundTitle, { color: colors.text }]}>
              {order.refundStatus === 'REQUESTED'
                ? 'ลูกค้าขอคืนเงิน'
                : order.refundStatus === 'APPROVED'
                  ? 'อนุมัติคืนเงินแล้ว'
                  : 'ปฏิเสธคำขอ'}
            </Text>
          </View>
          {order.refundReason && (
            <Text style={[styles.refundReason, { color: colors.subText }]}>เหตุผล: {order.refundReason}</Text>
          )}
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* ✅ ปุ่มตรวจสอบสลิป (แสดงเมื่อ status === 'VERIFYING') */}
      {order.status === 'VERIFYING' && (
        <TouchableOpacity
          style={[styles.checkSlipBtn, { backgroundColor: colors.primary }]}
          onPress={viewSlip}
        >
          <Ionicons name="document-text" size={18} color="#fff" />
          <Text style={styles.checkSlipText}>ตรวจสอบสลิป</Text>
        </TouchableOpacity>
      )}

      {/* ✅ ปุ่มยอมรับออเดอร์ (แสดงเมื่อ status === 'VERIFYING', 'PENDING_CONFIRMATION', หรือ 'PROCESSING' ที่ยังไม่เคยยอมรับ) */}
      {(order.status === 'VERIFYING' || order.status === 'PENDING_CONFIRMATION' || (order.status === 'PROCESSING' && !isOrderAccepted)) && (
        <TouchableOpacity
          style={[styles.acceptOrderBtn, { backgroundColor: '#4CAF50', marginTop: order.status === 'VERIFYING' ? 10 : 0 }]}
          onPress={async () => {
            Alert.alert(
              'ยอมรับออเดอร์',
              'คุณยอมรับออเดอร์นี้หรือไม่?\n\nหลังจากยอมรับ คุณจะต้องเตรียมสินค้าและจัดส่งภายใน 2 วัน',
              [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                  text: 'ยอมรับ',
                  onPress: async () => {
                    try {
                      // ✅ เปลี่ยนสถานะเป็น PROCESSING (ร้านยอมรับแล้ว กำลังเตรียมสินค้า)
                      await orderService.updateOrderStatus(order.id, 'PROCESSING');
                      // ✅ อัปเดต state ทันทีเพื่อให้ปุ่มกดได้ทันที
                      setIsAccepted(true);
                      Alert.alert('สำเร็จ', 'ยอมรับออเดอร์แล้ว\nกรุณาเตรียมสินค้าและจัดส่งภายใน 2 วัน');
                      onUpdateStatus('PROCESSING');
                    } catch (error: any) {
                      console.error('Accept order error:', error);
                      Alert.alert('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถยอมรับได้');
                    }
                  },
                },
              ],
            );
          }}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.checkSlipText}>ยอมรับออเดอร์</Text>
        </TouchableOpacity>
      )}

      {/* ✅ ปุ่มอนุมัติ/ปฏิเสธ (แสดงเมื่อ refundStatus === 'REQUESTED') */}
      {order.refundStatus === 'REQUESTED' && onRefundDecision && (
        <View style={styles.refundActions}>
          <TouchableOpacity
            style={[styles.refundBtn, styles.approveBtn]}
            onPress={() => {
              Alert.alert(
                'ยืนยัน',
                'ต้องการอนุมัติคืนเงินให้ลูกค้า?',
                [
                  { text: 'ยกเลิก', style: 'cancel' },
                  {
                    text: 'ยืนยัน',
                    onPress: () => onRefundDecision('APPROVED'),
                    style: 'default',
                  },
                ],
              );
            }}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.refundBtnText}>อนุมัติคืนเงิน</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refundBtn, styles.rejectBtn]}
            onPress={() => {
              Alert.alert(
                'ยืนยัน',
                'ต้องการปฏิเสธคำขอคืนเงิน?',
                [
                  { text: 'ยกเลิก', style: 'cancel' },
                  {
                    text: 'ยืนยัน',
                    onPress: () => onRefundDecision('REJECTED'),
                    style: 'destructive',
                  },
                ],
              );
            }}
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
            <Text style={styles.refundBtnText}>ปฏิเสธ</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ ปุ่มปฏิเสธออเดอร์ (แสดงเมื่อ status === 'PENDING_CONFIRMATION') */}
      {order.status === 'PENDING_CONFIRMATION' && (
        <TouchableOpacity
          style={[styles.rejectOrderBtn, { borderColor: '#F44336' }]}
          onPress={() => {
            Alert.prompt(
              'ปฏิเสธออเดอร์',
              'กรุณาระบุเหตุผลในการปฏิเสธออเดอร์ (เช่น สินค้าหมด, ที่อยู่นอกพื้นที่จัดส่ง)',
              [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                  text: 'ปฏิเสธ',
                  style: 'destructive',
                  onPress: async (reason) => {
                    if (!reason || !reason.trim()) {
                      Alert.alert('แจ้งเตือน', 'กรุณาระบุเหตุผล');
                      return;
                    }
                    try {
                      await orderService.updateOrderStatus(order.id, 'CANCELLED');
                      Alert.alert('สำเร็จ', `ปฏิเสธออเดอร์แล้ว\nเหตุผล: ${reason}`);
                      onUpdateStatus('CANCELLED');
                    } catch (error: any) {
                      Alert.alert('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถปฏิเสธได้');
                    }
                  },
                },
              ],
              'plain-text',
            );
          }}
        >
          <Ionicons name="close-circle" size={18} color="#F44336" />
          <Text style={[styles.rejectOrderBtnText, { color: '#F44336' }]}>ปฏิเสธออเดอร์</Text>
        </TouchableOpacity>
      )}

      {/* ✅ ปุ่มจัดการสินค้า - แสดงเมื่อ status === 'PROCESSING' หรือ 'READY_FOR_PICKUP' (ปุ่มเทาๆ กดไม่ได้ถ้ายังไม่ยอมรับออเดอร์) */}
      {order.status === 'PROCESSING' && (
        <>
          {/* ปุ่มแจ้งจัดส่งสินค้า (รวมการจัดเตรียมการจัดส่งด้วย) */}
          <TouchableOpacity
            style={[
              styles.shipBtn,
              {
                backgroundColor: isOrderAccepted ? colors.primary : '#CCCCCC',
                opacity: isOrderAccepted ? 1 : 0.6
              }
            ]}
            onPress={() => {
              if (!isOrderAccepted) {
                Alert.alert('แจ้งเตือน', 'กรุณายอมรับออเดอร์ก่อน');
                return;
              }
              onShipPress();
            }}
            disabled={!isOrderAccepted || isReadyToShipLoading}
          >
            <Ionicons name="car-outline" size={18} color={isOrderAccepted ? "#fff" : "#999"} />
            <Text style={[styles.shipBtnText, { color: isOrderAccepted ? "#fff" : "#999" }]}>
              {isReadyToShipLoading ? 'กำลังประมวลผล...' : '🚚 แจ้งจัดส่งสินค้า'}
            </Text>
          </TouchableOpacity>

          {/* ปุ่มดู Shipping Label / QR Code */}
          <TouchableOpacity
            style={[
              styles.viewLabelBtn,
              {
                borderColor: isOrderAccepted ? colors.primary : '#CCCCCC',
                opacity: isOrderAccepted ? 1 : 0.6
              }
            ]}
            onPress={() => {
              if (!isOrderAccepted) {
                Alert.alert('แจ้งเตือน', 'กรุณายอมรับออเดอร์ก่อน');
                return;
              }
              setShowShippingLabel(true);
            }}
            disabled={!isOrderAccepted}
          >
            <Ionicons name="qr-code-outline" size={18} color={isOrderAccepted ? colors.primary : "#999"} />
            <Text style={[styles.viewLabelBtnText, { color: isOrderAccepted ? colors.primary : "#999" }]}>
              ดู Shipping Label / QR Code
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* ✅ ปุ่มกำลังรอไรเดอร์ - แสดงเมื่อ status === 'READY_FOR_PICKUP' */}
      {order.status === 'READY_FOR_PICKUP' && (
        <>
          {/* ปุ่มกำลังรอไรเดอร์ (กดไม่ได้ แค่แสดงสถานะ) */}
          <View style={[styles.waitingRiderBtn, { backgroundColor: '#FFF3E0', borderColor: '#FF9800' }]}>
            <Ionicons name="time-outline" size={18} color="#FF9800" />
            <Text style={[styles.waitingRiderText, { color: '#FF9800' }]}>
              🏍️ กำลังรอไรเดอร์มารับสินค้า
            </Text>
          </View>

          {/* แสดงเลขพัสดุ (ถ้ามี) */}
          {order.trackingNumber && (
            <View style={[styles.trackingInfoBox, { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' }]}>
              <View style={styles.trackingInfoRow}>
                <Ionicons name="cube-outline" size={16} color="#4CAF50" />
                <Text style={[styles.trackingInfoLabel, { color: '#4CAF50' }]}>เลขพัสดุ:</Text>
                <Text style={[styles.trackingInfoValue, { color: '#2E7D32' }]}>{order.trackingNumber}</Text>
              </View>
              {order.shippingProvider && (
                <View style={styles.trackingInfoRow}>
                  <Ionicons name="business-outline" size={16} color="#4CAF50" />
                  <Text style={[styles.trackingInfoLabel, { color: '#4CAF50' }]}>ขนส่ง:</Text>
                  <Text style={[styles.trackingInfoValue, { color: '#2E7D32' }]}>{order.shippingProvider}</Text>
                </View>
              )}
            </View>
          )}

          {/* ปุ่มดู Shipping Label / QR Code */}
          <TouchableOpacity
            style={[styles.viewLabelBtn, { borderColor: colors.primary }]}
            onPress={() => setShowShippingLabel(true)}
          >
            <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
            <Text style={[styles.viewLabelBtnText, { color: colors.primary }]}>
              ดู Shipping Label / QR Code
            </Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={handleAction}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>เปลี่ยนสถานะ</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ Modal กรอกเลขพัสดุ */}
      <Modal visible={showShipModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>กรอกข้อมูลการจัดส่ง</Text>

            <Text style={[styles.label, { color: colors.text }]}>บริษัทขนส่ง</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={provider}
              onChangeText={(text) => {
                setProvider(text);
                // สุ่มเลขพัสดุใหม่เมื่อเปลี่ยน provider
                setTrackingNo(generateTrackingNumber(text));
              }}
              placeholder="เช่น Kerry Express, Flash Express, ไปรษณีย์ไทย"
              placeholderTextColor={colors.subText}
            />

            <Text style={[styles.label, { color: colors.text }]}>เลขพัสดุ (Tracking No.)</Text>
            <View style={styles.trackingInputRow}>
              <TextInput
                style={[styles.trackingInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={trackingNo}
                onChangeText={setTrackingNo}
                placeholder="เช่น KEX123456789"
                placeholderTextColor={colors.subText}
              />
              <TouchableOpacity
                style={[styles.randomBtn, { backgroundColor: colors.primary }]}
                onPress={() => setTrackingNo(generateTrackingNumber(provider))}
              >
                <Ionicons name="refresh-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowShipModal(false);
                  setTrackingNo('');
                }}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={confirmShipment} 
                style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: isSubmittingShipment ? 0.7 : 1 }]}
                disabled={isSubmittingShipment}
              >
                {isSubmittingShipment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>ยืนยันการส่ง</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ Modal แสดง Shipping Label พร้อม QR Code */}
      <Modal
        visible={showShippingLabel}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShippingLabel(false)}
      >
        <View style={styles.labelModalContainer}>
          <ShippingLabel
            order={order}
            onClose={() => setShowShippingLabel(false)}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  customer: {
    fontSize: 14,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    marginBottom: 2,
  },
  total: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  address: {
    fontSize: 12,
    marginTop: 5,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderRadius: 4,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
  },
  refundBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  refundBoxWarning: {
    backgroundColor: '#fff3cd',
    borderLeftColor: '#ffc107',
  },
  refundBoxSuccess: {
    backgroundColor: '#d4edda',
    borderLeftColor: '#28a745',
  },
  refundBoxDanger: {
    backgroundColor: '#f8d7da',
    borderLeftColor: '#dc3545',
  },
  refundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  refundTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  refundReason: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  refundActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  refundBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: '#4CAF50',
  },
  rejectBtn: {
    backgroundColor: '#F44336',
  },
  refundBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  checkSlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  checkSlipText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  acceptOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  shipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  shipBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  trackingStatusBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  trackingStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  trackingStatusTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  trackingStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  trackingStatusDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  readyToShipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  readyToShipBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  viewLabelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  viewLabelBtnText: {
    fontWeight: '600',
    marginLeft: 5,
    fontSize: 14,
  },
  labelModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDescriptionBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  statusDescriptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentTimerBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  paymentTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentTimerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 8,
  },
  paymentTimerValue: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  slaBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  slaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slaLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  confirmationTimerBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 12,
    marginTop: 8,
  },
  confirmationTimerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  confirmationTimerContent: {
    flex: 1,
  },
  confirmationTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  confirmationTimerLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmationTimerValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  confirmationTimerWarning: {
    fontSize: 13,
    lineHeight: 18,
  },
  confirmOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  confirmOrderBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rejectOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    gap: 6,
  },
  rejectOrderBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // ✅ Styles สำหรับปุ่มกำลังรอไรเดอร์
  waitingRiderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  waitingRiderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // ✅ Styles สำหรับกล่องแสดงเลขพัสดุ
  trackingInfoBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  trackingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  trackingInfoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  trackingInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  // ✅ Styles สำหรับ tracking input row
  trackingInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  randomBtn: {
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminOrderCard;

