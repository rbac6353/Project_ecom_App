// components/home/HomePromoBanner.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useTheme } from '@app/providers/ThemeContext';
import { useAuth } from '@app/providers/AuthContext';
import api from '@app/api/client';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 32;

interface ApiBanner {
  id: number;
  imageUrl: string;
  title?: string;
  link?: string;
  isActive: boolean;
  displayOrder: number;
}

export default function HomePromoBanner() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [apiBanners, setApiBanners] = useState<ApiBanner[]>([]);
  
  // ✅ ตรวจสอบว่าเป็น admin หรือ owner
  const isOwner = user?.role === 'seller' || user?.role === 'admin';

  const fetchBanners = async () => {
    try {
      const res = await api.get('/banners');
      const bannersList = Array.isArray(res) ? res : (res?.data || []);
      setApiBanners(bannersList);
      console.log('🖼️ HomePromoBanner - Fetched banners:', bannersList.length);
    } catch (e) {
      console.error('Error fetching banners:', e);
    }
  };

  // ✅ ดึงข้อมูล banner จาก API เมื่อ component mount
  useEffect(() => {
    fetchBanners();
  }, []);

  // ✅ Refresh ข้อมูล banner เมื่อกลับมาหน้า home
  useFocusEffect(
    useCallback(() => {
      fetchBanners();
    }, [])
  );

  // ✅ ฟังก์ชันสำหรับ admin/owner แก้ไข banner
  const handleLongPress = (banner: ApiBanner) => {
    if (!isOwner) return;
    
    Alert.alert(
      'จัดการแบนเนอร์',
      'เลือกการดำเนินการ',
      [
        {
          text: 'แก้ไข',
          onPress: () => {
            navigation.getParent()?.getParent()?.navigate('AdminBannerList');
          },
        },
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
      ]
    );
  };


  // ✅ ถ้าไม่มี banner จาก API ไม่แสดงอะไร
  if (apiBanners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / BANNER_WIDTH);
          setActiveIndex(index);
        }}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {apiBanners.map((banner) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.9}
            onPress={() => {
              // ✅ Handle banner link ถ้ามี
              if (banner.link) {
                if (banner.link.startsWith('boxify://')) {
                  const url = banner.link.replace('boxify://', '');
                  const [screen, ...params] = url.split('/');
                  const rootNavigation = navigation.getParent()?.getParent();
                  if (rootNavigation) {
                    if (screen === 'product' && params[0]) {
                      rootNavigation.navigate('ProductDetail', { productId: parseInt(params[0]) });
                    } else if (screen === 'category' && params[0]) {
                      rootNavigation.navigate('MainTabs', { screen: 'Categories' });
                    }
                  }
                } else if (banner.link.startsWith('http')) {
                  // External URL
                  Linking.openURL(banner.link);
                }
              }
            }}
            onLongPress={() => handleLongPress(banner)}
            style={styles.bannerTouchable}
          >
            <View style={styles.bannerImageContainer}>
              <Image
                source={{ uri: banner.imageUrl }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
              {/* ✅ แสดงไอคอนแก้ไขสำหรับ admin/owner */}
              {isOwner && (
                <View style={styles.editBadge}>
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      {apiBanners.length > 1 && (
        <View style={styles.pagination}>
          {apiBanners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeIndex && styles.paginationDotActive,
              ]}
            >
              {index === activeIndex && (
                <View style={styles.paginationDotInner} />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
  },
  bannerTouchable: {
    width: BANNER_WIDTH,
    height: 200,
    marginRight: 0,
  },
  bannerImageContainer: {
    width: BANNER_WIDTH,
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
    zIndex: 10,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  paginationDotInner: {
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
