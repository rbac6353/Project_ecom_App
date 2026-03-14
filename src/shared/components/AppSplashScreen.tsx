// components/AppSplashScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Import Minecraft image
const minecraftImage = require('@assets/—Pngtree—minecraft game_15487175.png');

// ป้องกัน Splash Screen ไม่ให้หายไปทันที - ให้ Native Splash แสดงไปก่อน
SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

interface AppSplashScreenProps {
  children: React.ReactNode;
}

const AppSplashScreen: React.FC<AppSplashScreenProps> = ({ children }) => {
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(false); // Track when custom splash should be visible
  const fadeAnim = useRef(new Animated.Value(0)).current; // For main content fade in
  const splashFadeIn = useRef(new Animated.Value(0)).current; // For smooth fade in from native splash

  // Animated values for main logo - start from 1 to prevent scaling issues
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const welcomeTranslateY = useRef(new Animated.Value(20)).current;
  const loadingOpacityAnim = useRef(new Animated.Value(0)).current;

  // Loading progress animation
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(1)).current;
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingDots, setLoadingDots] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        // Wait a tiny bit to ensure React Native is ready, then show custom splash
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Show custom splash immediately (no fade in needed since native splash is still showing)
        setSplashVisible(true);
        splashFadeIn.setValue(1); // Set to 1 immediately for smooth transition
        
        // Hide native splash screen immediately after custom splash is ready
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          // Ignore if already hidden
        }
        
        // Animate loading progress
        const progressAnimation = Animated.timing(loadingProgress, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: false,
        });

        // Update loading percentage
        const listenerId = loadingProgress.addListener(({ value }) => {
          if (isMounted) {
            setLoadingPercent(Math.min(100, Math.round(value * 100)));
          }
        });

        progressAnimation.start(({ finished }) => {
          if (finished && isMounted) {
            loadingProgress.removeListener(listenerId);
            Animated.timing(loadingOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }
        });

        // Start animations for splash screen elements
        // ลบ bounce animation ออก - ใช้แค่ fade in และ rotate เพื่อป้องกันปัญหา scale
        // logoScale เริ่มที่ 1 แล้ว ไม่ต้อง animate

        // Rotation animation (360 degrees)
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();

        // Logo fade in
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();

        // Floating effect (loop - up and down)
        Animated.loop(
          Animated.sequence([
            Animated.timing(logoFloat, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(logoFloat, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();

        // Particle/Shimmer effect
        Animated.loop(
          Animated.sequence([
            Animated.timing(particleAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(particleAnim, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();

        // Glow effect for loading bar (pulsing)
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();

        // Background image shows immediately - no parallax animation needed
        // (Image component is used instead of Animated.Image for instant display)

        // Stagger animation: Welcome text appears after logo
        Animated.parallel([
          Animated.timing(welcomeOpacity, {
            toValue: 1,
            duration: 600,
            delay: 400,
            useNativeDriver: true,
          }),
          Animated.spring(welcomeTranslateY, {
            toValue: 0,
            friction: 4,
            tension: 40,
            delay: 400,
            useNativeDriver: true,
          }),
        ]).start();

        // Loading bar appears last (stagger)
        Animated.timing(loadingOpacityAnim, {
          toValue: 1,
          duration: 500,
          delay: 600,
          useNativeDriver: true,
        }).start();

        // โหลดทรัพยากรต่างๆ ของแอพ (เช่น fonts, images, data)
        // จำลองการโหลด 2.5 วินาที
        await new Promise(resolve => setTimeout(resolve, 2500));
      } catch (e) {
        console.warn(e);
      } finally {
        if (isMounted) {
          // หยุด loop animations ทั้งหมดก่อน
          logoFloat.stopAnimation();
          particleAnim.stopAnimation();
          glowAnim.stopAnimation();
          
          // Fade in content และ Fade out splash พร้อมกัน (overlap)
          Animated.parallel([
            // Main content fade in
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 800,
              delay: 200,  // เริ่มก่อน splash fade out นิดหน่อย
              useNativeDriver: true,
            }),
            // Splash fade out
            Animated.timing(splashFadeIn, {
              toValue: 0,
              duration: 600,
              delay: 400,  // เริ่มทีหลัง เพื่อให้ content fade in ไปก่อน
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (isMounted) {
              setAppIsReady(true);
            }
          });
        }
      }
    }

    prepare();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  // Animated Dots Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // Ignore errors
      }
    }
  }, [appIsReady]);

  // ถ้ายังไม่พร้อมเลย return null
  if (!splashVisible) {
    return null;
  }

  // Render ทั้ง Splash และ Main Content พร้อมกัน
  return (
    <View style={{ flex: 1 }}>
      {/* Main Content - render ตั้งแต่ต้น แต่ซ่อนไว้ */}
      <Animated.View 
        style={{ 
          flex: 1,
          opacity: fadeAnim,
        }} 
        onLayout={onLayoutRootView}
      >
        {children}
      </Animated.View>

      {/* Splash Screen - ทับอยู่ข้างบนจนกว่าจะโหลดเสร็จ */}
      {!appIsReady && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.container,
            {
              opacity: splashFadeIn,
            },
          ]}
        >
          {/* Minecraft Background Image - Show immediately, no animation delay */}
          <Image
            source={minecraftImage}
            style={styles.backgroundImage}
            resizeMode="cover"
            fadeDuration={0}
          />

          {/* Gradient Overlay for better text visibility */}
          <LinearGradient
            colors={['rgba(255,107,53,0.4)', 'rgba(255,107,53,0.7)', 'rgba(230,92,0,0.5)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Main Content Container */}
          <View style={styles.contentContainer}>
          {/* BoxiFY Logo with Animation - Bounce, Rotate, Float */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [
                  // ลบ scale ออก - ใช้แค่ rotate และ float
                  {
                    rotate: logoRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                  {
                    translateY: logoFloat.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Particle/Shimmer Effect around logo */}
            <Animated.View
              style={[
                styles.particleRing,
                {
                  opacity: particleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.8],
                  }),
                  transform: [
                    {
                      scale: particleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
            
            {/* Glassmorphism Logo Box */}
            <BlurView intensity={80} tint="light" style={styles.logoBox}>
              <View style={styles.logoContent}>
                <Text style={styles.logoText}>BoxiFY</Text>
              </View>
              {/* Neon Glow Effect */}
              <Animated.View
                style={[
                  styles.neonGlow,
                  {
                    opacity: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ]}
              />
            </BlurView>
          </Animated.View>

          {/* Welcome Text with Stagger Animation */}
          <Animated.View
            style={[
              styles.welcomeContainer,
              {
                opacity: welcomeOpacity,
                transform: [
                  {
                    translateY: welcomeTranslateY,
                  },
                ],
              },
            ]}
          >
            <Text style={styles.welcomeText}>ยินดีต้อนรับ</Text>
            <Text style={styles.welcomeSubtext}>สู่ร้านค้าออนไลน์ของคุณ</Text>
          </Animated.View>

          {/* Loading Progress Bar with Modern Design */}
          <Animated.View
            style={[
              styles.loadingContainer,
              {
                opacity: loadingOpacityAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <View style={styles.loadingBarWrapper}>
              <View style={styles.loadingBarContainer}>
                <Animated.View
                  style={[
                    styles.loadingBar,
                    {
                      transform: [
                        {
                          scaleX: loadingProgress,
                        },
                      ],
                    },
                  ]}
                />
                {/* Moving Glow Effect */}
                <Animated.View
                  style={[
                    styles.loadingBarGlow,
                    {
                      opacity: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                      transform: [
                        {
                          translateX: loadingProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, width * 0.6],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
              <View style={styles.loadingInfo}>
                <Text style={styles.loadingText}>{loadingPercent}%</Text>
                <Text style={styles.loadingLabel}>กำลังโหลด{loadingDots}</Text>
              </View>
            </View>
          </Animated.View>
        </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  particleRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#FF6B35',
    top: -50,
    left: -50,
  },
  logoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glassmorphism - reduced opacity
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 40,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FF6B35',
    overflow: 'hidden',
    position: 'relative',
  },
  logoContent: {
    zIndex: 2,
  },
  neonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadingContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  loadingBarWrapper: {
    width: '100%',
  },
  loadingBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  loadingBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  loadingBarGlow: {
    position: 'absolute',
    top: -5,
    width: 30,
    height: 16,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  loadingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadingLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default AppSplashScreen;

