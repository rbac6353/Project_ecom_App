// components/home/FlashSaleItem.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface FlashSaleItemProps {
  item: any;
  originalPrice?: number; // ราคาเดิม (ถ้ามี)
}

const FlashSaleItem: React.FC<FlashSaleItemProps> = ({ item, originalPrice }) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  // คำนวณ % การขายเพื่อทำ Progress Bar
  const soldPercentage = Math.min((item.sold / item.stock) * 100, 100);
  const isAlmostSoldOut = soldPercentage > 80;
  const isSoldOut = soldPercentage >= 100;
  const remainingStock = item.stock - item.sold;

  // คำนวณส่วนลด
  const discount = item.discount || (originalPrice && originalPrice > item.price
    ? Math.round(((originalPrice - item.price) / originalPrice) * 100)
    : 0);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      activeOpacity={0.8}
    >
      {/* Flash Sale Badge - มุมบนซ้าย */}
      <View style={styles.flashBadge}>
        <LinearGradient
          colors={['#FF6B35', '#FF8C42', '#FFA07A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.flashBadgeGradient}
        >
          <Ionicons name="flash" size={10} color="#fff" />
          <Text style={styles.flashBadgeText}>FLASH</Text>
        </LinearGradient>
      </View>

      {/* Discount Badge - มุมบนขวา */}
      {discount > 0 && (
        <View style={styles.discountBadge}>
          <LinearGradient
            colors={['#FF1744', '#FF5722']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.discountBadgeGradient}
          >
            <Text style={styles.discountText}>-{discount}%</Text>
          </LinearGradient>
        </View>
      )}

      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: (item.image && item.image.trim() !== '')
              ? item.image
              : 'https://via.placeholder.com/150x150.png?text=No+Image',
          }}
          style={styles.image}
          resizeMode="cover"
        />
        {/* Overlay เมื่อหมด */}
        {isSoldOut && (
          <View style={styles.soldOutOverlay}>
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>หมดแล้ว</Text>
            </View>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        {/* Price Section */}
        <View style={styles.priceSection}>
          {originalPrice && originalPrice > item.price && (
            <Text style={[styles.originalPrice, { color: colors.subText }]}>
              ฿{originalPrice.toLocaleString()}
            </Text>
          )}
          <Text style={[styles.price, { color: '#FF1744' }]}>
            ฿{item.price.toLocaleString()}
          </Text>
        </View>

        {/* Progress Bar Section */}
        <View style={styles.progressSection}>
          {/* Progress Bar Container */}
          <View style={styles.progressBarContainer}>
            <LinearGradient
              colors={
                isAlmostSoldOut
                  ? ['#FF1744', '#FF5722', '#FF6B35']
                  : ['#4CAF50', '#66BB6A', '#81C784']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${soldPercentage}%` }]}
            />
            {/* Fire Icon เมื่อใกล้หมด */}
            {isAlmostSoldOut && !isSoldOut && (
              <View style={styles.fireIconContainer}>
                <Ionicons name="flame" size={14} color="#FFD700" />
              </View>
            )}
          </View>

          {/* Status Text */}
          <View style={styles.statusRow}>
            {isSoldOut ? (
              <Text style={[styles.statusText, { color: '#FF1744' }]}>
                <Ionicons name="close-circle" size={12} /> หมดแล้ว
              </Text>
            ) : isAlmostSoldOut ? (
              <Text style={[styles.statusText, { color: '#FF5722' }]}>
                <Ionicons name="flame" size={12} /> ใกล้หมดแล้ว!
              </Text>
            ) : (
              <Text style={[styles.statusText, { color: colors.subText }]}>
                เหลือ {remainingStock} ชิ้น
              </Text>
            )}
            <Text style={[styles.soldText, { color: colors.subText }]}>
              ขายแล้ว {item.sold}/{item.stock}
            </Text>
          </View>
        </View>
      </View>

      {/* Hot Indicator - เมื่อขายดี */}
      {soldPercentage > 50 && !isSoldOut && (
        <View style={styles.hotIndicator}>
          <Ionicons name="flame" size={16} color="#FF6B35" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 150,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    position: 'relative',
  },
  flashBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    borderRadius: 4,
    overflow: 'hidden',
  },
  flashBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  flashBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  discountBadgeGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOutBadge: {
    backgroundColor: '#424242',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  soldOutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  info: {
    padding: 10,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressSection: {
    marginTop: 4,
  },
  progressBarContainer: {
    width: '100%',
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  fireIconContainer: {
    position: 'absolute',
    right: 4,
    top: 3,
    zIndex: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  soldText: {
    fontSize: 9,
  },
  hotIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
});

export default FlashSaleItem;
