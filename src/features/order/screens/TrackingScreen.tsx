import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import OrderTimeline from '@shared/components/order/OrderTimeline';
import client from '@app/api/client';
import { apiCache } from '@shared/utils/apiCache';
import { TimelineStep, getCustomerTimeline, OrderStatus } from '@shared/utils/orderStatusUtils';

interface TrackingItem {
  id: number;
  status: string;
  title: string;
  description?: string;
  createdAt: string;
}

interface OrderData {
  id: number;
  orderStatus: string;
  createdAt: string;
  updatedAt?: string;
}

export default function TrackingScreen({ route }: any) {
  const { trackingNumber, provider, orderId } = route.params;
  const navigation = useNavigation<any>();
  const [timeline, setTimeline] = useState<TrackingItem[]>([]);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousOrderIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const fetchTracking = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      // Cancel previous request ถ้า orderId เปลี่ยน
      if (previousOrderIdRef.current !== undefined && previousOrderIdRef.current !== orderId) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        // Cancel cached request
        apiCache.cancel(`/orders/${previousOrderIdRef.current}/tracking`);
      }

      previousOrderIdRef.current = orderId;

      // สร้าง AbortController ใหม่
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);

      try {
        // ✅ ดึงข้อมูล order เพื่อใช้ getCustomerTimeline
        const orderResponse = await client.get(`/orders/${orderId}`, {
          signal: abortController.signal
        });
        const order = orderResponse as unknown as OrderData;

        if (!abortController.signal.aborted) {
          setOrderData(order);
        }

        // ดึงข้อมูล tracking สำหรับ timestamps
        const response = await client.get(`/orders/${orderId}/tracking`, {
          signal: abortController.signal
        });
        const data = response as unknown as TrackingItem[];

        // ตรวจสอบว่า request ยังไม่ถูก cancel
        if (!abortController.signal.aborted) {
          setTimeline(Array.isArray(data) ? data : []);
        }
      } catch (error: any) {
        // Handle AbortError
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || error.message === 'Request was cancelled') {
          return;
        }

        // Handle 429
        if (error?.response?.status === 429) {
          if (!abortController.signal.aborted) {
            setLoading(false);
          }
          return;
        }

        console.error('Fetch tracking error', error);
        if (!abortController.signal.aborted) {
          setTimeline([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchTracking();

    // Cleanup: cancel request เมื่อ component unmount หรือ orderId เปลี่ยน
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Cancel cached request
      if (orderId) {
        apiCache.cancel(`/orders/${orderId}/tracking`);
      }
    };
  }, [orderId]);

  // ✅ ใช้ getCustomerTimeline เหมือน OrderDetailScreen เพื่อแสดง Timeline ที่ละเอียด
  const timelineSteps = orderData
    ? getCustomerTimeline(
      orderData.orderStatus as OrderStatus,
      orderData.createdAt,
      orderData.updatedAt,
      timeline.map(item => ({ status: item.status, createdAt: item.createdAt }))
    )
    : [];

  // หา status ล่าสุดเพื่อแสดงปุ่ม "ดูหลักฐานการจัดส่ง"
  const latestStatus = orderData?.orderStatus || (timeline.length > 0 ? timeline[timeline.length - 1].status : null);

  return (
    <View style={styles.container}>
      <ScreenHeader title="ติดตามพัสดุ" />

      <View style={styles.header}>
        <Text style={styles.provider}>{provider || 'BoxiFY Express'}</Text>
        <Text style={styles.tracking}>{trackingNumber || '-'}</Text>
        <Text style={styles.status}>
          {timeline.length > 0 ? timeline[timeline.length - 1].title : 'ยังไม่มีข้อมูลการจัดส่ง'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FF5722"
          style={{ marginTop: 24 }}
        />
      ) : (
        <ScrollView style={styles.timelineBox}>
          {/* ใช้ OrderTimeline component สำหรับ UI ที่สวยงาม */}
          <View style={styles.timelineSection}>
            <Text style={styles.timelineTitle}>Timeline</Text>
            {timelineSteps.length > 0 ? (
              <>
                <OrderTimeline
                  steps={timelineSteps}
                  showTimestamps={true}
                />
                {/* แสดงลิงก์ "ดูหลักฐานการจัดส่งสินค้า" สำหรับสถานะ DELIVERED */}
                {latestStatus === 'DELIVERED' && (
                  <TouchableOpacity
                    style={styles.proofLink}
                    onPress={() => {
                      // Navigate to order detail to see proof image
                      if (route.params?.orderId) {
                        navigation.navigate('OrderDetail', {
                          orderId: route.params.orderId,
                        });
                      }
                    }}
                  >
                    <Text style={styles.proofLinkText}>
                      ดูหลักฐานการจัดส่งสินค้า
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>
                ยังไม่มีข้อมูลการจัดส่ง
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#000000', padding: 20, alignItems: 'center' },
  provider: { color: '#fff', fontSize: 16 },
  tracking: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  status: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  timelineBox: { backgroundColor: '#fff', marginTop: 10, padding: 20 },
  timelineSection: {
    paddingVertical: 8,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  proofLink: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    alignItems: 'center',
  },
  proofLinkText: {
    color: '#1565C0',
    fontSize: 14,
    fontWeight: '600',
  },
});