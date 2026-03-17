// components/navigation/FloatingTabBar.tsx
// 🚀 120 FPS: Realistic Clear Glass Lens + 🔍 EDGE-ONLY MAGNIFICATION

import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Text, // Import Text ปกติ
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@app/providers/ThemeContext';
import { useCart } from '@app/providers/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedReaction,
  runOnJS,
  interpolate,
  withTiming,
  Extrapolation, // ✅ ต้องใช้ Extrapolation
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_MAX_WIDTH = 600;
const HORIZONTAL_PADDING = 16;

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart(); // 🔴 Badge สำหรับ Cart

  const effectiveWidth = Math.min(SCREEN_WIDTH, TAB_BAR_MAX_WIDTH) - HORIZONTAL_PADDING * 2;
  const tabWidth = effectiveWidth / state.routes.length;

  // --- Shared Values (UI Thread) ---
  const translateX = useSharedValue(state.index * tabWidth);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0); // 0 = ซ่อน, 1 = แสดง
  const isDragging = useSharedValue(false);
  
  // 💧 Ripple Effect สำหรับแต่ละ tab
  const rippleScales = state.routes.map(() => useSharedValue(0));
  const rippleOpacities = state.routes.map(() => useSharedValue(0));

  // --- JS State ---
  const [activeJSIndex, setActiveJSIndex] = useState(state.index);

  // Sync ค่าเริ่มต้น (เมื่อเปลี่ยนหน้าด้วยการกดปกติ)
  useEffect(() => {
    if (!isDragging.value) {
      translateX.value = withSpring(state.index * tabWidth, {
        damping: 15,
        stiffness: 100,
      });
      setActiveJSIndex(state.index);
    }
  }, [state.index, tabWidth]);

  // --- Functions on JS Thread ---
  const handleNavigate = (index: number) => {
    if (index >= 0 && index < state.routes.length && index !== activeJSIndex) {
      Haptics.selectionAsync(); // สั่นเบาๆ เมื่อลากผ่าน
      navigation.navigate(state.routes[index].name);
      setActiveJSIndex(index);
    }
  };

  const triggerHapticStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // สั่น "กึก" เมื่อเลนส์เด้งขึ้น
  };

  // ✅ Gesture Logic
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(10) // กดค้าง 100ms (เร็วขึ้น)
    .onStart((e) => {
      isDragging.value = true;

      const startX = (SCREEN_WIDTH - effectiveWidth) / 2;
      let relativeX = e.absoluteX - startX - (tabWidth / 2);

      if (relativeX < 0) relativeX = 0;
      if (relativeX > effectiveWidth - tabWidth) relativeX = effectiveWidth - tabWidth;

      translateX.value = relativeX;
      scale.value = withSpring(1, { damping: 14, stiffness: 120 }); // เด้งนุ่มๆ

      runOnJS(triggerHapticStart)();
    })
    .onUpdate((e) => {
      const startX = (SCREEN_WIDTH - effectiveWidth) / 2;
      let relativeX = e.absoluteX - startX - (tabWidth / 2);

      if (relativeX < 0) relativeX = 0;
      if (relativeX > effectiveWidth - tabWidth) relativeX = effectiveWidth - tabWidth;

      let relativeY = e.translationY;
      const MAX_Y = 20; // จำกัดการขยับแนวตั้งให้น้อยลง เพราะวงรีมันเตี้ย
      if (relativeY < -MAX_Y) relativeY = -MAX_Y;
      if (relativeY > MAX_Y) relativeY = MAX_Y;

      translateX.value = relativeX;
      translateY.value = relativeY;
    })
    .onEnd(() => {
      isDragging.value = false;
      scale.value = withTiming(0, { duration: 250 }); // หุบลง
      translateY.value = withTiming(0);

      const nearestIndex = Math.round(translateX.value / tabWidth);
      const finalX = nearestIndex * tabWidth;
      translateX.value = withSpring(finalX);
    });

  // Check Index Change
  useAnimatedReaction(
    () => Math.round(translateX.value / tabWidth),
    (currentIndex, previousIndex) => {
      if (currentIndex !== previousIndex && isDragging.value) {
        runOnJS(handleNavigate)(currentIndex);
      }
    }
  );

  // Style สำหรับตัวเลนส์แก้ว
  const lensStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + interpolate(scale.value, [0, 1], [5, -15]) },
        { scale: scale.value },
      ],
      opacity: interpolate(scale.value, [0, 0.4, 1], [0, 1, 1]),
    };
  });
  
  // ✨ Glow Effect รอบเลนส์
  const lensGlowStyle = useAnimatedStyle(() => {
    const activeTabIndex = Math.round(translateX.value / tabWidth);
    const distance = Math.abs(translateX.value - activeTabIndex * tabWidth);
    const glowIntensity = interpolate(
      distance,
      [0, tabWidth * 0.5],
      [1, 0],
      Extrapolation.CLAMP
    );
    
    return {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3 + glowIntensity * 0.3,
      shadowRadius: 15 + glowIntensity * 10,
    };
  });
  
  // 💬 Tooltip แสดงชื่อ Tab เมื่อลาก
  const [tooltipText, setTooltipText] = useState('');
  
  useAnimatedReaction(
    () => Math.round(translateX.value / tabWidth),
    (currentIndex) => {
      if (currentIndex >= 0 && currentIndex < state.routes.length) {
        const route = state.routes[currentIndex];
        const { options } = descriptors[route.key];
        const text = typeof options.tabBarLabel === 'string'
          ? options.tabBarLabel
          : typeof options.title === 'string'
          ? options.title
          : route.name;
        runOnJS(setTooltipText)(text);
      }
    }
  );
  
  const tooltipStyle = useAnimatedStyle(() => {
    return {
      opacity: scale.value,
      transform: [{ translateY: -30 }],
    };
  });

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.tabBarWrapper}>
        {/* 🌈 Gradient Background */}
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.95)', // ขาวเกือบทึบด้านบน
            'rgba(255, 245, 235, 0.85)', // ส้มอ่อนด้านล่าง
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Gesture-driven area */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={styles.touchArea}>

            {/* --- REALISTIC GLASS LENS --- */}
            <Animated.View
              style={[
                styles.cursorContainer,
                { width: tabWidth },
                lensStyle,
              ]}
              pointerEvents="none"
            >
              {/* 💬 Tooltip */}
              <Animated.View style={[styles.tooltip, tooltipStyle]}>
                <Text style={styles.tooltipText}>
                  {tooltipText}
                </Text>
              </Animated.View>
              
              <Animated.View style={[styles.ovalLens, lensGlowStyle]}>
                {/* ✅ เปลี่ยน Gradient เป็นโทน ขาว/เงิน + สีธีม เพื่อสร้างขอบแก้ว
                  ใช้แนวตั้ง (Vertical) เพื่อจำลองแสงจากด้านบน
                */}
                <LinearGradient
                  colors={[
                    `rgba(${colors.primary === '#FF8C42' ? '255,140,66' : '255,255,255'},0.3)`, // ขอบบนสว่าง + สีธีม
                    'rgba(255,255,255,0.03)', // ตรงกลางใสมาก
                    `rgba(${colors.primary === '#FF8C42' ? '255,140,66' : '255,255,255'},0.2)`, // ขอบล่างสว่าง + สีธีม
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.glassRimGradient}
                >
                  <View style={styles.glassInner}>
                    {/* แสงสะท้อน (Glare) สีขาวคมๆ */}
                    <View style={styles.glareTop} />
                    <View style={styles.glareBottom} />
                  </View>
                </LinearGradient>
              </Animated.View>
            </Animated.View>

            {/* --- Icons Row --- */}
            <View style={styles.iconsRow}>
              {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const isFocused = activeJSIndex === index;

                // 💧 Handle Ripple Effect
                const handlePressIn = () => {
                  rippleScales[index].value = withTiming(1, { duration: 400 }, () => {
                    rippleScales[index].value = 0;
                  });
                  rippleOpacities[index].value = withTiming(1, { duration: 200 }, () => {
                    rippleOpacities[index].value = withTiming(0, { duration: 200 });
                  });
                };
                
                // 💧 Ripple Animation Style
                const rippleStyle = useAnimatedStyle(() => {
                  return {
                    transform: [{ scale: rippleScales[index].value }],
                    opacity: interpolate(
                      rippleOpacities[index].value,
                      [0, 1],
                      [1, 0],
                      Extrapolation.CLAMP
                    ),
                  };
                });
                
                // 🎨 Icon Color Transition
                const iconColorAnimated = useAnimatedStyle(() => {
                  const colorProgress = isFocused ? 1 : 0;
                  return {
                    opacity: interpolate(
                      colorProgress,
                      [0, 1],
                      [0.6, 1],
                      Extrapolation.CLAMP
                    ),
                  };
                });
                
                const onPress = () => {
                  // สำหรับ Profile tab ให้จัดการ navigation โดยตรง
                  if (route.name === 'Profile') {
                    const state = navigation.getState();
                    const profileRoute = state?.routes?.find((r: any) => r.name === 'Profile');
                    const profileState = profileRoute?.state;
                    
                    // ถ้ามี navigation state ใน ProfileStackNavigator
                    if (profileState && profileState.routes && profileState.routes.length > 0) {
                      const currentRoute = profileState.routes[profileState.index || 0];
                      // ถ้าไม่ได้อยู่ที่ ProfileScreen หรือ AuthScreen ให้ reset กลับไป
                      if (currentRoute && currentRoute.name !== 'ProfileScreen' && currentRoute.name !== 'AuthScreen') {
                        // ใช้ CommonActions.reset เพื่อ reset stack ของ ProfileStackNavigator กลับไปที่ ProfileScreen
                        navigation.dispatch(
                          CommonActions.reset({
                            index: state.index,
                            routes: state.routes.map((r: any) => {
                              if (r.name === 'Profile') {
                                return {
                                  ...r,
                                  state: {
                                    routes: [{ name: 'ProfileScreen' }],
                                    index: 0,
                                  },
                                };
                              }
                              return r;
                            }),
                          })
                        );
                        return;
                      }
                    }
                  }
                  
                  // สำหรับ tab อื่นๆ หรือ Profile tab ที่อยู่ที่ ProfileScreen แล้ว
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                };

                let iconName: any = 'square';
                if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
                else if (route.name === 'Categories') iconName = isFocused ? 'search' : 'search-outline';
                else if (route.name === 'Search') iconName = isFocused ? 'camera' : 'camera-outline';
                else if (route.name === 'Cart') iconName = isFocused ? 'cart' : 'cart-outline';
                else if (route.name === 'Profile') iconName = isFocused ? 'person' : 'person-outline';

                // 🔥🔥 EDGE MAGNIFICATION LOGIC 🔥🔥
                const animatedContentStyle = useAnimatedStyle(() => {
                  const tabCenter = index * tabWidth;
                  const distanceFromCenter = Math.abs(translateX.value - tabCenter);

                  // กำหนดโซนระยะห่าง (Distance Zones)
                  const centerPoint = 0;                // จุดกึ่งกลาง
                  const edgePeakPoint = tabWidth * 0.38; // จุดที่ขอบเลนส์ชนไอคอน (พีคสุด)
                  const outsidePoint = tabWidth * 0.65;  // จุดที่พ้นระยะเลนส์ไปแล้ว

                  // กำหนดอัตราขยาย (Scale Factors)
                  const scaleAtCenter = 1.05; // ตรงกลางให้ใหญ่ขึ้นนิดเดียว (หรือ 1.0 ถ้าเอาปกติเลย)
                  const scaleAtEdge = 1.45;   // ตรงขอบให้ใหญ่สุด
                  const scaleOutside = 1.0;   // ข้างนอกขนาดปกติ

                  // Interpolate แบบ 3 จังหวะ (Center -> Edge -> Outside)
                  let magnification = interpolate(
                    distanceFromCenter,
                    [centerPoint, edgePeakPoint, outsidePoint],
                    [scaleAtCenter, scaleAtEdge, scaleOutside],
                    Extrapolation.CLAMP
                  );
                  
                  // เช็คว่าเลนส์ถูกเปิดใช้งานหรือไม่
                  const finalScale = interpolate(scale.value, [0, 1], [1, magnification], Extrapolation.CLAMP);

                  return {
                    transform: [
                      { scale: finalScale },
                      // ดันขึ้นเล็กน้อยเมื่อขยาย เพื่อให้ดูมีมิติ
                      { translateY: interpolate(finalScale, [1, 1.45], [0, -3], Extrapolation.CLAMP) } 
                    ],
                  };
                });
                
                const iconColor = isFocused ? '#000000' : '#8E8E93';

                return (
                  <TouchableOpacity
                    key={route.key}
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    activeOpacity={1}
                    style={styles.tabButton}
                  >
                    {/* 💧 Ripple Effect */}
                    <Animated.View 
                      style={[
                        styles.ripple,
                        {
                          backgroundColor: 'rgba(0, 0, 0, 0.2)', // สีดำโปร่งใส
                        },
                        rippleStyle,
                      ]} 
                      pointerEvents="none"
                    />
                    
                    {/* ✅ Wrap ทั้ง Icon และ Text ไว้ใน Animated.View เดียวกัน */}
                    <Animated.View style={[styles.tabContentWrapper, animatedContentStyle]}>
                        <Animated.View style={iconColorAnimated}>
                          <Ionicons name={iconName} size={24} color={iconColor} />
                        </Animated.View>
                        
                        {/* 🔴 Badge สำหรับ Cart */}
                        {route.name === 'Cart' && itemCount > 0 && (
                          <View style={[styles.badge, { backgroundColor: '#FF3B30', borderColor: '#fff' }]}>
                            <Text style={styles.badgeText}>
                              {itemCount > 9 ? '9+' : itemCount}
                            </Text>
                          </View>
                        )}
                        
                        {isFocused && (
                            <Text style={[styles.label, {color: iconColor}]}>
                                {typeof options.tabBarLabel === 'string'
                                  ? options.tabBarLabel
                                  : typeof options.title === 'string'
                                  ? options.title
                                  : route.name}
                            </Text>
                        )}
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </View>

          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    pointerEvents: 'box-none',
  },
  tabBarWrapper: {
    width: '100%',
    maxWidth: TAB_BAR_MAX_WIDTH,
    height: 60,
    borderRadius: 30, // ความสูง / 2 เพื่อให้เป็นวงรีสมบูรณ์
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  touchArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  iconsRow: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  // Wrapper ใหม่สำหรับรวม Icon+Text ให้ขยายพร้อมกัน
  tabContentWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  cursorContainer: {
    position: 'absolute',
    height: 60,
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  
  // ✅ REALISTIC GLASS STYLES
  ovalLens: {
    width: 90, // เพิ่มขนาดเล็กน้อยเพื่อให้เห็นชัดขึ้น
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    // เงาเข้มขึ้นเพื่อให้เด่นชัด
    shadowOffset: { width: 0, height: 10 },
    elevation: 12, // เพิ่ม elevation
    backgroundColor: 'transparent',
  },
  glassRimGradient: {
    flex: 1,
    padding: 3, // เพิ่ม padding เพื่อให้ขอบหนาขึ้น
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 45, // ปรับให้ตรงกับ ovalLens
    backgroundColor: 'transparent', // ใสปิ๊ง (ลบพื้นหลัง)
    borderColor: 'rgba(255,255,255,0.5)', // ขอบโปร่งใสขึ้นอีก
    borderWidth: 2.5, // เพิ่มความหนาของขอบ
    overflow: 'hidden',
  },
  glareTop: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 30, // เพิ่มขนาดเล็กน้อย
    height: 12, // เพิ่มขนาดเล็กน้อย
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.6)', // แสงสะท้อนโปร่งใสขึ้นอีก
    transform: [{ rotate: '-20deg' }],
  },
  glareBottom: {
    position: 'absolute',
    bottom: 10,
    left: 15,
    width: 15, // เพิ่มขนาดเล็กน้อย
    height: 8, // เพิ่มขนาดเล็กน้อย
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)', // ลดความเข้มให้ใสขึ้นอีก
    transform: [{ rotate: '-20deg' }],
  },
  // 💧 Ripple Effect
  ripple: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  // 🔴 Badge สำหรับ Cart
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  // 💬 Tooltip
  tooltip: {
    position: 'absolute',
    top: -35,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'center',
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

