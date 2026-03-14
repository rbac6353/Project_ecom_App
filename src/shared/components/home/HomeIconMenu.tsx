// components/home/HomeIconMenu.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import { Category } from '@shared/interfaces/home';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - 40) / 4.5; // 4.5 items visible

interface HomeIconMenuProps {
  categories: Category[];
  onCategoryChange?: (categoryId: number | null) => void;
  selectedCategoryId?: number | null;
}

export default function HomeIconMenu({ 
  categories, 
  onCategoryChange,
  selectedCategoryId = null 
}: HomeIconMenuProps) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(selectedCategoryId);

  // Sync state with prop
  useEffect(() => {
    setSelectedCategory(selectedCategoryId);
  }, [selectedCategoryId]);

  const handleCategoryPress = (category: Category) => {
    setSelectedCategory(category.id);
    if (onCategoryChange) {
      onCategoryChange(category.id);
    } else {
      // Fallback: navigate to ProductList if no callback provided
      navigation.getParent()?.getParent()?.navigate('ProductList', { categoryId: category.id, query: category.name });
    }
  };

  const handleSeeAll = () => {
    navigation.navigate('Categories');
  };

  const handleJustForYou = () => {
    setSelectedCategory(null);
    if (onCategoryChange) {
      onCategoryChange(null);
    }
  };

  // Helper: ดึง icon ของหมวดหมู่จาก JSON image field
  const getCategoryIcon = (cat: Category): string | null => {
    if (!cat.image) {
      console.log(`⚠️ Category "${cat.name}" has no image field`);
      return null;
    }
    try {
      const parsed = JSON.parse(cat.image);
      if (parsed && typeof parsed === 'object' && parsed.icon) {
        const icon = String(parsed.icon).trim();
        // ✅ ถ้า icon เป็น "?" หรือ empty string ให้ return null (จะใช้ default icon)
        if (icon === '' || icon === '?' || icon === 'null') {
          console.log(`⚠️ Category "${cat.name}" has invalid icon: "${icon}"`);
          return null;
        }
        console.log(`✅ Category "${cat.name}" icon: "${icon}"`);
        return icon;
      }
    } catch (e) {
      console.error(`❌ Error parsing category "${cat.name}" image JSON:`, e);
    }
    return null;
  };

  // เพิ่ม "Just for you" tab แรก + map icon จาก category.image.icon
  const allTabs = useMemo(
    () => [
      { id: 0, name: 'Just for you', icon: '🌟' },
      ...categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: getCategoryIcon(cat),
      })),
    ],
    [categories]
  );

  // Animation for category items
  const scaleAnims = useRef(allTabs.map(() => new Animated.Value(1))).current;

  const handlePressIn = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  if (categories.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>หมวดหมู่</Text>
        <TouchableOpacity onPress={handleSeeAll} style={styles.seeAllBtn}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>ดูทั้งหมด</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Category Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={ITEM_SIZE + 12}
      >
        {allTabs.map((tab, index) => {
          const isActive = tab.id === 0 
            ? selectedCategory === null 
            : selectedCategory === tab.id;

          // สีพื้นหลังสำหรับแต่ละหมวดหมู่
          const bgColors: readonly [string, string] = isActive 
            ? [colors.primary, colors.primary] as const
            : ['#F8F9FA', '#F0F1F3'] as const;

          return (
            <Animated.View
              key={tab.id}
              style={[
                styles.categoryItem,
                { transform: [{ scale: scaleAnims[index] }] },
              ]}
            >
              <TouchableOpacity
                style={styles.categoryTouchable}
                onPress={() => {
                  if (tab.id === 0) {
                    handleJustForYou();
                  } else {
                    const category = categories.find(c => c.id === tab.id);
                    if (category) handleCategoryPress(category);
                  }
                }}
                onPressIn={() => handlePressIn(index)}
                onPressOut={() => handlePressOut(index)}
                activeOpacity={1}
              >
                {/* Icon Circle */}
                <View style={[
                  styles.iconCircle,
                  isActive && styles.iconCircleActive,
                  { backgroundColor: isActive ? colors.primary : '#F5F5F5' },
                ]}>
                  {isActive && (
                    <LinearGradient
                      colors={[colors.primary, '#FF6B35']}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  {tab.icon && tab.icon.trim() !== '' && tab.icon !== '?' ? (
                    /^[a-z0-9\-]+$/i.test(tab.icon.trim()) ? (
                      <Ionicons
                        name={tab.icon.trim() as any}
                        size={24}
                        color={isActive ? '#FFFFFF' : colors.text}
                      />
                    ) : (
                      <Text style={styles.iconEmoji}>{tab.icon}</Text>
                    )
                  ) : (
                    <Ionicons
                      name="grid-outline"
                      size={24}
                      color={isActive ? '#FFFFFF' : colors.text}
                    />
                  )}
                </View>

                {/* Category Name */}
                <Text
                  style={[
                    styles.categoryName,
                    { color: isActive ? colors.primary : colors.text },
                    isActive && styles.categoryNameActive,
                  ]}
                  numberOfLines={2}
                >
                  {tab.name}
                </Text>

                {/* Active Indicator */}
                {isActive && (
                  <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  categoryItem: {
    width: ITEM_SIZE,
    marginHorizontal: 6,
  },
  categoryTouchable: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  iconCircleActive: {
    shadowColor: '#FF8C42',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconEmoji: {
    fontSize: 26,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  categoryNameActive: {
    fontWeight: '700',
  },
  activeIndicator: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    marginTop: 6,
  },
});
