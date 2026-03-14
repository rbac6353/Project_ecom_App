import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert, Modal, TextInput } from 'react-native';
import { useTheme } from '@app/providers/ThemeContext';
import { Order } from '@shared/interfaces/order';
import { Ionicons } from '@expo/vector-icons';
import * as orderService from '@app/services/orderService';
import * as cartService from '@app/services/cartService';
import client from '@app/api/client';
import { apiCache } from '@shared/utils/apiCache';
import useDebouncedValue from '@shared/hooks/useDebouncedValue';
import { getCustomerStatusConfig, getCustomerTimeline, getRemainingTime, formatTimeRemaining, OrderStatus } from '@shared/utils/orderStatusUtils';
import OrderTimeline from './OrderTimeline';
import TimelineProgressBar from './TimelineProgressBar';
import PaymentTimer from './PaymentTimer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  onRefresh?: () => void; // ✅ Callback สำหรับ refresh order list
  navigation?: any; // ✅ Navigation สำหรับ navigate ไปหน้า WriteReview
  reviewedProductIds?: number[]; // ✅ รายการ productId ที่ผู้ใช้รีวิวไปแล้ว
  filterStatus?: string; // ✅ Filter status เพื่อรู้ว่าอยู่ในแท็บไหน
}

// ฟังก์ชันคำนวณวันที่คาดว่าจะได้รับ
const getExpectedDeliveryDate = (createdAt: string, status: string): string => {
  const orderDate = new Date(createdAt);
  let daysToAdd = 2;

  if (status === 'PROCESSING') {
    daysToAdd = 2;
  } else if (status === 'SHIPPED') {
    daysToAdd = 1;
  }

  const expectedDate = new Date(orderDate);
  expectedDate.setDate(expectedDate.getDate() + daysToAdd);

  const day = expectedDate.getDate();
  const month = expectedDate.toLocaleDateString('th-TH', { month: 'short' });
  return `${day} ${month}`;
};

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  onRefresh,
  navigation,
  reviewedProductIds,
  filterStatus,
}) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [localReviewed, setLocalReviewed] = useState(false); // ✅ ซ่อนปุ่มรีวิวทันทีหลังจากกดใน session นี้
  const [latestTracking, setLatestTracking] = useState<{ title: string; description?: string } | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<any[]>([]); // ✅ เก็บ tracking history สำหรับ timeline
  const previousOrderIdRef = useRef<number | undefined>(undefined);
  const debouncedOrderId = useDebouncedValue(order.id, 500);
  const [confirmationTimeLeft, setConfirmationTimeLeft] = useState<string>(''); // ✅ State สำหรับ countdown timer
  const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;

  if (!firstItem) return null;

  // ตรวจว่ามีสินค้าในออเดอร์นี้ตัวใดตัวหนึ่งที่ผู้ใช้รีวิวไปแล้วหรือยัง
  const productIdsInOrder = Array.isArray(order.items)
    ? order.items
      .map((it: any) => it.product?.id)
      .filter((id: any) => typeof id === 'number')
    : [];
  const hasReviewed =
    Array.isArray(reviewedProductIds) &&
    productIdsInOrder.some((id) => reviewedProductIds.includes(id as number));

  // ใช้ flag เดียวในการเช็คว่ารีวิวแล้วหรือยัง (ทั้งจาก backend และจาก session ปัจจุบัน)
  const isReviewed = hasReviewed || localReviewed;

  // ดึง Tracking Status ล่าสุด
  useEffect(() => {
    const fetchTracking = async () => {
      // ตรวจสอบว่า order.id เปลี่ยนจริงๆ หรือไม่
      if (previousOrderIdRef.current === order.id && previousOrderIdRef.current !== undefined) {
        // order.id ไม่เปลี่ยน ไม่ต้อง fetch ใหม่
        return;
      }

      previousOrderIdRef.current = order.id;

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
          // ✅ เก็บ tracking history สำหรับ timeline
          setTrackingHistory(timeline);
        } else {
          setLatestTracking(null);
          setTrackingHistory([]);
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

  // ✅ Countdown Timer สำหรับ PENDING_CONFIRMATION - ใช้ confirmationDeadline จาก Backend
  useEffect(() => {
    // ตรวจสอบเฉพาะออเดอร์ที่มีสถานะ PENDING_CONFIRMATION และมี confirmationDeadline
    if (order.status !== 'PENDING_CONFIRMATION' || !order.confirmationDeadline) {
      setConfirmationTimeLeft('');
      return;
    }

    const deadline = new Date(order.confirmationDeadline).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        // หมดเวลาแล้ว
        setConfirmationTimeLeft('หมดเวลาแล้ว');
        
        // เรียก onRefresh() เพื่อให้ Parent Component โหลดข้อมูลใหม่
        // Backend Cron Job จะเปลี่ยนสถานะเป็น CANCELLED อัตโนมัติ
        if (onRefresh) {
          onRefresh();
        }
        return;
      }

      // คำนวณเวลาเหลือ (ชั่วโมง:นาที:วินาที)
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      // Format: HH:mm:ss
      const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setConfirmationTimeLeft(formatted);
    };

    // อัปเดตทันทีครั้งแรก
    updateTimer();

    // อัปเดตทุก 1 วินาที
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [order.status, order.confirmationDeadline, onRefresh]);

  // ฟังก์ชันยืนยันการรับสินค้า
  const handleConfirmReceived = async () => {
    Alert.alert(
      'ยืนยันการรับสินค้า',
      'คุณต้องการยืนยันว่าคุณได้รับสินค้าแล้วใช่หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          onPress: async () => {
            try {
              setLoading(true);
              // ใช้ completeOrder (confirm-received) แทนการเซ็ตสถานะเอง
              await orderService.completeOrder(order.id);
              // ✅ ย้ายไปแท็บ "สำเร็จ" หลังจากยืนยันรับสินค้าแล้ว
              if (navigation) {
                navigation
                  ?.getParent?.()
                  ?.getParent?.()
                  ?.navigate('OrderHistory', { initialTab: 'สำเร็จ' });
              }
              // ✅ Refresh list (กรณีใช้ในหน้าที่ไม่ใช่ OrderHistory)
              if (onRefresh) {
                onRefresh();
              }
              Alert.alert('สำเร็จ', 'ยืนยันการรับสินค้าเรียบร้อยแล้ว');
            } catch (error: any) {
              console.error('Error confirming received:', error);
              Alert.alert(
                'ผิดพลาด',
                error.response?.data?.message || 'ไม่สามารถยืนยันการรับสินค้าได้'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ฟังก์ชันซื้ออีกครั้ง (Buy Again)
  const handleBuyAgain = async () => {
    try {
      setLoading(true);
      const result = await orderService.buyAgain(order.id);

      if (result && Array.isArray(result.items)) {
        for (const item of result.items) {
          if (!item.productId) continue;
          await cartService.addToCart(
            item.productId,
            item.count || 1,
            item.variantId || undefined,
          );
        }
      }

      Alert.alert('สำเร็จ', 'เพิ่มสินค้าลงในตะกร้าแล้ว', [
        {
          text: 'ไปที่ตะกร้า',
          onPress: () =>
            (navigation ||
              ({} as any))?.getParent?.()?.getParent?.()?.navigate('MainTabs', {
                screen: 'Cart',
              }),
        },
        { text: 'ปิด' },
      ]);
    } catch (error: any) {
      console.error('Error buy again:', error);
      Alert.alert(
        'ผิดพลาด',
        error?.response?.data?.message ||
        'ไม่สามารถซื้อซ้ำได้ สินค้าอาจถูกลบหรือหมดสต็อก',
      );
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันเปิด Modal ขอคืนเงิน/คืนสินค้า
  const handleOpenRefundModal = () => {
    setShowRefundModal(true);
  };

  // ฟังก์ชันส่งคำขอคืนเงิน/คืนสินค้า
  const handleSubmitRefund = async () => {
    if (!refundReason.trim()) {
      Alert.alert('ผิดพลาด', 'กรุณาระบุเหตุผล');
      return;
    }
    try {
      setLoading(true);
      setShowRefundModal(false);
      // ถ้ายังไม่ได้ยืนยันการรับสินค้า ให้ยืนยันก่อน
      if (order.status === 'SHIPPED') {
        await orderService.updateOrderStatus(order.id, 'DELIVERED');
      }
      await orderService.requestRefund(order.id, refundReason.trim());
      setRefundReason('');
      // ✅ Refresh order list ทันทีเพื่อให้ออเดอร์ย้ายไปแท็บ "การคืนเงิน/คืนสินค้า"
      if (onRefresh) {
        onRefresh();
      }
      Alert.alert('สำเร็จ', 'ส่งคำขอคืนเงิน/คืนสินค้าเรียบร้อยแล้ว');
    } catch (error: any) {
      console.error('Error requesting refund:', error);
      Alert.alert(
        'ผิดพลาด',
        error.response?.data?.message || 'ไม่สามารถส่งคำขอได้'
      );
    } finally {
      setLoading(false);
    }
  };

  const imageUrl = firstItem.product?.imageUrl ||
    (firstItem.product?.images && firstItem.product.images.length > 0
      ? firstItem.product.images[0]
      : 'https://via.placeholder.com/150');

  const images = firstItem.product?.images || [];
  const expectedDate = getExpectedDeliveryDate(order.createdAt, order.status);
  const deliveredAt = order.updatedAt || order.createdAt;

  // ✅ ใช้ utility functions สำหรับสถานะ
  const statusConfig = getCustomerStatusConfig(order.status as OrderStatus, order.refundStatus);
  const timelineSteps = getCustomerTimeline(
    order.status as OrderStatus,
    order.createdAt,
    order.updatedAt,
    trackingHistory, // ✅ ส่ง tracking history เพื่อใช้ timestamp ที่ถูกต้อง
  );
  const remainingTime = order.paymentExpiredAt ? getRemainingTime(order.paymentExpiredAt) : null;

  // ✅ เช็คว่าออเดอร์นี้ควรแสดงในแท็บ "สำเร็จ" หรือไม่ (auto-complete หลัง 7 วัน)
  const isAutoCompleted = (['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) && (() => {
    const shippedDate = order.updatedAt || order.createdAt;
    const daysDiff = (Date.now() - new Date(shippedDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 7;
  })();

  // ตรวจสอบว่ามี variant หรือไม่
  const variantText = (firstItem as any).variant
    ? (firstItem as any).variant.name
    : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Store Header */}
      <View style={styles.storeHeader}>
        <View style={styles.storeBadge}>
          <Text style={styles.storeBadgeText}>ร้านแนะนำ</Text>
        </View>
        <Text style={[styles.storeName, { color: colors.text }]} numberOfLines={1}>
          {firstItem.product?.storeName || 'BoxiFY Mall'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} style={{ marginRight: 4 }} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Product Section */}
      <View style={styles.productSection}>
        {/* Main Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.mainImage}
            resizeMode="cover"
          />

          {/* Thumbnail Images */}
          {images.length > 1 && (
            <View style={styles.thumbnailRow}>
              {images.slice(1, 4).map((img: string, index: number) => (
                <Image
                  key={index}
                  source={{ uri: img }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={[styles.productTitle, { color: colors.text }]} numberOfLines={2}>
            {firstItem.product?.title || 'สินค้าไม่ระบุ'}
          </Text>
          {variantText && (
            <Text style={[styles.variantText, { color: colors.subText }]}>
              {variantText}
            </Text>
          )}
          <Text style={[styles.productQty, { color: colors.subText }]}>x{firstItem.count}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            {firstItem.product?.discountPrice ? (
              <>
                <Text style={[styles.originalPrice, { color: colors.subText }]}>
                  ฿{firstItem.product.price.toLocaleString()}
                </Text>
                <Text style={[styles.discountPrice, { color: colors.primary }]}>
                  ฿{firstItem.product.discountPrice.toLocaleString()}
                </Text>
              </>
            ) : (
              <Text style={[styles.productPrice, { color: colors.text }]}>
                ฿{firstItem.product?.price?.toLocaleString() || '0'}
              </Text>
            )}
          </View>

          {/* Total Items */}
          {order.items.length > 1 && (
            <Text style={[styles.moreItems, { color: colors.subText }]}>
              สินค้ารวม {order.items.length} รายการ: ฿{order.total.toLocaleString()}
            </Text>
          )}
        </View>
      </View>

      {/* ✅ Payment Timer - แสดงเฉพาะตอนรอชำระเงิน (ไม่แสดงสำหรับ COD) */}
      {order.status === 'PENDING' && order.paymentMethod !== 'COD' && order.paymentExpiredAt && remainingTime && (
        <View style={[styles.paymentTimerBox, { backgroundColor: '#FFF3E0', borderColor: '#FF9800' }]}>
          <View style={styles.paymentTimerHeader}>
            <Ionicons name="time-outline" size={16} color="#FF9800" />
            <Text style={[styles.paymentTimerLabel, { color: '#FF9800' }]}>เหลือเวลา:</Text>
            <Text style={[styles.paymentTimerValue, { color: '#FF9800' }]}>
              {formatTimeRemaining(remainingTime)}
            </Text>
          </View>
          <Text style={[styles.paymentAmount, { color: colors.text }]}>
            ยอดชำระ: ฿{order.total.toLocaleString()}
          </Text>
        </View>
      )}

      {/* ✅ Refund Pending Banner - แสดงเมื่อระบบกำลังดำเนินการคืนเงิน */}
      {order.refundStatus === 'PENDING' && (
        <View
          style={{
            backgroundColor: '#FFF4E5',
            padding: 8,
            borderRadius: 4,
            marginTop: 8,
            marginHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Ionicons name="time-outline" size={16} color="#FF9800" style={{ marginRight: 6 }} />
          <Text style={{ color: '#FF9800', fontSize: 12, fontWeight: 'bold' }}>
            กำลังดำเนินการคืนเงิน (รอเจ้าหน้าที่ตรวจสอบ)
          </Text>
        </View>
      )}

      {/* ✅ Confirmation Timer - แสดงสำหรับสถานะ PENDING_CONFIRMATION (24 ชม.) - ใช้ confirmationDeadline จาก Backend */}
      {order.status === 'PENDING_CONFIRMATION' && order.confirmationDeadline && confirmationTimeLeft && (
        <View style={[styles.confirmationTimerBox, { backgroundColor: '#FFF3E0', borderColor: '#FF9800' }]}>
          <View style={styles.confirmationTimerHeader}>
            <Ionicons name="time-outline" size={16} color="#FF9800" />
            <Text style={[styles.confirmationTimerLabel, { color: '#FF9800' }]}>หมดเวลายืนยันใน:</Text>
            <Text style={[styles.confirmationTimerValue, { color: '#FF9800' }]}>
              {confirmationTimeLeft}
            </Text>
          </View>
          <Text style={[styles.confirmationTimerWarning, { color: colors.subText }]}>
            ร้านค้ายอมรับออเดอร์แล้ว มีเวลา 24 ชั่วโมง ในการยืนยันรับออเดอร์
          </Text>
          <Text style={[styles.confirmationTimerWarning, { color: colors.subText, marginTop: 4 }]}>
            หากร้านไม่ยืนยัน ระบบจะคืนเงินให้อัตโนมัติ
          </Text>
        </View>
      )}




      {/* ✅ Timeline Progress Bar - แสดงสำหรับสถานะที่เหมาะสม */}
      {['VERIFYING', 'PENDING_CONFIRMATION', 'PROCESSING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && (
        <TimelineProgressBar
          currentStep={timelineSteps.filter(s => s.completed || s.inProgress).length - 1}
          totalSteps={timelineSteps.length > 0 ? timelineSteps.length : 1}
          currentLabel={
            timelineSteps.find(s => s.inProgress)?.label ||
            timelineSteps[timelineSteps.length - 1]?.label ||
            statusConfig.label
          }
          timestamp={
            order.updatedAt
              ? new Date(order.updatedAt).toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
              })
              : undefined
          }
          onPress={() => {
            if (navigation) {
              navigation.navigate('Tracking', {
                trackingNumber: order.trackingNumber || order.id.toString(),
                provider: order.logisticsProvider || 'BoxiFY Express',
                orderId: order.id,
              });
            }
          }}
        />
      )}



      {/* ✅ Delivery Failed Box */}
      {order.status === 'DELIVERY_FAILED' && (
        <View style={[styles.deliveryBox, { backgroundColor: '#FFEBEE', borderColor: '#F44336' }]}>
          <Ionicons name="close-circle-outline" size={16} color="#F44336" />
          <Text style={[styles.deliveryText, { color: '#F44336' }]}>
            ส่งไม่สำเร็จ กรุณานัดส่งใหม่
          </Text>
        </View>
      )}

      {/* Action Buttons for RIDER_ASSIGNED/PICKED_UP/OUT_FOR_DELIVERY status (ที่ต้องได้รับ) - ยังไม่ผ่าน 7 วัน */}
      {(['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.status)) && !isAutoCompleted && (
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.refundButton, { borderColor: colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              handleOpenRefundModal();
            }}
            disabled={loading}
          >
            <Text style={[styles.refundButtonText, { color: colors.text }]}>
              คืนเงิน/คืนสินค้า
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons for DELIVERED status (ที่ต้องได้รับ) - แสดงปุ่ม "ฉันได้รับสินค้าแล้ว" */}
      {order.status === 'DELIVERED' && !isAutoCompleted && (
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.refundButton, { borderColor: colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              handleOpenRefundModal();
            }}
            disabled={loading}
          >
            <Text style={[styles.refundButtonText, { color: colors.text }]}>
              คืนเงิน/คืนสินค้า
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.receivedButton, { borderColor: '#FF9800', backgroundColor: '#FF9800' }]}
            onPress={(e) => {
              e.stopPropagation();
              handleConfirmReceived();
            }}
            disabled={loading}
          >
            <Text style={[styles.receivedButtonText, { color: '#fff' }]}>
              ฉันได้รับสินค้าแล้ว
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons for COMPLETED status (สำเร็จ) - รวม auto-complete หลัง 7 วัน */}
      {(order.status === 'COMPLETED' || isAutoCompleted) && (
        <View style={styles.actionButtonsRow}>
          {/* ปุ่มคืนเงิน/คืนสินค้า */}
          <TouchableOpacity
            style={[styles.refundButton, { borderColor: colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              handleOpenRefundModal();
            }}
            disabled={loading}
          >
            <Text style={[styles.refundButtonText, { color: colors.text }]}>
              คืนเงิน/คืนสินค้า
            </Text>
          </TouchableOpacity>

          {/* ปุ่มรีวิวสินค้า */}
          <TouchableOpacity
            style={[
              styles.reviewButton,
              { backgroundColor: isReviewed ? '#E0E0E0' : colors.primary },
            ]}
            disabled={isReviewed}
            onPress={(e) => {
              if (isReviewed) return;
              e.stopPropagation();
              // เมื่อกดรีวิว ให้เปลี่ยนสถานะเป็นรีวิวแล้วใน session ปัจจุบันทันที
              setLocalReviewed(true);
              if (navigation && firstItem?.product) {
                navigation.navigate('WriteReview', {
                  productId: firstItem.product.id,
                  productName: firstItem.product.title || 'สินค้า',
                  productImage:
                    firstItem.product.imageUrl ||
                    firstItem.product.images?.[0] ||
                    'https://via.placeholder.com/150',
                });
              }
            }}
          >
            <Ionicons name="star" size={16} color={isReviewed ? '#9E9E9E' : '#fff'} />
            <Text
              style={[
                styles.reviewButtonText,
                isReviewed && { color: '#9E9E9E' },
              ]}
            >
              {isReviewed ? 'รีวิวแล้ว' : 'ให้คะแนน'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ Action Buttons for PENDING_CONFIRMATION status (รอร้านค้ายืนยัน - หลังจากร้านกดยอมรับแล้ว) */}
      {order.status === 'PENDING_CONFIRMATION' && (
        <View style={styles.actionButtonsRow}>
          <View style={styles.pendingConfirmationInfo}>
            <Text style={[styles.pendingConfirmationText, { color: '#FF9800' }]}>
              ร้านค้ายอมรับออเดอร์แล้ว มีเวลา 24 ชั่วโมง ในการยืนยันรับออเดอร์
            </Text>
            <Text style={[styles.pendingConfirmationWarning, { color: colors.subText }]}>
              หากร้านไม่ยืนยัน ระบบจะคืนเงินให้อัตโนมัติ
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refundButton, { borderColor: colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              // Navigate to chat
              if (navigation) {
                navigation.navigate('AdminChatList', { orderId: order.id });
              }
            }}
            disabled={loading}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.text} />
            <Text style={[styles.refundButtonText, { color: colors.text }]}>
              แชทกับร้านค้า
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ Action Buttons for PENDING status (รอชำระเงิน) - ไม่แสดงสำหรับ COD */}
      {order.status === 'PENDING' && order.paymentMethod !== 'COD' && (
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.paymentButton, { backgroundColor: colors.primary }]}
            onPress={(e) => {
              e.stopPropagation();
              onPress(); // Navigate to payment screen
            }}
            disabled={loading}
          >
            <Ionicons name="card-outline" size={18} color="#fff" />
            <Text style={styles.paymentButtonText}>ชำระเงิน</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                'ยกเลิกคำสั่งซื้อ',
                'คุณต้องการยกเลิกคำสั่งซื้อนี้หรือไม่?',
                [
                  { text: 'ไม่', style: 'cancel' },
                  {
                    text: 'ยกเลิก',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await orderService.updateOrderStatus(order.id, 'CANCELLED');
                        if (onRefresh) onRefresh();
                        Alert.alert('สำเร็จ', 'ยกเลิกคำสั่งซื้อแล้ว');
                      } catch (error: any) {
                        Alert.alert('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถยกเลิกได้');
                      }
                    },
                  },
                ]
              );
            }}
            disabled={loading}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.text} />
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>ยกเลิก</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ Action Buttons for PROCESSING status (ที่ต้องจัดส่ง) */}
      {(order.status === 'PROCESSING' || order.status === 'READY_FOR_PICKUP') && (
        <View style={styles.actionButtonsRow}>
          <View style={styles.processingInfo}>
            <Text style={[styles.processingText, { color: '#26aa99' }]}>
              {order.status === 'READY_FOR_PICKUP'
                ? 'สินค้าพร้อมแล้ว กำลังหาไรเดอร์'
                : 'ร้านค้ามีเวลา 2 วัน ในการเตรียมสินค้า'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refundButton, { borderColor: colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              // Navigate to chat
              if (navigation) {
                navigation.navigate('AdminChatList', { orderId: order.id });
              }
            }}
            disabled={loading}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.text} />
            <Text style={[styles.refundButtonText, { color: colors.text }]}>
              แชทกับร้านค้า
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delivery Info and Contact Button Row for other statuses */}
      {(order.status === 'PENDING' || order.status === 'VERIFYING' || order.status === 'PENDING_CONFIRMATION') && (
        <View style={styles.bottomRow}>
          {/* Delivery Info */}
          {order.status === 'PROCESSING' && (
            <View style={[styles.deliveryBox, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.deliveryText, { color: '#4CAF50' }]}>
                คาดว่าจะได้รับใน {expectedDate}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
            </View>
          )}

          {/* Contact Seller Button - ด้านขวา */}
          <View style={styles.contactButtonContainer}>
            <TouchableOpacity
              style={[styles.contactButton, { borderColor: colors.border }]}
              onPress={(e) => {
                e.stopPropagation();
                // TODO: Navigate to chat
              }}
            >
              <Text style={[styles.contactButtonText, { color: colors.text }]}>ติดต่อผู้ขาย</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Refund Modal */}
      <Modal
        visible={showRefundModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRefundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ขอคืนเงิน/คืนสินค้า
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.subText }]}>
              กรุณาระบุเหตุผลในการขอคืนเงิน/คืนสินค้า
            </Text>
            <TextInput
              style={[styles.modalInput, {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="ระบุเหตุผล..."
              placeholderTextColor={colors.subText}
              multiline
              numberOfLines={4}
              value={refundReason}
              onChangeText={setRefundReason}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowRefundModal(false);
                  setRefundReason('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, { backgroundColor: colors.primary }]}
                onPress={handleSubmitRefund}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  {loading ? 'กำลังส่ง...' : 'ส่งคำขอ'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  storeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  storeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  productSection: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageContainer: {
    marginRight: 12,
  },
  mainImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 4,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: 4,
  },
  thumbnail: {
    width: 30,
    height: 30,
    borderRadius: 4,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  variantText: {
    fontSize: 12,
    marginBottom: 4,
  },
  productQty: {
    fontSize: 12,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  moreItems: {
    fontSize: 12,
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  deliveryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  deliveryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactButtonContainer: {
    marginLeft: 'auto', // ดันปุ่มไปขวาสุดเสมอ
  },
  contactButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  refundButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  receivedButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receivedButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  processingInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  processingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalSubmitButton: {
    // backgroundColor handled by inline style
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentTimerBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  paymentTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusDescriptionBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusDescriptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timelineContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pendingConfirmationInfo: {
    flex: 1,
    marginRight: 8,
  },
  pendingConfirmationText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  pendingConfirmationWarning: {
    fontSize: 12,
    lineHeight: 16,
  },
  confirmationTimerBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  confirmationTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmationTimerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 8,
  },
  confirmationTimerValue: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  confirmationTimerWarning: {
    fontSize: 12,
    lineHeight: 16,
  },
  waitingAcceptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  waitingAcceptContent: {
    flex: 1,
  },
  waitingAcceptText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  waitingAcceptDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default OrderCard;
