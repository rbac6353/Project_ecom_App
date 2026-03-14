// components/home/HomePromoHeader.tsx
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomePromoHeader({ navigation: navProp }: { navigation?: any }) {
  const { colors } = useTheme();
  const navigation = navProp || useNavigation<any>();

  // Service items for horizontal scroll
  const serviceItems = [
    {
      id: 1,
      icon: 'car-outline',
      title: 'ส่งฟรี + โค้ดลด',
      subtitle: 'ทั้งแอป',
      color: '#00BCD4',
      screen: 'CouponsScreen',
    },
    {
      id: 2,
      icon: 'flash',
      title: 'Flash Sale',
      subtitle: 'ลดแรง!',
      color: '#FF5722',
      screen: 'FlashSale',
    },
    {
      id: 3,
      icon: 'star',
      title: 'แต้มสะสม',
      subtitle: 'แลกของรางวัล',
      color: '#FF9800',
      screen: 'MyPoints',
    },
    {
      id: 4,
      icon: 'heart-outline',
      title: 'สินค้าที่ถูกใจ',
      subtitle: 'Wishlist',
      color: '#E91E63',
      screen: 'WishlistScreen',
    },
  ];

  const handleItemPress = (item: any) => {
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
    <LinearGradient
      colors={['#000000', '#000000', '#333333', '#FFFFFF']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.75, 0.92, 1]}
      style={styles.container}
    >
      {/* White Header Bar */}
      <View style={styles.whiteHeader}>
        {/* Left: Scanner Icon */}
        <TouchableOpacity style={styles.scannerIcon}>
          <Ionicons name="scan-outline" size={24} color="#666666" />
        </TouchableOpacity>

        {/* Middle: Three Segments */}
        <View style={styles.middleSection}>
          {/* Segment 1: Shopping Bag with Bonus */}
          <TouchableOpacity style={styles.segment}>
            <View style={styles.segmentIconContainer}>
              <Ionicons name="bag-outline" size={20} color="#FF5722" />
            </View>
            <View style={styles.segmentContent}>
              <Text style={styles.segmentValue}>฿0.00</Text>
              <View style={styles.segmentLabelRow}>
                <Text style={styles.segmentLabel}>โบนัสเงินฟรี</Text>
                <Ionicons name="cash-outline" size={12} color="#666666" style={styles.flyingMoneyIcon} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Segment 2: Coins */}
          <TouchableOpacity style={styles.segment}>
            <View style={[styles.segmentIconContainer, styles.coinIconContainer]}>
              <Ionicons name="logo-bitcoin" size={20} color="#FFD700" />
              <View style={styles.redDot} />
            </View>
            <View style={styles.segmentContent}>
              <Text style={styles.segmentValue}>0.20</Text>
              <Text style={styles.segmentLabel}>แจก Coins</Text>
            </View>
          </TouchableOpacity>

          {/* Segment 3: Discount Code */}
          <TouchableOpacity style={styles.segment}>
            <View style={[styles.segmentIconContainer, styles.ticketIconContainer]}>
              <Ionicons name="ticket-outline" size={20} color="#FF5722" />
              <View style={styles.redDot} />
            </View>
            <View style={styles.segmentContent}>
              <Text style={styles.segmentValue}>50+</Text>
              <Text style={styles.segmentLabel}>โค้ดส่วนลด</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Right: Circular B Icon */}
        <TouchableOpacity style={styles.circularBButton}>
          <View style={styles.circularBContainer}>
            <Text style={styles.circularBText}>B</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Service Icons Section */}
      <View style={styles.serviceSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.serviceScrollContent}
        >
          {serviceItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.serviceItem}
              onPress={() => handleItemPress(item)}
            >
              <View style={styles.serviceIconContainer}>
                <Ionicons name={item.icon as any} size={32} color={item.color} />
              </View>
              <Text style={styles.serviceTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text style={styles.serviceSubtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingBottom: 20,
    marginBottom: 0,
  },
  whiteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scannerIcon: {
    marginRight: 10,
  },
  middleSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 8,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  segmentIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    position: 'relative',
    backgroundColor: '#FFF',
  },
  coinIconContainer: {
    borderColor: '#FFD700',
    backgroundColor: '#FFF9E6',
  },
  ticketIconContainer: {
    borderColor: '#FF5722',
    backgroundColor: '#FFF',
  },
  redDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3D00',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  segmentContent: {
    flex: 1,
  },
  segmentValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  segmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  segmentLabel: {
    fontSize: 10,
    color: '#666666',
  },
  flyingMoneyIcon: {
    marginLeft: 4,
  },
  circularBButton: {
    marginLeft: 8,
  },
  circularBContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  circularBText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  serviceSection: {
    marginTop: 20,
  },
  serviceScrollContent: {
    paddingHorizontal: 16,
  },
  serviceItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 80,
  },
  serviceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  serviceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  serviceSubtitle: {
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
