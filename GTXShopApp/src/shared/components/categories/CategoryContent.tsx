// components/categories/CategoryContent.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, FlatList, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import api from '@app/api/client';
import ProductCard from '@shared/components/common/ProductCard';

// 💡 ใช้ interface ที่สอดคล้องกับ API /categories
interface Subcategory {
  id: number;
  name: string;
  iconType?: string;
  iconEmoji?: string;
  iconImageUrl?: string;
  iconIonicon?: string;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
  image: string; // JSON String (เก็บ icon และ image URL)
  subcategories?: Subcategory[]; // ✅ Array จาก Backend (ไม่ต้อง parse JSON)
}

const { width } = Dimensions.get('window');
// ความกว้างของเนื้อหา = [หน้าจอทั้งหมด] - [Sidebar 100] - [Padding 20] / [3 คอลัมน์]
const itemWidth = (width - 100 - 40) / 3;
// ✅ ความกว้างของพื้นที่ขวามือ (ประมาณ 75% ของหน้าจอ)
const contentWidth = width * 0.75;
// ✅ ความกว้างของการ์ดสินค้าในหน้าหมวดหมู่ (2 คอลัมน์, ห่างกัน 2%)
const productCardWidth = (contentWidth - 30) / 2; // ลบ padding 30

// NOTE: SubCategoryItem ไม่ได้ใช้แล้ว (ใช้โครงปุ่มใหม่ด้านล่าง)

