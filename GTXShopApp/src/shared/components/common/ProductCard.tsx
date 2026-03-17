// components/common/ProductCard.tsx
import React, { memo, useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import FadeInImage from './FadeInImage';
import { useTheme } from '@app/providers/ThemeContext';
import { useWishlist } from '@app/providers/WishlistContext';
import { useCart } from '@app/providers/CartContext';
import { shareContent } from '@shared/utils/share';
import SelectVariantModal from './SelectVariantModal';

const { width } = Dimensions.get('window');
const cardWidth = (width / 2) - 15; // 2 คอลัมน์ ลบ margin

// Helper Function: แปลงตัวเลข (เช่น 1200 -> 1.2k)
const formatCount = (num: number) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

// 💡 ใช้โครงสร้างข้อมูลที่อิงจากตาราง Product (SQL)
// รองรับทั้ง individual props และ product object
interface ProductCardProps {
  // แบบ individual props (สำหรับ backward compatibility)
  id?: number;
  title?: string;
  price?: number;
  discountPrice?: number | null;
  imageUrl?: string;
  storeName?: string;
  // แบบ product object (สำหรับ StoreProfileScreen)
  product?: any;
  // Optional onPress handler
  onPress?: () => void;
  // ✅ Optional style override (สำหรับหน้าหมวดหมู่)
  style?: any;
}

const ProductCard = (props: ProductCardProps) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();

  // ✅ รองรับทั้ง 2 แบบ: individual props หรือ product object
  const product = props.product || props;
  const id = product.id || props.id;
  const title = product.title || props.title || product.name || '';
  const price = product.price || props.price || 0;
  const discountPrice = product.discountPrice !== undefined ? product.discountPrice : (props.discountPrice !== undefined ? props.discountPrice : null);

  // ✅ ดึงรูปภาพจาก product.images array หรือใช้ imageUrl
  let imageUrl = props.imageUrl;
  if (!imageUrl && product.images && product.images.length > 0) {
    imageUrl = product.images[0].url;
  }
  // แก้ไขให้ครอบคลุม empty string ด้วย
  if (!imageUrl || imageUrl.trim() === '') {
    imageUrl = 'https://via.placeholder.com/300x300.png?text=No+Image';
  }

  // ✅ ดึงชื่อร้านจาก product.store.name หรือใช้ storeName
  const storeName = product.store?.name || props.storeName || 'BoxiFY Mall';

  // ✅ เช็คว่าเป็น Mall หรือไม่
  const isMall = product.store?.isMall || false;

  // ✅ เช็คว่าสินค้านี้อยู่ใน Wishlist หรือยัง
  const isLiked = isInWishlist(id);

  // ✅ ข้อมูลเพิ่มเติม
  const rating = product.ratingAverage || product.rating || (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1);
  const soldCount = product.sold || product.soldCount || 0;
  const originalPrice = product.originalPrice || (price ? Math.round(Number(price) * 1.2) : 0);

  const displayPrice = (discountPrice !== null && discountPrice !== undefined) ? discountPrice : ((price !== null && price !== undefined) ? price : 0);
  const hasDiscount = discountPrice !== null && discountPrice !== undefined && price !== null && price !== undefined && discountPrice < price;

  const handlePress = () => {
    if (props.onPress) {
      props.onPress();
    } else {
      // ✅ ตรวจสอบว่า id มีค่าก่อน navigate
      if (!id) {
        console.warn('ProductCard: Cannot navigate - product id is missing');
        return;
      }
      navigation.navigate('ProductDetail', { productId: id });
    }
  };

  // ✅ ฟังก์ชันแชร์สินค้า
  const handleShare = useCallback(async (e: any) => {
    e.stopPropagation(); // ป้องกันไม่ให้ trigger onPress ของ card
    if (!id) return;

    try {
      await shareContent(
        title || 'สินค้านี้',
        `ดูสินค้านี้สิ! ${title}`,
        `product/${id}`
      );
    } catch (error: any) {
      console.error('Share error:', error);
    }
  }, [id, title]);

  // ✅ ฟังก์ชันกดหัวใจ
  const handleHeart = useCallback(async (e: any) => {
    e.stopPropagation(); // ป้องกันไม่ให้ trigger onPress ของ card
    if (!id) return;
    toggleWishlist(id);
  }, [id, toggleWishlist]);

  // ✅ สินค้ามีตัวเลือก (variants/SKU) หรือไม่ (รองรับทั้ง variants array และ variantsCount จาก API)
  const hasVariants =
    (product?.variantsCount ?? 0) > 0 ||
    (product?.variants && Array.isArray(product.variants) && product.variants.length > 0);

  const [variantModalVisible, setVariantModalVisible] = useState(false);

  // ฟังก์ชันเพิ่มลงตะกร้า
  const handleAddToCart = useCallback(
    async (e: any) => {
      e.stopPropagation();
      if (!id) return;
      if (hasVariants) {
        setVariantModalVisible(true);
        return;
      }
      await addToCart(id, 1);
    },
    [id, addToCart, hasVariants],
  );

  const handleVariantConfirm = useCallback(
    async (variantId: number) => {
      await addToCart(id!, 1, variantId);
    },
    [id, addToCart],
  );

  return (
    <TouchableOpacity
      style={[
        styles.card,
        props.style,
        {
          backgroundColor: colors.card, // ขาวครีมอุ่น (Night Light Theme)
          shadowColor: colors.primary, // ใช้สีส้มหลักสำหรับเงา
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* ================= ส่วนรูปภาพ ================= */}
      <View style={styles.imageContainer}>
        <FadeInImage uri={imageUrl} style={styles.image} />

        {/* ❤️ Heart Icon (มุมบนขวา) */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={handleHeart}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.heartContainer}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? colors.heart : colors.text}
            />
          </View>
        </TouchableOpacity>

        {/* 🏷️ ป้าย Mall (มุมซ้ายบน) */}
        {isMall && (
          <View style={styles.mallBadge}>
            <Text style={styles.mallText}>Mall</Text>
          </View>
        )}

        {/* 🚚 ป้ายส่งฟรี (มุมซ้ายล่างของรูป) */}
        <View style={styles.freeShipBadge}>
          <MaterialCommunityIcons name="truck-delivery" size={10} color="#fff" />
          <Text style={styles.freeShipText}>ส่งฟรี</Text>
        </View>
      </View>

      {/* ================= ส่วนรายละเอียด ================= */}
      <View style={styles.info}>
        {/* ชื่อสินค้า (ตัดเหลือ 2 บรรทัด) */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {title || ''}
          </Text>
          {/* น้ำหนักสินค้า */}
          <Text style={[styles.weight, { color: colors.subText }]}>100 gm</Text>
        </View>

        {/* แถบคะแนนและยอดขาย */}
        <View style={styles.metaRow}>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={10} color="#FFC107" />
            <Text style={[styles.ratingText, { color: colors.text }]}>{rating}</Text>
          </View>
          <Text style={[styles.soldText, { color: colors.subText }]}>ขายแล้ว {formatCount(soldCount)} ชิ้น</Text>
        </View>

        {/* ราคาและปุ่มบวก */}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.primary }]}>${displayPrice.toLocaleString()}</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleAddToCart}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal เลือกตัวเลือก (SKU) เมื่อสินค้ามี variants */}
      <SelectVariantModal
        visible={variantModalVisible}
        productId={id ?? null}
        productTitle={title}
        onClose={() => setVariantModalVisible(false)}
        onConfirm={handleVariantConfirm}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // กรอบการ์ดหลัก
  card: {
    width: cardWidth,
    // backgroundColor และ shadowColor จะถูกกำหนดจาก colors ใน style inline
    marginBottom: 10,
    borderRadius: 20, // เปลี่ยนจาก 8 เป็น 20
    overflow: 'hidden',
    margin: 5,
    // เงา (Shadow) โทนส้มอ่อน - Night Light Theme
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, // เงาส้มอ่อน
    shadowRadius: 8,
    elevation: 5, // เงาสำหรับ Android
  },

  // --- Image Area ---
  imageContainer: {
    position: 'relative', // เพื่อให้ลูกๆ absolute ได้
    height: cardWidth, // ความสูงรูปภาพคงที่
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover' // ให้รูปเต็มกรอบโดยไม่เสียสัดส่วน (อาจโดนครอป)
  },
  // Heart Button (มุมบนขวา)
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  heartContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  // --- Badges (ป้ายต่างๆ) ---
  mallBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: '#D0011B', // สีแดง Shopee Mall
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderBottomRightRadius: 6, // มุมล่างขวาโค้ง
  },
  mallText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },

  freeShipBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    zIndex: 10,
    backgroundColor: '#00bfa5', // สีเขียวอมฟ้า
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2
  },
  freeShipText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 3
  },

  // --- Info Area (รายละเอียดด้านล่าง) ---
  info: {
    padding: 8,
    justifyContent: 'space-between', // จัดระยะห่าง
    flex: 1, // ให้ยืดเต็มพื้นที่ที่เหลือ
  },
  nameRow: {
    marginBottom: 4,
  },
  name: {
    fontSize: 13,
    lineHeight: 18,
    height: 36, // บังคับความสูงให้เท่ากัน 2 บรรทัด
    marginBottom: 4,
  },
  weight: {
    fontSize: 11,
    marginTop: 2,
  },

  // แถบคะแนน
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#eee',
    paddingRight: 6,
    marginRight: 6
  },
  ratingText: {
    fontSize: 10,
    marginLeft: 2
  },
  soldText: {
    fontSize: 10
  },

  // แถบราคา
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});

// ใช้ memo เพื่อประสิทธิภาพสูงสุด
export default memo(ProductCard);
