// screens/SearchInputScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, FlatList, Image, Alert, Dimensions, ActivityIndicator, Platform, Modal, Animated, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@app/providers/ThemeContext';
import api from '@app/api/client';
import ProductCard from '@shared/components/common/ProductCard';
import * as productService from '@app/services/productService';
import { visualSearch } from '@app/services/searchService';

const HISTORY_KEY = 'search_history';
const { width } = Dimensions.get('window');
const itemWidth = (width - 40) / 2;

// 💡 Interface สำหรับสินค้าที่จะแสดงใน Grid
interface RecommendedProduct {
  id: number;
  title: string;
  imageUrl: string;
}

// 💡 Interface สำหรับ Product ที่ค้นหาได้
interface Product {
  id: number;
  title: string;
  price: number;
  discountPrice: number | null;
  imageUrl: string;
  storeName: string;
}

const RECOMMENDED_TABS = ['แนะนำ', 'ผู้หญิง', 'กีฬา', 'ผู้ชาย'];

// 🚀 หมวดหมู่ด่วนให้กดค้นหาได้ทันที
const QUICK_CATEGORIES = [
  'โทรศัพท์มือถือ',
  'คอมพิวเตอร์',
  'กล้องถ่ายรูป',
  'เครื่องใช้ไฟฟ้า',
  'แฟชั่น',
  'นาฬิกา',
  'ทีวีและเครื่องเสียง',
  'เกมและของเล่น',
];

