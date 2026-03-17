// components/home/HomeHeader.tsx
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import { useAuth } from '@app/providers/AuthContext';
import client from '@app/api/client';

export default function HomeHeader() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [store, setStore] = useState<{ logo?: string; name?: string } | null>(null);
  
  // Animation values for bounce effect
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // ฟังก์ชันสำหรับแสดงข้อความทักทายตามเวลา
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = user?.name || 'Guest';

  const handleSearchPress = () => {
    navigation.navigate('SearchInput'); 
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notification');
  };

  const handleProfilePress = () => {
    // Navigate to Greeting screen when avatar is pressed
    navigation.navigate('Greeting');
  };

  // ฟังก์ชันดึงจำนวนการแจ้งเตือนที่ยังไม่อ่าน
  const getUnreadCount = async () => {
    try {
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get('/notifications/unread');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const count = typeof res === 'number' ? res : (res?.data ?? res?.count ?? 0);
      setUnreadCount(count);
    } catch (e) {
      // ถ้ายังไม่ได้ login หรือ error ก็ไม่ต้องแสดง
      setUnreadCount(0);
    }
  };

  // ดึงข้อมูลร้านค้า (ถ้า user เป็น seller) เพื่อแสดงโลโก้ร้านใน avatar
  useEffect(() => {
    if (!user) {
      setStore(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await client.get('/stores/my');
        const list = Array.isArray(res) ? res : res?.data ?? [];
        const storeData = list[0];
        if (!cancelled && storeData && (storeData.logo || storeData.name)) {
          setStore(storeData);
        } else {
          setStore(null);
        }
      } catch {
        if (!cancelled) setStore(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ดึงข้อมูลเมื่อ component mount และเมื่อ focus
  useEffect(() => {
    getUnreadCount();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      getUnreadCount();
      // Trigger bounce animation when screen comes into focus
      startBounceAnimation();
    }, []),
  );

  // ✅ Refresh unread count เมื่อกลับมาจากหน้า Notification (ใช้ navigation listener)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      getUnreadCount();
    });
    return unsubscribe;
  }, [navigation]);

  // Bounce animation function
  const startBounceAnimation = () => {
    // Reset animation values
    bounceAnim.setValue(0);
    scaleAnim.setValue(0);
    
    // Create parallel animations for bounce and scale
    Animated.parallel([
      Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 8,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 8,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Start animation on mount
  useEffect(() => {
    startBounceAnimation();
  }, []);


  return (
    <View style={[styles.headerContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Profile Avatar + Greeting Section */}
      <Animated.View 
        style={[
          styles.profileSection, 
          { 
            marginTop: -insets.top + 15,
            transform: [
              {
                translateY: bounceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
              {
                scale: scaleAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 1.05, 1],
                }),
              },
            ],
            opacity: bounceAnim,
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              {
                scale: scaleAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 1.1, 1],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity onPress={handleProfilePress} style={styles.avatarContainer}>
            {store?.logo && store.logo.trim() ? (
              <Image source={{ uri: store.logo }} style={styles.avatar} />
            ) : user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {userName[0]?.toUpperCase() || 'G'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Greeting')} 
          style={styles.greetingContainer}
          activeOpacity={0.7}
        >
          <Animated.Text 
            style={[
              styles.greetingText, 
              { 
                color: colors.text,
                opacity: bounceAnim,
              },
            ]}
          >
            Hey, {userName} 👋
          </Animated.Text>
          <Animated.Text 
            style={[
              styles.greetingSubtext, 
              { 
                color: colors.subText,
                opacity: bounceAnim,
              },
            ]}
          >
            {getGreeting()}
          </Animated.Text>
        </TouchableOpacity>

        {/* Notification Icon (ขวาสุด) */}
        <TouchableOpacity
          onPress={handleNotificationPress}
          style={styles.notificationButton}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={colors.text}
          />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Search Bar */}
      <TouchableOpacity 
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.inputBg || colors.card,
            borderColor: colors.inputBorder || colors.border,
          },
        ]} 
        onPress={handleSearchPress}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={20} color={colors.placeholder || colors.subText} style={styles.searchIcon} />
        <Text style={[styles.placeholderText, { color: colors.placeholder || colors.subText }]}>Search</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: 0,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  greetingSubtext: {
    fontSize: 14,
  },
  notificationButton: {
    padding: 5,
    marginLeft: 10,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 44,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  placeholderText: {
    flex: 1,
    fontSize: 14,
  },
});

