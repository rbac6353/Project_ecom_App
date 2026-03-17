import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/RootStackNavigator';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function AdminStoreListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  // --- 1. ฟังก์ชันดึงข้อมูลร้านค้า ---
  const fetchStores = async () => {
    try {
      setLoading(true);
      // ยิง API พร้อม Query Param
      const url = keyword
        ? `/stores/admin/all?keyword=${encodeURIComponent(keyword)}`
        : '/stores/admin/all';
      // ⚠️ สำคัญ: client.get() return data โดยตรง (ไม่ใช่ response object)
      const data = await client.get(url);
      console.log('📦 Stores API Response:', data);
      // API return array โดยตรง
      if (Array.isArray(data)) {
        setStores(data);
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        setStores(data.data);
      } else {
        console.warn('⚠️ Unexpected stores response structure:', data);
        setStores([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching stores:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'ไม่สามารถดึงข้อมูลร้านค้าได้';
      Alert.alert('ผิดพลาด', errorMessage);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลทุกครั้งที่เข้ามาหน้านี้
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchStores();
    }, []),
  );

  // --- 2. ฟังก์ชันอนุมัติร้านค้า (Verify) ---
  const handleVerify = (id: number, name: string) => {
    Alert.alert(
      'ยืนยันการอนุมัติ',
      `คุณต้องการอนุมัติร้าน "${name}" ให้เป็นร้านค้าทางการหรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'อนุมัติ',
          onPress: async () => {
            try {
              await client.patch(`/stores/${id}/verify`);
              Alert.alert('สำเร็จ', `ร้าน ${name} ได้รับการอนุมัติแล้ว`);
              fetchStores(); // โหลดข้อมูลใหม่เพื่ออัปเดตสถานะ
            } catch (error: any) {
              console.error('❌ Error verifying store:', error);
              const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'ทำรายการไม่สำเร็จ';
              Alert.alert('ผิดพลาด', errorMessage);
            }
          },
        },
      ],
    );
  };

  // --- 3. ฟังก์ชันลบร้านค้า (Delete) ---
  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'คำเตือน!',
      `คุณต้องการลบร้าน "${name}" และสินค้าทั้งหมดของร้านนี้ใช่หรือไม่? (กู้คืนไม่ได้)`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบร้านค้า',
          style: 'destructive', // สีแดง
          onPress: async () => {
            try {
              await client.delete(`/stores/${id}`);
              Alert.alert('ลบสำเร็จ', `ร้าน ${name} ถูกลบออกจากระบบแล้ว`);
              fetchStores(); // โหลดข้อมูลใหม่
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
      ],
    );
  };

  // --- 4. การ์ดแสดงผลแต่ละร้าน ---
  const renderStoreItem = ({ item }: any) => {
    // เช็คว่าร้านนี้ Verified หรือยัง
    const isVerified = item.isVerified;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('AdminStoreDetail', { storeId: item.id })
        }
      >
        <Image
          source={{
            uri: item.logo || 'https://placekitten.com/100/100',
          }}
          style={[styles.logo, { backgroundColor: colors.background }]}
        />

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.storeName, { color: colors.text }]}>{item.name}</Text>
            {isVerified && (
              <MaterialIcons
                name="verified"
                size={16}
                color={colors.primary}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>

          <Text style={[styles.owner, { color: colors.subText }]}>
            เจ้าของ: {item.owner?.name || item.owner?.email || 'ไม่ระบุ'}
          </Text>
          <Text style={[styles.date, { color: colors.subText }]}>
            เข้าร่วม: {new Date(item.createdAt).toLocaleDateString('th-TH')}
          </Text>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isVerified ? colors.background : colors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isVerified ? colors.primary : colors.primary },
              ]}
            >
              {isVerified ? '✅ อนุมัติแล้ว' : '⚠️ รอการตรวจสอบ'}
            </Text>
          </View>
        </View>

        {/* ปุ่ม Actions */}
        <View style={styles.actions}>
          {/* ปุ่มอนุมัติ (แสดงเฉพาะร้านที่ยังไม่ผ่าน) */}
          {!isVerified && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleVerify(item.id, item.name);
              }}
              style={styles.actionBtn}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={28}
                color="#4CAF50"
              />
            </TouchableOpacity>
          )}

          {/* ปุ่มลบ (แสดงเสมอ) */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(item.id, item.name);
            }}
            style={styles.actionBtn}
          >
            <Ionicons name="trash-outline" size={26} color="#F44336" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="จัดการร้านค้าทั้งหมด" />

      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons
          name="search"
          size={20}
          color={colors.subText}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="ค้นหาชื่อร้าน..."
          placeholderTextColor={colors.subText}
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={fetchStores}
          returnKeyType="search"
        />
        {keyword.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setKeyword('');
              fetchStores();
            }}
          >
            <Ionicons name="close-circle" size={20} color={colors.subText} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderStoreItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={60} color={colors.subText} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                {keyword ? 'ไม่พบร้านค้าที่ค้นหา' : 'ยังไม่มีร้านค้าในระบบ'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    marginBottom: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    height: 45,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },

  card: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  info: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  storeName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  owner: { fontSize: 12, color: '#666', marginTop: 2 },
  date: { fontSize: 10, color: '#999', marginTop: 2 },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  statusText: { fontSize: 10, fontWeight: 'bold' },

  actions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 5, marginLeft: 5 },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: '#999', fontSize: 16 },
});

