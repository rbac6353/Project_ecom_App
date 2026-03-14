// components/categories/CategorySidebar.tsx
import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';

// 💡 ใช้ interface ที่สอดคล้องกับ API /categories
interface Category {
  id: number;
  name: string;
  image: string; // JSON String ที่มี subcategories
}

interface CategorySidebarProps {
  categories: Category[];
  activeCategory: Category | null;
  onSelect: (category: Category) => void;
}

export default function CategorySidebar({ categories, activeCategory, onSelect }: CategorySidebarProps) {
  const { colors } = useTheme();

  const getCategoryIcon = (category: Category): string | null => {
    if (!category.image) return null;
    try {
      const parsed = JSON.parse(category.image);
      if (parsed && typeof parsed === 'object' && parsed.icon) {
        const icon = String(parsed.icon).trim();
        // ✅ ถ้า icon เป็น "?" หรือ empty string ให้ return null
        if (icon === '' || icon === '?' || icon === 'null') {
          return null;
        }
        return icon;
      }
    } catch (e) {
      // ignore parse error
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {categories.map((category) => {
          const isActive = category.id === activeCategory?.id;
          const icon = getCategoryIcon(category);
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.item,
                { borderLeftColor: 'transparent' },
                isActive && { backgroundColor: colors.card, borderLeftColor: '#000000' },
              ]}
              onPress={() => {
                console.log('Category pressed:', category.name);
                onSelect(category);
              }}
              activeOpacity={0.6}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              {icon ? (
                /^[a-z0-9\-]+$/i.test(icon.trim()) ? (
                  <Ionicons
                    name={icon.trim() as any}
                    size={16}
                    color={isActive ? '#000000' : colors.subText}
                    style={styles.itemIcon}
                  />
                ) : (
                  <Text
                    style={[
                      styles.itemIcon,
                      { color: isActive ? '#000000' : colors.subText },
                    ]}
                  >
                    {icon}
                  </Text>
                )
              ) : null}
              <Text
                style={[
                  styles.itemText,
                  { color: colors.subText },
                  isActive && { color: '#000000', fontWeight: 'bold' },
                ]}
              >
                {category.name || ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
  },
  item: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderLeftWidth: 3,
  },
  itemIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

