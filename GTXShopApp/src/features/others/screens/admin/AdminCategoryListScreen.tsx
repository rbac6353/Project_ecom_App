import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/RootStackNavigator';

export default function AdminCategoryListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // ⚠️ สำคัญ: client.get() return data โดยตรง (ไม่ใช่ response object)
      const data = await client.get('/categories');
      console.log('📂 Categories API Response:', data);
      if (Array.isArray(data)) {
        setCategories(data);
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        setCategories(data.data);
      } else {
        console.warn('⚠️ Unexpected categories response structure:', data);
        setCategories([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching categories:', error);
      Alert.alert('ผิดพลาด', error?.response?.data?.message || 'ไม่สามารถดึงข้อมูลหมวดหมู่ได้');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, []),
  );

  const handleDelete = (id: number, name: string) => {
    Alert.alert('ลบหมวดหมู่', `ต้องการลบ "${name}" หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log(`🗑️ Deleting category ID: ${id}`);
            await client.delete(`/categories/${id}`);
            Alert.alert('ลบสำเร็จ', `หมวดหมู่ "${name}" ถูกลบออกจากระบบแล้ว`);
            fetchCategories();
          } catch (error: any) {
            console.error('❌ Error deleting category:', error);
            const errorMessage =
              error.response?.data?.message ||
              error.message ||
              'ลบไม่สำเร็จ';
            Alert.alert('ผิดพลาด', errorMessage);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: any) => {
    // Parse image URL - API ส่ง category.image เป็น JSON string เช่น {"icon":"📱","image":"https://...","subcategories":[...]}
    let imageUrl = 'https://placekitten.com/100/100';
    if (item.image) {
      try {
        if (typeof item.image === 'string' && item.image.trim().startsWith('{')) {
          const parsed = JSON.parse(item.image);
          const url = parsed?.image || parsed?.url;
          if (typeof url === 'string' && url.trim() !== '') imageUrl = url;
        } else if (typeof item.image === 'string' && item.image.includes('http')) {
          imageUrl = item.image;
        }
      } catch {
        if (typeof item.image === 'string' && item.image.includes('http')) imageUrl = item.image;
      }
    }
    // กัน uri เป็น object (จะทำให้ RCTImageView รับ ReadableNativeMap แล้ว crash)
    const uri = typeof imageUrl === 'string' ? imageUrl : 'https://placekitten.com/100/100';

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Image source={{ uri }} style={[styles.image, { backgroundColor: colors.background }]} />

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.productCount, { color: colors.subText }]}>
            สินค้า: {item.products?.length || 0} รายการ
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              navigation.navigate('AdminManageCategory', { category: item })
            }
          >
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="จัดการหมวดหมู่" />
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="จัดการหมวดหมู่" />

      {categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="grid-outline" size={64} color={colors.subText} />
          <Text style={[styles.emptyText, { color: colors.subText }]}>ยังไม่มีหมวดหมู่</Text>
          <Text style={[styles.emptySubtext, { color: colors.subText }]}>
            กดปุ่ม + เพื่อเพิ่มหมวดหมู่ใหม่
          </Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AdminManageCategory')}
        activeOpacity={0.8}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  productCount: { fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 15, padding: 5 },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

