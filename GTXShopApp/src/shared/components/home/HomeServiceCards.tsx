// components/home/HomeServiceCards.tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = 100;
const CARD_SPACING = 12;

interface ServiceItem {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  iconBg?: string;
  screen: string;
}

export default function HomeServiceCards() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScroll, setCanScroll] = useState(false);

  // Service items for horizontal scroll
  const serviceItems: ServiceItem[] = [
    {
      id: 1,
      icon: 'car-outline',
      title: 'ส่งฟรี + โค้ดลด',
      subtitle: 'ทั้งแอป',
      color: '#00BCD4',
      iconBg: '#FFFFFF',
      screen: 'CouponsScreen',
    },
    {
      id: 2,
      icon: 'flash',
      title: 'Flash Sale',
      subtitle: 'ลดแรง!',
      color: '#FF5722',
      iconBg: 'primaryLight',
      screen: 'FlashSale',
    },
    {
      id: 3,
      icon: 'storefront-outline',
      title: 'ร้านค้า Mall',
      subtitle: 'ร้านค้าชั้นนำ',
      color: '#E91E63',
      iconBg: '#FFFFFF',
      screen: 'MallStoresScreen',
    },
    {
      id: 4,
      icon: 'star',
      title: 'แต้มสะสม',
      subtitle: 'แลกของรางวัล',
      color: '#FF9800',
      iconBg: '#FFFFFF',
      screen: 'MyPoints',
    },
  ];

  const handleItemPress = (item: ServiceItem) => {
    const rootNavigation = navigation.getParent()?.getParent();
    const profileStackScreens = ['VouchersScreen', 'WishlistScreen', 'HistoryScreen', 'FollowingScreen', 'HelpCenterScreen', 'MyWallet'];
    if (rootNavigation) {
      if (profileStackScreens.includes(item.screen)) {
        rootNavigation.navigate('MainTabs', { screen: 'Profile', params: { screen: item.screen } });
      } else {
        rootNavigation.navigate(item.screen);
      }
    } else {
      navigation.navigate(item.screen);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={(event) => {
          const scrollX = event.nativeEvent.contentOffset.x;
          const scrollWidth = event.nativeEvent.contentSize.width;
          const containerWidth = event.nativeEvent.layoutMeasurement.width;

          // Calculate progress (0 to 1)
          const maxScroll = scrollWidth - containerWidth;
          if (maxScroll > 0) {
            const progress = scrollX / maxScroll;
            setScrollProgress(Math.min(Math.max(progress, 0), 1));
            setCanScroll(true);
          } else {
            setCanScroll(false);
          }

          // Update active index
          const index = Math.round(scrollX / (CARD_WIDTH + CARD_SPACING));
          setActiveIndex(index);
        }}
        onContentSizeChange={(contentWidth, contentHeight) => {
          // Check if content can scroll
          const containerWidth = width - 32; // container padding
          setCanScroll(contentWidth > containerWidth);
        }}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
      >
        {serviceItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.serviceCard}
            onPress={() => handleItemPress(item)}
            activeOpacity={0.8}
          >
            <View style={[
              styles.iconContainer,
              {
                backgroundColor: item.id === 5
                  ? colors.primaryLight
                  : colors.card
              }
            ]}>
              <Ionicons
                name={item.icon as any}
                size={32}
                color={item.id === 5 ? colors.primary : item.color}
              />
            </View>
            <Text style={[styles.serviceTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={[styles.serviceSubtitle, { color: colors.subText }]} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Progress Bar Indicator */}
      {canScroll && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(scrollProgress * 100)}%`,
                  backgroundColor: colors.primary
                }
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingRight: 16,
  },
  serviceCard: {
    width: CARD_WIDTH,
    alignItems: 'center',
    marginRight: CARD_SPACING,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  serviceSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});

