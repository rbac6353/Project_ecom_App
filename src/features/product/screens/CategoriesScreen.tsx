// screens/CategoriesScreen.tsx
import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '@app/api/client';
import { useTheme } from '@app/providers/ThemeContext';

// 1. Import Components
import CategoryHeader from '@shared/components/categories/CategoryHeader';
import CategorySidebar from '@shared/components/categories/CategorySidebar';
import CategoryContent from '@shared/components/categories/CategoryContent';

// 2. Define Category Interface (ใช้เหมือนใน Components)
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
  subcategories?: Subcategory[]; // ✅ Array จาก Backend
}

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🎯 API: GET /categories
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const categoriesResponse = await api.get('/categories');
      // ✅ Response Interceptor จะ unwrap แล้ว
      const raw = Array.isArray(categoriesResponse) 
        ? categoriesResponse 
        : (categoriesResponse?.data || []);
      const data = raw.filter((c: any) => c.name !== 'สินค้าทั่วไป');
      setCategories(data);
      if (data.length > 0) {
        setActiveCategory(data[0]); // 💡 ตั้งค่าหมวดหมู่แรกเป็น Active เริ่มต้น
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'ไม่สามารถดึงข้อมูลหมวดหมู่ได้');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchCategories();
  }, [fetchCategories]));

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <CategoryHeader />

      <View style={styles.mainContainer}>
        <CategorySidebar
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />

        <CategoryContent activeCategory={activeCategory} />
      </View>
      
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});

