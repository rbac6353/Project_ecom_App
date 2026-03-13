import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useTheme } from '@app/providers/ThemeContext';
import { getMyReturns } from '@app/services/returnsService';
import { OrderReturn } from '@shared/interfaces/returns';
import ReturnStatusBadge from '@shared/components/order/ReturnStatusBadge';
import { useNavigation } from '@react-navigation/native';

const formatDateTime = (iso: string | undefined | null) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('th-TH');
  } catch {
    return iso;
  }
};

const reasonLabel = (code: string) => {
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

export default function ReturnHistoryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returns, setReturns] = useState<OrderReturn[]>([]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const list = await getMyReturns();
      setReturns(list);
    } catch (e: any) {
      console.error('Error loading returns:', e);
      setError(
        e?.response?.data?.message ||
        e?.message ||
        'ไม่สามารถโหลดประวัติการคืนสินค้าได้',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderItem = ({ item }: { item: OrderReturn }) => {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        activeOpacity={0.8}
        onPress={() => {
          navigation.navigate('OrderReturnDetail', { orderReturn: item });
        }}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.returnId, { color: colors.text }]}>
              คำขอคืนสินค้า #R{item.id}
            </Text>
            <Text style={[styles.orderId, { color: colors.subText }]}>
              คำสั่งซื้อ #O{item.orderId}
            </Text>
          </View>
          <ReturnStatusBadge status={item.status} />
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.subText }]}>
            วันที่ส่งคำขอ
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {formatDateTime(item.createdAt)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.subText }]}>
            เหตุผลหลัก
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {reasonLabel(item.reasonCode)}
          </Text>
        </View>

        {item.items && item.items.length > 0 && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.subText }]}>
              จำนวนสินค้า
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {item.items.length} รายการ
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.subText }]}>
            จำนวนเงินคืนโดยประมาณ
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {item.refundAmount != null
              ? `฿${item.refundAmount.toLocaleString()}`
              : '-'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={[]}>
      <ScreenHeader title="ประวัติการคืนสินค้า" />
      <View style={styles.container}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { color: colors.text }]}>
              {error}
            </Text>
          </View>
        )}
        {!error && returns.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              ยังไม่มีคำขอคืนสินค้า
            </Text>
          </View>
        )}
        <FlatList
          data={returns}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  returnId: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  orderId: {
    fontSize: 13,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 13,
    fontWeight: '500',
  },
  errorBox: {
    padding: 16,
  },
  errorText: {
    fontSize: 14,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});


