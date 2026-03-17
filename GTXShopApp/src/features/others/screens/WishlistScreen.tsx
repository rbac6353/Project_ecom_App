import React, { useCallback, useState, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import ProductCard from '@shared/components/common/ProductCard';
import { useTheme } from '@app/providers/ThemeContext';
import * as wishlistService from '@app/services/wishlistService';
import { useWishlist } from '@app/providers/WishlistContext';

export default function WishlistScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { wishlistIds, refreshWishlist } = useWishlist();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await wishlistService.getWishlist();
      // ✅ เพิ่มการเช็ค type ก่อน map
      if (!Array.isArray(data)) {
        console.warn('Wishlist data is not an array:', data);
        setProducts([]);
        return;
      }
      // API คืนค่ามาเป็น Wishlist Object เราต้องดึง product ออกมา
      const productList = data.map((item: any) => {
        const product = item.product || {};
        // Normalize product data
        let imageUrl = 'https://via.placeholder.com/150';
        if (product.images && product.images.length > 0) {
          imageUrl = product.images[0].url || product.images[0] || imageUrl;
        }
        return {
          id: product.id,
          title: product.title || product.name || 'Unknown Product',
          price: product.price || 0,
          discountPrice: product.discountPrice || null,
          imageUrl: imageUrl,
          storeName: product.store?.name || 'BoxiFY Mall',
          product: product, // ✅ เพิ่ม product object เพื่อให้ ProductCard ดึง store.isMall ได้
        };
      });
      setProducts(productList);
    } catch (error) {
      console.error('Load wishlist error:', error);
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลใหม่ทุกครั้งที่เข้ามาหน้านี้
  useFocusEffect(
    useCallback(() => {
      loadData();
      // Sync Context ให้ตรงกัน (แต่ไม่ใส่ใน dependency เพื่อไม่ให้เกิด infinite loop)
      refreshWishlist();
    }, []), // ไม่ใส่ wishlistIds เพื่อไม่ให้เกิด infinite loop
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="รายการโปรด" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title={`รายการโปรด (${products.length})`} />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.subText }]}>
            คุณยังไม่ได้เพิ่มสินค้าลงในรายการที่อยากได้ของคุณ
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={`รายการโปรด (${products.length})`} />
      <FlatList
        data={products}
        keyExtractor={(item, index) => item?.id?.toString() || `wishlist-${index}`}
        numColumns={2}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
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
        )}
      />
      
      {/* Gradient Fade - ไล่สีจากโปร่งใสด้านบน → ขาวด้านล่าง */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0)', '#FFFFFF']}
        style={[styles.bottomGradient, { height: 90 + insets.bottom }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});