export default function CategoryContent({ activeCategory }: { activeCategory: Category | null }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  // ✅ เปลี่ยน state จาก string เป็น number (subcategoryId)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);

  // ✅ ดึงสินค้าแนะนำเมื่อ activeCategory เปลี่ยน
  useEffect(() => {
    if (activeCategory?.id) {
      // Reset subcategory เมื่อเปลี่ยน category
      setSelectedSubcategoryId(null);
      // เรียก API โดยไม่ส่ง subcategoryId (แสดงสินค้าทั้งหมดในหมวดหมู่)
      fetchRecommendations(activeCategory.id, null);
    } else {
      setRecommendations([]);
    }
  }, [activeCategory?.id]);

  // ✅ Fetch ใหม่เมื่อเลือก subcategory
  useEffect(() => {
    if (activeCategory?.id) {
      // เรียก API ทันทีเมื่อ selectedSubcategoryId เปลี่ยน (ไม่ว่าจะเป็น null หรือมีค่า)
      fetchRecommendations(activeCategory.id, selectedSubcategoryId);
    }
  }, [selectedSubcategoryId]);

  const fetchRecommendations = async (categoryId: number, subcategoryId?: number | null) => {
    setProductLoading(true);
    try {
      // ✅ ใช้ /products เสมอ (ไม่ใช้ /recommendations) เพื่อให้รองรับ subcategory filter
      let url = `/products?categoryId=${categoryId}&limit=20`;
      
      // ✅ ใช้ subcategoryId ในการกรอง (เร็วกว่าและแม่นยำกว่า keyword search)
      if (subcategoryId) {
        url += `&subcategoryId=${subcategoryId}`;
        console.log('🔍 Filtering by subcategoryId:', subcategoryId);
      }

      console.log('🔍 Fetching products:', {
        categoryId,
        subcategoryId,
        url,
      });

      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await api.get(url);
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      let products = Array.isArray(res) ? res : (res?.data || []);

      // ✅ ตรวจสอบว่า response เป็น array หรือ object (pagination)
      if (!Array.isArray(products) && products.data && Array.isArray(products.data)) {
        products = products.data;
      } else if (!Array.isArray(products)) {
        products = []; // กรณีผิดพลาด หรือ format ไม่ตรง
      }

      console.log('📦 Products received:', {
        count: products.length,
        subcategoryId,
        sampleProducts: products.slice(0, 3).map((p: any) => ({
          id: p.id,
          title: p.title,
          subcategoryId: p.subcategoryId,
        })),
      });

      // ✅ ส่ง product object เพื่อให้ ProductCard ดึง store.isMall ได้
      const mappedProducts = products.map((p: any) => ({
        ...p,
        product: p,
      }));
      setRecommendations(mappedProducts);
    } catch (error: any) {
      console.error('❌ Error fetching recommendations:', {
        error: error.message,
        response: error.response?.data,
        categoryId,
        subcategoryId,
      });
      setRecommendations([]);
    } finally {
      setProductLoading(false);
    }
  };

  if (!activeCategory) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  // ✅ ใช้ subcategories จาก API (ไม่ต้อง parse JSON)
  const subcategories: Subcategory[] = activeCategory.subcategories || [];
  
  // ✅ Parse JSON จาก field 'image' เพื่อดึง banner image และ icon
  let bannerImageUrl: string = 'https://via.placeholder.com/600x200?text=Promotion+Banner';
  try {
    if (activeCategory.image && activeCategory.image.trim() !== '') {
      const parsedData = JSON.parse(activeCategory.image);
      if (parsedData && typeof parsedData === 'object' && parsedData.image) {
        bannerImageUrl = parsedData.image;
      }
    }
  } catch (e) {
    console.error("Error parsing category image JSON:", e);
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 90 }}
    >
      <Image
        source={{ uri: (bannerImageUrl && bannerImageUrl.trim() !== '') ? bannerImageUrl : 'https://via.placeholder.com/600x200?text=Promotion+Banner' }}
        style={[styles.banner, { backgroundColor: colors.background }]}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>หมวดหมู่ย่อย</Text>
      {subcategories.length > 0 ? (
        <View style={styles.subcategoryContainer}>
          {subcategories.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.subcategoryBtn,
                {
                  backgroundColor: selectedSubcategoryId === item.id ? colors.primary : colors.card,
                  borderColor: colors.border
                }
              ]}
              onPress={() => {
                // Toggle selection - ใช้ id แทน name
                const newSubcategoryId = selectedSubcategoryId === item.id ? null : item.id;
                console.log('🎯 Subcategory clicked:', {
                  id: item.id,
                  name: item.name,
                  current: selectedSubcategoryId,
                  new: newSubcategoryId,
                });
                setSelectedSubcategoryId(newSubcategoryId);
              }}
            >
              {/* ✅ แสดง icon จาก subcategory entity */}
              {item.iconEmoji && item.iconEmoji.trim() !== '' ? (
                <Text
                  style={[
                    styles.subcategoryIcon,
                    { color: selectedSubcategoryId === item.id ? '#fff' : colors.text },
                  ]}
                >
                  {item.iconEmoji}
                </Text>
              ) : item.iconIonicon && item.iconIonicon.trim() !== '' ? (
                <Ionicons
                  name={item.iconIonicon.trim() as any}
                  size={16}
                  color={selectedSubcategoryId === item.id ? '#fff' : colors.text}
                  style={styles.subcategoryIcon}
                />
              ) : (
                // ถ้าไม่มี icon ให้แสดง default icon
                <Ionicons
                  name="ellipse-outline"
                  size={12}
                  color={selectedSubcategoryId === item.id ? '#fff' : colors.subText}
                  style={styles.subcategoryIcon}
                />
              )}
              <Text style={[
                styles.subcategoryText,
                { color: selectedSubcategoryId === item.id ? '#fff' : colors.text }
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={{ textAlign: 'center', marginTop: 10, color: colors.subText }}>ไม่มีหมวดหมู่ย่อย</Text>
      )}

      {/* ✅ Recommended Products */}
      <View style={styles.recommendSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>คุณอาจจะชอบ</Text>

        {productLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : recommendations.length > 0 ? (
          <View style={styles.productGrid}>
            {recommendations.map((item: any) => (
              <View key={item.id} style={styles.productCardWrapper}>
                {/* ✅ ใช้ style prop เพื่อ override width และ margin สำหรับหน้าหมวดหมู่ */}
                <ProductCard
                  product={item.product || item}
                  onPress={() => navigation.push('ProductDetail', { productId: item.id })}
                  style={styles.categoryCardStyle}
                />
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.subText }]}>
            ไม่พบสินค้าในหมวดหมู่นี้
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  banner: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  gridColumnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  gridItem: {
    width: 80,
    alignItems: 'center',
    marginBottom: 10,
  },
  gridImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 5,
  },
  gridText: {
    fontSize: 12,
    textAlign: 'center',
  },
  recommendSection: {
    marginTop: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCardWrapper: {
    width: '48%', // 2 คอลัมน์
    marginBottom: 10,
  },
  categoryCardStyle: {
    width: '100%',
    margin: 0,
    marginBottom: 0,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  // ✅ Styles สำหรับ Subcategory Buttons
  subcategoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  subcategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  subcategoryIcon: {
    fontSize: 16,
    marginRight: 6,
    minWidth: 20,
    textAlign: 'center',
  },
  subcategoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
