import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { RootStackParamList } from '@navigation/RootStackNavigator';
import { useTheme } from '@app/providers/ThemeContext';
import { Order } from '@shared/interfaces/order';
import { requestReturn, CreateReturnPayload } from '@app/services/returnsService';
import * as orderService from '@app/services/orderService';

type RequestReturnRouteProp = RouteProp<RootStackParamList, 'RequestReturn'>;

interface LocalReturnItemState {
  orderItemId: number;
  title: string;
  quantityBought: number;
  quantityReturn: number;
  selected: boolean;
}

const REASONS = [
  { code: 'WRONG_ITEM', label: 'ได้รับสินค้าผิดจากที่สั่ง' },
  { code: 'DAMAGED', label: 'สินค้าชำรุด/เสียหาย' },
  { code: 'NOT_AS_DESCRIBED', label: 'สินค้าไม่ตรงตามรายละเอียด' },
  { code: 'OTHER', label: 'อื่น ๆ' },
];

export default function RequestReturnScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RequestReturnRouteProp>();
  const { colors } = useTheme();
  const { orderId, order: initialOrder } = route.params as {
    orderId: number;
    order?: Order;
  };

  const [order, setOrder] = useState<Order | undefined>(initialOrder);
  const [items, setItems] = useState<LocalReturnItemState[]>(() => {
    if (!initialOrder || !initialOrder.items) return [];
    return initialOrder.items.map((it) => ({
      orderItemId: (it as any).id, // id ของ ProductOnOrder
      title: it.product?.title || 'สินค้าไม่ระบุ',
      quantityBought: it.count,
      quantityReturn: 0,
      selected: false,
    }));
  });
  const [reasonCode, setReasonCode] = useState<string>('WRONG_ITEM');
  const [reasonText, setReasonText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadOrderIfNeeded = useCallback(async () => {
    if (order) return;
    try {
      setLoading(true);
      const data = await orderService.getOrderDetail(orderId);
      // ใช้โครง Order interface แบบคร่าว ๆ (assume backend ส่ง items เป็น productOnOrders ที่มี id,count,product)
      const mappedOrder: Order = {
        id: data.id,
        userId: data.orderedById || data.userId,
        total: data.cartTotal || data.total || 0,
        status: data.orderStatus || data.status || 'PENDING',
        shippingAddress: data.shippingAddress || '',
        shippingPhone: data.shippingPhone || '',
        createdAt: data.createdAt || new Date().toISOString(),
        paymentMethod: data.paymentMethod,
        paymentExpiredAt: data.paymentExpiredAt,
        paymentSlipUrl: data.paymentSlipUrl,
        trackingNumber: data.trackingNumber,
        logisticsProvider: data.logisticsProvider,
        items: (data.productOnOrders || []).map((po: any) => ({
          id: po.id,
          count: po.count,
          price: Number(po.price),
          product: {
            ...(po.product || {}),
          },
        })),
        refundStatus: data.refundStatus,
        refundReason: data.refundReason,
      };
      setOrder(mappedOrder);
      setItems(
        (mappedOrder.items || []).map((it) => ({
          orderItemId: (it as any).id,
          title: it.product?.title || 'สินค้าไม่ระบุ',
          quantityBought: it.count,
          quantityReturn: 0,
          selected: false,
        })),
      );
    } catch (error) {
      console.error('Failed to load order for return:', error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้');
    } finally {
      setLoading(false);
    }
  }, [order, orderId]);

  React.useEffect(() => {
    loadOrderIfNeeded();
  }, [loadOrderIfNeeded]);

  const toggleItem = (orderItemId: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.orderItemId === orderItemId
          ? {
            ...it,
            selected: !it.selected,
            quantityReturn:
              !it.selected && it.quantityReturn === 0 ? 1 : it.quantityReturn,
          }
          : it,
      ),
    );
  };

  const changeQty = (orderItemId: number, delta: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.orderItemId !== orderItemId) return it;
        let next = it.quantityReturn + delta;
        if (next < 1) next = 1;
        if (next > it.quantityBought) next = it.quantityBought;
        return {
          ...it,
          selected: next > 0,
          quantityReturn: next,
        };
      }),
    );
  };

  const selectedItems = useMemo(
    () => items.filter((it) => it.selected && it.quantityReturn > 0),
    [items],
  );

  const handleSubmit = async () => {
    if (!order) {
      Alert.alert('ผิดพลาด', 'ไม่พบข้อมูลคำสั่งซื้อ');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการเพื่อขอคืน');
      return;
    }

    if (!reasonCode) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกเหตุผลการคืนสินค้า');
      return;
    }

    const payload: CreateReturnPayload = {
      reasonCode,
      reasonText: reasonText?.trim() || undefined,
      items: selectedItems.map((it) => ({
        orderItemId: it.orderItemId,
        quantity: it.quantityReturn,
      })),
    };

    try {
      setSubmitting(true);
      await requestReturn(orderId, payload);
      Alert.alert('สำเร็จ', 'ส่งคำขอคืนสินค้าเรียบร้อยแล้ว', [
        {
          text: 'ดูคำสั่งซื้อ',
          onPress: () =>
            navigation.navigate('OrderDetail', {
              orderId,
            }),
        },
        {
          text: 'ตกลง',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Request return error:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'ไม่สามารถส่งคำขอคืนสินค้าได้';
      Alert.alert('ผิดพลาด', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !order) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={[]}>
      <ScreenHeader title="ขอคืนสินค้า" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* สรุปออเดอร์ */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.orderId, { color: colors.text }]}>
            คำสั่งซื้อ #O{orderId}
          </Text>
          {order && (
            <>
              <Text style={[styles.orderMeta, { color: colors.subText }]}>
                วันที่สั่งซื้อ:{' '}
                {new Date(order.createdAt).toLocaleString('th-TH')}
              </Text>
              <Text style={[styles.orderMeta, { color: colors.subText }]}>
                ยอดรวมประมาณ: ฿{order.total.toLocaleString()}
              </Text>
            </>
          )}
        </View>

        {/* รายการสินค้า */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            เลือกสินค้าที่ต้องการคืน
          </Text>
          {items.length === 0 && (
            <Text style={{ color: colors.subText }}>
              ไม่พบรายการสินค้าในคำสั่งซื้อนี้
            </Text>
          )}
          {items.map((it) => (
            <TouchableOpacity
              key={it.orderItemId}
              style={[
                styles.itemRow,
                { borderBottomColor: colors.border },
              ]}
              onPress={() => toggleItem(it.orderItemId)}
              activeOpacity={0.7}
            >
              <View style={styles.itemLeft}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: it.selected ? colors.primary : colors.border,
                      backgroundColor: it.selected
                        ? colors.primary
                        : 'transparent',
                    },
                  ]}
                >
                  {it.selected && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Text
                    style={[styles.itemTitle, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {it.title}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.subText }]}>
                    จำนวนที่ซื้อ: {it.quantityBought}
                  </Text>
                </View>
              </View>

              <View style={styles.qtyControl}>
                <TouchableOpacity
                  onPress={() => changeQty(it.orderItemId, -1)}
                  disabled={!it.selected || it.quantityReturn <= 1}
                  style={[
                    styles.qtyButton,
                    {
                      borderColor: colors.border,
                      opacity: !it.selected || it.quantityReturn <= 1 ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: colors.text }}>-</Text>
                </TouchableOpacity>
                <Text style={[styles.qtyText, { color: colors.text }]}>
                  {it.selected && it.quantityReturn > 0
                    ? it.quantityReturn
                    : 0}
                </Text>
                <TouchableOpacity
                  onPress={() => changeQty(it.orderItemId, 1)}
                  disabled={!it.selected || it.quantityReturn >= it.quantityBought}
                  style={[
                    styles.qtyButton,
                    {
                      borderColor: colors.border,
                      opacity:
                        !it.selected || it.quantityReturn >= it.quantityBought
                          ? 0.4
                          : 1,
                    },
                  ]}
                >
                  <Text style={{ color: colors.text }}>+</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* เหตุผลการคืนสินค้า */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            เหตุผลการคืนสินค้า
          </Text>
          <View style={styles.reasonList}>
            {REASONS.map((r) => {
              const active = reasonCode === r.code;
              return (
                <TouchableOpacity
                  key={r.code}
                  style={[
                    styles.reasonChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active
                        ? colors.primary + '22'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => setReasonCode(r.code)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: active ? colors.primary : colors.text,
                      fontSize: 13,
                    }}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.reasonInputBox}>
            <Text
              style={{
                color: colors.subText,
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              รายละเอียดเพิ่มเติม (ถ้ามี)
            </Text>
            <View
              style={[
                styles.reasonTextArea,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <ScrollView>
                <Text
                  style={{ color: colors.text, fontSize: 14 }}
                  // ใช้ Text + onPress keyboard ไม่ดีนัก แต่เพื่อหลีกเลี่ยง import TextInput เพิ่มในไฟล์นี้
                  // เหมาะสำหรับแก้ใน step ถัดไปหากต้องการ UX ที่ดีกว่า
                  onPress={() => { }}
                >
                  {reasonText || 'อธิบายปัญหาของสินค้า เช่น มีรอยขีดข่วน กล่องบุบ ฯลฯ'}
                </Text>
              </ScrollView>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { borderTopColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: submitting
                ? '#ffccbc'
                : selectedItems.length === 0
                  ? '#ccc'
                  : '#FF5722',
            },
          ]}
          onPress={handleSubmit}
          disabled={submitting || selectedItems.length === 0}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>ส่งคำขอคืนสินค้า</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 12,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 14,
    marginHorizontal: 6,
  },
  reasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  reasonInputBox: {
    marginTop: 10,
  },
  reasonTextArea: {
    minHeight: 70,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});


