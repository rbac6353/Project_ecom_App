/**
 * Utility functions สำหรับจัดการสถานะออเดอร์
 * รองรับทั้ง 3 ฝั่ง: ลูกค้า, ร้านค้า, ไรเดอร์
 */

export type OrderStatus =
  | 'PENDING'              // 1. รอชำระเงิน
  | 'VERIFYING'            // 2. รอตรวจสอบสลิป
  | 'PENDING_CONFIRMATION' // 3. รอร้านค้ายืนยันรับออเดอร์ (ใหม่!)
  | 'PROCESSING'           // 4. กำลังเตรียมสินค้า
  | 'READY_FOR_PICKUP'     // 5. พร้อมจัดส่ง (กำลังหาไรเดอร์)
  | 'RIDER_ASSIGNED'       // 6. มีไรเดอร์รับงาน (กำลังไปรับ)
  | 'PICKED_UP'            // 7. ไรเดอร์รับสินค้าแล้ว
  | 'OUT_FOR_DELIVERY'     // 8. กำลังจัดส่ง
  | 'DELIVERED'            // 9. ส่งถึงแล้ว (รอยืนยัน)
  | 'COMPLETED'            // 10. สำเร็จสมบูรณ์
  | 'CANCELLED'            // 11. ยกเลิก
  | 'DELIVERY_FAILED'      // 12. ส่งไม่สำเร็จ
  | 'REFUND_REQUESTED'     // 13. ขอคืนสินค้า
  | 'REFUND_APPROVED'      // 14. อนุมัติคืนแล้ว (รอส่งคืน)
  | 'REFUNDED';            // 15. คืนเงินเรียบร้อย

export type UserRole = 'CUSTOMER' | 'STORE' | 'COURIER';

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
  timelineText: string;
}

