// screens/store/StoreProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import { useAuth } from '@app/providers/AuthContext';
import client from '@app/api/client';
import ProductCard from '@shared/components/common/ProductCard';
import { shareContent } from '@shared/utils/share';
import { collectCoupon } from '@app/services/couponService';

export default function StoreProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { storeId } = route.params;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStoreProfile();
  }, [storeId]);

  const fetchStoreProfile = async () => {
    try {
      setLoading(true);
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get(`/stores/${storeId}/profile`);
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const storeData = res?.data || res || {};

      console.log('Store Profile Data:', JSON.stringify(storeData, null, 2)); // Debug log
      console.log('Products:', storeData.products?.length || 0, 'items');
      if (storeData.products && storeData.products.length > 0) {
        console.log('First Product:', JSON.stringify(storeData.products[0], null, 2));
      }

      if (!storeData || !storeData.id) {
        Alert.alert('ผิดพลาด', 'ไม่พบข้อมูลร้านค้า');
        setData(null);
        return;
      }

      setData(storeData);
      setIsFollowing(storeData.isFollowing || false);
    } catch (error: any) {
      // ✅ Handle 429 error gracefully
      if (error?.response?.status === 429) {
        console.log('⚠️ Rate limit reached, retrying later...');
      } else {
        console.error('Error fetching store profile:', error);
        Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลร้านค้าได้');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนติดตามร้านค้า');
      return;
    }

    try {
      setIsFollowing(!isFollowing);
      await client.post(`/stores/${storeId}/follow`);
      // ✅ Refresh ข้อมูลร้านเพื่ออัปเดต followerCount
      await fetchStoreProfile();
    } catch (error: any) {
      setIsFollowing(!isFollowing);
      console.error('Toggle follow error:', error);
      const errorMessage = error.response?.data?.message || 'ไม่สามารถติดตามร้านค้าได้';
      Alert.alert('เกิดข้อผิดพลาด', errorMessage);
    }
  };

  // ✅ ฟังก์ชันกดแชร์ร้านค้า
  const handleShareStore = () => {
    if (!data) return;

    shareContent(
      `ร้าน ${data.name} บน BoxiFY`,
      `พบกับสินค้าคุณภาพดีจากร้าน ${data.name} พร้อมคูปองส่วนลดมากมาย`,
      `store/${data.id}`
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text }}>ไม่พบข้อมูลร้านค้า</Text>
        </View>
      </View>
    );
  }

  // --- UI Components ---

  const StoreHeader = () => (
    <ImageBackground
      source={{ uri: data.logo || 'https://via.placeholder.com/800x400/333/333' }}
      style={styles.headerBg}
      imageStyle={{ opacity: 0.6 }}
    >
      <View style={[styles.headerOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="search" size={16} color="#fff" />
            <TextInput
              placeholder="ค้นหาในร้านนี้"
              placeholderTextColor="rgba(255,255,255,0.7)"
              style={[styles.searchInput, { color: '#fff' }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* ✅ ปุ่มแชร์ร้านค้า */}
          <TouchableOpacity style={{ marginLeft: 10 }} onPress={handleShareStore}>
            <Ionicons name="share-social-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 15 }}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Store Info */}
        <View style={styles.storeInfoRow}>
          <Image
            source={{ uri: data.logo || 'https://placekitten.com/100/100' }}
            style={[styles.logo, { borderColor: '#fff' }]}
          />

          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.storeName}>{data.name}</Text>
              {/* ✅ ป้าย Mall */}
              {data.isMall && (
                <View style={styles.officialBadge}>
                  <Text style={styles.officialText}>Mall</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statTag, { backgroundColor: colors.primary }]}>
                <Text style={styles.statText}>⭐ {data.rating || 4.9}</Text>
              </View>
              <Text style={styles.statTextInfo}> ผู้ติดตาม {data.followerCount || 0}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View>
            <TouchableOpacity
              style={[
                styles.followBtn,
                { backgroundColor: colors.primary },
                isFollowing && [styles.followingBtn, { backgroundColor: 'transparent', borderColor: '#fff' }],
              ]}
              onPress={handleToggleFollow}
            >
              {isFollowing ? (
                <Text style={styles.followingText}>ติดตามแล้ว</Text>
              ) : (
                <Text style={styles.followText}>+ ติดตาม</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chatBtn, { borderColor: '#fff' }]}
              onPress={() => {
                if (!user) {
                  Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนเริ่มแชท');
                  return;
                }
                // ✅ สร้าง Room ID ที่ไม่ซ้ำกัน: chat_store_{storeId}_user_{userId}
                const uniqueRoomId = `chat_store_${data.id}_user_${user.id}`;
                navigation.navigate('Chat', { roomId: uniqueRoomId });
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fff" />
              <Text style={styles.chatText}> พูดคุย</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );

  // ✅ ฟังก์ชั่นเก็บคูปอง
  const handleCollectCoupon = async (couponId: number) => {
    if (!user) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบเพื่อเก็บคูปอง');
      return;
    }

    try {
      await collectCoupon(couponId);

      // อัปเดต state ในหน้าจอ
      setData((prev: any) => ({
        ...prev,
        coupons: prev.coupons.map((c: any) =>
          c.id === couponId ? { ...c, isCollected: true } : c
        )
      }));

      Alert.alert('สำเร็จ', 'เก็บคูปองเรียบร้อยแล้ว ใช้ได้ที่หน้าชำระเงินครับ');
    } catch (error: any) {
      console.error('Collect coupon error:', error);
      Alert.alert('ข้อผิดพลาด', error.message || 'เก็บคูปองไม่สำเร็จ');
    }
  };

  const CouponSection = () => {
    if (!data.coupons || data.coupons.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.couponScroll, { backgroundColor: colors.card }]}
      >
        {data.coupons.map((coupon: any) => {
          const isCollected = coupon.isCollected || false;
          return (
            <View key={coupon.id} style={[styles.couponCard, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.couponTitle, { color: colors.primary }]}>
                  ส่วนลด ฿{coupon.discountAmount || coupon.discountPercent + '%'}
                </Text>
                <Text style={[styles.couponSub, { color: colors.subText }]}>
                  ขั้นต่ำ ฿{coupon.minPurchase || 0}
                </Text>
                {coupon.expiresAt && (
                  <Text style={[styles.couponDate, { color: colors.subText }]}>
                    ใช้ได้ถึง: {new Date(coupon.expiresAt).toLocaleDateString('th-TH')}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.collectBtn,
                  { backgroundColor: isCollected ? colors.border : colors.primary }
                ]}
                disabled={isCollected}
                onPress={() => handleCollectCoupon(coupon.id)}
              >
                <Text style={{ color: isCollected ? colors.subText : '#fff', fontSize: 12, fontWeight: 'bold' }}>
                  {isCollected ? 'เก็บแล้ว' : 'เก็บ'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  // Filter products by search query
  const filteredProducts = data.products?.filter((product: any) => {
    if (!searchQuery.trim()) return true;
    return product.title?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  // Render Main List
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <FlatList
        data={filteredProducts}
        numColumns={2}
        keyExtractor={(item, index) => item?.id?.toString() || `item-${index}`}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => navigation.push('ProductDetail', { productId: item.id })}
          />
        )}
        ListHeaderComponent={() => (
          <>
            <StoreHeader />

            {/* Tabs */}
            <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={[styles.tabItem, styles.activeTab, { borderBottomColor: colors.primary }]}>
                <Text style={[styles.activeTabText, { color: colors.primary }]}>ร้านค้า</Text>
              </View>
              <View style={styles.tabItem}>
                <Text style={[styles.tabText, { color: colors.subText }]}>สินค้าทั้งหมด</Text>
              </View>
              <View style={styles.tabItem}>
                <Text style={[styles.tabText, { color: colors.subText }]}>สินค้าใหม่</Text>
              </View>
            </View>

            {/* Coupon Section */}
            <CouponSection />

            {/* Flash Sale Banner */}
            <View style={[styles.flashBanner, { backgroundColor: colors.card }]}>
              <Text style={[styles.flashTitle, { color: colors.primary }]}>⚡ FLASH SALE</Text>
              <Text style={[styles.flashTimer, { backgroundColor: colors.background, color: colors.text }]}>
                04 : 41 : 22
              </Text>
            </View>
          </>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color={colors.subText} />
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              {searchQuery ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้าในร้านนี้'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header Styles
  headerBg: {
    width: '100%',
    height: 180,
  },
  headerOverlay: {
    flex: 1,
    padding: 15,
    paddingTop: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    paddingHorizontal: 10,
    borderRadius: 4,
    height: 36,
  },
  searchInput: {
    flex: 1,
    marginLeft: 5,
    fontSize: 14,
  },
  storeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
  },
  storeName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'center',
  },
  statTag: {
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  statText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statTextInfo: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 8,
  },
  // Buttons
  followBtn: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
    alignItems: 'center',
  },
  followingBtn: {
    borderWidth: 1,
  },
  followText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  followingText: {
    color: '#fff',
    fontSize: 12,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 6,
    borderRadius: 4,
  },
  chatText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    height: 45,
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
  },
  activeTabText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Coupons
  couponScroll: {
    padding: 10,
    marginBottom: 10,
  },
  couponCard: {
    width: 220,
    height: 80,
    marginRight: 10,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
  },
  couponTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  couponSub: {
    fontSize: 10,
    marginTop: 2,
  },
  couponDate: {
    fontSize: 10,
    marginTop: 4,
  },
  collectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  // Flash Sale
  flashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
  },
  flashTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  flashTimer: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  officialBadge: {
    backgroundColor: '#D0011B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  officialText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

