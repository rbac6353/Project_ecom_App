// screens/ProductDetailScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, StatusBar, ActivityIndicator, FlatList, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@app/api/client';
import { useCart } from '@app/providers/CartContext';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';
import ProductCard from '@shared/components/common/ProductCard';
import { shareContent } from '@shared/utils/share';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// ให้รูปเต็มหน้าจอ (สี่เหลี่ยมจัตุรัส)
const IMAGE_HEIGHT = screenWidth;

// ✅ การ์ดสินค้าสำหรับ section "สินค้าที่เกี่ยวข้อง" ดีไซน์ใหม่แบบ Shopee
const RelatedProductCard = ({ item, onPress }: { item: any; onPress: () => void }) => {
  const product = item.product || item;
  const imageUrl =
    product.images?.[0]?.url ||
    product.imageUrl ||
    'https://via.placeholder.com/300x300.png?text=No+Image';
  const title = product.title || product.name || '';
  const price =
    product.discountPrice !== undefined && product.discountPrice !== null
      ? product.discountPrice
      : product.price || 0;

  return (
    <TouchableOpacity style={styles.relatedCard} activeOpacity={0.9} onPress={onPress}>
      <Image source={{ uri: imageUrl }} style={styles.relatedImage} resizeMode="cover" />
      <View style={styles.relatedInfo}>
        <Text numberOfLines={2} style={styles.relatedTitle}>
          {title}
        </Text>
        <Text style={styles.relatedPrice}>
          ฿{price?.toLocaleString?.() ?? price}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ProductDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { itemCount } = useCart(); // ✅ ดึงจำนวนสินค้าในตะกร้าสำหรับ badge
  const { productId } = route.params || {};
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0); // หน้าปัจจุบันของสไลด์
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  // ✅ เพิ่ม State สำหรับปุ่ม "อ่านเพิ่มเติม"
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  // ✅ เพิ่ม State สำหรับสินค้าแนะนำ
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  // ✅ State สำหรับปุ่มติดตาม
  const [isFollowing, setIsFollowing] = useState(false);
  // ✅ State สำหรับตัวเลือกสินค้า (Variants)
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  // ✅ State สำหรับเก็บ selected attributes (เช่น { COLOR: "ดำ", MEMORY: "128GB" })
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  // ✅ State สำหรับ Modal รายงานรีวิว
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  // ✅ State สำหรับ Wishlist
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  // ✅ State สำหรับ AI Product Assistant
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ✅ ref สำหรับควบคุม PagerView เวลาเปลี่ยนตัวเลือกสินค้า
  const pagerRef = useRef<PagerView | null>(null);

  // ✅ เมื่อเลื่อนรูป ให้เลือกตัวเลือกสินค้าที่ผูกกับรูปนั้นอัตโนมัติ
  const handleImagePageSelected = (position: number) => {
    setActiveImageIndex(position);

    // ✅ Fix #1: เช็คว่า user กำลังเลือก attribute อยู่ไหม
    // ถ้า user กำลังเลือก ให้ skip auto-match (เพื่อไม่ให้ swipe image ทับ selection)
    if (selectedAttributes && Object.keys(selectedAttributes).length > 0) {
      return; // Skip auto-match ถ้า user กำลังเลือก
    }

    // ✅ แค่ auto-match ถ้ายังไม่มี selection
    if (product?.variants && product.variants.length > 0) {
      const matchedVariant = product.variants.find(
        (v: any) =>
          typeof v.imageIndex === 'number' &&
          v.imageIndex > 0 &&
          v.imageIndex - 1 === position,
      );

      if (matchedVariant) {
        setSelectedVariant(matchedVariant);
        // ✅ แค่ set attributes ถ้ายังไม่มี selection
        if (matchedVariant.attributes && typeof matchedVariant.attributes === 'object') {
          setSelectedAttributes(matchedVariant.attributes || {});
        }
      }
    }
  };

  // ✅ ดึง attribute types จาก variants
  const getAttributeTypes = (): { type: string; values: string[] }[] => {
    if (!product?.variants || product.variants.length === 0) return [];

    const typesMap = new Map<string, Set<string>>();
    product.variants.forEach((v: any) => {
      if (v.attributes && typeof v.attributes === 'object') {
        Object.keys(v.attributes).forEach((key) => {
          if (!typesMap.has(key)) {
            typesMap.set(key, new Set());
          }
          typesMap.get(key)?.add(v.attributes[key]);
        });
      }
    });

    const types: { type: string; values: string[] }[] = [];
    typesMap.forEach((values, type) => {
      types.push({ type, values: Array.from(values) });
    });
    return types;
  };

  // ✅ หา variant ที่ตรงกับ selected attributes
  // ✅ Fix #2: Allow partial match (ไม่ต้องครบทุกกลุ่ม)
  const findMatchingVariant = (attributes: Record<string, string>): any | null => {
    if (!product?.variants || product.variants.length === 0) return null;
    if (Object.keys(attributes).length === 0) return null;

    // ✅ ไม่ต้องครบทุกกลุ่ม ให้ match partial ได้
    // เช็คว่า variant นี้มี attributes ที่ selected ทุกตัวหรือไม่
    return product.variants.find((v: any) => {
      if (!v.attributes || typeof v.attributes !== 'object') return false;

      // เช็คว่า variant นี้มี attributes ที่ selected ทุกตัวหรือไม่
      return Object.keys(attributes).every(
        key => v.attributes[key] === attributes[key]
      );
    }) || null;
  };

  // ✅ เมื่อเลือก attribute
  const handleSelectAttribute = (type: string, value: string) => {
    // ✅ ใช้ functional update เพื่อให้แน่ใจว่าใช้ค่า state ล่าสุด
    setSelectedAttributes((prevAttributes) => {
      const newAttributes = { ...prevAttributes };
      // ✅ ในแต่ละกลุ่มเลือกได้ทีละ 1 ตัว (แทนที่ค่าเดิม)
      newAttributes[type] = value;

      // ✅ หา variant ที่ตรงกับ attributes (ใช้ newAttributes ที่เพิ่งสร้าง)
      const matchedVariant = findMatchingVariant(newAttributes);
      if (matchedVariant) {
        setSelectedVariant(matchedVariant);

        // ✅ เปลี่ยนรูปตาม variant
        const imgIndex =
          typeof matchedVariant.imageIndex === 'number' && matchedVariant.imageIndex > 0
            ? matchedVariant.imageIndex - 1
            : null;
        if (
          imgIndex !== null &&
          product.images &&
          product.images.length > imgIndex
        ) {
          setActiveImageIndex(imgIndex);
          if (pagerRef.current) {
            pagerRef.current.setPage(imgIndex);
          }
        }
      } else {
        // ถ้ายังหาไม่เจอ variant ที่ตรงกัน ให้ยังไม่ set selectedVariant
        // แต่ยังคง selectedAttributes ไว้ (เพื่อให้ UI แสดงการเลือกของผู้ใช้)
        setSelectedVariant(null);
      }

      // ✅ Return newAttributes เพื่ออัปเดต state
      return newAttributes;
    });
  };

  // ✅ เช็คว่า value นี้มี stock หรือไม่ และสามารถใช้ได้กับ selected attributes อื่นๆ หรือไม่
  const isValueAvailable = (type: string, value: string): boolean => {
    if (!product?.variants) return false;

    // ✅ ถ้า value นี้ถูกเลือกอยู่แล้ว ให้ available เสมอ (เพื่อให้สามารถเปลี่ยนกลับได้)
    const currentSelectedValue = selectedAttributes[type];
    if (currentSelectedValue === value) {
      return true;
    }

    // สร้าง attributes ชั่วคราวเพื่อเช็ค
    const testAttributes = { ...selectedAttributes, [type]: value };

    // ถ้ามี selected attributes อื่นๆ ให้เช็คว่ามี variant ที่ตรงกันหรือไม่
    const otherSelectedKeys = Object.keys(testAttributes).filter(key => key !== type);

    if (otherSelectedKeys.length > 0) {
      // เช็คว่ามี variant ที่ตรงกับ testAttributes หรือไม่
      const matchingVariant = product.variants.find((v: any) => {
        if (!v.attributes || typeof v.attributes !== 'object') return false;
        const variantAttrs = v.attributes;

        // เช็คว่า variant นี้มี attribute นี้และตรงกับ selected attributes อื่นๆ หรือไม่
        if (variantAttrs[type] !== value) return false;

        // เช็คว่า selected attributes อื่นๆ ตรงกับ variant หรือไม่
        return otherSelectedKeys.every(key => variantAttrs[key] === testAttributes[key]);
      });

      return matchingVariant ? matchingVariant.stock > 0 : false;
    }

    // ถ้ายังไม่มี selected attributes อื่นๆ ให้เช็คแค่ว่ามี variant ที่มี attribute นี้หรือไม่
    const variantWithValue = product.variants.find((v: any) => {
      if (!v.attributes || typeof v.attributes !== 'object') return false;
      return v.attributes[type] === value;
    });

    return variantWithValue ? variantWithValue.stock > 0 : false;
  };

  useEffect(() => {
    fetchProductDetail();
  }, [productId]);

  // ✅ Effect: ยิง API บันทึกประวัติเมื่อเข้าหน้าจอ
  useEffect(() => {
    const logView = async () => {
      // เช็คว่า Login อยู่ไหม (ถ้ามี Token)
      // ถ้าเป็น Guest อาจจะข้ามไป หรือเก็บใน AsyncStorage แทน
      if (!user) {
        // ถ้ายังไม่ได้ login ให้เก็บใน AsyncStorage แทน (backward compatibility)
        saveViewHistory(productId);
        return;
      }

      try {
        await api.post(`/products/${productId}/view`);
      } catch (e) {
        // Silent fail (ไม่ต้องแจ้งเตือน user ถ้าบันทึกไม่ได้)
        console.log('Log view failed', e);
        // Fallback: เก็บใน AsyncStorage
        saveViewHistory(productId);
      }
    };

    if (productId) {
      logView();
    }
  }, [productId, user]);

  // ✅ ดึงสินค้าที่เกี่ยวข้องเมื่อ product โหลดเสร็จ
  useEffect(() => {
    if (product) {
      fetchRecommendedProducts();
    }
  }, [product]);

  // ✅ เช็คสถานะเมื่อโหลดสินค้าเสร็จ
  useEffect(() => {
    if (product?.store?.id && user) {
      checkFollowStatus(product.store.id);
    }
    // ✅ เช็คสถานะ Wishlist
    if (product && user) {
      checkWishlistStatus();
    }
  }, [product, user]);

  const fetchProductDetail = async () => {
    if (!productId) {
      setError('ไม่พบรหัสสินค้า');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const productData = await api.get(`/products/${productId}`);

      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const data = productData?.data || productData;

      if (!data || !data.id) {
        setError('ไม่พบข้อมูลสินค้า');
        setLoading(false);
        return;
      }

      // ✅ Parse attributes ถ้าเป็น JSON string
      if (data?.variants && Array.isArray(data.variants)) {
        data.variants = data.variants.map((v: any) => {
          if (v.attributes && typeof v.attributes === 'string') {
            try {
              v.attributes = JSON.parse(v.attributes);
            } catch (e) {
              console.error('Failed to parse variant attributes:', e);
              v.attributes = null;
            }
          }
          return v;
        });
      }

      setProduct(data);
    } catch (error: any) {
      console.error('Error fetching product:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'ไม่สามารถโหลดข้อมูลสินค้าได้';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ฟังก์ชันเช็คสถานะติดตาม
  const checkFollowStatus = async (storeId: number) => {
    try {
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await api.get(`/stores/${storeId}/is-following`) as any;
      const isFollowing = res?.isFollowing ?? res?.data?.isFollowing ?? false;
      setIsFollowing(isFollowing);
    } catch (e) {
      console.log('Check follow failed', e);
    }
  };

  // ✅ ฟังก์ชันกดติดตาม/เลิกติดตาม
  const handleToggleFollow = async () => {
    if (!product?.store?.id) return;

    // ✅ ตรวจสอบว่า user login หรือยัง
    if (!user) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนติดตามร้านค้า');
      return;
    }

    try {
      // Optimistic Update (เปลี่ยน UI ทันที)
      setIsFollowing(!isFollowing);
      await api.post(`/stores/${product.store.id}/follow`);
    } catch (e: any) {
      // Revert ถ้าพัง
      setIsFollowing(!isFollowing);
      console.error('Toggle follow error:', e);

      // แสดง error message ที่เข้าใจง่าย
      const errorMessage = e.response?.data?.message ||
        e.message ||
        'ไม่สามารถติดตามร้านค้าได้ กรุณาลองอีกครั้ง';
      Alert.alert('เกิดข้อผิดพลาด', errorMessage);
    }
  };

  // ✅ ฟังก์ชันกดแชร์สินค้า
  const handleShare = () => {
    if (!product) return;

    const price = selectedVariant?.price
      ? Number(selectedVariant.price)
      : (product.price || 0);
    const originalPrice = product.originalPrice || Math.round(price * 1.3);

    shareContent(
      product.name || product.title || 'สินค้านี้', // Title
      `ลดราคาเหลือ ฿${price.toLocaleString()} จากปกติ ฿${originalPrice.toLocaleString()}!`, // Message
      `product/${product.id}` // Path
    );
  };

  // ✅ ฟังก์ชันรายงานรีวิว
  const handleReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณาระบุเหตุผล');
      return;
    }

    if (!selectedReviewId) return;

    try {
      await api.post(`/reviews/${selectedReviewId}/report`, {
        reason: reportReason.trim(),
      });
      Alert.alert('สำเร็จ', 'ส่งเรื่องร้องเรียนแล้ว');
      setReportModalVisible(false);
      setReportReason('');
      setSelectedReviewId(null);
    } catch (e: any) {
      console.error('Report review error:', e);
      Alert.alert(
        'ผิดพลาด',
        e.response?.data?.message || 'ส่งเรื่องไม่สำเร็จ',
      );
    }
  };

  // ✅ AI Product Assistant: ส่งคำถามไปยัง Backend
  const handleAskAi = async () => {
    const q = aiQuestion.trim();
    if (!q) {
      Alert.alert('แจ้งเตือน', 'กรุณาพิมพ์คำถาม');
      return;
    }
    if (!productId) return;
    setAiError(null);
    setAiAnswer(null);
    setAiLoading(true);
    try {
      const res = await api.post(`/products/${productId}/ask-ai`, { question: q }) as { answer?: string };
      const answer = res?.answer ?? '';
      setAiAnswer(answer || 'ไม่ได้รับคำตอบจาก AI');
    } catch (e: any) {
      const msg =
        e.response?.data?.message ||
        e.message ||
        (e.code === 'ERR_NETWORK' ? 'เชื่อมต่ออินเทอร์เน็ตไม่ได้' : 'AI ตอบคำถามไม่สำเร็จ');
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const openAiModal = () => {
    setAiQuestion('');
    setAiAnswer(null);
    setAiError(null);
    setAiModalVisible(true);
  };

  const closeAiModal = () => {
    setAiModalVisible(false);
    setAiQuestion('');
    setAiAnswer(null);
    setAiError(null);
  };

  // ✅ ฟังก์ชันเก็บประวัติการดูสินค้า (Cookies)
  const saveViewHistory = async (productId: number) => {
    try {
      const VIEW_HISTORY_KEY = 'product_view_history';
      const historyStr = await AsyncStorage.getItem(VIEW_HISTORY_KEY);
      let history: number[] = historyStr ? JSON.parse(historyStr) : [];

      // ลบ productId เก่าออก (ถ้ามี) แล้วเพิ่มใหม่ที่ตำแหน่งแรก
      history = history.filter((id) => id !== productId);
      history.unshift(productId);

      // เก็บแค่ 20 รายการล่าสุด
      history = history.slice(0, 20);

      await AsyncStorage.setItem(VIEW_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving view history:', error);
    }
  };

  // ✅ ฟังก์ชันดึงสินค้าที่เกี่ยวข้อง (Related Products)
  const fetchRecommendedProducts = async () => {
    if (!product) return;

    setLoadingRelated(true);
    try {
      // ใช้ categoryId ของสินค้าปัจจุบันเพื่อดึงสินค้าที่เกี่ยวข้อง
      const categoryId = product.category?.id;

      if (!categoryId) {
        setLoadingRelated(false);
        return;
      }

      // ✅ เรียก API เพื่อดึงสินค้าที่เกี่ยวข้อง (Related Products)
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const response = await api.get(`/products/${productId}/related`, {
        params: {
          categoryId: categoryId,
          limit: 6,
        },
      });

      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const productsList = Array.isArray(response) ? response : (response?.data || []);

      // Map ข้อมูลสินค้าให้ตรงกับ ProductCard
      const mappedProducts = productsList.map((p: any) => ({
        id: p.id,
        title: p.title || '',
        price: p.price || 0,
        discountPrice: p.discountPrice || null,
        imageUrl: p.images && p.images.length > 0 ? p.images[0].url : 'https://via.placeholder.com/400',
        storeName: p.store?.name || 'BoxiFY Mall',
        product: p, // ✅ เพิ่ม product object เพื่อให้ ProductCard ดึง store.isMall ได้
      }));

      setRelatedProducts(mappedProducts);
    } catch (error) {
      console.error('Error fetching related products:', error);
      setRelatedProducts([]);
    } finally {
      setLoadingRelated(false);
    }
  };

  // ฟังก์ชันแปลงตัวเลขให้สวยงาม (เช่น 3500 -> 3.5k)
  const formatCount = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // ✅ ฟังก์ชันเช็คสถานะ Wishlist
  const checkWishlistStatus = async () => {
    if (!user || !productId) return;

    try {
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const wishlistData = await api.get('/wishlist');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const wishlistItems = Array.isArray(wishlistData) ? wishlistData : (wishlistData?.data || []);
      const isInList = wishlistItems.some((item: any) => item.product?.id === productId || item.productId === productId);
      setIsInWishlist(isInList);
    } catch (error) {
      console.log('Check wishlist error:', error);
    }
  };

  // ✅ ฟังก์ชันกดปุ่ม Wishlist (เพิ่ม/ลบ)
  const handleToggleWishlist = async () => {
    if (!user) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าลงรายการโปรด');
      return;
    }

    setIsWishlistLoading(true);

    try {
      if (isInWishlist) {
        // ลบออกจาก Wishlist
        await api.delete(`/wishlist/${productId}`);
        setIsInWishlist(false);
      } else {
        // เพิ่มเข้า Wishlist - ใช้ POST /wishlist/:productId
        await api.post(`/wishlist/${productId}`);
        setIsInWishlist(true);
      }
    } catch (error: any) {
      console.error('Toggle wishlist error:', error);
      Alert.alert('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถดำเนินการได้');
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      // Navigate to login if not authenticated
      navigation.navigate('MainTabs', {
        screen: 'Profile',
        params: {
          screen: 'AuthScreen',
        },
      });
      return;
    }

    // ✅ เช็คว่ามี variants และยังไม่ได้เลือก
    if (product?.variants && product.variants.length > 0 && !selectedVariant) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกตัวเลือกสินค้า');
      return;
    }

    try {
      setIsAddingToCart(true);
      const success = await addToCart(productId, 1, selectedVariant?.id);
      if (success) {
        // Show success message (you can use Alert or Toast)
        console.log('Added to cart successfully');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      navigation.navigate('MainTabs', {
        screen: 'Profile',
        params: {
          screen: 'AuthScreen',
        },
      });
      return;
    }
    // Navigate to checkout - ต้องส่งข้อมูลสินค้าไปด้วย
    // สำหรับตอนนี้ให้เพิ่มลงตะกร้าก่อน แล้วไปหน้า checkout
    handleAddToCart();
    setTimeout(() => {
      navigation.navigate('Checkout');
    }, 500);
  };

  // ✅ ฟังก์ชันแชทกับร้านค้า
  const handleChat = () => {
    if (!user) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนเริ่มแชท', [
        {
          text: 'เข้าสู่ระบบ',
          onPress: () => navigation.navigate('MainTabs', {
            screen: 'Profile',
            params: { screen: 'AuthScreen' },
          }),
        },
        { text: 'ยกเลิก', style: 'cancel' },
      ]);
      return;
    }

    if (!product?.store?.id) {
      Alert.alert('ขออภัย', 'ไม่พบข้อมูลร้านค้า');
      return;
    }

    // Pattern ห้องแชท: chat_store_{storeId}_user_{userId}
    const roomId = `chat_store_${product.store.id}_user_${user.id}`;
    navigation.navigate('Chat', { roomId });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subText, marginTop: 16 }]}>
          กำลังโหลดข้อมูลสินค้า...
        </Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 20 }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.subText} />
        <Text style={[styles.errorTitle, { color: colors.text, marginTop: 16 }]}>
          {error || 'ไม่พบสินค้า'}
        </Text>
        <Text style={[styles.errorMessage, { color: colors.subText, marginTop: 8, textAlign: 'center' }]}>
          กรุณาลองใหม่อีกครั้งหรือตรวจสอบรหัสสินค้า
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary, marginTop: 24 }]}
          onPress={() => {
            setLoading(true);
            setError(null);
            fetchProductDetail();
          }}
        >
          <Text style={styles.retryButtonText}>ลองอีกครั้ง</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.backButton, { marginTop: 12 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: colors.primary }]}>กลับ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // จัดการรูปภาพ (ถ้าไม่มีรูป ให้ใช้รูป Placeholder)
  const images = product.images && product.images.length > 0
    ? product.images.map((img: any) => img.url)
    : ['https://via.placeholder.com/400x400.png?text=No+Image'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#121212' ? 'light-content' : 'dark-content'} />

      {/* Header อยู่ด้านบนสุด */}
      <SafeAreaView style={[styles.headerContainer, { backgroundColor: colors.card }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.searchBarFake, { backgroundColor: colors.background }]} onPress={() => navigation.navigate('SearchInput')}>
            <Ionicons name="search" size={18} color={colors.subText} style={{ marginRight: 8 }} />
            <Text style={[styles.searchPlaceholder, { color: colors.subText }]}>ค้นหาสินค้าในร้านนี้</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })}>
            <View style={{ position: 'relative' }}>
              <Ionicons name="cart-outline" size={24} color={colors.primary} />
              {itemCount > 0 && (
                <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}>
                  <Text style={styles.badgeText}>
                    {itemCount > 99 ? '99+' : itemCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <MaterialCommunityIcons name="dots-horizontal" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>

        {/* --- 2. Image Carousel (ภาพสไลด์) --- */}
        <View style={styles.carouselContainer}>
          <PagerView
            ref={pagerRef}
            style={styles.pagerView}
            initialPage={0}
            onPageSelected={(e) => handleImagePageSelected(e.nativeEvent.position)}
          >
            {images.map((url: string, index: number) => (
              <View key={index} style={styles.slide}>
                <Image
                  source={{ uri: (url && url.trim() !== '') ? url : 'https://via.placeholder.com/400x400.png?text=No+Image' }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </PagerView>
          {/* Image Counter (มุมขวาล่างของรูป) */}
          {images.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>{activeImageIndex + 1}/{images.length}</Text>
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {/* ✅ แถบ Mall Banner */}
          {product.store?.isMall && (
            <View style={styles.mallBanner}>
              <MaterialCommunityIcons name="check-decagram" size={14} color="#fff" />
              <Text style={styles.mallBannerText}>Shopee Mall • ของแท้ 100%</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={[styles.currentPrice, { color: colors.primary }]}>
              ฿{(
                selectedVariant?.price
                  ? Number(selectedVariant.price)
                  : product.price || 0
              ).toLocaleString()}
            </Text>
            {product.originalPrice && (
              <>
                <Text style={[styles.originalPrice, { color: colors.subText }]}>฿{product.originalPrice.toLocaleString()}</Text>
                <View style={[styles.discountTag, { backgroundColor: colors.primary }]}>
                  <Text style={styles.discountText}>{product.discountPercentage || 30}% OFF</Text>
                </View>
              </>
            )}
          </View>

          <Text style={[styles.productTitle, { color: colors.text }]} numberOfLines={3}>
            {product.name || product.title || 'ไม่มีชื่อสินค้า'}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={14} color="#FFC107" />
              <Text style={[styles.ratingText, { color: colors.primary }]}>{product.ratingAverage || '4.5'}</Text>
              <Text style={[styles.ratingCount, { color: colors.subText }]}>({product.ratingCount || 0})</Text>
            </View>
            <View style={[styles.verticleLine, { backgroundColor: colors.border }]}></View>
            <Text style={[styles.soldText, { color: colors.text }]}>ขายแล้ว {formatCount(product.soldCount || 0)}+ ชิ้น</Text>
            <View style={{ flex: 1 }} />
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: colors.background }]} />

        {/* --- ✅ ส่วนเลือกตัวเลือก (Variants) แบบ Dynamic --- */}
        {product?.variants && product.variants.length > 0 && (() => {
          const attributeTypes = getAttributeTypes();

          // ✅ ถ้ามี attributes ให้แสดงแบบแยกกลุ่ม
          if (attributeTypes.length > 0) {
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ตัวเลือกสินค้า</Text>

                {attributeTypes.map((attrType, typeIndex) => {
                  const selectedValue = selectedAttributes[attrType.type];

                  return (
                    <View key={typeIndex} style={styles.attributeGroup}>
                      <Text style={[styles.attributeGroupTitle, { color: colors.text }]}>
                        {attrType.type}
                      </Text>
                      <View style={styles.attributeContainer}>
                        {attrType.values.map((value, valueIndex) => {
                          const isSelected = selectedValue === value;
                          const isAvailable = isValueAvailable(attrType.type, value);

                          return (
                            <TouchableOpacity
                              key={valueIndex}
                              disabled={!isAvailable}
                              style={[
                                styles.attributeChip,
                                { backgroundColor: colors.background, borderColor: colors.border },
                                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                                !isAvailable && { opacity: 0.5 },
                              ]}
                              onPress={() => handleSelectAttribute(attrType.type, value)}
                            >
                              <Text
                                style={[
                                  styles.attributeText,
                                  { color: colors.text },
                                  isSelected && { color: '#fff' },
                                  !isAvailable && { color: colors.subText },
                                ]}
                              >
                                {value}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}

                <View style={styles.stockInfo}>
                  <Text style={[styles.stockLabel, { color: colors.text }]}>
                    คลัง:{' '}
                    {(() => {
                      // ✅ Fix #4: Stock Display Logic
                      if (selectedVariant) {
                        return selectedVariant.stock;
                      }

                      const selectedKeys = Object.keys(selectedAttributes);
                      if (selectedKeys.length === 0) {
                        return 'กรุณาเลือกตัวเลือก';
                      }

                      // ✅ ถ้าเลือกบางส่วน แสดง "เลือก X/Y" แทน "ไม่พบ"
                      const attributeTypes = getAttributeTypes();
                      const requiredCount = attributeTypes.length;

                      if (selectedKeys.length < requiredCount) {
                        return `เลือก ${selectedKeys.length}/${requiredCount}`;
                      }

                      // เลือกครบแล้ว แต่หาไม่เจอ variant
                      return 'ไม่มีสินค้าตามที่เลือก';
                    })()}
                  </Text>
                </View>
              </View>
            );
          }

          // ✅ ถ้าไม่มี attributes ให้แสดงแบบเดิม (backward compatibility)
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ตัวเลือกสินค้า</Text>
              <View style={styles.variantContainer}>
                {product.variants.map((variant: any) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const isOutOfStock = variant.stock <= 0;

                  return (
                    <TouchableOpacity
                      key={variant.id}
                      disabled={isOutOfStock}
                      style={[
                        styles.variantChip,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        isOutOfStock && { backgroundColor: colors.background, borderColor: colors.border, opacity: 0.5 },
                      ]}
                      onPress={() => {
                        setSelectedVariant(variant);
                        // ถ้า variant ระบุ imageIndex ให้เปลี่ยนรูปหลักตาม
                        const imgIndex =
                          typeof variant.imageIndex === 'number' && variant.imageIndex > 0
                            ? variant.imageIndex - 1
                            : null;
                        if (
                          imgIndex !== null &&
                          product.images &&
                          product.images.length > imgIndex
                        ) {
                          setActiveImageIndex(imgIndex);
                          // เลื่อน PagerView ไปยังรูปที่ต้องการ
                          if (pagerRef.current) {
                            pagerRef.current.setPage(imgIndex);
                          }
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.variantText,
                          { color: colors.text },
                          isSelected && { color: '#fff' },
                          isOutOfStock && { color: colors.subText },
                        ]}
                      >
                        {variant.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.stockInfo}>
                <Text style={[styles.stockLabel, { color: colors.text }]}>
                  คลัง:{' '}
                  {selectedVariant
                    ? selectedVariant.stock
                    : 'กรุณาเลือกตัวเลือก'}
                </Text>
              </View>
            </View>
          );
        })()}

        <View style={[styles.separator, { backgroundColor: colors.background }]} />

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.guaranteeRow}>
            <MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.primary} />
            <Text style={[styles.guaranteeText, { color: colors.text }]}>Shopee คุ้มชัวร์</Text>
            <Text style={[styles.guaranteeSubText, { color: colors.subText }]}>คืนเงิน/สินค้าฟรีใน 15 วัน • ของแท้ 100%</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.shippingRow}>
            <MaterialCommunityIcons name="truck-delivery-outline" size={20} color={colors.icon} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.shippingTitle, { color: colors.text }]}>ส่งฟรี</Text>
              <Text style={[styles.shippingSub, { color: colors.subText }]}>ร้านค้าโค้ดคุ้มส่งฟรี ขั้นต่ำ ฿0</Text>
              <View style={styles.shippingDetail}>
                <MaterialCommunityIcons name="truck-fast-outline" size={16} color={colors.icon} />
                <Text style={[styles.shippingDate, { color: colors.subText }]}>
                  จะได้รับภายใน 3 วัน (ส่งจาก {product.store?.location || 'กรุงเทพมหานคร'})
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.border} />
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: colors.background }]} />

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.storeHeader}>
            <Image
              source={{ uri: (product.store?.logo && product.store.logo.trim() !== '') ? product.store.logo : 'https://placekitten.com/200/200' }}
              style={styles.storeLogo}
            />
            <View style={styles.storeInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.storeName, { color: colors.text }]}>{product.store?.name || 'BoxiFY Mall'}</Text>
                {/* ✅ แสดงป้าย Mall เฉพาะเมื่อร้านเป็น Mall จริงๆ */}
                {product.store?.isMall && (
                  <View style={styles.officialBadge}>
                    <Text style={styles.officialText}>Mall</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.storeStatus, { color: colors.subText }]}>ออนไลน์เมื่อ 5 นาทีที่แล้ว</Text>
              <View style={styles.storeLocationRow}>
                <Ionicons name="location-outline" size={12} color={colors.subText} />
                <Text style={[styles.storeLocation, { color: colors.subText }]}>
                  {product.store?.location || 'กรุงเทพมหานคร'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[
                  styles.viewStoreBtn,
                  { borderColor: colors.primary },
                  isFollowing && { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={handleToggleFollow}
              >
                <Text style={[
                  styles.viewStoreText,
                  { color: colors.primary },
                  isFollowing && { color: colors.subText },
                ]}>
                  {isFollowing ? 'กำลังติดตาม' : '+ ติดตาม'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewStoreBtn,
                  { borderColor: colors.primary, backgroundColor: colors.primary },
                ]}
                onPress={() => navigation.navigate('StoreProfile', { storeId: product.store.id })}
              >
                <Text style={[styles.viewStoreText, { color: colors.text }]}>
                  ดูร้านค้า
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.storeStatsRow}>
            <View style={styles.storeStatItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{product.store?.itemCount || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>รายการสินค้า</Text>
            </View>
            <View style={[styles.storeStatBorder, { backgroundColor: colors.border }]} />
            <View style={styles.storeStatItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{product.store?.rating || 4.8}</Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>ให้คะแนน</Text>
            </View>
            <View style={[styles.storeStatBorder, { backgroundColor: colors.border }]} />
            <View style={styles.storeStatItem}>
              {/* ✅ แสดงจำนวนผู้ติดตามจริงจาก API */}
              <Text style={[styles.statValue, { color: colors.text }]}>
                {product.store?.followerCount !== undefined ? product.store.followerCount.toLocaleString() : '0'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>ผู้ติดตาม</Text>
            </View>
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: colors.background }]} />

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>คุณลักษณะ</Text>

          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: colors.subText }]}>หมวดหมู่</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.specValueLink, { color: colors.text }]}>
                {product.category?.name || 'ไม่มีหมวดหมู่'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.subText} />
            </View>
          </View>
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: colors.subText }]}>ยี่ห้อ</Text>
            <Text style={[styles.specValue, { color: colors.text }]}>{product.brand || 'No Brand'}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: colors.subText }]}>จำนวนสินค้า</Text>
            <Text style={[styles.specValue, { color: colors.text }]}>
              {product.quantity || product.stock || 0} ชิ้น
            </Text>
          </View>
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: colors.subText }]}>ส่งจาก</Text>
            <Text style={[styles.specValue, { color: colors.text }]}>
              {product.store?.location || product.shipsFrom || 'กรุงเทพมหานคร'}
            </Text>
          </View>
          {product.store?.owner && (
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: colors.subText }]}>เจ้าของร้าน</Text>
              <Text style={[styles.specValue, { color: colors.text }]}>
                {product.store.owner.name || product.store.owner.email || '-'}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.separator, { backgroundColor: colors.background }]} />

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>รายละเอียดสินค้า</Text>
          {product.description ? (
            <>
              <Text
                style={[styles.descriptionText, { color: colors.text }]}
                numberOfLines={isDescExpanded ? undefined : 6}
              >
                {product.description}
              </Text>
              {product.description.length > 200 && (
                <TouchableOpacity
                  style={[styles.expandBtn, { borderTopColor: colors.border }]}
                  onPress={() => setIsDescExpanded(!isDescExpanded)}
                >
                  <Text style={[styles.expandText, { color: colors.primary }]}>
                    {isDescExpanded ? 'ย่อรายละเอียด' : 'อ่านเพิ่มเติม'}
                  </Text>
                  <Ionicons
                    name={isDescExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={[styles.descriptionText, { color: colors.subText }]}>
              ไม่มีรายละเอียดสินค้า
            </Text>
          )}
        </View>

        {/* ✨ ปุ่ม AI Product Assistant */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            onPress={openAiModal}
            activeOpacity={0.8}
            style={[styles.aiAskButton, { backgroundColor: colors.background, borderColor: colors.primary }]}
          >
            <View style={[styles.aiAskIconWrap, { backgroundColor: colors.primary + '20' }]}>
              <MaterialCommunityIcons name="robot-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.aiAskButtonText, { color: colors.text }]}>
              ✨ ถาม AI เกี่ยวกับสินค้านี้
            </Text>
            <Text style={[styles.aiAskButtonSubtext, { color: colors.subText }]}>
              สงสัยอะไร ถามได้เลย เช่น วิธีใช้, ขนาด, ของแถม
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subText} />
          </TouchableOpacity>
        </View>

        <View style={[styles.separator, { backgroundColor: colors.background }]} />
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.reviewHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>คะแนนของสินค้า</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((i) => {
                    const average = product.ratingSummary?.average || 0;
                    const isFilled = i <= Math.round(average);
                    return (
                      <Ionicons
                        key={i}
                        name={isFilled ? 'star' : 'star-outline'}
                        size={14}
                        color={isFilled ? colors.primary : colors.border}
                      />
                    );
                  })}
                </View>
                <Text style={[styles.ratingAverageText, { color: colors.text }]}>
                  {product.ratingSummary?.average > 0 ? product.ratingSummary.average.toFixed(1) : '0.0'}/5
                </Text>
                <Text style={[styles.ratingCountText, { color: colors.subText }]}>
                  ({formatCount(product.ratingSummary?.count || 0)} รีวิว)
                </Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>ดูทั้งหมด</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Review List */}
          {product.reviews && product.reviews.length > 0 ? (
            product.reviews.map((review: any, index: number) => (
              <View key={review.id || index} style={styles.reviewItem}>
                {/* User Info */}
                <View style={styles.reviewUserRow}>
                  <Image
                    source={{
                      uri: ((review.user?.avatar && review.user.avatar.trim() !== '') || (review.user?.picture && review.user.picture.trim() !== ''))
                        ? (review.user.avatar || review.user.picture)
                        : 'https://placekitten.com/50/50',
                    }}
                    style={styles.userAvatar}
                  />
                  <View>
                    <Text style={[styles.userName, { color: colors.text }]}>
                      {review.user?.name || 'ผู้ใช้'}
                    </Text>
                    <View style={styles.starsRow}>
                      {[...Array(review.rating || 5)].map((_, i) => (
                        <Ionicons key={i} name="star" size={10} color={colors.primary} />
                      ))}
                    </View>
                  </View>
                </View>

                {review.variation && (
                  <Text style={[styles.variationText, { color: colors.subText }]}>
                    ตัวเลือกสินค้า: {review.variation}
                  </Text>
                )}
                {review.comment && (
                  <Text style={[styles.commentText, { color: colors.text }]}>{review.comment}</Text>
                )}

                {/* Review Images */}
                {review.images && Array.isArray(review.images) && review.images.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.reviewImagesContainer}
                  >
                    {review.images.map((img: string, i: number) => (
                      <Image
                        key={i}
                        source={{ uri: (img && img.trim() !== '') ? img : 'https://via.placeholder.com/80' }}
                        style={styles.reviewImage}
                      />
                    ))}
                  </ScrollView>
                )}

                {/* Seller Reply (ถ้ามี) */}
                {review.sellerReply && (
                  <View style={[styles.sellerReplyBox, { backgroundColor: colors.background }]}>
                    <Text style={[styles.sellerReplyLabel, { color: colors.text }]}>
                      การตอบกลับจากร้านค้า:
                    </Text>
                    <Text style={[styles.sellerReplyText, { color: colors.text }]}>
                      {review.sellerReply}
                    </Text>
                  </View>
                )}

                {user && product?.store && (user.id === product.store.ownerId || user.role === 'seller') && (
                  <TouchableOpacity
                    style={styles.reportBtn}
                    onPress={() => {
                      setSelectedReviewId(review.id);
                      setReportModalVisible(true);
                    }}
                  >
                    <Ionicons name="flag-outline" size={14} color={colors.subText} />
                    <Text style={[styles.reportText, { color: colors.subText }]}>แจ้งลบรีวิว</Text>
                  </TouchableOpacity>
                )}

                {review.createdAt && (
                  <Text style={[styles.reviewDate, { color: colors.subText }]}>
                    {review.createdAt}
                  </Text>
                )}

                {review.isEdited && (
                  <Text style={[styles.editedLabel, { color: colors.subText }]}>
                    (แก้ไขแล้ว)
                  </Text>
                )}

                {index < (product.reviews?.length || 0) - 1 && (
                  <View style={[styles.divider, { marginTop: 15, backgroundColor: colors.border }]} />
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                ยังไม่มีรีวิวสำหรับสินค้านี้
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.separator, { backgroundColor: colors.background }]} />

        {/* ✅ Section: สินค้าที่เกี่ยวข้อง */}
        {relatedProducts.length > 0 && (
          <View style={[styles.recommendationsSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>
              สินค้าที่เกี่ยวข้อง
            </Text>
            {loadingRelated ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedScrollContent}
              >
                {relatedProducts.map((item: any, index: number) => {
                  const product = item.product || item;
                  return (
                    <View
                      key={product.id || index}
                      style={[
                        styles.relatedItemWrapper,
                        index === 0 && styles.relatedItemFirst,
                      ]}
                    >
                      <RelatedProductCard
                        item={product}
                        onPress={() =>
                          navigation.push('ProductDetail', {
                            productId: product.id || item.id,
                          })
                        }
                      />
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        <View style={{ height: 20 }} />

      </ScrollView>

      <SafeAreaView style={[styles.bottomSafeArea, { backgroundColor: colors.card }]} edges={['bottom']}>
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
            <Text style={[styles.chatBtnText, { color: colors.primary }]}>แชทเลย</Text>
          </TouchableOpacity>
          <View style={[styles.verticleLineSlim, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={[
              styles.addToCartBtn,
              (isAddingToCart ||
                (() => {
                  // ✅ Fix #5: ต้องเลือก COMPLETE (ทุกกลุ่ม) ค่อยเพิ่มลงตะกร้า
                  if (product?.variants && product.variants.length > 0) {
                    const attributeTypes = getAttributeTypes();
                    const selectedKeys = Object.keys(selectedAttributes);
                    return selectedKeys.length !== attributeTypes.length || !selectedVariant;
                  }
                  return false;
                })()) &&
              styles.addToCartBtnDisabled,
            ]}
            onPress={handleAddToCart}
            disabled={
              isAddingToCart ||
              (() => {
                // ✅ Fix #5: ต้องเลือก COMPLETE (ทุกกลุ่ม) ค่อยเพิ่มลงตะกร้า
                if (product?.variants && product.variants.length > 0) {
                  const attributeTypes = getAttributeTypes();
                  const selectedKeys = Object.keys(selectedAttributes);
                  return selectedKeys.length !== attributeTypes.length || !selectedVariant;
                }
                return false;
              })()
            }
          >
            {isAddingToCart ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="cart-plus" size={22} color="#fff" />
                <Text style={styles.addToCartText}>เพิ่มไปยังรถเข็น</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.buyNowBtn,
              (() => {
                // ✅ Fix #5: ต้องเลือก COMPLETE (ทุกกลุ่ม) ค่อยซื้อเลย
                if (product?.variants && product.variants.length > 0) {
                  const attributeTypes = getAttributeTypes();
                  const selectedKeys = Object.keys(selectedAttributes);
                  return selectedKeys.length !== attributeTypes.length || !selectedVariant;
                }
                return false;
              })() &&
              styles.buyNowBtnDisabled,
            ]}
            onPress={handleBuyNow}
            disabled={
              (() => {
                // ✅ Fix #5: ต้องเลือก COMPLETE (ทุกกลุ่ม) ค่อยซื้อเลย
                if (product?.variants && product.variants.length > 0) {
                  const attributeTypes = getAttributeTypes();
                  const selectedKeys = Object.keys(selectedAttributes);
                  return selectedKeys.length !== attributeTypes.length || !selectedVariant;
                }
                return false;
              })()
            }
          >
            <Text
              style={[
                styles.buyNowText,
                (() => {
                  // ✅ Fix #5: ต้องเลือก COMPLETE (ทุกกลุ่ม) ค่อยซื้อเลย
                  if (product?.variants && product.variants.length > 0) {
                    const attributeTypes = getAttributeTypes();
                    const selectedKeys = Object.keys(selectedAttributes);
                    return selectedKeys.length !== attributeTypes.length || !selectedVariant;
                  }
                  return false;
                })() &&
                styles.buyNowTextDisabled,
              ]}
            >
              ซื้อเลย
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ✅ Modal รายงานรีวิว */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setReportModalVisible(false);
          setReportReason('');
          setSelectedReviewId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>เหตุผลที่ต้องการลบรีวิว</Text>
            <TextInput
              style={[styles.reportInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="เช่น เป็นข้อความเท็จ, คำหยาบคาย, เนื้อหาไม่เหมาะสม"
              placeholderTextColor={colors.subText}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setReportModalVisible(false);
                  setReportReason('');
                  setSelectedReviewId(null);
                }}
                style={[styles.modalCancelBtn, { backgroundColor: colors.background }]}
              >
                <Text style={{ color: colors.text }}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReport}
                style={styles.modalSubmitBtn}
              >
                <Text style={styles.modalSubmitText}>ส่งเรื่อง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✨ Modal AI Product Assistant */}
      <Modal
        visible={aiModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAiModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.aiModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.aiModalHeader}>
              <View style={styles.aiModalTitleRow}>
                <MaterialCommunityIcons name="robot-outline" size={24} color={colors.primary} />
                <Text style={[styles.aiModalTitle, { color: colors.text }]}>ถาม AI เกี่ยวกับสินค้า</Text>
              </View>
              <TouchableOpacity onPress={closeAiModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={28} color={colors.subText} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.aiModalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={[styles.aiQuestionInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="เช่น อันนี้กี่แคล? ใช้ยังไง? มีของแถมไหม?"
                placeholderTextColor={colors.subText}
                value={aiQuestion}
                onChangeText={(t) => { setAiQuestion(t); setAiError(null); }}
                editable={!aiLoading}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {aiError ? (
                <View style={[styles.aiErrorBox, { backgroundColor: '#FFEBEE', borderColor: '#EF5350' }]}>
                  <Ionicons name="warning-outline" size={18} color="#C62828" />
                  <Text style={styles.aiErrorText}>{aiError}</Text>
                </View>
              ) : null}

              {aiLoading ? (
                <View style={styles.aiLoadingBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.aiLoadingText, { color: colors.subText }]}>AI กำลังคิดคำตอบ...</Text>
                </View>
              ) : aiAnswer ? (
                <View style={[styles.aiAnswerBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.aiAnswerLabel, { color: colors.subText }]}>คำตอบจาก AI</Text>
                  <Text style={[styles.aiAnswerText, { color: colors.text }]}>{aiAnswer}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.aiModalActions}>
              <TouchableOpacity
                onPress={closeAiModal}
                style={[styles.aiModalCancelBtn, { backgroundColor: colors.background }]}
              >
                <Text style={{ color: colors.text }}>ปิด</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAskAi}
                disabled={aiLoading || !aiQuestion.trim()}
                style={[
                  styles.aiModalSendBtn,
                  { backgroundColor: colors.primary },
                  (aiLoading || !aiQuestion.trim()) && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.aiModalSendText}>ส่งคำถาม</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorMessage: {
    fontSize: 14,
    maxWidth: 300,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 150,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: { flex: 1 },
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 50,
  },
  bottomSafeArea: {},
  headerIconBtn: { padding: 8 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  searchBarFake: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 10,
    height: 36,
    marginHorizontal: 10,
  },
  searchPlaceholder: { fontSize: 14 },

  carouselContainer: {
    height: IMAGE_HEIGHT,
    width: '100%',
    overflow: 'hidden',
  },
  pagerView: {
    flex: 1,
    width: '100%',
  },
  slide: {
    flex: 1,
    width: '100%',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: { color: '#fff', fontSize: 12 },

  section: { padding: 15, marginBottom: 8 },
  separator: { height: 8 },

  // --- Variants ---
  variantContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  variantChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  variantText: {
    fontSize: 14,
  },
  // ✅ Styles สำหรับ Attribute Groups
  attributeGroup: {
    marginBottom: 20,
  },
  attributeGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  attributeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  attributeText: {
    fontSize: 14,
  },
  stockInfo: {
    marginTop: 10,
  },
  stockLabel: {
    fontSize: 14,
  },

  // --- Price & Title ---
  mallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D0011B',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  mallBannerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  currentPrice: { fontSize: 24, fontWeight: 'bold' },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginLeft: 8,
    marginBottom: 4,
  },
  discountTag: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    marginLeft: 8,
    marginBottom: 4,
  },
  discountText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  productTitle: { fontSize: 16, lineHeight: 22, marginBottom: 10 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  ratingBox: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 14, marginLeft: 4 },
  ratingCount: { fontSize: 12, marginLeft: 4 },
  verticleLine: { width: 1, height: 14, marginHorizontal: 10 },
  soldText: { fontSize: 12 },

  bottomBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  chatBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBtnText: { fontSize: 10, marginTop: 2 },
  verticleLineSlim: { width: 1, height: '60%' },
  addToCartBtn: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#26aa99',
    height: '100%',
  },
  addToCartText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  addToCartBtnDisabled: { opacity: 0.6 },
  buyNowBtn: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    height: '100%',
  },
  buyNowText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buyNowBtnDisabled: { opacity: 0.6 },
  buyNowTextDisabled: { opacity: 0.6 },

  // --- 5. Guarantee & Shipping ---
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  guaranteeText: { fontSize: 12, marginLeft: 5 },
  guaranteeSubText: { fontSize: 12, marginLeft: 10 },
  divider: { height: 1, marginVertical: 10 },
  shippingRow: { flexDirection: 'row', alignItems: 'flex-start' },
  shippingTitle: { fontSize: 14, fontWeight: 'bold' },
  shippingSub: { fontSize: 12, marginTop: 2 },
  shippingDetail: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  shippingDate: { fontSize: 12, marginLeft: 5 },

  // --- 6. Store Info ---
  storeHeader: { flexDirection: 'row', alignItems: 'center' },
  storeLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
  },
  storeInfo: { flex: 1, marginLeft: 10 },
  storeName: { fontSize: 16, fontWeight: 'bold' },
  officialBadge: {
    backgroundColor: '#D0011B',
    paddingHorizontal: 4,
    borderRadius: 2,
    marginLeft: 5,
  },
  officialText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  storeStatus: { fontSize: 12 },
  storeLocationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  storeLocation: { fontSize: 12, marginLeft: 2 },
  viewStoreBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  viewStoreText: { fontSize: 12 },
  followingBtn: {},
  followingText: {},
  storeStatsRow: {
    flexDirection: 'row',
    marginTop: 15,
    alignItems: 'center',
  },
  storeStatItem: { flex: 1, alignItems: 'center' },
  storeStatBorder: { width: 1, height: 20 },
  statValue: { fontSize: 14, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 2 },

  // --- 7. Specs & 8. Description ---
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  specRow: { flexDirection: 'row', marginBottom: 12 },
  specLabel: { width: 100, fontSize: 14 },
  specValue: { flex: 1, fontSize: 14 },
  specValueLink: { fontSize: 14, color: '#26aa99' },
  descriptionText: { fontSize: 14, lineHeight: 22 },
  expandBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    marginTop: 10,
  },
  expandText: { fontSize: 14, marginRight: 5 },

  // --- 9. Reviews ---
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  starsRow: { flexDirection: 'row' },
  ratingAverageText: { fontSize: 14, marginLeft: 5 },
  ratingCountText: { fontSize: 12, marginLeft: 5 },
  seeAllText: { fontSize: 14 },

  reviewItem: { marginTop: 10 },
  reviewUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  userName: { fontSize: 12, marginBottom: 2 },

  variationText: { fontSize: 12, marginBottom: 4 },
  commentText: { fontSize: 14, lineHeight: 20, marginBottom: 8 },

  reviewImagesContainer: { flexDirection: 'row', marginBottom: 8 },
  reviewImage: {
    width: 70,
    height: 70,
    borderRadius: 4,
    marginRight: 8,
  },

  sellerReplyBox: {
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
  },
  sellerReplyLabel: {
    fontSize: 12,
    color: '#26aa99',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sellerReplyText: { fontSize: 12 },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 5,
    marginBottom: 5,
    padding: 5,
  },
  reportText: {
    fontSize: 12,
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  reviewDate: { fontSize: 10 },
  editedLabel: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    padding: 20,
    borderRadius: 10,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 15,
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    minHeight: 100,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSubmitBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#D32F2F',
  },
  modalSubmitText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // --- 10. Recommendations ---
  recommendationsSection: {
    padding: 15,
    paddingBottom: 10,
  },
  recommendationsList: {
    paddingTop: 10,
  },
  // ✅ ดีไซน์สินค้า "สินค้าที่เกี่ยวข้อง" ให้ไม่ติดกันเกินไป
  relatedScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  relatedItemWrapper: {
    width: 140,
    marginRight: 16,
  },
  relatedItemFirst: {
    marginLeft: 8,
  },
  relatedCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  relatedImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#f5f5f5',
  },
  relatedInfo: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  relatedTitle: {
    fontSize: 12,
    color: '#222',
    marginBottom: 4,
  },
  relatedPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ee4d2d',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  // --- AI Product Assistant ---
  aiAskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  aiAskIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiAskButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  aiAskButtonSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  aiModalContent: {
    padding: 20,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  aiModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aiModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  aiModalScroll: {
    maxHeight: 320,
  },
  aiQuestionInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    minHeight: 80,
    fontSize: 15,
  },
  aiErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  aiErrorText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
  },
  aiLoadingBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  aiLoadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  aiAnswerBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  aiAnswerLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  aiAnswerText: {
    fontSize: 15,
    lineHeight: 22,
  },
  aiModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  aiModalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  aiModalSendBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  aiModalSendText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