// ✅ ฝั่งลูกค้า
export const getCustomerStatusConfig = (status: OrderStatus, refundStatus?: string): StatusConfig => {
  const configs: Record<OrderStatus, StatusConfig> = {
    PENDING: {
      label: 'รอการชำระเงิน',
      color: '#FF9800',
      bgColor: '#FFF3E0',
      icon: 'time-outline',
      description: 'รอการชำระเงิน',
      timelineText: 'สั่งซื้อสำเร็จ',
    },
    VERIFYING: {
      label: 'รอตรวจสอบการชำระเงิน',
      color: '#FF9800',
      bgColor: '#FFF3E0',
      icon: 'document-text-outline',
      description: 'ชำระเงินเรียบร้อยแล้ว รอร้านค้ายอมรับออเดอร์',
      timelineText: 'ชำระเงินเรียบร้อย',
    },
    PENDING_CONFIRMATION: {
      label: 'รอร้านค้ายืนยัน',
      color: '#FF9800',
      bgColor: '#FFF3E0',
      icon: 'time-outline',
      // ✅ ลูกค้าชำระเงินแล้ว แต่ร้านค้ายังไม่ได้ยอมรับออเดอร์
      description: 'ชำระเงินเรียบร้อยแล้ว รอร้านค้ายืนยันรับออเดอร์ (ภายใน 24 ชั่วโมง)',
      timelineText: 'รอร้านค้ายืนยัน',
    },
    PROCESSING: {
      label: 'กำลังเตรียมสินค้า',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'cube-outline',
      description: 'ร้านค้ายืนยันรับออเดอร์แล้ว กำลังเตรียมสินค้า',
      timelineText: 'ร้านค้ากำลังเตรียมสินค้า',
    },
    READY_FOR_PICKUP: {
      label: 'สินค้าพร้อมจัดส่ง',
      color: '#2196F3',
      bgColor: '#E3F2FD',
      icon: 'cube-outline',
      description: 'สินค้าพร้อมจัดส่ง กำลังหาไรเดอร์',
      timelineText: 'สินค้าพร้อมแล้ว กำลังหาไรเดอร์',
    },
    RIDER_ASSIGNED: {
      label: 'ที่ต้องได้รับ',
      color: '#FF9800',
      bgColor: '#FFF3E0',
      icon: 'car-outline',
      description: 'มีไรเดอร์รับงานแล้ว กำลังไปรับสินค้า',
      timelineText: 'ไรเดอร์กำลังไปรับสินค้า',
    },
    PICKED_UP: {
      label: 'ที่ต้องได้รับ',
      color: '#FF9800',
      bgColor: '#FFF3E0',
      icon: 'checkmark-circle-outline',
      description: 'ไรเดอร์รับสินค้าจากร้านแล้ว',
      timelineText: 'ไรเดอร์รับสินค้าแล้ว',
    },
    OUT_FOR_DELIVERY: {
      label: 'ที่ต้องได้รับ - กำลังจัดส่ง',
      color: '#FF9800',
      bgColor: '#FFF3E0',
      icon: 'car-sport-outline',
      description: 'พัสดุกำลังเดินทางมาหาคุณ!',
      timelineText: 'กำลังจัดส่งถึงคุณ',
    },
    DELIVERED: {
      label: 'ที่ต้องได้รับ - ได้รับแล้ว',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'checkmark-circle-outline',
      description: 'พัสดุส่งถึงแล้ว กรุณายืนยันรับสินค้า',
      timelineText: 'จัดส่งเรียบร้อย',
    },
    COMPLETED: {
      label: 'สำเร็จ',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'checkmark-done-circle',
      description: 'ออเดอร์เสร็จสมบูรณ์',
      timelineText: 'ยืนยันรับสินค้า',
    },
    CANCELLED: {
      label: 'ยกเลิกแล้ว',
      color: '#9E9E9E',
      bgColor: '#F5F5F5',
      icon: 'close-circle-outline',
      description: 'ออเดอร์ถูกยกเลิก',
      timelineText: 'ยกเลิกออเดอร์',
    },
    DELIVERY_FAILED: {
      label: 'ส่งไม่สำเร็จ',
      color: '#F44336',
      bgColor: '#FFEBEE',
      icon: 'close-circle-outline',
      description: 'ส่งไม่สำเร็จ กรุณานัดส่งใหม่',
      timelineText: 'ส่งไม่สำเร็จ',
    },
    REFUND_REQUESTED: {
      label: 'ขอคืนสินค้า/คืนเงิน',
      color: '#FF5722',
      bgColor: '#FFEBEE',
      icon: 'return-up-back-outline',
      description: 'มีการขอคืนสินค้า/คืนเงิน',
      timelineText: 'ขอคืนสินค้า/คืนเงิน',
    },
    REFUND_APPROVED: {
      label: 'อนุมัติคืนแล้ว',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'checkmark-circle-outline',
      description: 'ร้านอนุมัติคืนแล้ว รอส่งของคืน',
      timelineText: 'อนุมัติคืนแล้ว',
    },
    REFUNDED: {
      label: 'คืนเงินเรียบร้อย',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'checkmark-done-circle',
      description: 'คืนเงินเรียบร้อยแล้ว',
      timelineText: 'คืนเงินเรียบร้อย',
    },
  };

  return configs[status] || configs.PENDING;
};

