// screens/seller/SellerProductListScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  TextInput,
  Switch,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import { useAuth } from '@app/providers/AuthContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

const { width } = Dimensions.get('window');

type FilterType = 'all' | 'active' | 'outOfStock' | 'inactive';

export default function SellerProductListScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    outOfStock: 0,
  });

  // ดึงข้อมูลร้านค้าและสินค้า
  const fetchData = async () => {
    try {
      let currentStore = null;

      if (user?.stores && user.stores.length > 0) {
        currentStore = user.stores[0];
      } else {
        const userData: any = await client.get('/auth/profile');
        const stores = userData?.stores || [];
        if (stores.length > 0) {
          currentStore = stores[0];
        }
      }

      if (currentStore) {
        // ✅ ดึงข้อมูลร้านค้าล่าสุด (รวม Logo) includeInactive=true
        try {
          const storeProfileResponse: any = await client.get(`/stores/${currentStore.id}/profile?includeInactive=true`);
          const storeData = storeProfileResponse?.data || storeProfileResponse || {};

          setStore({
            ...currentStore,
            ...storeData,
          });

          const productsList = storeData?.products || [];
          console.log('📦 Products Fetched:', productsList.length);
          if (productsList.length > 0) {
            console.log('🔍 Sample Product:', JSON.stringify(productsList[0], null, 2));
            console.log('🔍 Status Check:', productsList.map((p: any) => ({ id: p.id, active: p.isActive, qty: p.quantity })));
          }
          setProducts(Array.isArray(productsList) ? productsList : []);

          // Calculate stats
          const totalSales = productsList.reduce((sum: number, p: any) => sum + (p.sold || 0), 0);
          const outOfStock = productsList.filter((p: any) => (p.quantity || 0) <= 0).length;
          setStats({
            totalProducts: productsList.length,
            totalSales,
            outOfStock,
          });
        } catch (err) {
          console.error('Error fetching store profile:', err);
          // Fallback ถ้าดึง profile ไม่ได้
          setStore(currentStore);
        }
      }
    } catch (error: any) {
      if (error?.response?.status === 429) {
        console.log('⚠️ Rate limit reached, using cached data');
        if (user?.stores && user.stores.length > 0) {
          setStore(user.stores[0]);
        }
      } else {
        console.error('Error fetching products:', error);
        Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลสินค้าได้');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter products
  useEffect(() => {
    let result = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) =>
        (p.title || p.name || '').toLowerCase().includes(query)
      );
    }

    // Status filter
    switch (activeFilter) {
      case 'active':
        result = result.filter((p) => p.isActive && (p.quantity || 0) > 0);
        break;
      case 'outOfStock':
        result = result.filter((p) => (p.quantity || 0) <= 0);
        break;
      case 'inactive':
        result = result.filter((p) => !p.isActive);
        break;
    }

    setFilteredProducts(result);
  }, [products, searchQuery, activeFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [user])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleEditProduct = (product: any) => {
    navigation.navigate('AddProduct', { productId: product.id, product });
  };

  const handleDeleteProduct = (product: any) => {
    Alert.alert(
      'ยืนยันการลบ',
      `คุณต้องการลบสินค้า "${product?.title || product?.name || 'สินค้านี้'}" ใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/products/${product.id}`);
              Alert.alert('สำเร็จ', 'ลบสินค้าเรียบร้อยแล้ว');
              fetchData();
            } catch (error: any) {
              console.error('Delete product error:', error);
              Alert.alert('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถลบสินค้าได้');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (product: any) => {
    try {
      await client.patch(`/products/${product.id}/toggle-status`);
      fetchData();
    } catch (error: any) {
      console.error('Toggle status error:', error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProduct');
  };

  const getImageUrl = (product: any) => {
    if (product.images && product.images.length > 0) {
      return product.images[0].url;
    }
    return 'https://via.placeholder.com/100';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH').format(price);
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'active', label: 'เปิดขาย' },
    { key: 'outOfStock', label: 'หมดสต็อก' },
    { key: 'inactive', label: 'ปิดขาย' },
  ];

  const renderProductItem = ({ item }: { item: any }) => {
    const isOutOfStock = (item.quantity || 0) <= 0;

    return (
      <TouchableOpacity
        style={[styles.productItem, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        activeOpacity={0.7}
      >
        {/* Product Image */}
        <Image source={{ uri: getImageUrl(item) }} style={styles.productImage} />

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={[styles.productTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title || item.name}
          </Text>

          <Text style={[styles.productPrice, { color: colors.primary }]}>
            ฿{formatPrice(parseFloat(item.price || 0))}
          </Text>

          <View style={styles.productStats}>
            <View style={styles.statItem}>
              <Ionicons name="cube-outline" size={14} color={isOutOfStock ? '#FF3B30' : colors.subText} />
              <Text style={[styles.statText, { color: isOutOfStock ? '#FF3B30' : colors.subText }]}>
                {item.quantity || 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cart-outline" size={14} color={colors.subText} />
              <Text style={[styles.statText, { color: colors.subText }]}>
                {item.sold || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.productActions}>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggleActive(item)}
            trackColor={{ false: '#ccc', true: colors.primary + '80' }}
            thumbColor={item.isActive ? colors.primary : '#f4f3f4'}
            style={styles.switch}
          />

          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => handleEditProduct(item)}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => handleDeleteProduct(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="สินค้าของฉัน" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="สินค้าของฉัน" />
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={64} color={colors.subText} />
          <Text style={[styles.emptyText, { color: colors.subText }]}>
            คุณยังไม่มีร้านค้า
          </Text>
          <TouchableOpacity
            style={[styles.createStoreBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('CreateStore')}
          >
            <Text style={styles.createStoreBtnText}>สร้างร้านค้าใหม่</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="สินค้าของฉัน" />

      {/* Store Header with Stats */}
      <View style={[styles.storeHeader, { backgroundColor: colors.card }]}>
        <View style={styles.storeInfoRow}>
          {store.logo ? (
            <Image
              source={{ uri: store.logo }}
              style={styles.storeLogo}
            />
          ) : (
            <View style={[styles.storeLogo, styles.logoPlaceholder]}>
              <Ionicons name="storefront" size={24} color="#999" />
            </View>
          )}
          <Text style={[styles.storeName, { color: colors.text }]} numberOfLines={1}>
            {store.name}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {stats.totalProducts}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>สินค้า</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {stats.totalSales}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>ขายแล้ว</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: stats.outOfStock > 0 ? '#FF3B30' : colors.primary }]}>
              {stats.outOfStock}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>หมดสต็อก</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.subText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="ค้นหาสินค้า..."
            placeholderTextColor={colors.subText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.subText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              activeFilter === filter.key && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === filter.key ? '#fff' : colors.subText },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={colors.subText} />
          <Text style={[styles.emptyText, { color: colors.subText }]}>
            {searchQuery || activeFilter !== 'all' ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้า'}
          </Text>
          {!searchQuery && activeFilter === 'all' && (
            <Text style={[styles.emptySubtext, { color: colors.subText }]}>
              เพิ่มสินค้าแรกของคุณเลย!
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddProduct}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  // Store Header
  storeHeader: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    marginRight: 12,
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  // Filters
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Product Item
  productItem: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  productStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  productActions: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  actionIcon: {
    padding: 6,
  },
  // List
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  createStoreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  createStoreBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
