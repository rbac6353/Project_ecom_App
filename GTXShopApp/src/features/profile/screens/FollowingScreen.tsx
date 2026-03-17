import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function FollowingScreen() {
  const navigation = useNavigation();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowing = async () => {
    try {
      setLoading(true);
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get('/stores/user/following');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const followingList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      // API คืนค่ามาเป็น Array ของ Relation [{ id: 1, store: {...} }, ...]
      // เรา map เอาแต่ store ออกมาใช้
      setStores(followingList.map((item: any) => item.store || item));
    } catch (error: any) {
      // ✅ Handle 429 error gracefully
      if (error?.response?.status === 429) {
        console.log('⚠️ Rate limit reached, retrying later...');
      } else {
        console.error('Fetch following error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFollowing();
    }, []),
  );

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.logo || 'https://placekitten.com/100/100' }}
        style={styles.logo}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.desc} numberOfLines={1}>
          {item.description || 'ร้านค้านี้ยังไม่มีรายละเอียด'}
        </Text>
      </View>
      <TouchableOpacity style={styles.visitBtn}>
        <Text style={styles.visitText}>ดูร้าน</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="ร้านที่ติดตาม" />

      {loading ? (
        <ActivityIndicator color="#FF5722" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={styles.empty}>คุณยังไม่ได้ติดตามร้านค้าใดๆ</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  desc: { fontSize: 12, color: '#999', marginTop: 4 },
  visitBtn: {
    borderWidth: 1,
    borderColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  visitText: { color: '#FF5722', fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' },
});