// ✅ ฝั่งร้านค้า
export const getStoreStatusConfig = (status: OrderStatus, refundStatus?: string): StatusConfig => {
  const configs: Record<OrderStatus, StatusConfig> = {
    PENDING: {
      label: 'รอลูกค้าชำระเงิน',
      color: '#FFC107',
      bgColor: '#FFF9C4',
      icon: 'time-outline',
      description: 'รอลูกค้าชำระเงิน',
      timelineText: 'รอลูกค้าชำระเงิน',
    },
    VERIFYING: {
      label: 'รอตรวจสอบสลิป',
      color: '#FF9800',
      bgColor: '#FFE0B2',
      icon: 'document-text-outline',
      description: 'ลูกค้าชำระเงินแล้ว กรุณาตรวจสอบสลิป',
      timelineText: 'ลูกค้าชำระเงินแล้ว',
    },
    PENDING_CONFIRMATION: {
      label: 'รอยืนยัน - ใหม่!',
      color: '#F44336',
      bgColor: '#FFEBEE',
      icon: 'notifications-outline',
      description: '🎉 มีออเดอร์ใหม่! กรุณายืนยันรับออเดอร์',
      timelineText: 'รอยืนยันรับออเดอร์',
    },
    PROCESSING: {
      label: 'ที่ต้องจัดส่ง - ใหม่!',
      color: '#F44336',
      bgColor: '#FFEBEE',
      icon: 'cube-outline',
      // ✅ เน้นว่าขั้นนี้คือ "เตรียมสินค้า" ก่อน พร้อมสำหรับการจัดส่ง
      description: '🎉 ลูกค้าชำระเงินแล้ว กรุณาเตรียมสินค้าเพื่อติดตามการจัดส่ง',
      timelineText: 'ยืนยันออเดอร์แล้ว',
    },
    READY_FOR_PICKUP: {
      label: 'สินค้าพร้อมแล้ว',
      color: '#2196F3',
      bgColor: '#E3F2FD',
      icon: 'cube-outline',
      description: 'สินค้าพร้อมแล้ว กำลังหาไรเดอร์',
      timelineText: 'สินค้าพร้อมแล้ว',
    },
    RIDER_ASSIGNED: {
      label: 'มีไรเดอร์รับงานแล้ว',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'person-outline',
      description: 'ไรเดอร์กำลังมา กรุณาเตรียมพัสดุ',
      timelineText: 'ไรเดอร์กำลังมาที่ร้าน',
    },
    PICKED_UP: {
      label: 'ไรเดอร์รับสินค้าแล้ว',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'checkmark-circle-outline',
      description: 'ไรเดอร์รับสินค้าแล้ว กำลังจัดส่ง',
      timelineText: 'ไรเดอร์รับสินค้าแล้ว',
    },
    OUT_FOR_DELIVERY: {
      label: 'กำลังจัดส่ง',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'car-sport-outline',
      description: 'ไรเดอร์กำลังนำส่งพัสดุให้ลูกค้า',
      timelineText: 'กำลังจัดส่ง',
    },
    DELIVERED: {
      label: 'รอยืนยันการรับสินค้า',
      color: '#FFC107',
      bgColor: '#FFF9C4',
      icon: 'checkmark-circle-outline',
      description: 'พัสดุจัดส่งถึงลูกค้าเรียบร้อย รอลูกค้ายืนยัน',
      timelineText: 'ส่งถึงลูกค้าแล้ว',
    },
    COMPLETED: {
      label: 'สำเร็จ',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'checkmark-done-circle',
      description: '🎉 ลูกค้ายืนยันรับสินค้าเรียบร้อย',
      timelineText: 'ลูกค้ายืนยันรับสินค้า',
    },
    CANCELLED: {
      label: 'ยกเลิกแล้ว',
      color: '#9E9E9E',
      bgColor: '#F5F5F5',
      icon: 'close-circle-outline',
      description: 'ออเดอร์ถูกยกเลิก',
      timelineText: 'ยกเลิกออเดอร์',
    },
    DELIVERY_FAILED: {
      label: 'ส่งไม่สำเร็จ',
      color: '#F44336',
      bgColor: '#FFEBEE',
      icon: 'close-circle-outline',
      description: 'ส่งไม่สำเร็จ รอลูกค้านัดส่งใหม่',
      timelineText: 'ส่งไม่สำเร็จ',
    },
    REFUND_REQUESTED: {
      label: 'ขอคืนสินค้า/คืนเงิน',
      color: '#FF5722',
      bgColor: '#FFEBEE',
      icon: 'return-up-back-outline',
      description: 'ลูกค้าขอคืนสินค้า/คืนเงิน',
      timelineText: 'ลูกค้าขอคืนสินค้า',
    },
    REFUND_APPROVED: {
      label: 'อนุมัติคืนแล้ว',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'checkmark-circle-outline',
      description: 'อนุมัติคืนแล้ว รอลูกค้าส่งของคืน',
      timelineText: 'อนุมัติคืนแล้ว',
    },
    REFUNDED: {
      label: 'คืนเงินเรียบร้อย',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'checkmark-done-circle',
      description: 'คืนเงินเรียบร้อยแล้ว',
      timelineText: 'คืนเงินเรียบร้อย',
    },
  };

  return configs[status] || configs.PENDING;
};

