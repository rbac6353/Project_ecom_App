import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Clipboard,
  Dimensions,
  BackHandler,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import * as orderService from '@app/services/orderService';
import { Order } from '@shared/interfaces/order';
import { getMyReviews } from '@app/services/reviewService';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { RootStackParamList } from '@navigation/RootStackNavigator';
import { useTheme } from '@app/providers/ThemeContext';
import { useAuth } from '@app/providers/AuthContext';
import PaymentTimer from '@shared/components/order/PaymentTimer';
import client from '@app/api/client';
import { getCustomerStatusConfig, getCustomerTimeline, OrderStatus } from '@shared/utils/orderStatusUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

type OrderDetailRouteProp = RouteProp<RootStackParamList, 'OrderDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ✅ Fix #4: Helper function สำหรับ parse attributes (รองรับทั้ง JSON string และ object)
const parseAttributes = (attrs: any): Record<string, string> | null => {
  if (!attrs) return null;
  if (typeof attrs === 'string') {
    try {
      const parsed = JSON.parse(attrs);
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch (e) {
      console.warn('Failed to parse attributes JSON:', e);
      return null;
    }
  }
  if (typeof attrs === 'object' && attrs !== null) {
    return attrs;
  }
  return null;
};

// ฟังก์ชัน normalize response จาก backend ให้ตรงกับ interface
const normalizeOrder = (apiOrder: any): any => {
  const items = (apiOrder.productOnOrders || []).map((item: any) => {
    const product = item.product || {};
    const variant = item.variant || null;
    let imageUrl = 'https://via.placeholder.com/150';
    const images: string[] = [];

    if (product.images && product.images.length > 0) {
      product.images.forEach((img: any) => {
        // ✅ ดึง URL จาก Image entity (รองรับทั้ง secure_url และ url)
        const url = img.secure_url || img.url || (typeof img === 'string' ? img : null);
        if (url && url.trim() !== '') {
          images.push(url);
        }
      });
      imageUrl = images[0] || imageUrl;
    }

    return {
      id: item.id,
      count: item.count,
      price: item.price,
      variantId: item.variantId || null,
      variant: variant ? {
        id: variant.id,
        name: variant.name,
        price: variant.price,
        attributes: parseAttributes(variant.attributes), // ✅ Fix #4: Parse attributes
      } : null,
      product: {
        id: product.id || item.productId,
        title: product.title || product.name || 'Unknown Product',
        price: item.price || product.price || 0,
        discountPrice: product.discountPrice || null,
        imageUrl: imageUrl,
        images: images,
        storeName: product.store?.name || 'BoxiFY Mall',
        storeId: product.storeId || product.store?.id || null,
      },
    };
  });

  // ✅ คำนวณ subtotal จาก items
  const subtotal = items.reduce((sum: number, item: any) => {
    const itemPrice = item.variant?.price || item.price || 0;
    return sum + (itemPrice * item.count);
  }, 0);

  // ✅ Fix #3: คำนวณ shipping cost (ถ้าไม่มีใน backend)
  // cartTotal = subtotal + shippingCost - discountAmount
  // shippingCost = cartTotal - subtotal + discountAmount
  const discountAmount = Number(apiOrder.discountAmount || 0);
  const cartTotal = Number(apiOrder.cartTotal || 0);
  // ✅ ใช้ Math.max เพื่อป้องกันค่าลบ (กรณีที่คำนวณผิดพลาด)
  const shippingCost = Math.max(0, cartTotal - subtotal + discountAmount);

  return {
    id: apiOrder.id,
    userId: apiOrder.orderedById || apiOrder.userId,
    total: cartTotal,
    subtotal: subtotal,
    shippingCost: shippingCost > 0 ? shippingCost : 0,
    discountAmount: discountAmount,
    discountCode: apiOrder.discountCode || null,
    status: apiOrder.orderStatus || apiOrder.status || 'PENDING',
    shippingAddress: apiOrder.shippingAddress || '',
    shippingPhone: apiOrder.shippingPhone || '',
    createdAt: apiOrder.createdAt || new Date().toISOString(),
    paymentMethod: apiOrder.paymentMethod || 'STRIPE',
    paymentExpiredAt: apiOrder.paymentExpiredAt || null,
    trackingNumber: apiOrder.trackingNumber || null,
    logisticsProvider: apiOrder.logisticsProvider || null,
    items: items,
    refundStatus: apiOrder.refundStatus || 'NONE',
    refundReason: apiOrder.refundReason || '',
  };
};

// ฟังก์ชันคำนวณวันที่คาดว่าจะได้รับ (ประมาณ 2-3 วันหลังจาก PROCESSING)
const getExpectedDeliveryDate = (createdAt: string, status: string): string => {
  const orderDate = new Date(createdAt);
  let daysToAdd = 2;

  if (status === 'PROCESSING') {
    daysToAdd = 2; // 2 วันหลังจากเตรียมจัดส่ง
  } else if (status === 'SHIPPED') {
    daysToAdd = 1; // 1 วันหลังจากส่งแล้ว
  }

  const expectedDate = new Date(orderDate);
  expectedDate.setDate(expectedDate.getDate() + daysToAdd);

  const day = expectedDate.getDate();
  const month = expectedDate.toLocaleDateString('th-TH', { month: 'short' });
  return `${day} ${month}`;
};

// ฟังก์ชันแยกชื่อและที่อยู่จาก shippingAddress
const parseAddress = (address: string) => {
  // Format: "ชื่อ (ที่อยู่...)"
  const match = address.match(/^(.+?)\s*\((.+)\)$/);
  if (match) {
    return {
      name: match[1].trim(),
      address: match[2].trim(),
    };
  }
  return {
    name: '',
    address: address,
  };
};

function canRequestReturn(order: Order): boolean {
  // ขอคืนได้เมื่อออเดอร์สำเร็จแล้ว และยังไม่มีคำขอคืนเงินสถานะ REQUESTED
  return (
    order.status === 'DELIVERED' &&
    order.refundStatus !== 'REQUESTED'
  );
}

// ✅ Animated Timeline Item Component
const AnimatedTimelineItem = ({ 
  step, 
  index, 
  isLast, 
  isCompleted, 
  isInProgress 
}: { 
  step: any; 
  index: number; 
  isLast: boolean; 
  isCompleted: boolean; 
  isInProgress: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Stagger animation for each timeline item
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for in-progress items
    if (isInProgress) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [index, isInProgress]);

  return (
    <Animated.View 
      style={[
        styles.timelineItem,
        { 
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      {/* Timeline Connector */}
      {!isLast && (
        <Animated.View 
          style={[
            styles.timelineConnector,
            { 
              backgroundColor: isCompleted ? '#4CAF50' : '#E0E0E0',
              opacity: fadeAnim,
            }
          ]} 
        />
      )}
      
      {/* Timeline Dot with Glow Effect */}
      <Animated.View 
        style={[
          styles.timelineDot,
          isCompleted && styles.timelineDotCompleted,
          isInProgress && styles.timelineDotProgress,
          isCompleted && styles.timelineDotGlow,
          {
            transform: [{ scale: isInProgress ? pulseAnim : scaleAnim }],
          }
        ]}
      >
        {isCompleted && (
          <Ionicons name="checkmark" size={12} color="#fff" />
        )}
        {isInProgress && (
          <View style={styles.timelinePulse} />
        )}
      </Animated.View>
      
      {/* Timeline Content */}
      <View style={styles.timelineContent}>
        <Text style={[
          styles.timelineLabel,
          isCompleted && styles.timelineLabelCompleted,
          isInProgress && styles.timelineLabelProgress,
        ]}>
          {step.label}
        </Text>
        {step.timestamp && (
          <Text style={styles.timelineTime}>
            {new Date(step.timestamp).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

// ✅ Animated Card Component
const AnimatedCard = ({ 
  children, 
  style, 
  delay = 0 
}: { 
  children: React.ReactNode; 
  style?: any; 
  delay?: number;
}) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View 
      style={[
        styles.modernCard,
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ✅ Animated Button Component with Haptic
const AnimatedButton = ({ 
  onPress, 
  style, 
  children,
  disabled = false,
}: { 
  onPress: () => void; 
  style?: any; 
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Haptics not available
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function OrderDetailScreen() {
  const route = useRoute<OrderDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { orderId, fromPayment } = route.params as any;
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [expandedAddress, setExpandedAddress] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const confettiRef = useRef<any>(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [shipment, setShipment] = useState<any>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const orderRef = useRef<any | null>(null);
  const [copyAnimated, setCopyAnimated] = useState(false);

  // ✅ Animation Values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const statusBadgeScale = useRef(new Animated.Value(0.8)).current;
  const proofImageScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  // ✅ Entry Animations
  useEffect(() => {
    if (order) {
      Animated.parallel([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(statusBadgeScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [order]);

  // ✅ ฟังก์ชันกลับหน้าแรก (ล้าง stack ทั้งหมด)
  const handleBackToHome = React.useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      }),
    );
  }, [navigation]);

  // ✅ ฟังก์ชันไปหน้าประวัติคำสั่งซื้อแบบ Reset Stack:
  // Stack ใหม่ = [MainTabs, OrderHistory]
  // ใช้ได้ทั้งกรณีมาจาก Checkout/Success หรือจากที่อื่น ป้องกัน loop
  const handleGoToHistory = React.useCallback(() => {
    const currentOrder = orderRef.current;

    // ✅ เลือกแท็บเริ่มต้นตามสถานะคำสั่งซื้อ (ใช้ค่าล่าสุดจาก ref)
    let initialTab: string | undefined;
    const status = currentOrder?.status as string | undefined;

    switch (status) {
      // ✅ ที่ต้องชำระ: PENDING, VERIFYING
      case 'PENDING':
      case 'VERIFYING':
        initialTab = 'ที่ต้องชำระ';
        break;

      // ✅ ที่ต้องจัดส่ง: PENDING_CONFIRMATION, PROCESSING, READY_FOR_PICKUP
      case 'PENDING_CONFIRMATION':
      case 'PROCESSING':
      case 'READY_FOR_PICKUP':
        initialTab = 'ที่ต้องจัดส่ง';
        break;

      // ✅ ที่ต้องได้รับ: สถานะที่ของออกจากร้าน / กำลังไปส่ง (ถ้ามี DELIVERED ให้ถือว่าอยู่ในกลุ่มนี้)
      case 'SHIPPED':
      case 'DELIVERED':
        initialTab = 'ที่ต้องได้รับ';
        break;

      // ✅ สำเร็จ: COMPLETED จริงๆ เท่านั้น
      case 'COMPLETED':
        initialTab = 'สำเร็จ';
        break;

      // ✅ ยกเลิกแล้ว
      case 'CANCELLED':
      case 'CANCELLATION_REQUESTED':
        initialTab = 'ยกเลิกแล้ว';
        break;

      default:
        initialTab = undefined;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          {
            name: 'OrderHistory',
            params: initialTab ? { initialTab } : undefined,
          },
        ],
      }),
    );
  }, [navigation]);

  // ✅ โหลดข้อมูลคำสั่งซื้อ (Memoized เพื่อกัน useFocusEffect loop)
  const loadDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrderDetail(orderId);
      const normalized = normalizeOrder(data);
      setOrder(normalized);

      // ✅ Fix #1: ดึงข้อมูล shipment เพื่อดู proofImage และ signatureImage
      // ✅ Handle multiple response formats และ null response
      try {
        const shipmentRes = await client.get(`/shipments/orders/${orderId}/detail`);
        // ✅ Backend จะ return null ถ้ายังไม่มี shipment (ออเดอร์ยังไม่ถึงขั้นตอนจัดส่ง)
        // ✅ Unwrap response: { data: { shipment: {...} } } หรือ { data: {...} } หรือ {...} หรือ null
        const shipmentData = shipmentRes?.data?.shipment || shipmentRes?.data?.data || shipmentRes?.data || shipmentRes;
        
        // ✅ เช็คว่า shipmentData ไม่ใช่ null หรือ undefined
        if (shipmentData && shipmentData !== null && typeof shipmentData === 'object') {
          setShipment(shipmentData);
        }
        // ถ้าเป็น null ไม่ต้องทำอะไร (เป็นสถานะปกติที่ยังไม่มี shipment)
      } catch (e: any) {
        // ✅ Backend จะ return null แทน throw error แล้ว แต่ถ้ายังมี error อื่นๆ ให้ log
        if (e.response?.status !== 404 && e.response?.status !== 200) {
          console.log('Error fetching shipment:', e);
        }
        // ถ้าเป็น 404 หรือ null response ไม่ต้องแสดง error (เป็นสถานะปกติ)
      }

      // ตรวจว่าผู้ใช้เคยรีวิวสินค้าภายในออเดอร์นี้แล้วหรือยัง
      try {
        const myReviews = await getMyReviews();
        const productIdSet = new Set<number>();
        myReviews.forEach((r: any) => {
          const pid = r.product?.id ?? r.productId;
          if (typeof pid === 'number') {
            productIdSet.add(pid);
          }
        });
        const anyReviewed =
          Array.isArray(normalized.items) &&
          normalized.items.some(
            (it: any) => it.product?.id && productIdSet.has(it.product.id),
          );
        setHasReviewed(anyReviewed);
      } catch (e) {
        console.log('Error fetching my reviews for order detail:', e);
        setHasReviewed(false);
      }
    } catch (error) {
      console.error('Error loading order detail:', error);
      Alert.alert('Error', 'ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // ✅ รวม useFocusEffect: โหลดข้อมูล + ดัก hardware back ในบล็อกเดียว
  useFocusEffect(
    React.useCallback(() => {
      // โหลดข้อมูลทุกครั้งที่หน้าถูก focus
      loadDetail();

      // ดักปุ่ม Back บน Android
      // - ถ้ามาจาก flow การชำระเงิน (fromPayment) → กลับหน้า Home
      // - ถ้ามาจากที่อื่น → ไปหน้าประวัติการสั่งซื้อ
      const onBackPress = () => {
        if (fromPayment) {
          handleBackToHome();
        } else {
          handleGoToHistory();
        }
        return true; // block default behavior
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, [loadDetail, fromPayment, handleBackToHome, handleGoToHistory]),
  );

  // ✅ ใช้ utility functions สำหรับสถานะ
  const statusConfig = order ? getCustomerStatusConfig(order.status as OrderStatus, order.refundStatus) : null;
  const timelineSteps = order ? getCustomerTimeline(
    order.status as OrderStatus,
    order.createdAt,
    order.updatedAt,
  ) : [];

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'COD': return 'ชำระปลายทาง';
      case 'STRIPE': return 'บัตรเครดิต/เดบิต';
      default: return method;
    }
  };

  const handleCopyOrderId = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
    setCopyAnimated(true);
    Clipboard.setString(orderId.toString());
    setTimeout(() => setCopyAnimated(false), 1500);
  };

  const handleCancelOrder = (mode: 'instant' | 'request') => {
    const title =
      mode === 'instant' ? 'ยกเลิกคำสั่งซื้อ' : 'ขออนุมัติยกเลิกคำสั่งซื้อ';
    const message =
      mode === 'instant'
        ? 'เมื่อยกเลิกแล้ว ระบบจะคืนเงินเข้ากระเป๋าเงิน (My Wallet) โดยอัตโนมัติ และคืนสต็อกสินค้า'
        : 'ระบบจะส่งคำขอยกเลิกไปให้ร้านค้าพิจารณา หากร้านค้าอนุมัติ ระบบจะคืนเงินเข้ากระเป๋าเงิน (My Wallet) ให้คุณโดยอัตโนมัติ';

    Alert.alert(title, message, [
      { text: 'ไม่', style: 'cancel' },
      {
        text: 'ยืนยัน',
        style: 'destructive',
        onPress: async () => {
          try {
            await orderService.cancelOrder(orderId, '');
            Alert.alert('สำเร็จ', 'อัปเดตสถานะคำสั่งซื้อเรียบร้อยแล้ว', [
              {
                text: 'ตกลง',
                onPress: () => {
                  loadDetail();
                },
              },
            ]);
          } catch (error: any) {
            Alert.alert(
              'Error',
              error?.response?.data?.message || 'ไม่สามารถยกเลิกคำสั่งซื้อได้',
            );
          }
        },
      },
    ]);
  };

  const handleContactSeller = () => {
    if (!user?.id) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนติดต่อผู้ขาย');
      return;
    }
    const storeId = order?.items?.[0]?.product?.storeId;
    if (!storeId) {
      Alert.alert('แจ้งเตือน', 'ไม่พบข้อมูลร้านค้าของออเดอร์นี้');
      return;
    }
    const roomId = `chat_store_${storeId}_user_${user.id}`;
    navigation.navigate('Chat', { roomId });
  };

  const handleRequestRefund = async () => {
    if (!refundReason.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณาระบุเหตุผลการขอคืนเงิน');
      return;
    }

    try {
      setSubmittingRefund(true);
      await orderService.requestRefund(orderId, refundReason.trim());
      Alert.alert('สำเร็จ', 'ส่งคำขอคืนเงินแล้ว กรุณารอร้านค้าอนุมัติ');
      setShowRefundModal(false);
      setRefundReason('');
      loadDetail();
    } catch (error: any) {
      Alert.alert('ผิดพลาด', error.response?.data?.message || 'ส่งคำขอไม่สำเร็จ');
    } finally {
      setSubmittingRefund(false);
    }
  };

  if (loading || !order) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
  const addressInfo = parseAddress(order.shippingAddress);
  const expectedDate = getExpectedDeliveryDate(order.createdAt, order.status);

  // ✅ Smart Cancel conditions
  const canInstantCancel =
    order.status === 'PENDING' ||
    order.status === 'VERIFYING' ||
    order.status === 'PENDING_CONFIRMATION';

  const canRequestCancel =
    order.status === 'PROCESSING' || order.status === 'READY_FOR_PICKUP';

  const isCancellationRequested = order.status === 'CANCELLATION_REQUESTED';

  const isPendingPayment =
    order.status === 'PENDING' && order.paymentMethod !== 'COD';

  const isPaymentCompleted =
    order.paymentMethod !== 'COD' &&
    order.status !== 'PENDING' &&
    order.status !== 'CANCELLED';

  // ✅ Helper function to get gradient colors based on status
  const getStatusGradient = (status: string): readonly [string, string] => {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
        return ['#43A047', '#66BB6A'] as const;
      case 'OUT_FOR_DELIVERY':
      case 'PICKED_UP':
      case 'RIDER_ASSIGNED':
        return ['#FB8C00', '#FFA726'] as const;
      case 'PROCESSING':
      case 'READY_FOR_PICKUP':
        return ['#1E88E5', '#42A5F5'] as const;
      case 'PENDING':
      case 'VERIFYING':
      case 'PENDING_CONFIRMATION':
        return ['#F4511E', '#FF7043'] as const;
      case 'CANCELLED':
        return ['#757575', '#9E9E9E'] as const;
      default:
        return ['#1E88E5', '#42A5F5'] as const;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F5F7FA' }]} edges={[]}>
      {/* ✅ Custom Header with Gradient & Shadow */}
      <Animated.View style={{ opacity: headerAnim }}>
        <LinearGradient
          colors={getStatusGradient(order.status)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Subtle Overlay Pattern */}
          <View style={styles.headerOverlay} />
          
          <View style={styles.headerContent}>
            <AnimatedButton 
              onPress={handleBackToHome} 
              style={styles.backButton}
            >
              <BlurView intensity={20} tint="light" style={styles.backButtonBlur}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </BlurView>
            </AnimatedButton>
            <Text style={styles.headerTitle}>รายละเอียดคำสั่งซื้อ</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* ✅ Status Badge with Animation */}
          {statusConfig && (
            <Animated.View 
              style={[
                styles.statusBadgeContainer,
                { transform: [{ scale: statusBadgeScale }] }
              ]}
            >
              <BlurView intensity={25} tint="light" style={styles.statusBadgeBlur}>
                <View style={styles.statusBadgeInner}>
                  <View style={styles.statusIconWrapper}>
                    <Ionicons name={statusConfig.icon as any} size={28} color="#fff" />
                  </View>
                  <View style={styles.statusTextWrapper}>
                    <Text style={styles.statusBadgeTitle}>{statusConfig.label}</Text>
                    <Text style={styles.statusBadgeDesc}>{statusConfig.description}</Text>
                  </View>
                </View>
              </BlurView>
            </Animated.View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* ✅ Header Shadow */}
      <View style={styles.headerShadow} />

      <Animated.ScrollView 
        style={[styles.scrollView, { opacity: contentFadeAnim }]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ✅ Payment Section */}
        {isPendingPayment && order.paymentExpiredAt && (
          <AnimatedCard delay={0}>
            <PaymentTimer
              expiredAt={order.paymentExpiredAt}
              onExpire={async () => {
                try {
                  const updated = await orderService.getOrderDetail(orderId);
                  const normalized = normalizeOrder(updated);
                  if (normalized.status === 'CANCELLED' || normalized.orderStatus === 'CANCELLED') {
                    setOrder(normalized);
                  } else {
                    await orderService.updateOrderStatus(orderId, 'CANCELLED');
                    await loadDetail();
                  }
                } catch (e) {
                  console.error('Payment expired check failed:', e);
                  await loadDetail();
                }
              }}
            />
          </AnimatedCard>
        )}

        {/* ✅ Payment Completed Banner with Gradient */}
        {isPaymentCompleted && (
          <AnimatedCard style={styles.successCard} delay={100}>
            <LinearGradient
              colors={['#E8F5E9', '#C8E6C9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            >
              <View style={styles.bannerRow}>
                <View style={[styles.bannerIconCircle, styles.successIconCircle]}>
                  <Ionicons name="checkmark" size={22} color="#fff" />
                </View>
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerTitle}>ชำระเงินเรียบร้อยแล้ว</Text>
                  <Text style={styles.bannerSubtitle}>
                    ไม่จำเป็นต้องชำระซ้ำอีก
                  </Text>
                </View>
                <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
              </View>
            </LinearGradient>
          </AnimatedCard>
        )}

        {/* ✅ Refund Pending Banner */}
        {order.refundStatus === 'PENDING' && (
          <AnimatedCard style={styles.warningCard} delay={100}>
            <LinearGradient
              colors={['#FFF8E1', '#FFECB3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            >
              <View style={styles.bannerRow}>
                <View style={[styles.bannerIconCircle, { backgroundColor: '#FFA000' }]}>
                  <Ionicons name="wallet-outline" size={20} color="#fff" />
                </View>
                <View style={styles.bannerTextContainer}>
                  <Text style={[styles.bannerTitle, { color: '#E65100' }]}>ระบบกำลังดำเนินการคืนเงิน</Text>
                  <Text style={[styles.bannerSubtitle, { color: '#8D6E63' }]}>
                    กรุณารอเจ้าหน้าที่ดำเนินการภายใน 1-2 วัน
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </AnimatedCard>
        )}

        {/* ✅ Modern Timeline Section with Animations */}
        {timelineSteps.length > 0 && (
          <AnimatedCard delay={200}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrapper, styles.cardIconTimeline]}>
                <Ionicons name="git-branch-outline" size={18} color="#1E88E5" />
              </View>
              <Text style={styles.cardTitle}>สถานะการสั่งซื้อ</Text>
            </View>
            
            <View style={styles.modernTimeline}>
              {timelineSteps.map((step, index) => (
                <AnimatedTimelineItem
                  key={index}
                  step={step}
                  index={index}
                  isLast={index === timelineSteps.length - 1}
                  isCompleted={step.completed}
                  isInProgress={step.inProgress}
                />
              ))}
            </View>
          </AnimatedCard>
        )}

        {/* ✅ Expected Delivery Card */}
        {(order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'OUT_FOR_DELIVERY') && (
          <AnimatedCard style={styles.highlightCard} delay={300}>
            <LinearGradient
              colors={['#E3F2FD', '#BBDEFB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.deliveryGradient}
            >
              <View style={styles.deliveryEstimate}>
                <View style={styles.deliveryIconWrapper}>
                  <Ionicons name="time-outline" size={24} color="#1565C0" />
                </View>
                <View style={styles.deliveryEstimateText}>
                  <Text style={styles.deliveryEstimateLabel}>คาดว่าจะได้รับภายใน</Text>
                  <Text style={styles.deliveryEstimateDate}>{expectedDate}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64B5F6" />
              </View>
            </LinearGradient>
          </AnimatedCard>
        )}

        {/* ✅ Shipping Info Card */}
        <AnimatedCard delay={400}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
              try {
                await Haptics.selectionAsync();
              } catch (e) {}
              if (order.trackingNumber && (order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.status === 'OUT_FOR_DELIVERY')) {
                navigation.navigate('Tracking', {
                  trackingNumber: order.trackingNumber,
                  provider: order.logisticsProvider || 'ไม่ระบุ',
                  orderId: order.id,
                });
              } else {
                Alert.alert(
                  'ข้อมูลการจัดส่ง',
                  `วิธีการจัดส่ง: Express Delivery - ส่งด่วน\n\n${order.trackingNumber ? `เลขพัสดุ: ${order.trackingNumber}` : 'ยังไม่มีเลขพัสดุ (รอการจัดส่ง)'}`,
                  [{ text: 'ตกลง' }]
                );
              }
            }}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrapper, styles.cardIconShipping]}>
                <Ionicons name="car-outline" size={18} color="#1E88E5" />
              </View>
              <Text style={styles.cardTitle}>ข้อมูลการจัดส่ง</Text>
              <Ionicons name="chevron-forward" size={20} color="#90A4AE" style={{ marginLeft: 'auto' }} />
            </View>
            
            <View style={styles.shippingInfo}>
              <View style={styles.shippingMethod}>
                <View style={styles.flashBadge}>
                  <Ionicons name="flash" size={14} color="#fff" />
                </View>
                <Text style={styles.shippingMethodText}>Express Delivery - ส่งด่วน</Text>
              </View>
              
              {order.trackingNumber && (
                <View style={styles.trackingContainer}>
                  <View style={styles.trackingBadge}>
                    <Text style={styles.trackingLabel}>เลขพัสดุ</Text>
                    <View style={styles.trackingNumberRow}>
                      <Text style={styles.trackingNumber}>{order.trackingNumber}</Text>
                      <AnimatedButton
                        onPress={async () => {
                          try {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          } catch (e) {}
                          Clipboard.setString(order.trackingNumber!);
                          Alert.alert('คัดลอกแล้ว', order.trackingNumber!);
                        }}
                        style={styles.copyChip}
                      >
                        <Ionicons name={copyAnimated ? 'checkmark' : 'copy-outline'} size={14} color={copyAnimated ? '#4CAF50' : '#1E88E5'} />
                      </AnimatedButton>
                    </View>
                  </View>
                  {order.logisticsProvider && (
                    <Text style={styles.providerName}>{order.logisticsProvider}</Text>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </AnimatedCard>

        {/* ✅ Shipping Address Card */}
        <AnimatedCard delay={500}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrapper, styles.cardIconAddress]}>
              <Ionicons name="location" size={18} color="#E91E63" />
            </View>
            <Text style={styles.cardTitle}>ที่อยู่จัดส่ง</Text>
          </View>
          
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <View style={styles.personIcon}>
                <Ionicons name="person" size={16} color="#fff" />
              </View>
              <Text style={styles.addressName}>
                {addressInfo.name || 'ไม่ระบุชื่อ'}
              </Text>
              {order.shippingPhone && (
                <View style={styles.phoneBadge}>
                  <Ionicons name="call" size={12} color="#4CAF50" />
                  <Text style={styles.phoneText}>{order.shippingPhone}</Text>
                </View>
              )}
            </View>
            <Text
              style={styles.addressText}
              numberOfLines={expandedAddress ? undefined : 2}
            >
              {addressInfo.address}
            </Text>
            {addressInfo.address.length > 50 && (
              <TouchableOpacity onPress={() => setExpandedAddress(!expandedAddress)} style={styles.expandButton}>
                <Text style={styles.expandButtonText}>
                  {expandedAddress ? 'ดูน้อยลง' : 'ดูเพิ่มเติม'}
                </Text>
                <Ionicons name={expandedAddress ? 'chevron-up' : 'chevron-down'} size={16} color="#1E88E5" />
              </TouchableOpacity>
            )}
          </View>
        </AnimatedCard>

        {/* ✅ Product Details Card */}
        {order.items && order.items.length > 0 && (
          <AnimatedCard delay={600}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrapper, styles.cardIconProduct]}>
                <Ionicons name="cube" size={18} color="#FB8C00" />
              </View>
              <Text style={styles.cardTitle}>รายการสินค้า</Text>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{order.items.length} รายการ</Text>
              </View>
            </View>

            {order.items.map((item: any, index: number) => {
              const itemPrice = item.variant?.price || item.price || item.product.price || 0;
              const totalItemPrice = itemPrice * item.count;

              return (
                <TouchableOpacity 
                  key={item.id || index} 
                  style={styles.productItem}
                  activeOpacity={0.8}
                >
                  <View style={styles.productImageWrapper}>
                    <Image
                      source={{ uri: item.product.imageUrl }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.1)']}
                      style={styles.productImageOverlay}
                    />
                  </View>
                  <View style={styles.productDetails}>
                    <Text style={styles.productTitle} numberOfLines={2}>
                      {item.product.title}
                    </Text>
                    {item.variant && (
                      <View style={styles.variantBadge}>
                        <Text style={styles.variantText}>{item.variant.name}</Text>
                      </View>
                    )}
                    <View style={styles.productFooter}>
                      <View style={styles.qtyBadge}>
                        <Text style={styles.productQty}>x{item.count}</Text>
                      </View>
                      <Text style={styles.productPrice}>฿{totalItemPrice.toLocaleString()}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* ✅ Order Summary */}
            {/* ✅ Order Summary with Gradient Total */}
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>ยอดรวมสินค้า</Text>
                <Text style={styles.summaryValue}>฿{order.subtotal?.toLocaleString() || '0'}</Text>
              </View>

              {order.shippingCost > 0 && (
                <View style={styles.summaryRow}>
                  <View style={styles.summaryLabelRow}>
                    <Ionicons name="car-outline" size={14} color="#78909C" />
                    <Text style={styles.summaryLabel}>ค่าจัดส่ง</Text>
                  </View>
                  <Text style={styles.summaryValue}>฿{order.shippingCost.toLocaleString()}</Text>
                </View>
              )}

              {order.discountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <View style={styles.discountRow}>
                    <View style={styles.discountBadge}>
                      <Ionicons name="pricetag" size={12} color="#fff" />
                    </View>
                    <Text style={[styles.summaryLabel, { color: '#4CAF50' }]}>
                      ส่วนลด{order.discountCode ? ` (${order.discountCode})` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                    -฿{order.discountAmount.toLocaleString()}
                  </Text>
                </View>
              )}

              <LinearGradient
                colors={['#FFF3E0', '#FFE0B2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.totalGradient}
              >
                <Text style={styles.totalLabel}>ยอดชำระทั้งหมด</Text>
                <Text style={styles.totalValue}>฿{order.total.toLocaleString()}</Text>
              </LinearGradient>
            </View>
          </AnimatedCard>
        )}

        {/* ✅ Payment & Order Info Card */}
        <AnimatedCard delay={700}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrapper, styles.cardIconReceipt]}>
              <Ionicons name="receipt" size={18} color="#4CAF50" />
            </View>
            <Text style={styles.cardTitle}>ข้อมูลคำสั่งซื้อ</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>หมายเลขคำสั่งซื้อ</Text>
              <View style={styles.orderIdRow}>
                <Text style={styles.infoValueMono}>#{orderId}</Text>
                <AnimatedButton onPress={handleCopyOrderId} style={styles.copyIconBtn}>
                  <Ionicons 
                    name={copyAnimated ? 'checkmark-circle' : 'copy-outline'} 
                    size={18} 
                    color={copyAnimated ? '#4CAF50' : '#1E88E5'} 
                  />
                </AnimatedButton>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ช่องทางชำระเงิน</Text>
              <View style={styles.paymentMethodRow}>
                <View style={[
                  styles.paymentMethodIcon,
                  { backgroundColor: order.paymentMethod === 'COD' ? '#E8F5E9' : '#E3F2FD' }
                ]}>
                  <Ionicons 
                    name={order.paymentMethod === 'COD' ? 'cash-outline' : 'card-outline'} 
                    size={14} 
                    color={order.paymentMethod === 'COD' ? '#4CAF50' : '#1E88E5'} 
                  />
                </View>
                <Text style={styles.infoValue}>{getPaymentMethodText(order.paymentMethod || 'STRIPE')}</Text>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* ✅ Quick Actions Card */}
        <AnimatedCard delay={800}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrapper, styles.cardIconServices]}>
              <Ionicons name="apps" size={18} color="#7C4DFF" />
            </View>
            <Text style={styles.cardTitle}>บริการ</Text>
          </View>

          <View style={styles.quickActions}>
            <AnimatedButton style={styles.quickActionBtn} onPress={handleContactSeller}>
              <View style={[styles.quickActionIcon, styles.quickActionChat]}>
                <Ionicons name="chatbubble-ellipses" size={22} color="#1E88E5" />
              </View>
              <Text style={styles.quickActionText}>ติดต่อผู้ขาย</Text>
            </AnimatedButton>

            <AnimatedButton 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('HelpCenter')}
            >
              <View style={[styles.quickActionIcon, styles.quickActionHelp]}>
                <Ionicons name="help-circle" size={22} color="#FB8C00" />
              </View>
              <Text style={styles.quickActionText}>ช่วยเหลือ</Text>
            </AnimatedButton>

            {order.trackingNumber && (
              <AnimatedButton 
                style={styles.quickActionBtn}
                onPress={() => navigation.navigate('Tracking', {
                  trackingNumber: order.trackingNumber!,
                  provider: order.logisticsProvider || 'ไม่ระบุ',
                  orderId: order.id,
                })}
              >
                <View style={[styles.quickActionIcon, styles.quickActionTrack]}>
                  <Ionicons name="location" size={22} color="#4CAF50" />
                </View>
                <Text style={styles.quickActionText}>ติดตามพัสดุ</Text>
              </AnimatedButton>
            )}
          </View>
        </AnimatedCard>

        {/* ✅ Proof of Delivery Section with Zoom Animation */}
        {order.status === 'DELIVERED' && shipment && (shipment.proofImage || shipment.signatureImage) && (
          <AnimatedCard delay={900}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrapper, styles.cardIconProof]}>
                <Ionicons name="camera" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.cardTitle}>หลักฐานการจัดส่ง</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
                <Text style={styles.verifiedText}>ยืนยันแล้ว</Text>
              </View>
            </View>

            {shipment.proofImage && (
              <AnimatedButton
                style={styles.proofImageWrapper}
                onPress={() => {
                  Animated.sequence([
                    Animated.timing(proofImageScale, {
                      toValue: 1.05,
                      duration: 100,
                      useNativeDriver: true,
                    }),
                    Animated.timing(proofImageScale, {
                      toValue: 1,
                      duration: 100,
                      useNativeDriver: true,
                    }),
                  ]).start(() => setShowProofModal(true));
                }}
              >
                <Animated.View style={{ transform: [{ scale: proofImageScale }] }}>
                  <Image
                    source={{ uri: shipment.proofImage }}
                    style={styles.proofImageModern}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.proofImageGradient}
                  >
                    <View style={styles.proofExpandBtn}>
                      <Ionicons name="expand" size={18} color="#fff" />
                    </View>
                    <Text style={styles.proofExpandText}>แตะเพื่อดูรูปเต็ม</Text>
                  </LinearGradient>
                </Animated.View>
              </AnimatedButton>
            )}

            {shipment.signatureImage && (
              <View style={styles.signatureSection}>
                <View style={styles.signatureHeader}>
                  <Ionicons name="create-outline" size={16} color="#78909C" />
                  <Text style={styles.signatureTitle}>ลายเซ็นผู้รับ</Text>
                </View>
                <View style={styles.signatureBox}>
                  <Image
                    source={{ uri: shipment.signatureImage }}
                    style={styles.signatureImageModern}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}

            {shipment.deliveredTime && (
              <View style={styles.deliveryTimeRow}>
                <View style={styles.deliveryTimeIcon}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
                <Text style={styles.deliveryTimeText}>
                  จัดส่งเมื่อ {new Date(shipment.deliveredTime).toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
          </AnimatedCard>
        )}

        {/* ✅ Refund Section */}
        {(order.status === 'DELIVERED' && order.refundStatus === 'NONE') || 
         (order.refundStatus && order.refundStatus !== 'NONE') ? (
          <AnimatedCard delay={1000}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrapper, styles.cardIconRefund]}>
                <Ionicons name="swap-horizontal" size={18} color="#E53935" />
              </View>
              <Text style={styles.cardTitle}>คืนเงิน / คืนสินค้า</Text>
            </View>

            {order.status === 'DELIVERED' && order.refundStatus === 'NONE' && (
              <AnimatedButton
                style={styles.refundActionBtn}
                onPress={() => setShowRefundModal(true)}
              >
                <View style={styles.refundIconWrapper}>
                  <Ionicons name="return-up-back" size={18} color="#fff" />
                </View>
                <Text style={styles.refundActionText}>ขอคืนเงิน / คืนสินค้า</Text>
                <Ionicons name="chevron-forward" size={20} color="#FFCDD2" />
              </AnimatedButton>
            )}

            {order.refundStatus && order.refundStatus !== 'NONE' && (
              <View style={[
                styles.refundStatusCard,
                order.refundStatus === 'APPROVED' && styles.refundApproved,
                order.refundStatus === 'REJECTED' && styles.refundRejected,
                order.refundStatus === 'REQUESTED' && styles.refundPending,
              ]}>
                <View style={[
                  styles.refundStatusIconWrapper,
                  { backgroundColor: order.refundStatus === 'APPROVED' ? '#E8F5E9' : 
                    order.refundStatus === 'REJECTED' ? '#FFEBEE' : '#FFF3E0' }
                ]}>
                  <Ionicons
                    name={
                      order.refundStatus === 'APPROVED' ? 'checkmark-circle' :
                      order.refundStatus === 'REJECTED' ? 'close-circle' : 'time'
                    }
                    size={24}
                    color={
                      order.refundStatus === 'APPROVED' ? '#4CAF50' :
                      order.refundStatus === 'REJECTED' ? '#F44336' : '#FF9800'
                    }
                  />
                </View>
                <View style={styles.refundStatusContent}>
                  <Text style={styles.refundStatusTitle}>
                    {order.refundStatus === 'REQUESTED' ? 'รอตรวจสอบ' :
                     order.refundStatus === 'APPROVED' ? 'อนุมัติคืนเงินแล้ว' : 'ปฏิเสธคำขอ'}
                  </Text>
                  {order.refundReason && (
                    <Text style={styles.refundReasonText}>"{order.refundReason}"</Text>
                  )}
                </View>
              </View>
            )}
          </AnimatedCard>
        ) : null}

        <View style={{ height: 140 }} />
      </Animated.ScrollView>

      {/* ✅ Modern Bottom Action Buttons with Blur */}
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="light" style={styles.bottomActionsBlur}>
        <View style={styles.bottomActionsModern}>
          {/* ✅ ปุ่มยืนยันรับสินค้า */}
          {order.status === 'DELIVERED' && (
            <AnimatedButton
              style={styles.primaryActionBtn}
              onPress={async () => {
                try {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch (e) {}
                Alert.alert(
                  'ยืนยันการรับสินค้า',
                  'กรุณาตรวจสอบสินค้าก่อนกดยืนยัน เมื่อยืนยันแล้วจะไม่สามารถขอคืนเงิน/คืนสินค้าได้',
                  [
                    { text: 'ยกเลิก', style: 'cancel' },
                    {
                      text: 'ยืนยัน',
                      onPress: async () => {
                        try {
                          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          await orderService.completeOrder(orderId);
                          setShowSuccessModal(true);
                          confettiRef.current?.start();
                        } catch (error: any) {
                          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                          Alert.alert(
                            'ผิดพลาด',
                            error?.response?.data?.message || 'ไม่สามารถยืนยันการรับสินค้าได้',
                          );
                        }
                      },
                    },
                  ],
                );
              }}
            >
              <LinearGradient
                colors={['#FB8C00', '#E65100']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBtn}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>ฉันได้รับสินค้าแล้ว</Text>
              </LinearGradient>
            </AnimatedButton>
          )}

          {/* ปุ่มรีวิวสินค้า */}
          {order.status === 'DELIVERED' && !hasReviewed && (
            <AnimatedButton
              style={styles.outlineBtn}
              onPress={() => navigation.navigate('WriteReview', { orderId, items: order.items })}
            >
              <View style={styles.outlineBtnContent}>
                <Ionicons name="star" size={18} color="#FB8C00" />
                <Text style={styles.outlineBtnText}>ให้คะแนนสินค้า</Text>
              </View>
            </AnimatedButton>
          )}

          {/* ปุ่มขอคืนสินค้า */}
          {canRequestReturn(order) && (
            <AnimatedButton
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('OrderReturnRequest', { orderId, order })}
            >
              <Text style={styles.secondaryBtnText}>ขอคืนสินค้า</Text>
            </AnimatedButton>
          )}

          {/* ปุ่มยกเลิก */}
          {canInstantCancel && (
            <AnimatedButton
              style={styles.secondaryBtn}
              onPress={() => handleCancelOrder('instant')}
            >
              <Text style={styles.secondaryBtnText}>ยกเลิกคำสั่งซื้อ</Text>
            </AnimatedButton>
          )}

          {canRequestCancel && (
            <AnimatedButton
              style={styles.secondaryBtn}
              onPress={() => handleCancelOrder('request')}
            >
              <Text style={styles.secondaryBtnText}>ขออนุมัติยกเลิก</Text>
            </AnimatedButton>
          )}

          {isCancellationRequested && (
            <View style={[styles.secondaryBtn, styles.pendingBtn]}>
              <Ionicons name="time-outline" size={18} color="#E65100" />
              <Text style={[styles.secondaryBtnText, { color: '#E65100' }]}>
                รอร้านค้าอนุมัติการยกเลิก
              </Text>
            </View>
          )}

          {/* ปุ่มติดต่อผู้ขาย */}
          <AnimatedButton style={styles.contactBtnModern} onPress={handleContactSeller}>
            <View style={styles.contactBtnContent}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#1E88E5" />
              <Text style={styles.contactBtnText}>ติดต่อผู้ขาย</Text>
            </View>
          </AnimatedButton>
        </View>
      </BlurView>

      {/* Refund Modal */}
      <Modal
        visible={showRefundModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRefundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>ระบุเหตุผลการขอคืน</Text>
            <TextInput
              style={[styles.reasonInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="เช่น สินค้าชำรุด, ได้รับของผิด, สีเพี้ยน"
              placeholderTextColor={colors.subText}
              value={refundReason}
              onChangeText={setRefundReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setShowRefundModal(false);
                  setRefundReason('');
                }}
                style={[styles.modalBtn, styles.cancelModalBtn]}
              >
                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRequestRefund}
                style={[styles.modalBtn, styles.submitModalBtn, { backgroundColor: colors.primary }]}
                disabled={submittingRefund}
              >
                {submittingRefund ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>ส่งคำขอ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ Proof of Delivery Modal */}
      <Modal
        visible={showProofModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProofModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.proofModalContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.closeProofModalBtn}
              onPress={() => setShowProofModal(false)}
            >
              <Ionicons name="close-circle" size={30} color={colors.text} />
            </TouchableOpacity>
            {shipment?.proofImage && (
              <Image
                source={{ uri: shipment.proofImage }}
                style={styles.proofModalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Success Modal with Confetti */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={{ 
              width: 80, 
              height: 80, 
              borderRadius: 40, 
              backgroundColor: '#E8F5E9', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>สำเร็จ!</Text>
            <Text style={styles.successSub}>
              คุณได้รับสินค้าเรียบร้อยแล้ว
            </Text>
            <Text style={styles.coinText}>+50 Coins</Text>

            <TouchableOpacity
              style={styles.closeSuccessBtn}
              onPress={() => {
                setShowSuccessModal(false);
                loadDetail();
              }}
            >
              <Text style={styles.closeSuccessText}>ตกลง</Text>
            </TouchableOpacity>
          </View>

          {/* พลุแตก! */}
          <ConfettiCannon
            count={200}
            origin={{ x: -10, y: 0 }}
            autoStart={false}
            fadeOut
            ref={confettiRef}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ✅ Header Gradient Styles
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 24,
    paddingHorizontal: 18,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    zIndex: 1,
  },
  backButton: {
    overflow: 'hidden',
    borderRadius: 22,
  },
  backButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statusBadgeContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 1,
  },
  statusBadgeBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statusBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  statusIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  statusTextWrapper: {
    flex: 1,
  },
  statusBadgeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statusBadgeDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 18,
  },
  headerShadow: {
    height: 6,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  // ✅ Scroll & Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  // ✅ Modern Card Base with Enhanced Shadow
  modernCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  successCard: {
    padding: 0,
    overflow: 'hidden',
  },
  warningCard: {
    padding: 0,
    overflow: 'hidden',
  },
  highlightCard: {
    padding: 0,
    overflow: 'hidden',
  },

  // ✅ Banner Styles
  bannerGradient: {
    padding: 16,
    borderRadius: 16,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  successIconCircle: {
    backgroundColor: '#4CAF50',
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 3,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#558B2F',
  },

  // ✅ Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardIconTimeline: {
    backgroundColor: '#E3F2FD',
  },
  cardIconShipping: {
    backgroundColor: '#E3F2FD',
  },
  cardIconAddress: {
    backgroundColor: '#FCE4EC',
  },
  cardIconProduct: {
    backgroundColor: '#FFF3E0',
  },
  cardIconReceipt: {
    backgroundColor: '#E8F5E9',
  },
  cardIconServices: {
    backgroundColor: '#EDE7F6',
  },
  cardIconProof: {
    backgroundColor: '#E8F5E9',
  },
  cardIconRefund: {
    backgroundColor: '#FFEBEE',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#263238',
    flex: 1,
  },

  // ✅ Modern Timeline with Glow
  modernTimeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    left: 10,
    top: 24,
    width: 2,
    height: 32,
    backgroundColor: '#E0E0E0',
    borderRadius: 1,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    zIndex: 1,
  },
  timelineDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineDotProgress: {
    backgroundColor: '#FB8C00',
  },
  timelineDotGlow: {
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  timelinePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#90A4AE',
    marginBottom: 3,
  },
  timelineLabelCompleted: {
    color: '#37474F',
    fontWeight: '600',
  },
  timelineLabelProgress: {
    color: '#E65100',
    fontWeight: '700',
  },
  timelineTime: {
    fontSize: 12,
    color: '#B0BEC5',
  },

  // ✅ Delivery Estimate
  deliveryGradient: {
    padding: 16,
    borderRadius: 16,
  },
  deliveryEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryEstimateText: {
    flex: 1,
    marginLeft: 14,
  },
  deliveryEstimateLabel: {
    fontSize: 12,
    color: '#546E7A',
    marginBottom: 2,
  },
  deliveryEstimateDate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1565C0',
  },

  // ✅ Shipping Info Styles
  shippingInfo: {
    marginTop: 4,
  },
  shippingMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  flashBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FB8C00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shippingMethodText: {
    fontSize: 14,
    color: '#37474F',
    marginLeft: 10,
    fontWeight: '600',
  },
  trackingContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    padding: 14,
  },
  trackingBadge: {
    marginBottom: 4,
  },
  trackingLabel: {
    fontSize: 11,
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    fontWeight: '600',
  },
  trackingNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1565C0',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyChip: {
    marginLeft: 10,
    padding: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  providerName: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 6,
  },

  // ✅ Address Card Styles
  addressCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  personIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#78909C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#263238',
    marginLeft: 10,
    flex: 1,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  phoneText: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 4,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 22,
    marginLeft: 38,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginLeft: 38,
  },
  expandButtonText: {
    fontSize: 13,
    color: '#1E88E5',
    fontWeight: '600',
    marginRight: 4,
  },

  // ✅ Product Item Styles
  itemCountBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  itemCountText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '700',
  },
  productItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productImageWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  productImage: {
    width: 76,
    height: 76,
    borderRadius: 14,
  },
  productImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  productDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
    lineHeight: 20,
  },
  variantBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECEFF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  variantText: {
    fontSize: 11,
    color: '#546E7A',
    fontWeight: '500',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  qtyBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  productQty: {
    fontSize: 13,
    color: '#78909C',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#263238',
  },

  // ✅ Summary Section
  summarySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#78909C',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E65100',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#E65100',
  },

  // ✅ Order Info Styles
  infoGrid: {
    gap: 14,
  },
  infoItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
  },
  infoLabel: {
    fontSize: 11,
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#263238',
  },
  infoValueMono: {
    fontSize: 16,
    fontWeight: '700',
    color: '#263238',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyIconBtn: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentMethodIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ✅ Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionBtn: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionChat: {
    backgroundColor: '#E3F2FD',
  },
  quickActionHelp: {
    backgroundColor: '#FFF3E0',
  },
  quickActionTrack: {
    backgroundColor: '#E8F5E9',
  },
  quickActionText: {
    fontSize: 12,
    color: '#546E7A',
    fontWeight: '600',
  },

  // ✅ Proof Section Styles
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 'auto',
  },
  verifiedText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '700',
    marginLeft: 4,
  },
  proofImageWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  proofImageModern: {
    width: '100%',
    height: '100%',
  },
  proofImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  proofExpandBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofExpandText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  signatureSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  signatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  signatureTitle: {
    fontSize: 13,
    color: '#78909C',
    fontWeight: '600',
  },
  signatureBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  signatureImageModern: {
    width: '100%',
    height: 90,
  },
  deliveryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryTimeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryTimeText: {
    fontSize: 13,
    color: '#546E7A',
    fontWeight: '500',
  },

  // ✅ Refund Section
  refundActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  refundIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundActionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#C62828',
  },
  refundStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
  },
  refundApproved: {
    backgroundColor: '#E8F5E9',
  },
  refundRejected: {
    backgroundColor: '#FFEBEE',
  },
  refundPending: {
    backgroundColor: '#FFF3E0',
  },
  refundStatusIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundStatusContent: {
    flex: 1,
  },
  refundStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#263238',
    marginBottom: 3,
  },
  refundReasonText: {
    fontSize: 13,
    color: '#78909C',
    fontStyle: 'italic',
  },

  // ✅ Bottom Actions with Blur
  bottomActionsBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  bottomActionsModern: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryActionBtn: {
    flex: 2,
    minWidth: '60%',
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#E65100',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  outlineBtn: {
    flex: 1,
  },
  outlineBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FB8C00',
    gap: 8,
    backgroundColor: '#FFF8F0',
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546E7A',
  },
  pendingBtn: {
    backgroundColor: '#FFF3E0',
    flexDirection: 'row',
    gap: 8,
  },
  contactBtnModern: {
    flex: 1,
  },
  contactBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
    gap: 8,
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1565C0',
  },

  // ✅ Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#263238',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
    backgroundColor: '#F5F7FA',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalBtn: {
    backgroundColor: '#ECEFF1',
  },
  cancelBtnText: {
    color: '#546E7A',
    fontWeight: '600',
    fontSize: 15,
  },
  submitModalBtn: {
    backgroundColor: '#E53935',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // ✅ Success Modal
  successModalCard: {
    width: 300,
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#263238',
  },
  successSub: {
    marginTop: 8,
    textAlign: 'center',
    color: '#78909C',
    fontSize: 14,
  },
  coinText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFC107',
    marginTop: 12,
    marginBottom: 24,
  },
  closeSuccessBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 30,
  },
  closeSuccessText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // ✅ Proof Modal
  proofModalContent: {
    width: '95%',
    maxHeight: '90%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  closeProofModalBtn: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  proofModalImage: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: 12,
  },
});