export default function SearchInputScreen({ navigation }: any) {
  const route = useRoute();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const imageUri = (route.params as any)?.imageUri;
  const openFilter = (route.params as any)?.openFilter;

  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<RecommendedProduct[]>([]);
  const [loadingRecommend, setLoadingRecommend] = useState(false);
  const [activeTab, setActiveTab] = useState('แนะนำ');
  // ✅ คำแนะนำการค้นหา (autocomplete)
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const suggestionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ✅ State สำหรับ track ว่า TextInput focus อยู่หรือไม่ (เพื่อแสดง suggestion/history ในหน้า showResults)
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // 🚀 State สำหรับผลลัพธ์การค้นหา
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [otherSearchResults, setOtherSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [isVisualSearch, setIsVisualSearch] = useState(false); // ระบุว่าเป็นการค้นหาด้วยภาพ

  // 🚀 State สำหรับสินค้าที่เกี่ยวข้อง (เมื่อไม่พบผลลัพธ์)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // 🚀 State สำหรับ FilterBar
  const [sortBy, setSortBy] = useState('related');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  // 🚀 State สำหรับ Filter Modal (แบบ Shopee)
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('ช่วงราคา');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedShopType, setSelectedShopType] = useState<'mall' | 'regular' | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<'new' | 'used' | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  // 🚀 Animation สำหรับ Filter Modal (slide ลงจากบน)
  // เริ่มจาก -450 (ซ่อนเฉพาะส่วน content) แล้ว slide ลงมาที่ 58 (ใต้ header จริง)
  const filterSlideAnim = React.useRef(new Animated.Value(-450)).current; // ใช้แค่ -450 (ความสูงของ content ไม่รวม header)

  useEffect(() => {
    if (showPriceFilter) {
      // รีเซ็ตตำแหน่งแล้วค่อย slide ลง
      filterSlideAnim.setValue(-450); // เริ่มที่ -450
      Animated.timing(filterSlideAnim, {
        toValue: 58, // slide ลงมาหยุดที่ 58 (ใต้ header จริง)
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      // animation ตอนปิด
      Animated.timing(filterSlideAnim, {
        toValue: -450, // slide กลับไปที่ -450
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [showPriceFilter, filterSlideAnim]);

  // 🚀 ฟังก์ชันปิด Modal แบบมี animation
  const closeFilterModal = () => {
    Animated.timing(filterSlideAnim, {
      toValue: -450, // เปลี่ยนเป็น -450
      duration: 250,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowPriceFilter(false);
    });
  };

  // ฟังก์ชันค้นหาด้วยภาพ (ประกาศก่อน useEffect)
  const performVisualSearch = useCallback(async (imageUri: string) => {
    setLoading(true);
    setShowResults(true);
    setSearchResults([]);
    setOtherSearchResults([]);
    setCurrentSearchQuery('ผลการค้นหาด้วยภาพ');
    setQuery('ผลการค้นหาด้วยภาพ');
    setIsVisualSearch(true);
    setHasMore(false);

    try {
      console.log('📷 Starting visual search with image:', imageUri);
      const { products, otherProducts } = await visualSearch(imageUri);
      const total = (products?.length || 0) + (otherProducts?.length || 0);

      if (total === 0) {
        Alert.alert('ไม่พบสินค้า', 'ไม่พบสินค้าที่คล้ายกับรูปภาพนี้');
        return;
      }

      const mapProduct = (p: any) => ({
        id: p.id,
        title: p.title || '',
        price: (p.price !== null && p.price !== undefined) ? parseFloat(p.price) : 0,
        discountPrice: p.discountPrice !== null && p.discountPrice !== undefined ? parseFloat(p.discountPrice) : null,
        imageUrl: p.images && p.images.length > 0 ? p.images[0].url : 'https://via.placeholder.com/600',
        storeName: p.store ? p.store.name : 'BoxiFY Mall',
        product: p,
      });

      setSearchResults((products || []).map(mapProduct));
      setOtherSearchResults((otherProducts || []).map(mapProduct));
    } catch (error: any) {
      console.error('❌ Visual search error:', error);
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถค้นหาสินค้าจากรูปภาพได้');
      setSearchResults([]);
      setOtherSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🚀 ตรวจสอบ imageUri จาก route params และเรียก visual search
  useEffect(() => {
    if (imageUri) {
      console.log('📷 Image URI received from route params:', imageUri);
      performVisualSearch(imageUri);
    }
  }, [imageUri, performVisualSearch]);

  // 🚀 เปิด Filter Modal เมื่อ navigate มาพร้อม openFilter = true
  useEffect(() => {
    if (openFilter) {
      setShowPriceFilter(true);
    }
  }, [openFilter]);

  // โหลด history และ recommendations เมื่อ component mount (ถ้าไม่มี imageUri)
  useEffect(() => {
    if (!imageUri && !showResults) {
      loadHistoryAndRecommend();
    }
  }, [showResults]);

  // 🚀 ฟังก์ชันโหลดประวัติ + ดึงสินค้าแนะนำ
  const loadHistoryAndRecommend = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem(HISTORY_KEY);
      let lastSearch = '';

      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(parsedHistory);
        if (parsedHistory.length > 0) {
          lastSearch = parsedHistory[0];
        }
      }

      fetchRecommendations(lastSearch);
    } catch (e) {
      console.error(e);
    }
  };

  // 🚀 ฟังก์ชันดึงสินค้าจาก API (Smart Fetch)
  const fetchRecommendations = async (keyword: string) => {
    setLoadingRecommend(true);
    try {
      let response;

      if (keyword && keyword.trim()) {
        response = await api.get('/products/search', {
          params: { keyword: keyword.trim() },
        });
      } else {
        // ✅ ดึงสินค้าทั้งหมด (Response Interceptor จะ unwrap แล้ว)
        response = await api.get('/products');
      }

      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const productsArray = Array.isArray(response) ? response : (response?.data || []);

      const items = productsArray.slice(0, 10).map((p: any) => ({
        id: p.id,
        title: p.title || '',
        imageUrl: p.images && p.images.length > 0 ? p.images[0].url : 'https://via.placeholder.com/100',
      }));

      setRecommendedItems(items);
    } catch (error) {
      console.log('Failed to load recommendations:', error);
      setRecommendedItems([]);
    } finally {
      setLoadingRecommend(false);
    }
  };

  // 🚀 ฟังก์ชันดึงสินค้าที่เกี่ยวข้อง (เมื่อไม่พบผลลัพธ์)
  const fetchRelatedProducts = useCallback(async (keyword: string) => {
    setLoadingRelated(true);
    try {
      // ดึงสินค้าที่เกี่ยวข้องโดยไม่ใช้ keyword หรือใช้ keyword ที่คล้ายกัน
      const response: any = await productService.getProducts(
        undefined,
        1,
        10,
        undefined, // ไม่ใช้ keyword เพื่อดึงสินค้าทั่วไป
        'sold', // เรียงตามยอดขาย
        undefined,
        undefined,
      );

      const mappedProducts = response.data.slice(0, 8).map((p: any) => ({
        id: p.id,
        title: p.title || '',
        price: (p.price !== null && p.price !== undefined) ? parseFloat(p.price) : 0,
        discountPrice: p.discountPrice !== null && p.discountPrice !== undefined ? parseFloat(p.discountPrice) : null,
        imageUrl: p.images && p.images.length > 0 ? p.images[0].url : 'https://via.placeholder.com/600',
        storeName: p.store ? p.store.name : 'BoxiFY Mall',
        product: p,
      }));

      setRelatedProducts(mappedProducts);
    } catch (error) {
      console.error('❌ Error fetching related products:', error);
      setRelatedProducts([]);
    } finally {
      setLoadingRelated(false);
    }
  }, []);

  // 🚀 ฟังก์ชันค้นหาสินค้า
  const fetchSearchResults = useCallback(async (pageNumber: number, isRefresh = false) => {
    if (!hasMore && !isRefresh) return;

    if (pageNumber === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const keyword = currentSearchQuery && currentSearchQuery.trim() ? currentSearchQuery.trim() : undefined;
      console.log('🔍 Searching products with keyword:', keyword);
      console.log('📄 Page:', pageNumber);
      console.log('📊 SortBy:', sortBy);
      console.log('💰 Price Range:', minPrice && maxPrice ? `${minPrice}-${maxPrice}` : (minPrice ? `>${minPrice}` : (maxPrice ? `<${maxPrice}` : 'All')));

      const response: any = await productService.getProducts(
        undefined,
        pageNumber,
        10,
        keyword,
        sortBy,
        minPrice ? Number(minPrice) : undefined,
        maxPrice ? Number(maxPrice) : undefined,
      );

      console.log('✅ Search response:', {
        total: response.total,
        page: response.page,
        last_page: response.last_page,
        products_count: response.data?.length || 0,
      });

      let mappedProducts = response.data.map((p: any) => ({
        id: p.id,
        title: p.title || '',
        price: (p.price !== null && p.price !== undefined) ? parseFloat(p.price) : 0,
        discountPrice: p.discountPrice !== null && p.discountPrice !== undefined ? parseFloat(p.discountPrice) : null,
        imageUrl: p.images && p.images.length > 0 ? p.images[0].url : 'https://via.placeholder.com/600',
        storeName: p.store ? p.store.name : 'BoxiFY Mall',
        product: p, // ✅ เพิ่ม product object เพื่อให้ ProductCard ดึง store.isMall ได้
      }));

      // 🚀 Filter ฝั่ง Client (เพราะ backend ยังไม่รองรับ)
      // Filter by Rating
      if (selectedRating !== null) {
        mappedProducts = mappedProducts.filter((item: any) => {
          const productRating = item.product?.rating || item.product?.averageRating || 0;
          return productRating >= selectedRating;
        });
      }

      // Filter by Shop Type (Mall/Regular)
      if (selectedShopType !== null) {
        mappedProducts = mappedProducts.filter((item: any) => {
          const isMall = item.product?.store?.isMall || false;
          if (selectedShopType === 'mall') {
            return isMall === true;
          } else if (selectedShopType === 'regular') {
            return isMall === false;
          }
          return true;
        });
      }

      // Filter by Condition (New/Used)
      if (selectedCondition !== null) {
        mappedProducts = mappedProducts.filter((item: any) => {
          const condition = item.product?.condition || 'new';
          return condition.toLowerCase() === selectedCondition.toLowerCase();
        });
      }

      console.log('📦 Mapped products (after filters):', mappedProducts.length);

      if (isRefresh) {
        setSearchResults(mappedProducts);
        // ถ้าไม่พบผลลัพธ์ ให้ดึงสินค้าที่เกี่ยวข้อง
        if (mappedProducts.length === 0 && pageNumber === 1 && keyword) {
          fetchRelatedProducts(keyword);
        } else {
          setRelatedProducts([]);
        }
      } else {
        setSearchResults(prev => [...prev, ...mappedProducts]);
      }

      setHasMore(response.page < response.last_page);
    } catch (error: any) {
      console.error('❌ Error fetching products:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (pageNumber === 1) {
        setSearchResults([]);
        // ถ้าไม่พบผลลัพธ์ ให้ดึงสินค้าที่เกี่ยวข้อง
        if (currentSearchQuery) {
          fetchRelatedProducts(currentSearchQuery);
        }
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentSearchQuery, hasMore, sortBy, minPrice, maxPrice, selectedRating, selectedShopType, selectedCondition, selectedPaymentMethod]);

  // ✅ ดึงคำแนะนำการค้นหาจาก Backend (Debounced)
  const scheduleFetchSuggestions = (text: string) => {
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }

    const trimmed = text.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    suggestionsTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('🔍 Fetching suggestions for:', trimmed);
        // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
        const res = await api.get('/products/suggestions', {
          params: { keyword: trimmed },
        });

        let list: string[] = Array.isArray(res) ? res : (res?.data || []);

        // ✨ กรอง: ขึ้นต้นด้วยหรือมีคำค้นหา และต้องยาวกว่าคำค้นหา (ไม่ให้ตัวอักษรเดียวเช่น "ก" โผล่เป็น suggestion)
        const filteredList = list.filter(
          (item) =>
            (item.toLowerCase().startsWith(trimmed.toLowerCase()) ||
              item.toLowerCase().includes(trimmed.toLowerCase())) &&
            item.trim().length > trimmed.length,
        );

        console.log('✅ Filtered suggestions:', filteredList);
        setSuggestions(filteredList.slice(0, 10)); // เอาแค่ 10 คำแรก
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      }
    }, 300); // ลดเวลา debounce ลงนิดหน่อยให้รู้สึกเร็วขึ้น
  };

  const handleChangeQuery = (text: string) => {
    setQuery(text);
    if (!showResults) {
      scheduleFetchSuggestions(text);
    }
  };

  const handleSearch = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      Alert.alert('คำเตือน', 'กรุณากรอกคำค้นหา');
      return;
    }

    console.log('🔍 Starting search for:', trimmedText);

    // ✅ รีเซ็ตโหมด Visual Search เสมอเมื่อมีการค้นหาด้วยข้อความ
    setIsVisualSearch(false);
    // เริ่มค้นหาแล้ว ซ่อนคำแนะนำ
    setSuggestions([]);

    const newHistory = [trimmedText, ...history.filter(h => h !== trimmedText)].slice(0, 10);
    setHistory(newHistory);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));

    // ตั้งค่า state สำหรับแสดงผลลัพธ์
    setCurrentSearchQuery(trimmedText);
    setQuery(trimmedText);
    setShowResults(true);
    setPage(1);
    setHasMore(true);
    setSearchResults([]);
    // ✅ Reset state เก่าก่อนเริ่มค้นหาใหม่
    setRelatedProducts([]);
    setLoading(false);
    setLoadingMore(false);

    // เรียก fetchSearchResults โดยตรงด้วย keyword
    setLoading(true);
    console.log('🔍 Calling API with params:', {
      keyword: trimmedText,
      page: 1,
      sortBy,
      minPrice,
      maxPrice,
    });
    try {
      const response: any = await productService.getProducts(
        undefined,
        1,
        10,
        trimmedText,
        sortBy,
        minPrice ? Number(minPrice) : undefined,
        maxPrice ? Number(maxPrice) : undefined,
      );

      console.log('✅ Search response:', {
        total: response.total,
        page: response.page,
        last_page: response.last_page,
        products_count: response.data?.length || 0,
      });

      let mappedProducts = response.data.map((p: any) => ({
        id: p.id,
        title: p.title || '',
        price: (p.price !== null && p.price !== undefined) ? parseFloat(p.price) : 0,
        discountPrice: p.discountPrice !== null && p.discountPrice !== undefined ? parseFloat(p.discountPrice) : null,
        imageUrl: p.images && p.images.length > 0 ? p.images[0].url : 'https://via.placeholder.com/600',
        storeName: p.store ? p.store.name : 'BoxiFY Mall',
        product: p, // ✅ เพิ่ม product object เพื่อให้ ProductCard ดึง store.isMall ได้
      }));

      // 🚀 Filter ฝั่ง Client (เพราะ backend ยังไม่รองรับ)
      // Filter by Rating
      if (selectedRating !== null) {
        mappedProducts = mappedProducts.filter((item: any) => {
          const productRating = item.product?.rating || item.product?.averageRating || 0;
          return productRating >= selectedRating;
        });
      }

      // Filter by Shop Type (Mall/Regular)
      if (selectedShopType !== null) {
        mappedProducts = mappedProducts.filter((item: any) => {
          const isMall = item.product?.store?.isMall || false;
          if (selectedShopType === 'mall') {
            return isMall === true;
          } else if (selectedShopType === 'regular') {
            return isMall === false;
          }
          return true;
        });
      }

      // Filter by Condition (New/Used)
      if (selectedCondition !== null) {
        mappedProducts = mappedProducts.filter((item: any) => {
          const condition = item.product?.condition || 'new';
          return condition.toLowerCase() === selectedCondition.toLowerCase();
        });
      }

      console.log('📦 Mapped products (after filters):', mappedProducts.length);
      setSearchResults(mappedProducts);
      console.log('✅ Search completed, results set:', mappedProducts.length);
      // ถ้าไม่พบผลลัพธ์ ให้ดึงสินค้าที่เกี่ยวข้อง
      if (mappedProducts.length === 0 && trimmedText) {
        fetchRelatedProducts(trimmedText);
      } else {
        setRelatedProducts([]);
      }
      setHasMore(response.page < response.last_page);
    } catch (error: any) {
      console.error('❌ Error fetching products:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      Alert.alert('Error', error.response?.data?.message || 'ไม่พบสินค้าที่ค้นหา');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 ฟังก์ชันจัดการ Visual Search
  const handleCameraPress = async () => {
    try {
      // แสดง ActionSheet ให้เลือกถ่ายรูปหรือเลือกรูป
      Alert.alert(
        'ค้นหาด้วยภาพ',
        'เลือกวิธีค้นหา',
        [
          {
            text: 'ถ่ายรูป',
            onPress: () => handleTakePhoto(),
          },
          {
            text: 'เลือกรูปจากอัลบั้ม',
            onPress: () => handlePickImage(),
          },
          {
            text: 'ยกเลิก',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error showing camera options:', error);
    }
  };

  // ฟังก์ชันถ่ายรูป
  const handleTakePhoto = async () => {
    try {
      // ขอ permission สำหรับกล้อง
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert('คำเตือน', 'ต้องการสิทธิ์ในการเข้าถึงกล้องเพื่อถ่ายรูป');
        return;
      }

      // เปิดกล้อง
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'], // ✅ SDK 53+ format
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await performVisualSearch(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถถ่ายรูปได้');
    }
  };

  // ฟังก์ชันเลือกรูปจากอัลบั้ม
  const handlePickImage = async () => {
    try {
      // ขอ permission สำหรับ media library
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaPermission.granted) {
        Alert.alert('คำเตือน', 'ต้องการสิทธิ์ในการเข้าถึงรูปภาพ');
        return;
      }

      // เปิด image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // ✅ SDK 53+ format
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await performVisualSearch(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้');
    }
  };


  const handleBackToSearch = () => {
    setShowResults(false);
    setQuery('');
    setCurrentSearchQuery('');
    setSearchResults([]);
    setRelatedProducts([]);
    setIsVisualSearch(false);
  };

  const handleLoadMore = () => {
    // Visual search ไม่มี pagination
    if (isVisualSearch) return;

    if (!loadingMore && !loading && hasMore && currentSearchQuery) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSearchResults(nextPage);
    }
  };

  const handleRefresh = () => {
    // Visual search ไม่มี pagination
    if (isVisualSearch) {
      Alert.alert('คำเตือน', 'ไม่สามารถรีเฟรชผลการค้นหาด้วยภาพได้');
      return;
    }

    setPage(1);
    setHasMore(true);
    fetchSearchResults(1, true);
  };

  const clearHistory = async () => {
    setHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);
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

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ padding: 10 }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  // 🚀 Component แสดง Active Filters
  const ActiveFiltersBar = () => {
    const activeFilters: Array<{ label: string; onRemove: () => void }> = [];

    // ช่วงราคา
    if (minPrice || maxPrice) {
      const priceLabel = minPrice && maxPrice
        ? `฿${minPrice} - ฿${maxPrice}`
        : minPrice
          ? `฿${minPrice} ขึ้นไป`
          : `฿${maxPrice} ลงมา`;
      activeFilters.push({
        label: priceLabel,
        onRemove: () => {
          setMinPrice('');
          setMaxPrice('');
          setSelectedPriceRange(null);
          if (showResults && !isVisualSearch && currentSearchQuery) {
            setPage(1);
            setHasMore(true);
            fetchSearchResults(1, true);
          }
        },
      });
    }

    // คะแนน
    if (selectedRating !== null) {
      activeFilters.push({
        label: `≥${selectedRating}★`,
        onRemove: () => {
          setSelectedRating(null);
          if (showResults && !isVisualSearch && currentSearchQuery) {
            setPage(1);
            setHasMore(true);
            fetchSearchResults(1, true);
          }
        },
      });
    }

    // ประเภทร้าน
    if (selectedShopType !== null) {
      activeFilters.push({
        label: selectedShopType === 'mall' ? 'Shopee Mall' : 'ร้านแนะนำ',
        onRemove: () => {
          setSelectedShopType(null);
          if (showResults && !isVisualSearch && currentSearchQuery) {
            setPage(1);
            setHasMore(true);
            fetchSearchResults(1, true);
          }
        },
      });
    }

    // สภาพสินค้า
    if (selectedCondition !== null) {
      activeFilters.push({
        label: selectedCondition === 'new' ? 'ใหม่' : 'ของมือสอง',
        onRemove: () => {
          setSelectedCondition(null);
          if (showResults && !isVisualSearch && currentSearchQuery) {
            setPage(1);
            setHasMore(true);
            fetchSearchResults(1, true);
          }
        },
      });
    }

    // ช่องทางการชำระเงิน
    if (selectedPaymentMethod !== null) {
      activeFilters.push({
        label: selectedPaymentMethod,
        onRemove: () => {
          setSelectedPaymentMethod(null);
          if (showResults && !isVisualSearch && currentSearchQuery) {
            setPage(1);
            setHasMore(true);
            fetchSearchResults(1, true);
          }
        },
      });
    }

    if (activeFilters.length === 0) return null;

    return (
      <View style={[styles.activeFiltersBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {activeFilters.map((filter, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.activeFilterChip, { backgroundColor: colors.background, borderColor: colors.primary }]}
              onPress={filter.onRemove}
            >
              <Text style={[styles.activeFilterText, { color: '#000000' }]}>{filter.label}</Text>
              <Ionicons name="close-circle" size={16} color="#000000" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
          {activeFilters.length > 0 && (
            <TouchableOpacity
              style={[styles.clearAllButton, { backgroundColor: colors.background }]}
              onPress={clearPriceFilter}
            >
              <Text style={[styles.clearAllText, { color: '#000000' }]}>ล้างทั้งหมด</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  const FilterBar = () => {
    return (
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
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
          onPress={() => setSortBy(sortBy === 'price_asc' ? 'price_desc' : 'price_asc')}
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

  // 🚀 ฟังก์ชันกรองราคา
  const applyPriceFilter = () => {
    closeFilterModal();
    // รอให้ animation เสร็จก่อนแล้วค่อย refetch
    setTimeout(() => {
      setPage(1);
      setHasMore(true);
      if (showResults && !isVisualSearch && currentSearchQuery) {
        fetchSearchResults(1, true);
      } else if (showResults && !isVisualSearch) {
        // ถ้ายังไม่มี query ให้ค้นหาใหม่ด้วย filter ที่ตั้งไว้
        handleSearch(currentSearchQuery || query);
      }
    }, 300);
  };

  const clearPriceFilter = () => {
    setMinPrice('');
    setMaxPrice('');
    setSelectedPriceRange(null);
    setSelectedRating(null);
    setSelectedShopType(null);
    setSelectedCondition(null);
    setSelectedPaymentMethod(null);
    closeFilterModal();
    // รอให้ animation เสร็จก่อนแล้วค่อย refetch
    setTimeout(() => {
      setPage(1);
      setHasMore(true);
      if (showResults && !isVisualSearch && currentSearchQuery) {
        fetchSearchResults(1, true);
      }
    }, 300);
  };

  // 🚀 useEffect เมื่อ sortBy เปลี่ยน (refetch ทันที)
  useEffect(() => {
    if (showResults && !isVisualSearch && currentSearchQuery) {
      console.log('🔄 SortBy changed, refetching...');
      setPage(1);
      setHasMore(true);
      fetchSearchResults(1, true);
    }
  }, [sortBy]);

  // 🚀 useEffect เมื่อ minPrice หรือ maxPrice เปลี่ยน (ไม่ refetch อัตโนมัติ ต้องกดปุ่มตกลง)
  // ลบ useEffect นี้เพราะเราต้องการให้ refetch เมื่อกดปุ่มตกลงเท่านั้น

  if (showResults) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={handleBackToSearch}>
            <Ionicons name="arrow-back" size={24} color={colors.icon} />
          </TouchableOpacity>
          <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.primary }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="ค้นหาสินค้า..."
              placeholderTextColor={colors.subText}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (text.trim()) {
                  scheduleFetchSuggestions(text);
                } else {
                  setSuggestions([]);
                }
              }}
              onFocus={() => {
                console.log('🔍 TextInput focused!');
                setIsSearchFocused(true);
                console.log('📝 Current query:', query);
                console.log('📜 History:', history);
                if (query.trim()) {
                  scheduleFetchSuggestions(query);
                }
              }}
              onBlur={() => {
                // Delay เพื่อให้กด suggestion ได้ก่อน
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              onSubmitEditing={() => handleSearch(query)}
              returnKeyType="search"
            />
            {/* ✅ ปุ่ม X: แก้ไขให้เห็นชัดเจนขึ้น */}
            {query.length > 0 && (
              <TouchableOpacity
                style={{ padding: 4, marginLeft: 4 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => {
                  setQuery('');
                  setSuggestions([]);
                  setIsSearchFocused(true); // คงสถานะ focus ไว้เพื่อให้เห็นประวัติ
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.text || '#000'} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cameraIcon} onPress={handleCameraPress}>
              <Ionicons name="camera-outline" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.filterButtonInHeader}
            onPress={() => setShowPriceFilter(true)}
          >
            <Ionicons name="filter-outline" size={18} color={colors.primary} />
            <Text style={[styles.filterButtonTextInHeader, { color: colors.primary }]}>ตัวกรอง</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ Logic การเลือกแสดงผล: isSearchFocused ? (Overlay) : (Content) */}
        {isSearchFocused ? (
          // ✅ A: ถ้ากดค้นหาอยู่ ให้แสดง Overlay (List) อย่างเดียว เต็มจอ
          <View style={[styles.suggestionOverlay, { backgroundColor: colors.background }]}>
            <ScrollView
              style={styles.suggestionOverlayScroll}
              contentContainerStyle={styles.suggestionOverlayContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* 1. Suggestions */}
              {suggestions.length > 0 && (
                <View style={[styles.suggestionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.suggestionSectionTitle, { color: colors.subText }]}>คำแนะนำ</Text>
                  {suggestions.map((s, index) => (
                    <TouchableOpacity
                      key={`suggestion-${s}-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setQuery(s);
                        handleSearch(s);
                        setIsSearchFocused(false);
                      }}
                    >
                      <Ionicons name="search-outline" size={16} color={colors.subText} style={{ marginRight: 8 }} />
                      <Text style={{ color: colors.text }} numberOfLines={1}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* 2. History (แสดงเมื่อไม่มี Suggestions) */}
              {history.length > 0 && suggestions.length === 0 && (
                <View style={[styles.suggestionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.suggestionSectionTitle, { color: colors.subText }]}>ประวัติการค้นหา</Text>
                  {history.map((item, index) => (
                    <TouchableOpacity
                      key={`history-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setQuery(item);
                        handleSearch(item);
                        setIsSearchFocused(false);
                      }}
                    >
                      <Ionicons name="time-outline" size={16} color={colors.subText} style={{ marginRight: 8 }} />
                      <Text style={{ color: colors.text }} numberOfLines={1}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* 3. Empty State (เพื่อให้เห็นกรอบแม้ไม่มีข้อมูล) */}
              {suggestions.length === 0 && history.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: colors.subText }}>พิมพ์เพื่อค้นหา...</Text>
                </View>
              )}
            </ScrollView>
          </View>
        ) : (
          // ✅ B: ถ้าไม่ได้กดค้นหา ให้แสดงผลลัพธ์สินค้า (Results)
          <>
            <FilterBar />
            <ActiveFiltersBar />
            <Text style={[styles.resultCount, { color: colors.subText, backgroundColor: colors.card }]}>
              พบสินค้า {searchResults.length + otherSearchResults.length} รายการ
            </Text>

            {loading && page === 1 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderProduct}
                keyExtractor={(item, index) => item.id.toString() + index}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                ListFooterComponent={() => (
                  <>
                    {isVisualSearch && otherSearchResults.length > 0 && (
                      <View style={styles.otherSection}>
                        <Text style={[styles.otherSectionTitle, { color: colors.subText }]}>สินค้าอื่นๆ</Text>
                        <View style={styles.otherSectionGrid}>
                          {otherSearchResults.map((item: any, index: number) => (
                            <View key={item.id.toString() + '_other_' + index} style={styles.otherSectionItem}>
                              {renderProduct({ item })}
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    {renderFooter()}
                  </>
                )}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={80} color={colors.subText} style={styles.emptyIcon} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>ไม่พบสินค้าที่ค้นหา</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.subText }]}>
                      ลองค้นหาด้วยคำอื่น หรือปรับตัวกรอง
                    </Text>

                    {/* สินค้าที่เกี่ยวข้อง */}
                    {relatedProducts.length > 0 && (
                      <View style={styles.relatedSection}>
                        <Text style={[styles.relatedTitle, { color: colors.text }]}>สินค้าที่เกี่ยวข้อง</Text>
                        {loadingRelated ? (
                          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
                        ) : (
                          <FlatList
                            data={relatedProducts}
                            renderItem={renderProduct}
                            keyExtractor={(item, index) => item.id.toString() + index}
                            numColumns={2}
                            columnWrapperStyle={styles.columnWrapper}
                            scrollEnabled={false}
                            contentContainerStyle={styles.relatedGrid}
                          />
                        )}
                      </View>
                    )}
                  </View>
                )}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                onRefresh={handleRefresh}
                refreshing={loading && page === 1}
                style={[styles.list, { backgroundColor: colors.background }]}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        )}

        {/* Modal กรองแบบ Shopee */}
        <Modal
          visible={showPriceFilter}
          transparent
          animationType="none"
          onRequestClose={closeFilterModal}
        >
          <TouchableOpacity
            style={styles.filterModalOverlay}
            activeOpacity={1}
            onPress={closeFilterModal}
          >
            <Animated.View
              style={[
                styles.filterModalContainer,
                { backgroundColor: colors.card, transform: [{ translateY: filterSlideAnim }] },
              ]}
            >
              <View style={[styles.filterModalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={closeFilterModal}>
                  <Ionicons name="arrow-back" size={24} color={colors.icon} />
                </TouchableOpacity>
                <View style={[styles.searchBar, { backgroundColor: colors.inputBg || colors.background, borderColor: colors.primary }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="ค้นหาสินค้า..."
                    placeholderTextColor={colors.subText}
                    value={query}
                    editable={false}
                  />
                  <TouchableOpacity style={styles.cameraIcon}>
                    <Ionicons name="camera-outline" size={20} color={colors.subText} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.filterButtonInHeader}>
                  <Ionicons name="filter-outline" size={18} color={colors.primary} />
                  <Text style={[styles.filterButtonTextInHeader, { color: colors.primary }]}>ตัวกรอง</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.filterMainContent}>
                <View style={[styles.filterSidebar, { backgroundColor: colors.background }]}>
                  <TouchableOpacity
                    style={[
                      styles.filterSidebarItem,
                      { borderLeftColor: 'transparent' },
                      selectedFilterCategory === 'ช่วงราคา' && [styles.filterSidebarItemActive, { backgroundColor: colors.card, borderLeftColor: colors.primary }],
                    ]}
                    onPress={() => setSelectedFilterCategory('ช่วงราคา')}
                  >
                    <Text
                      style={[
                        styles.filterSidebarText,
                        { color: colors.subText },
                        selectedFilterCategory === 'ช่วงราคา' && [styles.filterSidebarTextActive, { color: colors.primary }],
                      ]}
                    >
                      ช่วงราคา
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterSidebarItem,
                      { borderLeftColor: 'transparent' },
                      selectedFilterCategory === 'คะแนน' && [styles.filterSidebarItemActive, { backgroundColor: colors.card, borderLeftColor: colors.primary }],
                    ]}
                    onPress={() => setSelectedFilterCategory('คะแนน')}
                  >
                    <Text
                      style={[
                        styles.filterSidebarText,
                        { color: colors.subText },
                        selectedFilterCategory === 'คะแนน' && [styles.filterSidebarTextActive, { color: colors.primary }],
                      ]}
                    >
                      คะแนน
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterSidebarItem,
                      { borderLeftColor: 'transparent' },
                      selectedFilterCategory === 'ประเภทร้าน' && [styles.filterSidebarItemActive, { backgroundColor: colors.card, borderLeftColor: colors.primary }],
                    ]}
                    onPress={() => setSelectedFilterCategory('ประเภทร้าน')}
                  >
                    <Text
                      style={[
                        styles.filterSidebarText,
                        { color: colors.subText },
                        selectedFilterCategory === 'ประเภทร้าน' && [styles.filterSidebarTextActive, { color: colors.primary }],
                      ]}
                    >
                      ประเภทร้าน
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterSidebarItem,
                      { borderLeftColor: 'transparent' },
                      selectedFilterCategory === 'สภาพสินค้า' && [styles.filterSidebarItemActive, { backgroundColor: colors.card, borderLeftColor: colors.primary }],
                    ]}
                    onPress={() => setSelectedFilterCategory('สภาพสินค้า')}
                  >
                    <Text
                      style={[
                        styles.filterSidebarText,
                        { color: colors.subText },
                        selectedFilterCategory === 'สภาพสินค้า' && [styles.filterSidebarTextActive, { color: colors.primary }],
                      ]}
                    >
                      สภาพสินค้า
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterSidebarItem,
                      { borderLeftColor: 'transparent' },
                      selectedFilterCategory === 'ช่องทางการชำระเงิน' && [styles.filterSidebarItemActive, { backgroundColor: colors.card, borderLeftColor: colors.primary }],
                    ]}
                    onPress={() => setSelectedFilterCategory('ช่องทางการชำระเงิน')}
                  >
                    <Text
                      style={[
                        styles.filterSidebarText,
                        { color: colors.subText },
                        selectedFilterCategory === 'ช่องทางการชำระเงิน' && [styles.filterSidebarTextActive, { color: colors.primary }],
                      ]}
                    >
                      ช่องทางการชำระเงิน
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.filterContent, { backgroundColor: colors.card }]}>
                  <ScrollView style={styles.filterScrollView}>
                    {selectedFilterCategory === 'ช่วงราคา' && (
                      <View>
                        <Text style={[styles.filterContentTitle, { color: colors.text }]}>ช่วงราคา</Text>
                        <View style={styles.priceInputRow}>
                          <TextInput
                            style={[styles.priceInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
                            placeholder="ใส่ราคาต่ำสุด"
                            placeholderTextColor={colors.subText}
                            keyboardType="numeric"
                            value={minPrice}
                            onChangeText={setMinPrice}
                          />
                          <Text style={{ marginHorizontal: 10, color: colors.text }}>-</Text>
                          <TextInput
                            style={[styles.priceInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
                            placeholder="ใส่ราคาสูงสุด"
                            placeholderTextColor={colors.subText}
                            keyboardType="numeric"
                            value={maxPrice}
                            onChangeText={setMaxPrice}
                          />
                        </View>
                        <View style={styles.filterButtonRow}>
                          {['0-150', '150-300', '300-450'].map((range) => {
                            const [min, max] = range.split('-');
                            const isActive = minPrice === min && maxPrice === max;
                            return (
                              <TouchableOpacity
                                key={range}
                                style={[
                                  styles.filterOptionButton,
                                  { backgroundColor: colors.card, borderColor: colors.border },
                                  isActive && [styles.filterOptionButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                                ]}
                                onPress={() => {
                                  if (isActive) {
                                    setMinPrice('');
                                    setMaxPrice('');
                                    setSelectedPriceRange(null);
                                  } else {
                                    setMinPrice(min);
                                    setMaxPrice(max);
                                    setSelectedPriceRange(range);
                                  }
                                }}
                              >
                                <Text
                                  style={[
                                    styles.filterOptionText,
                                    { color: colors.text },
                                    isActive && [styles.filterOptionTextActive, { color: '#fff' }],
                                  ]}
                                >
                                  {range}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {selectedFilterCategory === 'คะแนน' && (
                      <View>
                        <Text style={[styles.filterContentTitle, { color: colors.text }]}>คะแนน</Text>
                        <View style={styles.filterButtonRow}>
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <TouchableOpacity
                              key={rating}
                              style={[
                                styles.filterOptionButton,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                selectedRating === rating && [styles.filterOptionButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                              ]}
                              onPress={() => setSelectedRating(selectedRating === rating ? null : rating)}
                            >
                              <Text
                                style={[
                                  styles.filterOptionText,
                                  { color: colors.text },
                                  selectedRating === rating && [styles.filterOptionTextActive, { color: '#fff' }],
                                ]}
                              >
                                {rating === 5 ? '5★' : `≥${rating}★`}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {selectedFilterCategory === 'ประเภทร้าน' && (
                      <View>
                        <Text style={[styles.filterContentTitle, { color: colors.text }]}>ประเภทร้าน</Text>
                        <View style={styles.filterButtonRow}>
                          {[
                            { label: 'Shopee Mall', value: 'mall' },
                            { label: 'ร้านแนะนำ', value: 'regular' },
                          ].map((type) => {
                            const isActive = selectedShopType === type.value;
                            return (
                              <TouchableOpacity
                                key={type.value}
                                style={[
                                  styles.filterOptionButton,
                                  { backgroundColor: colors.card, borderColor: colors.border },
                                  isActive && [styles.filterOptionButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                                ]}
                                onPress={() => setSelectedShopType(isActive ? null : type.value as 'mall' | 'regular')}
                              >
                                <Text
                                  style={[
                                    styles.filterOptionText,
                                    { color: colors.text },
                                    isActive && [styles.filterOptionTextActive, { color: '#fff' }],
                                  ]}
                                >
                                  {type.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {selectedFilterCategory === 'สภาพสินค้า' && (
                      <View>
                        <Text style={[styles.filterContentTitle, { color: colors.text }]}>สภาพสินค้า</Text>
                        <View style={styles.filterButtonRow}>
                          {[
                            { label: 'ใหม่', value: 'new' },
                            { label: 'ของมือสอง', value: 'used' },
                          ].map((condition) => {
                            const isActive = selectedCondition === condition.value;
                            return (
                              <TouchableOpacity
                                key={condition.value}
                                style={[
                                  styles.filterOptionButton,
                                  { backgroundColor: colors.card, borderColor: colors.border },
                                  isActive && [styles.filterOptionButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                                ]}
                                onPress={() => setSelectedCondition(isActive ? null : condition.value as 'new' | 'used')}
                              >
                                <Text
                                  style={[
                                    styles.filterOptionText,
                                    { color: colors.text },
                                    isActive && [styles.filterOptionTextActive, { color: '#fff' }],
                                  ]}
                                >
                                  {condition.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {selectedFilterCategory === 'ช่องทางการชำระเงิน' && (
                      <View>
                        <Text style={[styles.filterContentTitle, { color: colors.text }]}>ช่องทางการชำระเงิน</Text>
                        <View style={styles.filterButtonRow}>
                          {['เก็บเงินปลายทาง', 'บัตรเครดิต', 'การผ่อนชำระ'].map((method) => (
                            <TouchableOpacity
                              key={method}
                              style={[
                                styles.filterOptionButton,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                selectedPaymentMethod === method && [styles.filterOptionButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                              ]}
                              onPress={() => setSelectedPaymentMethod(selectedPaymentMethod === method ? null : method)}
                            >
                              <Text
                                style={[
                                  styles.filterOptionText,
                                  { color: colors.text },
                                  selectedPaymentMethod === method && [styles.filterOptionTextActive, { color: '#fff' }],
                                ]}
                              >
                                {method}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </ScrollView>

                  <View style={[styles.filterModalActions, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.filterClearBtn, { backgroundColor: colors.background, borderColor: colors.primary }]}
                      onPress={clearPriceFilter}
                    >
                      <Text style={[styles.filterClearBtnText, { color: colors.primary }]}>ล้าง</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterConfirmBtn, { backgroundColor: colors.primary }]}
                      onPress={applyPriceFilter}
                    >
                      <Text style={styles.filterConfirmBtnText}>ตกลง</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.icon} />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.primary }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="เสื้อแขนยาว"
            placeholderTextColor={colors.subText}
            value={query}
            onChangeText={handleChangeQuery}
            onSubmitEditing={() => handleSearch(query)}
            autoFocus={true}
            returnKeyType="search"
          />
          {query.trim().length > 0 && (
            <TouchableOpacity
              style={styles.clearIcon}
              onPress={() => {
                setQuery('');
                setSuggestions([]);
                if (showResults) {
                  setShowResults(false);
                  setSearchResults([]);
                  setRelatedProducts([]);
                  setCurrentSearchQuery('');
                  setPage(1);
                  setHasMore(true);
                }
              }}
            >
              <Ionicons name="close-circle" size={18} color={colors.subText} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cameraIcon} onPress={handleCameraPress}>
            <Ionicons name="camera-outline" size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: '#000000' }]} onPress={() => handleSearch(query)}>
          <Ionicons name="search" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* ✅ Suggestion List ใต้ช่องค้นหา */}
      {!showResults && query.trim().length > 0 && suggestions.length > 0 && (
        <View style={[styles.suggestionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {suggestions.map((s, index) => (
            <TouchableOpacity
              key={`${s}-${index}`}
              style={styles.suggestionItem}
              onPress={() => {
                setQuery(s);
                handleSearch(s);
              }}
            >
              <Ionicons name="search-outline" size={16} color={colors.subText} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.text }} numberOfLines={1}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* หมวดหมู่ยอดนิยม: ทำให้กดได้จริง */}
        <View style={[styles.quickCategoryContainer, { backgroundColor: colors.card }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickCategoryScroll}
          >
            {QUICK_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.quickCategoryChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => handleSearch(cat)}
              >
                <Text
                  style={[styles.quickCategoryText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {history.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>ประวัติการค้นหา</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Ionicons name="trash-outline" size={20} color={colors.subText} />
              </TouchableOpacity>
            </View>
            <View style={styles.historyContainer}>
              {history.map((item, index) => (
                <TouchableOpacity key={index} style={[styles.historyChip, { backgroundColor: colors.background }]} onPress={() => handleSearch(item)}>
                  <Text style={[styles.historyText, { color: colors.text }]} numberOfLines={1}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.recommendHeader}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
              {RECOMMENDED_TABS.map((tab, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.tab, { borderBottomColor: colors.primary }, activeTab === tab && styles.activeTab]}
                  onPress={() => {
                    setActiveTab(tab);
                  }}
                >
                  <Text style={[
                    styles.tabText,
                    { color: colors.subText },
                    activeTab === tab && { color: colors.primary },
                  ]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {loadingRecommend ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.gridContainer}>
              {recommendedItems.length > 0 ? (
                recommendedItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.gridItem, { backgroundColor: colors.card }]}
                    onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                  >
                    <Image source={{ uri: item.imageUrl }} style={[styles.gridImage, { backgroundColor: colors.background }]} />
                    <Text style={[styles.gridText, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ color: colors.subText }}>ไม่พบสินค้าแนะนำ</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 15,
  },
  suggestionOverlay: {
    flex: 1,
    backgroundColor: '#fff', // หรือ colors.background
    width: '100%',
    zIndex: 10,
  },
  suggestionOverlayScroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  suggestionOverlayContent: {
    paddingBottom: 20,
  },
  suggestionContainer: {
    borderBottomWidth: 1,
    borderTopWidth: 0,
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  suggestionSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    height: 38,
    marginHorizontal: 10,
    paddingHorizontal: 12,
  },
  clearIcon: {
    marginHorizontal: 4,
  },
  input: { flex: 1, fontSize: 14 },
  searchText: { fontSize: 16, flex: 1 },
  cameraIcon: { marginLeft: 5 },
  searchBtn: {
    width: 60,
    height: 38,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  filterButtonTextInHeader: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  resultCount: {
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  content: { flex: 1 },
  section: { marginBottom: 20, paddingHorizontal: 15 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },
  historyContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  historyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 8,
  },
  historyText: { fontSize: 12 },

  // หมวดหมู่ด่วนด้านบน (แทนข้อความยาว ๆ ที่กดไม่ได้)
  quickCategoryContainer: {
    paddingVertical: 10,
    marginBottom: 10,
  },
  quickCategoryScroll: {
    paddingHorizontal: 15,
  },
  quickCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  quickCategoryText: {
    fontSize: 12,
  },

  recommendHeader: { marginBottom: 15 },
  tabsContainer: { flexDirection: 'row' },
  tab: { marginRight: 20, paddingBottom: 5 },
  activeTab: { borderBottomWidth: 2 },
  tabText: { fontSize: 16, fontWeight: 'bold' },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: itemWidth,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 10,
  },
  gridText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 10,
    width: '100%',
  },
  listContent: {
    paddingBottom: 20,
    alignItems: 'center',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    width: '100%',
    minHeight: 300,
  },
  emptyIcon: {
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
  },
  relatedSection: {
    width: '100%',
    marginTop: 30,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 15,
    width: '100%',
    textAlign: 'left',
  },
  relatedGrid: {
    paddingHorizontal: 0,
    width: '100%',
    alignItems: 'center',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    width: '100%',
  },
  activeFiltersBar: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  activeFiltersContent: {
    alignItems: 'center',
    paddingRight: 10,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 4,
  },
  clearAllText: {
    fontSize: 13,
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
  // Modal Styles (เดิม - เก็บไว้สำหรับ backward compatibility)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  // Filter Modal Styles (แบบ Shopee)
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  filterModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 508,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  filterMainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  filterSidebar: {
    width: 120,
  },
  filterSidebarItem: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
  },
  filterSidebarItemActive: {
  },
  filterSidebarText: {
    fontSize: 14,
  },
  filterSidebarTextActive: {
    fontWeight: '600',
  },
  filterContent: {
    flex: 1,
  },
  filterScrollView: {
    flex: 1,
    padding: 20,
  },
  filterContentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  filterButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  filterOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  filterOptionButtonActive: {
  },
  filterOptionText: {
    fontSize: 14,
  },
  filterOptionTextActive: {
    fontWeight: '600',
  },
  filterModalActions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    gap: 10,
  },
  filterClearBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  filterClearBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  filterConfirmBtnText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
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
  cancelBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 5,
  },
  applyBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#FF5722',
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