// ✅ ฝั่งไรเดอร์
export const getCourierStatusConfig = (status: string, shipmentStatus?: string): StatusConfig => {
  // สำหรับไรเดอร์ ใช้ shipment status เป็นหลัก
  if (shipmentStatus === 'WAITING_PICKUP') {
    return {
      label: 'งานใหม่พร้อมรับ!',
      color: '#2196F3',
      bgColor: '#E3F2FD',
      icon: 'notifications-outline',
      description: 'งานส่งของใหม่',
      timelineText: 'งานใหม่',
    };
  }

  // ✅ สถานะใหม่: RIDER_ASSIGNED - ไรเดอร์รับงานแล้ว กำลังไปรับ
  if (status === 'RIDER_ASSIGNED' || (shipmentStatus === 'IN_TRANSIT' && status !== 'PICKED_UP')) {
    return {
      label: 'งานที่รับแล้ว - กำลังไปรับสินค้า',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'car-outline',
      description: 'กำลังเดินทางไปรับพัสดุ',
      timelineText: 'กำลังไปรับสินค้า',
    };
  }

  // ✅ สถานะใหม่: PICKED_UP - ไรเดอร์รับสินค้าแล้ว
  if (status === 'PICKED_UP' || shipmentStatus === 'PICKED_UP') {
    return {
      label: 'รับสินค้าเรียบร้อย - เริ่มเดินทางไปส่ง',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'checkmark-circle-outline',
      description: 'รับสินค้าเรียบร้อย เริ่มเดินทางไปส่ง',
      timelineText: 'รับสินค้าเรียบร้อย',
    };
  }

  if (shipmentStatus === 'OUT_FOR_DELIVERY' || status === 'OUT_FOR_DELIVERY') {
    return {
      label: 'งานกำลังดำเนินการ - กำลังส่งของ',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'car-sport-outline',
      description: 'กำลังเดินทางไปส่งพัสดุ',
      timelineText: 'กำลังส่งของ',
    };
  }

  if (status === 'DELIVERED') {
    return {
      label: 'งานเสร็จสมบูรณ์ - รอลูกค้ายืนยัน',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'checkmark-circle-outline',
      description: 'ส่งมอบสำเร็จ',
      timelineText: 'ส่งมอบสำเร็จ',
    };
  }

  if (status === 'COMPLETED') {
    return {
      label: 'งานสำเร็จ',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: 'checkmark-done-circle',
      description: '🎉 ลูกค้ายืนยันรับสินค้าแล้ว',
      timelineText: 'ลูกค้ายืนยันแล้ว',
    };
  }

  // ✅ สถานะใหม่: DELIVERY_FAILED - ส่งไม่สำเร็จ
  if (status === 'DELIVERY_FAILED' || shipmentStatus === 'FAILED') {
    return {
      label: 'ส่งไม่สำเร็จ',
      color: '#F44336',
      bgColor: '#FFEBEE',
      icon: 'close-circle-outline',
      description: 'ส่งไม่สำเร็จ เลือกวิธีจัดการ',
      timelineText: 'ส่งไม่สำเร็จ',
    };
  }

  // ✅ สถานะใหม่: READY_FOR_PICKUP - งานใหม่พร้อมรับ
  if (status === 'READY_FOR_PICKUP') {
    return {
      label: 'งานใหม่พร้อมรับ!',
      color: '#2196F3',
      bgColor: '#E3F2FD',
      icon: 'notifications-outline',
      description: 'งานส่งของใหม่',
      timelineText: 'งานใหม่',
    };
  }

  return {
    label: 'งานใหม่',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    icon: 'notifications-outline',
    description: 'งานใหม่',
    timelineText: 'งานใหม่',
  };
};

// ✅ Timeline steps สำหรับแต่ละสถานะ
export interface TimelineStep {
  status: OrderStatus | string;
  label: string;
  completed: boolean;
  inProgress: boolean;
  timestamp?: string;
}

