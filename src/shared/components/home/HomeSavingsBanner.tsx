// components/home/HomeSavingsBanner.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Product } from '@shared/interfaces/home';

export default function HomeSavingsBanner({ products }: { products: Product[] }) {
  const navigation = useNavigation<any>();
  const productSlice = products.slice(0, 3); // แสดงแค่ 3 ชิ้นแรก

  if (productSlice.length === 0) {
    return null;
  }

  const handleProductPress = (productId: number) => {
    navigation.navigate('ProductDetail', { productId });
  };

  return (
    <View style={styles.container}>
      <View style={styles.bannerInfo}>
        <Text style={styles.bannerTitle}>Super Savings Day | ลดสูงสุด 12%</Text>
        <Text style={styles.bannerSubtitle}>คุ้มไม่ไหว!</Text>
      </View>

      {/* แสดง Product Grid 3 ชิ้น */}
      <View style={styles.productGrid}>
        {productSlice.map((product) => {
          const displayPrice = product.discountPrice || product.price;
          const hasDiscount = product.discountPrice !== null && product.discountPrice < product.price;

          return (
            <TouchableOpacity
              key={product.id}
              style={styles.productItem}
              onPress={() => handleProductPress(product.id)}
            >
              <Image
                source={{ uri: (product.imageUrl && product.imageUrl.trim() !== '') ? product.imageUrl : 'https://via.placeholder.com/100' }}
                style={styles.productImage}
              />
              <Text style={styles.productPrice} numberOfLines={1}>
                ฿{displayPrice.toLocaleString()}
              </Text>
              {hasDiscount ? (
                <Text style={styles.originalPrice} numberOfLines={1}>
                  ฿{product.price.toLocaleString()}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFEB3B', // สีเหลือง
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  bannerInfo: {
    paddingBottom: 10,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  bannerSubtitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  productGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productItem: {
    width: '30%',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    backgroundColor: 'white',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF5722',
    textAlign: 'center',
  },
  originalPrice: {
    fontSize: 10,
    color: '#999',
    textDecorationLine: 'line-through',
    textAlign: 'center',
  },
});
