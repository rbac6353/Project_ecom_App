// components/home/HomeBannerCarousel.tsx
import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import PagerView from 'react-native-pager-view';
import api from '@app/api/client';
import { useTheme } from '@app/providers/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const { width } = Dimensions.get('window');

export default function HomeBannerCarousel() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [banners, setBanners] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await api.get('/banners');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const bannersList = Array.isArray(res) ? res : (res?.data || []);
      setBanners(bannersList);
    } catch (e) {
      console.error('Error fetching banners:', e);
    }
  };

  const handleBannerPress = (banner: any) => {
    if (!banner.link) return;

    // Handle deep link
    if (banner.link.startsWith('boxify://')) {
      const url = banner.link.replace('boxify://', '');
      const [screen, ...params] = url.split('/');

      if (screen === 'product' && params[0]) {
        navigation.navigate('ProductDetail', { productId: parseInt(params[0]) });
      } else if (screen === 'category' && params[0]) {
        navigation.navigate('Categories', { categoryId: parseInt(params[0]) });
      }
    } else if (banner.link.startsWith('http')) {
      // External URL
      Linking.openURL(banner.link);
    }
  };

  if (banners.length === 0) {
    return null; // ถ้าไม่มีไม่โชว์
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <PagerView
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={(e) => setActiveIndex(e.nativeEvent.position)}
      >
        {banners.map((item: any, index: number) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.9}
            onPress={() => handleBannerPress(item)}
            style={styles.slide}
          >
            <Image
              source={{ uri: (item.imageUrl && item.imageUrl.trim() !== '') ? item.imageUrl : 'https://via.placeholder.com/800x150.png?text=No+Image' }}
              style={styles.image}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </PagerView>

      {/* Pagination Dots */}
      {banners.length > 1 && (
        <View style={styles.pagination}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === activeIndex ? '#FF5722' : 'rgba(255, 255, 255, 0.5)',
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 150,
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pagerView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    width: width - 20,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

