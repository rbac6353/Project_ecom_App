import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/RootStackNavigator';

export default function AdminStoreDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { storeId } = route.params;

  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      console.log(`🏪 Fetching store details for ID: ${storeId}`);
      const res = await client.get(`/stores/admin/${storeId}`);
      console.log('📦 Store Details API Response:', JSON.stringify(res, null, 2));
      setStore(res);
    } catch (error: any) {
      console.error('❌ Error fetching store details:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'ไม่สามารถดึงข้อมูลร้านค้าได้';
      Alert.alert('ผิดพลาด', errorMessage);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [storeId]);

  // ฟังก์ชันอนุมัติ
  const handleVerify = () => {
    Alert.alert('ยืนยัน', 'ต้องการอนุมัติร้านค้านี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'อนุมัติ',
        onPress: async () => {
          try {
            console.log(`✅ Verifying store ID: ${storeId}`);
            await client.patch(`/stores/${storeId}/verify`);
            Alert.alert('สำเร็จ', 'อนุมัติร้านค้าเรียบร้อย');
            fetchDetail(); // Refresh หน้าจอ
          } catch (error: any) {
            console.error('❌ Error verifying store:', error);
            const errorMessage =
              error.response?.data?.message ||
              error.message ||
              'ไม่สามารถดำเนินการได้';
            Alert.alert('ผิดพลาด', errorMessage);
          }
        },
      },
    ]);
  };

  // ฟังก์ชันลบ
  const handleDelete = () => {
    Alert.alert('คำเตือน', 'ลบร้านค้านี้และสินค้าทั้งหมด?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log(`🗑️ Deleting store ID: ${storeId}`);
            await client.delete(`/stores/${storeId}`);
            Alert.alert('ลบสำเร็จ', 'ร้านค้าถูกลบออกจากระบบแล้ว');
            navigation.goBack();
          } catch (error: any) {
            console.error('❌ Error deleting store:', error);
            const errorMessage =
              error.response?.data?.message ||
              error.message ||
              'ลบร้านค้าไม่สำเร็จ';
            Alert.alert('ผิดพลาด', errorMessage);
          }
        },
      },
    ]);
  };

  // ✅ ฟังก์ชันตั้งค่า Mall
  const handleToggleMall = () => {
    const action = store.isMall ? 'ปลดสถานะ Mall' : 'ตั้งเป็น Mall (ร้านทางการ)';
    Alert.alert('ยืนยันการตั้งค่า', `คุณต้องการ "${action}" หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ยืนยัน',
        onPress: async () => {
          try {
            console.log(`🏪 Toggling Mall status for store ID: ${storeId}`);
            await client.patch(`/stores/${storeId}/mall`);
            Alert.alert('สำเร็จ', 'อัปเดตสถานะเรียบร้อย');
            fetchDetail(); // โหลดข้อมูลใหม่เพื่ออัปเดตปุ่ม
          } catch (error: any) {
            console.error('❌ Error toggling mall:', error);
            const errorMessage =
              error.response?.data?.message ||
              error.message ||
              'ทำรายการไม่สำเร็จ';
            Alert.alert('ผิดพลาด', errorMessage);
          }
        },
      },
    ]);
  };

  if (loading)
    return (
      <ActivityIndicator size="large" color="#FF5722" style={{ marginTop: 50 }} />
    );
  if (!store) return null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="รายละเอียดร้านค้า" />

      <ScrollView style={styles.content}>
        {/* 1. Store Header Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Image
              source={{
                uri: store.logo || 'https://placekitten.com/100/100',
              }}
              style={styles.logo}
            />
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.name}>{store.name}</Text>
              <Text style={styles.desc} numberOfLines={2}>
                {store.description || 'ไม่มีรายละเอียด'}
              </Text>

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: store.isVerified ? '#E8F5E9' : '#FFF3E0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: store.isVerified ? '#2E7D32' : '#EF6C00' },
                  ]}
                >
                  {store.isVerified
                    ? '✅ Verified Store'
                    : '⚠️ Pending Approval'}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {!store.isVerified && (
              <TouchableOpacity
                style={[styles.btn, styles.verifyBtn]}
                onPress={handleVerify}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.btnText}>อนุมัติร้านค้า</Text>
              </TouchableOpacity>
            )}
            {/* ✅ ปุ่ม Mall */}
            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: store.isMall ? '#333' : '#D0011B' },
              ]}
              onPress={handleToggleMall}
            >
              <Ionicons
                name={store.isMall ? 'storefront' : 'storefront-outline'}
                size={18}
                color="#fff"
              />
              <Text style={styles.btnText}>
                {store.isMall ? 'ปลด Mall' : 'ตั้งเป็น Mall'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.deleteBtn]}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={18} color="#fff" />
              <Text style={styles.btnText}>ลบร้านค้า</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Owner Info (Link to User Detail) */}
        {store.owner && (
          <TouchableOpacity
            style={styles.ownerCard}
            onPress={() =>
              navigation.navigate('AdminUserDetails', {
                userId: store.owner.id,
              })
            }
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.avatarPlaceholder}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  {store.owner.name?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.ownerLabel}>เจ้าของร้าน</Text>
                <Text style={styles.ownerName} numberOfLines={1}>
                  {store.owner.name || 'ไม่ระบุชื่อ'} ({store.owner.email})
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}

        {/* 3. Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#2196F3' }]}>
              {store.stats?.totalProducts || 0}
            </Text>
            <Text style={styles.statLabel}>สินค้าทั้งหมด</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {store.stats?.totalSoldItems || 0}
            </Text>
            <Text style={styles.statLabel}>ขายแล้ว (ชิ้น)</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>
              ฿{Number(store.stats?.inventoryValue || 0).toLocaleString('th-TH')}
            </Text>
            <Text style={styles.statLabel}>มูลค่าคลัง</Text>
          </View>
        </View>

        {/* 4. Products Preview */}
        <Text style={styles.sectionTitle}>
          สินค้าในร้าน ({store.products?.length || 0})
        </Text>
        {store.products && store.products.length > 0 ? (
          store.products.map((prod: any) => {
            const productImage =
              prod.images?.[0]?.url ||
              prod.image ||
              'https://placekitten.com/100/100';
            return (
              <View key={prod.id} style={styles.productRow}>
                <Image source={{ uri: productImage }} style={styles.prodImg} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.prodName} numberOfLines={2}>
                    {prod.name}
                  </Text>
                  <Text style={styles.prodPrice}>
                    ฿{Number(prod.price || 0).toLocaleString('th-TH')}
                  </Text>
                  <View style={styles.prodInfoRow}>
                    <Text style={styles.prodStock}>
                      Stock: {prod.quantity || 0}
                    </Text>
                    <Text style={styles.prodSold}>Sold: {prod.sold || 0}</Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>ยังไม่มีสินค้าในร้าน</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 15 },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  name: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  desc: { fontSize: 12, color: '#666', marginVertical: 4 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeText: { fontSize: 10, fontWeight: 'bold' },

  actionRow: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'flex-end',
    gap: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    gap: 5,
  },
  verifyBtn: { backgroundColor: '#4CAF50' },
  deleteBtn: { backgroundColor: '#D32F2F' },
  btnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  ownerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerLabel: { fontSize: 10, color: '#999' },
  ownerName: { fontSize: 14, fontWeight: 'bold', color: '#333' },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 10, color: '#666', marginTop: 2 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 10,
    marginLeft: 5,
  },
  productRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  prodImg: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#eee',
  },
  prodName: { fontSize: 14, color: '#333', fontWeight: '500' },
  prodPrice: { fontSize: 14, fontWeight: 'bold', color: '#FF5722', marginTop: 2 },
  prodInfoRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 10,
  },
  prodStock: { fontSize: 10, color: '#999' },
  prodSold: { fontSize: 10, color: '#4CAF50', fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
});

