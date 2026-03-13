// screens/ProductListScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Alert, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import api from '@app/api/client';
import ProductCard from '@shared/components/common/ProductCard';
import * as productService from '@app/services/productService';

// 💡 โครงสร้าง Product ที่อิงจาก SQL
interface Product {
    id: number;
    title: string;
    price: number;
    discountPrice: number | null;
    images: { url: string }[];
    store: { name: string } | null;
}

export default function ProductListScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [otherProducts, setOtherProducts] = useState<Product[]>([]); // สินค้าอื่นๆ (visual search)
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { query, categoryId, categoryName, products: preloadedProducts, otherProducts: preloadedOtherProducts } = route?.params || {};
  const [searchQuery, setSearchQuery] = useState(query || '');
  const [sortBy, setSortBy] = useState('related');
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // ฟังก์ชันโหลดข้อมูล
  const fetchProducts = useCallback(async (pageNumber: number, isRefresh = false) => {
    // ถ้ามี products ที่ส่งมาแล้ว (จาก visual search) ให้ใช้เลย
    if (preloadedProducts && Array.isArray(preloadedProducts) && pageNumber === 1) {
      const mappedProducts = preloadedProducts.map((p: any) => ({
        id: p.id,
        title: p.title || '',
        price: (p.price !== null && p.price !== undefined) ? p.price : 0,
        discountPrice: p.discountPrice !== null && p.discountPrice !== undefined ? p.discountPrice : null,
        imageUrl: p.images && p.images.length > 0 ? p.images[0].url : 'https://via.placeholder.com/600',
        storeName: p.store ? p.store.name : 'BoxiFY Mall',
        product: p,
      }));
      setProducts(mappedProducts);
      setOtherProducts(
        Array.isArray(preloadedOtherProducts) && preloadedOtherProducts.length > 0
          ? preloadedOtherProducts.map((p: any) => ({
              id: p.id,
              title: p.title || '',
              price: (p.price !== null && p.price !== undefined) ? p.price : 0,
              discountPrice: p.discountPrice != null ? p.discountPrice : null,
              imageUrl: p.images?.length > 0 ? p.images[0].url : 'https://via.placeholder.com/600',
              storeName: p.store?.name || 'BoxiFY Mall',
              product: p,
            }))
          : []
      );
      setHasMore(false);
      setLoading(false);
      return;
    }

    if (!hasMore && !isRefresh) return;

    if (pageNumber === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const searchTerm = searchQuery || query;
      
      // ใช้ productService ที่รองรับ pagination
      const response = await productService.getProducts(
        categoryId ? Number(categoryId) : undefined,
        pageNumber,
        10,
        searchTerm && searchTerm.trim() ? searchTerm.trim() : undefined,
        sortBy === 'related' || sortBy === 'newest' ? undefined : sortBy,
        minPrice ? Number(minPrice) : undefined,
        maxPrice ? Number(maxPrice) : undefined,
      );

      // Mapping ข้อมูล
      const mappedProducts = response.data.map((p: any) => ({
        id: p.id,
        title: p.title || '',
        price: (p.price !== null && p.price !== undefined) ? p.price : 0,
        discountPrice: p.discountPrice !== null && p.discountPrice !== undefined ? p.discountPrice : null,
        imageUrl: p.images && p.images.length > 0 ? p.images[0].url : 'https://via.placeholder.com/600',
        storeName: p.store ? p.store.name : 'BoxiFY Mall',
        product: p, // ✅ เพิ่ม product object เพื่อให้ ProductCard ดึง store.isMall ได้
      }));

      if (isRefresh) {
        setProducts(mappedProducts); // ถ้า Refresh ให้แทนที่เลย
      } else {
        setProducts(prev => [...prev, ...mappedProducts]); // ถ้า Load More ให้เอามาต่อท้าย
      }

      // เช็คว่าหมดหน้าหรือยัง
      setHasMore(response.page < response.last_page);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      if (pageNumber === 1) {
        Alert.alert('Error', 'ไม่พบสินค้าที่ค้นหา');
        setProducts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, query, categoryId, preloadedProducts, hasMore, sortBy, minPrice, maxPrice]);

  // โหลดครั้งแรก
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
  }, [categoryId]);

  // เมื่อเปลี่ยน Sort หรือ Price Filter ให้โหลดใหม่ตั้งแต่หน้า 1
  useEffect(() => {
    if (preloadedProducts) return; // ไม่ต้องโหลดใหม่ถ้าเป็น visual search
    setPage(1);
    setHasMore(true);
    setProducts([]); // เคลียร์ของเก่าก่อนเพื่อให้รู้ว่าเปลี่ยนแล้ว
    fetchProducts(1, true);
  }, [sortBy]);

  // ฟังก์ชันกด Apply ราคา
  const applyPriceFilter = () => {
    setShowPriceFilter(false);
    setPage(1);
    setHasMore(true);
    setProducts([]);
    fetchProducts(1, true);
  };

  // ฟังก์ชันเคลียร์ตัวกรองราคา
  const clearPriceFilter = () => {
    setMinPrice('');
    setMaxPrice('');
    setShowPriceFilter(false);
    setPage(1);
    setHasMore(true);
    setProducts([]);
    fetchProducts(1, true);
  };

  // ฟังก์ชันเมื่อเลื่อนลงสุดขอบ (End Reached)
  const handleLoadMore = () => {
    if (!loadingMore && !loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage);
    }
  };

  // ฟังก์ชัน Pull to Refresh
  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
  };

  const handleSearch = () => {
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
  };

  const renderProduct = ({ item }: { item: any }) => (
    // ✅ ส่ง product object เพื่อให้ ProductCard ดึง store.isMall ได้
    <ProductCard 
      product={item.product || item}
      id={item.id}
      title={item.title}
      price={item.price}
      discountPrice={item.discountPrice}
      imageUrl={item.imageUrl}
      storeName={item.storeName}
    />
  );

  // --- UI Components ---

  const FilterBar = () => {
    return (
      <View style={[styles.filterBar, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            { backgroundColor: colors.background },
            sortBy === 'related' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSortBy('related')}
        >
          <Text
            style={[
              styles.filterText,
              { color: colors.text },
              sortBy === 'related' && { color: '#fff' },
            ]}
          >
            เกี่ยวข้อง
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            { backgroundColor: colors.background },
            sortBy === 'newest' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSortBy('newest')}
        >
          <Text
            style={[
              styles.filterText,
              { color: colors.text },
              sortBy === 'newest' && { color: '#fff' },
            ]}
          >
            ล่าสุด
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            { backgroundColor: colors.background },
            sortBy === 'sold' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSortBy('sold')}
        >
          <Text
            style={[
              styles.filterText,
              { color: colors.text },
              sortBy === 'sold' && { color: '#fff' },
            ]}
          >
            สินค้าขายดี
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            { backgroundColor: colors.background },
            (sortBy === 'price_asc' || sortBy === 'price_desc') && { backgroundColor: colors.primary },
          ]}
          onPress={() =>
            setSortBy(sortBy === 'price_asc' ? 'price_desc' : 'price_asc')
          }
        >
          <Text
            style={[
              styles.filterText,
              { color: colors.text },
              sortBy.includes('price') && { color: '#fff' },
            ]}
          >
            ราคา{' '}
            {sortBy === 'price_asc'
              ? '▲'
              : sortBy === 'price_desc'
              ? '▼'
              : '↕'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const ListHeader = () => {
    const displayQuery = searchQuery || query;
    return (
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={24} color={colors.icon} />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Text style={[styles.searchText, { color: colors.text }]} numberOfLines={1}>
            {displayQuery ? displayQuery : 'สินค้าทั้งหมด'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowPriceFilter(true)}
        >
          <Text style={styles.filterButtonText}>ตัวกรอง</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={{ padding: 10 }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (otherProducts.length > 0) {
      return (
        <View style={styles.otherSection}>
          <Text style={[styles.otherSectionTitle, { color: colors.subText }]}>สินค้าอื่นๆ</Text>
          <View style={styles.otherSectionGrid}>
            {otherProducts.map((item: any, index: number) => (
              <View key={item.id.toString() + '_other_' + index} style={styles.otherSectionItem}>
                {renderProduct({ item })}
              </View>
            ))}
          </View>
        </View>
      );
    }
    return null;
  };

  if (loading && page === 1) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ListHeader />
        <FilterBar />
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  console.log(
    '🔍 ProductListScreen render - products:',
    products.length,
    'sortBy:',
    sortBy,
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item, index) => item.id.toString() + index}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        style={styles.list}
        ListHeaderComponent={
          <>
            <ListHeader />
            <FilterBar />
            <View style={styles.resultContainer}>
              <Text style={[styles.resultCount, { color: colors.text }]}>
                พบสินค้า {products.length + (otherProducts?.length || 0)} รายการ
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={() => (
          <Text style={{ color: colors.subText }}>ไม่พบสินค้าที่ค้นหา</Text>
        )}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onRefresh={handleRefresh}
        refreshing={loading && page === 1}
      />

      <Modal
        visible={showPriceFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPriceFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>ช่วงราคา</Text>
            <View style={styles.priceInputRow}>
              <TextInput
                style={[styles.priceInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="ต่ำสุด"
                placeholderTextColor={colors.subText}
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
              />
              <Text style={{ marginHorizontal: 10, color: colors.text }}>-</Text>
              <TextInput
                style={[styles.priceInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="สูงสุด"
                placeholderTextColor={colors.subText}
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={clearPriceFilter}
                style={[styles.cancelBtn, { backgroundColor: colors.background }]}
              >
                <Text style={{ color: colors.text }}>เคลียร์</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowPriceFilter(false)}
                style={[styles.cancelBtn, { backgroundColor: colors.background }]}
              >
                <Text style={{ color: colors.text }}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyPriceFilter} style={[styles.applyBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff' }}>ตกลง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gradient Fade - ไล่สีจากโปร่งใสด้านบน → ขาวด้านล่าง */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0)', '#FFFFFF']}
        style={[styles.bottomGradient, { height: 90 + insets.bottom }]}
        pointerEvents="none"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 5 },
  columnWrapper: { justifyContent: 'space-between' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    height: 36,
    marginHorizontal: 10,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, paddingHorizontal: 5, fontSize: 14 },
  searchText: { fontSize: 16, flex: 1 },
  resultContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 8,
  },
  filterButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  filterBar: {
    flexDirection: 'row',
    height: 44,
    borderBottomWidth: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    zIndex: 100,
  },
  filterBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    height: '100%',
    position: 'relative',
    borderRadius: 4,
    marginHorizontal: 2,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    textAlign: 'center',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  otherSection: {
    marginTop: 24,
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  otherSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  otherSectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  otherSectionItem: {
    width: '48%',
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 5,
  },
  applyBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 5,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});

