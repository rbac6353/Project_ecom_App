// screens/FlashSaleScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import api from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import FlashSaleItem from '@shared/components/home/FlashSaleItem';

export default function FlashSaleScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Logic นับถอยหลัง
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [endTime, setEndTime] = useState<Date | null>(null);

  // Timer สำหรับนับถอยหลัง (ใช้ endTime จาก API)
  useEffect(() => {
    if (!endTime) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = Math.max(0, end - now);

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ h, m, s });
    };

    updateTimer(); // อัปเดตทันที
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  // ดึงข้อมูล Flash Sale จาก API
  const fetchFlashSaleProducts = useCallback(async (pageNumber: number = 1, isRefresh = false) => {
    if (!hasMore && !isRefresh && pageNumber > 1) return;

    if (pageNumber === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // ⚠️ สำคัญ: api.get() return data โดยตรง (ไม่ใช่ response object)
      // เพราะ response interceptor แกะ response แล้ว
      const data = await api.get('/flash-sales/current') as any;

      console.log('⚡ Flash Sale API Response:', data);

      // ตรวจสอบและดึงข้อมูล products จาก response
      let products: any[] = [];
      
      if (data && data.flashSale && data.flashSale.items) {
        // ใช้ข้อมูลจาก Flash Sale Campaign ใหม่
        products = data.flashSale.items.map((item: any) => item.product);
      } else if (Array.isArray(data)) {
        products = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        products = data.data;
      } else if (data && typeof data === 'object' && Array.isArray(data.items)) {
        products = data.items;
      } else {
        console.warn('⚠️ Flash Sale API returned invalid data structure:', {
          data: data,
          dataType: typeof data,
          isArray: Array.isArray(data),
          keys: data && typeof data === 'object' ? Object.keys(data) : null,
        });
        if (isRefresh || pageNumber === 1) {
          setFlashSaleProducts([]);
        }
        setHasMore(false);
        return;
      }

      // Map ข้อมูลสินค้าให้ตรงกับ FlashSaleItem
      // ถ้าเป็น Flash Sale Campaign ใหม่ จะมี flashSaleItem มาด้วย
      const flashSaleData = data?.flashSale;
      const mappedProducts = products.map((p: any, index: number) => {
        // หา FlashSaleItem ที่ตรงกับสินค้านี้
        const flashSaleItem = flashSaleData?.items?.[index];
        
        const originalPrice = p.price || 0;
        // ใช้ราคา Flash Sale ถ้ามี (ตรงกับ database: discountPrice)
        const discountPrice = flashSaleItem?.discountPrice || p.discountPrice || originalPrice;
        const discount = originalPrice > 0
          ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
          : 0;

        // ใช้ข้อมูล sold และ stock จาก FlashSaleItem (ตรงกับ database: limitStock)
        const stock = flashSaleItem?.limitStock || p.quantity || 100;
        const sold = flashSaleItem?.sold || 0;

        // ดึงรูปภาพ - รองรับทั้ง secure_url และ url
        let imageUrl = 'https://via.placeholder.com/150';
        if (p.images && Array.isArray(p.images) && p.images.length > 0) {
          const firstImage = p.images[0];
          imageUrl = firstImage.secure_url || firstImage.url || imageUrl;
        } else if (p.imageUrl) {
          imageUrl = p.imageUrl;
        }

        return {
          id: p.id,
          image: imageUrl,
          price: discountPrice,
          originalPrice: originalPrice, // เพิ่มราคาเดิม
          discount: discount,
          sold: sold,
          stock: stock,
        };
      });

      if (isRefresh || pageNumber === 1) {
        setFlashSaleProducts(mappedProducts);
      } else {
        setFlashSaleProducts(prev => [...prev, ...mappedProducts]);
      }

      // อัปเดต endTime สำหรับ countdown timer
      if (flashSaleData?.endTime) {
        setEndTime(new Date(flashSaleData.endTime));
      }

      // Flash Sale ไม่มี pagination (แสดงทั้งหมดในรอบ)
      setHasMore(false);
      console.log(`✅ Flash Sale loaded: ${mappedProducts.length} products`);
    } catch (error: any) {
      console.error('❌ Error fetching flash sale products:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      if (pageNumber === 1) {
        setFlashSaleProducts([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [hasMore]);

  // โหลดข้อมูลเมื่อเข้าหน้า
  useFocusEffect(
    useCallback(() => {
      fetchFlashSaleProducts(1, true);
      setPage(1);
      setHasMore(true);
    }, [])
  );

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchFlashSaleProducts(1, true);
    setRefreshing(false);
  }, [fetchFlashSaleProducts]);

  // Load more
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFlashSaleProducts(nextPage);
    }
  }, [page, loadingMore, hasMore, fetchFlashSaleProducts]);

  // Render Header with Timer
  const renderHeader = () => (
    <View style={[styles.headerContainer, { backgroundColor: colors.card }]}>
      <View style={styles.titleRow}>
        <Ionicons name="flash" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.primary }]}>FLASH SALE</Text>
      </View>
      <View style={styles.timerContainer}>
        <Text style={[styles.timerLabel, { color: colors.subText }]}>เหลือเวลา:</Text>
        <View style={[styles.timeBox, { backgroundColor: colors.text }]}>
          <Text style={styles.timeText}>{formatTime(timeLeft.h)}</Text>
        </View>
        <Text style={[styles.colon, { color: colors.text }]}>:</Text>
        <View style={[styles.timeBox, { backgroundColor: colors.text }]}>
          <Text style={styles.timeText}>{formatTime(timeLeft.m)}</Text>
        </View>
        <Text style={[styles.colon, { color: colors.text }]}>:</Text>
        <View style={[styles.timeBox, { backgroundColor: colors.text }]}>
          <Text style={styles.timeText}>{formatTime(timeLeft.s)}</Text>
        </View>
      </View>
    </View>
  );

  // Render Footer (Loading indicator)
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  // Render Empty State
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="flash-outline" size={64} color={colors.subText} />
      <Text style={[styles.emptyText, { color: colors.text }]}>ไม่มีสินค้า Flash Sale</Text>
      <Text style={[styles.emptySubText, { color: colors.subText }]}>
        รอสินค้าโปรโมชั่นพิเศษเร็วๆ นี้
      </Text>
    </View>
  );

  if (loading && flashSaleProducts.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScreenHeader title="Flash Sale" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScreenHeader title="Flash Sale" />
      
      <FlatList
        data={flashSaleProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <View style={styles.itemContainer}>
              <FlashSaleItem item={item} originalPrice={item.originalPrice} />
            </View>
          </View>
        )}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          flashSaleProducts.length === 0 && styles.emptyListContent
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
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
  headerContainer: {
    padding: 16,
    marginBottom: 10,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  timeBox: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  colon: {
    marginHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 10,
  },
  itemWrapper: {
    flex: 1,
    maxWidth: '48%',
    marginBottom: 10,
    alignItems: 'center',
  },
  itemContainer: {
    width: '100%',
    maxWidth: 160,
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
  },
});
