import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import {
  getSellerReturns,
  updateSellerReturnStatus,
} from '@app/services/returnsService';
import { OrderReturn, OrderReturnStatus } from '@shared/interfaces/returns';
import ReturnStatusBadge from '@shared/components/order/ReturnStatusBadge';

const REASON_LABELS: Record<string, string> = {
  WRONG_ITEM: 'ได้รับสินค้าผิดจากที่สั่ง',
  DAMAGED: 'สินค้าเสียหาย/แตกหัก',
  NOT_AS_DESCRIBED: 'สินค้าไม่ตรงตามรายละเอียด',
  OTHER: 'อื่น ๆ',
};

export default function SellerReturnListScreen() {
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      // ดึงเฉพาะคำขอที่อยู่ในสถานะ REQUESTED (รอดำเนินการ)
      const list = await getSellerReturns('REQUESTED' as OrderReturnStatus);
      setReturns(list);
    } catch (error) {
      console.error('Error fetching seller returns:', error);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReturns();
    }, []),
  );

  const handleDecision = (
    item: OrderReturn,
    decision: OrderReturnStatus.APPROVED | OrderReturnStatus.REJECTED,
  ) => {
    const isApprove = decision === 'APPROVED';
    Alert.alert(
      'ยืนยันการดำเนินการ',
      isApprove
        ? 'ต้องการอนุมัติคำขอคืนสินค้านี้หรือไม่?'
        : 'ต้องการปฏิเสธคำขอคืนสินค้านี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          onPress: async () => {
            try {
              await updateSellerReturnStatus(item.id, {
                status: decision,
              });
              Alert.alert('สำเร็จ', 'อัปเดตสถานะคำขอคืนสินค้าเรียบร้อยแล้ว');
              fetchReturns();
            } catch (error: any) {
              console.error('Error updating seller return status:', error);
              Alert.alert(
                'ผิดพลาด',
                error?.response?.data?.message ||
                  'ไม่สามารถอัปเดตสถานะคำขอคืนสินค้าได้',
              );
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: OrderReturn }) => {
    const firstItem = item.items && item.items.length > 0 ? item.items[0] : null;
    const productName =
      firstItem?.productName || `สินค้าในออเดอร์ #${item.orderId}`;
    const productImage =
      firstItem?.productImageUrl ||
      (item.images && item.images.length > 0 ? item.images[0] : undefined) ||
      'https://via.placeholder.com/120';

    const reasonLabel =
      (item.reasonCode && REASON_LABELS[item.reasonCode]) || 'คำขอคืนสินค้า';

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.orderId}>คำขอคืน #{item.id}</Text>
          <ReturnStatusBadge status={item.status} />
        </View>

        <Text style={styles.subText}>ออเดอร์: #{item.orderId}</Text>

        <View style={styles.productRow}>
          <Image source={{ uri: productImage }} style={styles.image} />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {productName}
            </Text>
            {firstItem && (
              <Text style={styles.productQty}>
                จำนวนที่ขอคืน: x{firstItem.quantity}
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.reasonTitle}>เหตุผล:</Text>
        <Text style={styles.reasonText}>
          {reasonLabel}
          {item.reasonText ? ` - ${item.reasonText}` : ''}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleDecision(item, 'REJECTED')}
          >
            <Text style={styles.rejectText}>ปฏิเสธ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => handleDecision(item, 'APPROVED')}
          >
            <Text style={styles.approveText}>อนุมัติคำขอ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="คำขอคืนสินค้า (ร้านค้า)" />
      <FlatList
        data={returns}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>ยังไม่มีคำขอคืนสินค้าค้างอยู่</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  listContent: { padding: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderId: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  subText: {
    fontSize: 12,
    color: '#777',
    marginBottom: 8,
  },
  productRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#eee',
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
  },
  productQty: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
  reasonTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  reasonText: {
    fontSize: 12,
    color: '#444',
    marginBottom: 8,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  rejectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
  },
  approveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  rejectText: { fontSize: 12, color: '#555' },
  approveText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 14,
  },
});


