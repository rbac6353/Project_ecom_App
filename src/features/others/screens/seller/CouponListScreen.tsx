import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function CouponListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get('/coupons');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const couponsList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setCoupons(couponsList);
    } catch (error) {
      console.error(error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลคูปองได้');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCoupons();
    }, []),
  );

  const handleDelete = (id: number) => {
    Alert.alert('ยืนยัน', 'ต้องการลบคูปองนี้ใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/coupons/${id}`);
            fetchCoupons();
            Alert.alert('สำเร็จ', 'ลบคูปองเรียบร้อย');
          } catch (err) {
            Alert.alert('Error', 'ลบไม่สำเร็จ');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: any) => {
    const isExpired = new Date(item.expiresAt) < new Date();
    return (
      <View style={[styles.card, { backgroundColor: colors.card }, isExpired && styles.expiredCard]}>
        <View style={styles.leftPart}>
          <Text style={[styles.code, { color: colors.primary }]}>{item.code}</Text>
          <Text style={[styles.desc, { color: colors.text }]}>
            {item.discountAmount > 0
              ? `ลด ฿${item.discountAmount}`
              : `ลด ${item.discountPercent}%${item.maxDiscount ? ` (สูงสุด ฿${item.maxDiscount})` : ''}`}
            {item.minPurchase > 0 && ` (ขั้นต่ำ ฿${item.minPurchase})`}
          </Text>
          <Text style={[styles.date, { color: colors.subText }]}>
            หมดอายุ: {new Date(item.expiresAt).toLocaleDateString('th-TH')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="จัดการคูปอง" />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.subText }]}>ยังไม่มีคูปอง</Text>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddCoupon')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
  },
  expiredCard: { opacity: 0.6 },
  leftPart: { flex: 1 },
  code: { fontSize: 18, fontWeight: 'bold' },
  desc: { fontSize: 14, marginTop: 4 },
  date: { fontSize: 12, marginTop: 4 },
  deleteBtn: { padding: 10 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  emptyText: { textAlign: 'center', marginTop: 50 },
});

