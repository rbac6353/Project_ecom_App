// screens/HomeScreen.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, FlatList, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '@app/api/client';
import { Category, Product } from '@shared/interfaces/home';
import * as productService from '@app/services/productService';
import { useTheme } from '@app/providers/ThemeContext';
import { useAuth } from '@app/providers/AuthContext';

// Import Components
import HomeHeader from '@shared/components/home/HomeHeader';
import HomePromoBanner from '@shared/components/home/HomePromoBanner';
import HomeServiceCards from '@shared/components/home/HomeServiceCards';
import HomeIconMenu from '@shared/components/home/HomeIconMenu';
import ProductCard from '@shared/components/common/ProductCard';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);

  // ฟังก์ชัน map product data
  const mapProducts = (productsData: any[]): Product[] => {
    return productsData.map((p: any) => {
      const imageUrl = p.images && p.images.length > 0 ? p.images[0].url : 'https://via.placeholder.com/600';
      return {
        id: p.id,
        title: p.title || '',
        price: p.price || 0,
        discountPrice: p.discountPrice || null,
        imageUrl,
        storeName: p.store ? p.store.name : 'BoxiFY Mall',
        product: p,
      };
    });
  };

  const fetchData = useCallback(async (categoryId: number | null = null, pageNum: number = 1, isLoadMore: boolean = false) => {
    // ป้องกันการเรียกซ้ำ
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    if (!isLoadMore) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // 🎯 API 1: GET /categories (ดึงเมนูไอคอน) - ดึงแค่ครั้งแรก
      if (categories.length === 0) {
        const categoriesResponse = await api.get('/categories');
        const categoriesData = Array.isArray(categoriesResponse) 
          ? categoriesResponse 
          : (categoriesResponse?.data || []);
        setCategories(categoriesData.filter((c: any) => c.name !== 'สินค้าทั่วไป'));
      }

      // ✅ API 2: ดึงสินค้าตามหมวดหมู่ที่เลือก
      let productsData: any[] = [];
      let totalPages = 1;

      if (categoryId) {
        // ถ้าเลือกหมวดหมู่ ให้ดึงสินค้าตามหมวดหมู่นั้น
        const productsResponse = await productService.getProducts(categoryId, pageNum, 10);
        if (Array.isArray(productsResponse)) {
          productsData = productsResponse;
        } else if (productsResponse?.data && Array.isArray(productsResponse.data)) {
          productsData = productsResponse.data;
          totalPages = productsResponse.last_page || 1;
        } else {
          productsData = [];
        }
      } else {
        // ดึงสินค้าทั้งหมด (ไม่จำกัดหมวดหมู่)
        const productsResponse = await productService.getProducts(undefined, pageNum, 10);
        console.log('📦 Products Response:', {
          is_array: Array.isArray(productsResponse),
          has_data: !!productsResponse?.data,
          type: typeof productsResponse,
          page: pageNum,
        });
        if (Array.isArray(productsResponse)) {
          productsData = productsResponse;
        } else if (productsResponse?.data && Array.isArray(productsResponse.data)) {
          productsData = productsResponse.data;
          totalPages = productsResponse.last_page || 1;
        } else {
          productsData = [];
        }
      }

      console.log('✅ Products Data:', {
        length: productsData.length,
        page: pageNum,
        totalPages,
      });

      const mappedProducts = mapProducts(productsData);

      if (isLoadMore) {
        setRecommendedProducts(prev => [...prev, ...mappedProducts]);
      } else {
        setRecommendedProducts(mappedProducts);
      }

      // ตรวจสอบว่ายังมีข้อมูลให้โหลดอีกไหม
      setHasMore(pageNum < totalPages && productsData.length > 0);

    } catch (error: any) {
      console.error('Error fetching home data:', error);
      if (!isLoadMore) {
        const errorMessage = error.message === 'Network Error'
          ? 'ไม่สามารถเชื่อมต่อกับ Backend Server ได้\n\nกรุณาตรวจสอบ:\n1. Backend server กำลังรันอยู่\n2. Device และ Computer อยู่ใน network เดียวกัน\n3. Firewall อนุญาตให้เชื่อมต่อ port 3000'
          : 'ไม่สามารถดึงข้อมูลหน้า Home ได้ กรุณาตรวจสอบ Backend';
        Alert.alert('Error', errorMessage);
        setCategories([]);
        setRecommendedProducts([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [user, categories.length]);

  // ฟังก์ชันสำหรับจัดการเมื่อเปลี่ยนหมวดหมู่
  const handleCategoryChange = useCallback((categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
    setHasMore(true);
    setRecommendedProducts([]);
    fetchData(categoryId, 1, false);
  }, [fetchData]);

  // ฟังก์ชัน Load More เมื่อเลื่อนใกล้ล่างสุด
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(selectedCategoryId, nextPage, true);
    }
  }, [isLoadingMore, isLoading, hasMore, page, selectedCategoryId, fetchData]);

  // ดึงหมวดหมู่ล่าสุดทุกครั้งที่โฟกัสที่หน้า Home (ให้เห็นหมวดหมู่ที่ seed / แก้ไขจาก Backend)
  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get('/categories');
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setCategories(list.filter((c: any) => c.name !== 'สินค้าทั่วไป'));
    } catch (e) {
      console.error('Failed to fetch categories', e);
    }
  }, []);

  // ดึงข้อมูลครั้งแรกเมื่อ component mount
  useEffect(() => {
    fetchData(null, 1, false);
  }, []); // เรียกแค่ครั้งเดียวเมื่อ mount

  // ทุกครั้งที่กลับมาหน้า Home: รีเฟรชหมวดหมู่ (ให้แสดงหมวดหมู่ล่าสุดจาก Backend)
  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      // ถ้ายังไม่ได้เลือกหมวดหมู่ และยังไม่มีสินค้า ให้ดึงสินค้า Just for you
      if (selectedCategoryId === null && recommendedProducts.length === 0) {
        fetchData(null, 1, false);
      }
    }, [fetchCategories, selectedCategoryId, recommendedProducts.length, fetchData])
  );

  // Render product item
  const renderProduct = useCallback(({ item, index }: { item: Product; index: number }) => (
    <View style={styles.productItem}>
      <ProductCard
        product={item.product || item}
        id={item.id}
        title={item.title}
        price={item.price}
        discountPrice={item.discountPrice}
        imageUrl={item.imageUrl}
        storeName={item.storeName}
      />
    </View>
  ), []);

  // Render footer (loading indicator)
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingMoreText, { color: colors.subText }]}>กำลังโหลด...</Text>
      </View>
    );
  }, [isLoadingMore, colors]);

  // Header component
  const ListHeader = useCallback(() => (
    <>
      {/* Promotional Banner (สีส้ม) */}
      <HomePromoBanner />

      {/* Service Cards Section */}
      <HomeServiceCards />

      {/* Categories Section (Horizontal Tabs) */}
      <HomeIconMenu 
        categories={categories} 
        onCategoryChange={handleCategoryChange}
        selectedCategoryId={selectedCategoryId}
      />

      {/* Title */}
      <View style={[styles.promoArea, { backgroundColor: colors.card }]}>
        <Text style={[styles.recommendTitle, { color: colors.text }]}>
          {selectedCategoryId 
            ? categories.find(c => c.id === selectedCategoryId)?.name || 'Products'
            : 'สินค้าทั้งหมด'
          }
        </Text>
      </View>
    </>
  ), [categories, selectedCategoryId, handleCategoryChange, colors]);

  // Skeleton loading
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <View key={item} style={[styles.skeletonItem, { backgroundColor: colors.border }]} />
      ))}
    </View>
  );

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      edges={['top']}
    >
      <HomeHeader />
      
      <FlatList
        key="product-grid-2cols"
        data={recommendedProducts}
        renderItem={renderProduct}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={isLoading && recommendedProducts.length === 0 ? renderSkeleton : renderFooter}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.subText }]}>ไม่พบสินค้า</Text>
          </View>
        ) : null}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: 90 + insets.bottom }]}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />
      
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
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 0,
  },
  promoArea: {
    paddingHorizontal: 15,
    marginBottom: 10,
    marginTop: 5,
    borderRadius: 25,
    paddingVertical: 12,
  },
  recommendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingTop: 3,
    paddingBottom: 3,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  productItem: {
    width: '48%',
    marginBottom: 10,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  skeletonItem: {
    width: '48%',
    height: 250,
    borderRadius: 12,
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
  },
});
