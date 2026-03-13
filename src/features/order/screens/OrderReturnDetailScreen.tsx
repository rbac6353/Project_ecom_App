import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useTheme } from '@app/providers/ThemeContext';
import { RootStackParamList } from '@navigation/RootStackNavigator';
import { OrderReturn } from '@shared/interfaces/returns';
import ReturnStatusBadge from '@shared/components/order/ReturnStatusBadge';

type OrderReturnDetailRouteProp = RouteProp<
  RootStackParamList,
  'OrderReturnDetail'
>;

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('th-TH');
  } catch {
    return iso;
  }
};

const reasonLabel = (code: string | null) => {
  if (!code) return '-';
  switch (code) {
    case 'WRONG_ITEM':
      return 'ได้รับสินค้าผิดจากที่สั่ง';
    case 'DAMAGED':
      return 'สินค้าชำรุด/เสียหาย';
    case 'NOT_AS_DESCRIBED':
      return 'สินค้าไม่ตรงตามรายละเอียด';
    case 'OTHER':
      return 'อื่น ๆ';
    default:
      return code;
  }
};

export default function OrderReturnDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<OrderReturnDetailRouteProp>();
  const { orderReturn } = route.params as { orderReturn: OrderReturn };

  const items = orderReturn.items || [];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={[]}
    >

      <ScreenHeader
        title="รายละเอียดคำขอคืนสินค้า"
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header & Status */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                คำขอคืนสินค้า #R{orderReturn.id}
              </Text>
              <Text style={[styles.subTitle, { color: colors.subText }]}>
                คำสั่งซื้อ #O{orderReturn.orderId}
              </Text>
            </View>
            <ReturnStatusBadge status={orderReturn.status} />
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.subText }]}>
              วันที่ส่งคำขอ
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {formatDateTime(orderReturn.createdAt)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.subText }]}>
              วันที่ปิดคำขอ
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {formatDateTime(orderReturn.resolvedAt)}
            </Text>
          </View>
          {orderReturn.userName && (
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.subText }]}>
                ลูกค้า
              </Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {orderReturn.userName}
              </Text>
            </View>
          )}
        </View>

        {/* Reason */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            เหตุผลการคืนสินค้า
          </Text>
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.metaLabel, { color: colors.subText }]}>
              เหตุผลหลัก
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {reasonLabel(orderReturn.reasonCode)}
            </Text>
          </View>
          {orderReturn.reasonText && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.metaLabel, { color: colors.subText }]}>
                รายละเอียดเพิ่มเติม
              </Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {orderReturn.reasonText}
              </Text>
            </View>
          )}
        </View>

        {/* Items */}
        {items.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              รายการสินค้าในคำขอคืน
            </Text>
            {items.map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>
                    {it.productName || 'สินค้าไม่ระบุ'}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.subText }]}>
                    จำนวนที่ขอคืน: {it.quantity}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.subText }]}>
                    ราคาต่อชิ้น: ฿{it.unitPrice.toLocaleString()}
                  </Text>
                </View>
                {it.productImageUrl && (
                  <Image
                    source={{ uri: it.productImageUrl }}
                    style={styles.itemImage}
                  />
                )}
              </View>
            ))}
          </View>
        )}

        {/* Images */}
        {orderReturn.images && orderReturn.images.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              รูปประกอบคำขอคืน
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 12 }}
            >
              {orderReturn.images.map((img, idx) => (
                <Image
                  key={idx}
                  source={{ uri: img }}
                  style={styles.previewImage}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Admin / Refund info */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            สถานะการคืนเงิน
          </Text>
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.metaLabel, { color: colors.subText }]}>
              จำนวนเงินคืนโดยประมาณ
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {orderReturn.refundAmount != null
                ? `฿${orderReturn.refundAmount.toLocaleString()}`
                : '-'}
            </Text>
          </View>
          {orderReturn.adminNote && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.metaLabel, { color: colors.subText }]}>
                หมายเหตุจากผู้ดูแลระบบ/ร้านค้า
              </Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {orderReturn.adminNote}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subTitle: {
    fontSize: 13,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 6,
    marginLeft: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
});