// ✅ Helper function เพื่อหา timestamp จาก tracking history
type TrackingItem = { status: string; createdAt?: string; timestamp?: string };

const getTimestampFromTracking = (trackingHistory: TrackingItem[], status: string): string | undefined => {
  if (!trackingHistory || trackingHistory.length === 0) return undefined;

  // Map tracking status กับ order status
  const statusMap: Record<string, string[]> = {
    'VERIFYING': ['PAYMENT_VERIFIED'],
    'PENDING_CONFIRMATION': ['PENDING_CONFIRMATION'],
    'PROCESSING': ['PREPARING', 'ORDER_ACCEPTED'],
    'READY_FOR_PICKUP': ['SEARCHING_COURIER', 'READY_FOR_PICKUP'],
    'RIDER_ASSIGNED': ['COURIER_ASSIGNED'],
    'PICKED_UP': ['PICKED_UP'],
    'OUT_FOR_DELIVERY': ['OUT_FOR_DELIVERY'],
    'DELIVERED': ['DELIVERED'],
  };

  const matchingStatuses = statusMap[status] || [];
  const tracking = trackingHistory.find(t => matchingStatuses.includes(t.status));
  return tracking?.createdAt || tracking?.timestamp;
};

export const getCustomerTimeline = (
  orderStatus: OrderStatus,
  createdAt: string,
  updatedAt?: string,
  trackingHistory: TrackingItem[] = [],
): TimelineStep[] => {
  const steps: TimelineStep[] = [
    {
      status: 'PENDING',
      label: 'สั่งซื้อสำเร็จ',
      completed: true,
      inProgress: false,
      timestamp: createdAt,
    },
  ];

  // ✅ Step: ชำระเงินเรียบร้อย
  const activeStatuses = ['VERIFYING', 'PENDING_CONFIRMATION', 'PROCESSING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'];
  if (orderStatus !== 'PENDING' && orderStatus !== 'CANCELLED' && !orderStatus.includes('REFUND') && orderStatus !== 'DELIVERY_FAILED') {
    steps.push({
      status: 'VERIFYING',
      label: 'ชำระเงินเรียบร้อย',
      completed: activeStatuses.includes(orderStatus),
      inProgress: orderStatus === 'VERIFYING',
      timestamp: getTimestampFromTracking(trackingHistory || [], 'VERIFYING') || updatedAt,
    });
  }

  // ✅ Step: รอร้านค้ายืนยัน (PENDING_CONFIRMATION)
  if (['VERIFYING', 'PENDING_CONFIRMATION', 'PROCESSING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(orderStatus)) {
    // ✅ ตรวจสอบว่าร้านยืนยันรับแล้วหรือยัง
    const isConfirmed = orderStatus !== 'VERIFYING' && orderStatus !== 'PENDING_CONFIRMATION';
    const pendingLabel = isConfirmed ? 'ร้านค้ายืนยันรับออเดอร์แล้ว' : 'รอร้านค้ายืนยัน';

    steps.push({
      status: 'PENDING_CONFIRMATION',
      label: pendingLabel,
      completed: isConfirmed,
      inProgress: !isConfirmed && (orderStatus === 'PENDING_CONFIRMATION' || orderStatus === 'VERIFYING'),
      timestamp: getTimestampFromTracking(trackingHistory || [], 'PENDING_CONFIRMATION') || updatedAt,
    });
  }

  // ✅ Step: ร้านค้ากำลังเตรียมสินค้า (รวม "ร้านค้ายอมรับออเดอร์" ไว้ใน step เดียว)
  const isAccepted = ['PROCESSING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(
    orderStatus,
  );

  if (isAccepted && ['PROCESSING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(orderStatus)) {
    steps.push({
      status: 'PROCESSING',
      label: 'ร้านค้ากำลังเตรียมสินค้า',
      completed: ['READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(orderStatus),
      inProgress: orderStatus === 'PROCESSING',
      timestamp: getTimestampFromTracking(trackingHistory, 'PROCESSING') || updatedAt,
    });
  }

  // ✅ Step: สินค้าพร้อมแล้ว กำลังหาไรเดอร์
  if (['READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(orderStatus)) {
    steps.push({
      status: 'READY_FOR_PICKUP',
      label: 'สินค้าพร้อมแล้ว กำลังหาไรเดอร์',
      completed: ['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(orderStatus),
      inProgress: orderStatus === 'READY_FOR_PICKUP',
      timestamp: getTimestampFromTracking(trackingHistory, 'READY_FOR_PICKUP') || updatedAt,
    });
  }

  // ✅ Step: ไรเดอร์กำลังไปรับสินค้า
  if (['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(orderStatus)) {
    steps.push({
      status: 'RIDER_ASSIGNED',
      label: 'ไรเดอร์กำลังไปรับสินค้า',
      completed: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(orderStatus),
      inProgress: orderStatus === 'RIDER_ASSIGNED',
      timestamp: getTimestampFromTracking(trackingHistory, 'RIDER_ASSIGNED') || updatedAt,
    });
  }

  // ✅ Step: ไรเดอร์รับสินค้าแล้ว
  if (['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(orderStatus)) {
    steps.push({
      status: 'PICKED_UP',
      label: 'ไรเดอร์รับสินค้าแล้ว',
      completed: ['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(orderStatus),
      inProgress: orderStatus === 'PICKED_UP',
      timestamp: getTimestampFromTracking(trackingHistory, 'PICKED_UP') || updatedAt,
    });
  }

  // ✅ Step: กำลังจัดส่งถึงคุณ
  if (['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(orderStatus)) {
    steps.push({
      status: 'OUT_FOR_DELIVERY',
      label: 'กำลังจัดส่งถึงคุณ',
      completed: ['DELIVERED', 'COMPLETED'].includes(orderStatus),
      inProgress: orderStatus === 'OUT_FOR_DELIVERY',
      timestamp: getTimestampFromTracking(trackingHistory, 'OUT_FOR_DELIVERY') || updatedAt,
    });
  }

  // ✅ Step: จัดส่งเรียบร้อย
  if (['DELIVERED', 'COMPLETED'].includes(orderStatus)) {
    steps.push({
      status: 'DELIVERED',
      label: 'จัดส่งเรียบร้อย',
      completed: true, // ✅ แสดงติ๊กถูกสีเขียวเสมอ เพราะจัดส่งสำเร็จแล้ว
      inProgress: false,
      timestamp: getTimestampFromTracking(trackingHistory, 'DELIVERED') || updatedAt,
    });
  }

  // ✅ Step: ยืนยันรับสินค้า
  if (orderStatus === 'COMPLETED') {
    steps.push({
      status: 'COMPLETED',
      label: 'ยืนยันรับสินค้า',
      completed: true,
      inProgress: false,
      timestamp: updatedAt,
    });
  }

  return steps;
};

// ✅ ฟังก์ชันสำหรับคำนวณเวลาที่เหลือ (SLA)
export const getRemainingTime = (expiredAt: string | Date | null): { hours: number; minutes: number; seconds: number } | null => {
  if (!expiredAt) return null;

  const now = new Date();
  const expired = typeof expiredAt === 'string' ? new Date(expiredAt) : expiredAt;
  const diff = expired.getTime() - now.getTime();

  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
};

// ✅ ฟังก์ชันสำหรับจัดรูปแบบเวลา
export const formatTimeRemaining = (time: { hours: number; minutes: number; seconds: number } | null): string => {
  if (!time) return 'หมดเวลาแล้ว';

  const { hours, minutes, seconds } = time;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

// ✅ ฟังก์ชันสำหรับคำนวณระยะทาง (mock - ควรใช้ API จริง)
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  // Haversine formula
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ✅ ฟังก์ชันสำหรับคำนวณเวลาที่คาดว่าจะถึง
export const getEstimatedArrivalTime = (distance: number, averageSpeed: number = 30): number => {
  // averageSpeed in km/h, return time in minutes
  return Math.ceil((distance / averageSpeed) * 60);
};

