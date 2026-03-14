import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Switch, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useTheme } from '@app/providers/ThemeContext';

export default function AdminBannerListScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [banners, setBanners] = useState<any[]>([]);

  const fetchBanners = async () => {
    try {
      // ⚠️ สำคัญ: api.get() return data โดยตรง (ไม่ใช่ response object)
      const data = await api.get('/banners/admin/all');
      console.log('🖼️ Banners API Response:', data);
      if (Array.isArray(data)) {
        setBanners(data);
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        setBanners(data.data);
      } else {
        console.warn('⚠️ Unexpected banners response structure:', data);
        setBanners([]);
      }
    } catch (e: any) {
      console.error('❌ Error fetching banners:', {
        message: e?.message,
        response: e?.response?.data,
        status: e?.response?.status,
      });
      setBanners([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBanners();
    }, [])
  );

  const handleToggle = async (id: number) => {
    try {
      await api.patch(`/banners/${id}/toggle`);
      fetchBanners();
    } catch (e) {
      console.error('Error toggling banner:', e);
      Alert.alert('Error', 'ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('ยืนยัน', 'ลบแบนเนอร์นี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/banners/${id}`);
            fetchBanners();
          } catch (e) {
            console.error('Error deleting banner:', e);
            Alert.alert('Error', 'ไม่สามารถลบได้');
          }
        },
      },
    ]);
  };

  // ✅ ฟังก์ชันอัปเดตลำดับด้วยตัวเลข
  const handleUpdateOrder = async (bannerId: number, newOrder: number) => {
    // ✅ Validate ตัวเลข
    if (isNaN(newOrder) || newOrder < 1) {
      Alert.alert('ผิดพลาด', 'กรุณาใส่ตัวเลขที่มากกว่า 0');
      return;
    }

    if (newOrder > banners.length) {
      Alert.alert('ผิดพลาด', `กรุณาใส่ตัวเลขไม่เกิน ${banners.length}`);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await api.patch(`/banners/${bannerId}/order`, {
        displayOrder: newOrder - 1, // ใช้ 0-based index
      });
      fetchBanners();
    } catch (e) {
      console.error('Error updating order:', e);
      Alert.alert('Error', 'ไม่สามารถอัปเดตลำดับได้');
    }
  };

  // ✅ Component แยกสำหรับ Banner Item
  const BannerItem = ({ item, index, onUpdateOrder, onToggle, onDelete, onEdit }: any) => {
    const { colors } = useTheme();
    const currentOrder = index + 1;
    const [orderInput, setOrderInput] = useState<string>(currentOrder.toString());
    
    // ✅ Update input เมื่อ index เปลี่ยน (เมื่อ reorder แล้ว)
    React.useEffect(() => {
      setOrderInput((index + 1).toString());
    }, [index]);
    
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* ✅ Input สำหรับใส่ตัวเลขลำดับ */}
        <View style={styles.orderContainer}>
          <Text style={[styles.orderLabel, { color: colors.subText }]}>ลำดับ</Text>
          <TextInput
            style={[
              styles.orderInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.primary || '#FF5722',
                color: colors.text,
              },
            ]}
            value={orderInput}
            onChangeText={(text) => {
              // ✅ อนุญาตเฉพาะตัวเลข
              const numericValue = text.replace(/[^0-9]/g, '');
              setOrderInput(numericValue);
            }}
            onBlur={() => {
              // ✅ เมื่อ blur ให้อัปเดตลำดับ
              const newOrder = parseInt(orderInput);
              if (newOrder && newOrder !== currentOrder && newOrder >= 1 && newOrder <= banners.length) {
                onUpdateOrder(item.id, newOrder);
              } else {
                // ✅ ถ้าไม่ถูกต้อง ให้ reset เป็นค่าปัจจุบัน
                setOrderInput(currentOrder.toString());
              }
            }}
            onSubmitEditing={() => {
              // ✅ เมื่อกด Enter/Done
              const newOrder = parseInt(orderInput);
              if (newOrder && newOrder !== currentOrder && newOrder >= 1 && newOrder <= banners.length) {
                onUpdateOrder(item.id, newOrder);
              } else {
                setOrderInput(currentOrder.toString());
              }
            }}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
          />
        </View>
        
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]}>
            {item.title || 'ไม่มีชื่อ'}
          </Text>
          <Text style={[styles.link, { color: colors.subText }]} numberOfLines={1}>
            {item.link || '-'}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={{ marginRight: 10 }}
          >
            <Ionicons name="create-outline" size={24} color={colors.primary || '#FF5722'} />
          </TouchableOpacity>
          <Switch value={item.isActive} onValueChange={() => onToggle(item.id)} />
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            style={{ marginLeft: 10 }}
          >
            <Ionicons name="trash-outline" size={24} color="red" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleEdit = (banner: any) => {
    navigation.navigate('AdminAddBanner', { banner });
  };

  const renderItem = ({ item, index }: any) => (
    <BannerItem
      item={item}
      index={index}
      onUpdateOrder={handleUpdateOrder}
      onToggle={handleToggle}
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="จัดการแบนเนอร์" />
      <FlatList
        data={banners}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={({ item, index }) => renderItem({ item, index })}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              ยังไม่มีแบนเนอร์
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AdminAddBanner')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  orderInput: {
    width: 50,
    height: 40,
    borderWidth: 2,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  image: {
    width: 80,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#eee',
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  link: {
    fontSize: 10,
    marginTop: 4,
  },
  hintText: {
    fontSize: 9,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});

