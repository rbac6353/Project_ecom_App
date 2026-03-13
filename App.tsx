// App.tsx
import './src/i18n'; // ✅ Import i18n config
import React, { useState, useEffect } from 'react';
import { View, Platform, Text, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';

// ✅ Import Stripe - ใช้ stub เฉพาะบน web (Expo รวม Stripe native ไว้ใน Expo Go แล้ว)
import Constants from 'expo-constants';

// Import Stripe conditionally: stub เฉพาะ web, native (รวม Expo Go) ใช้ของจริง
let StripeProvider: any;
if (Platform.OS === 'web') {
  const stub = require('./src/stubs/stripe-web-stub');
  StripeProvider = stub.StripeProvider;
} else {
  const stripe = require('@stripe/stripe-react-native');
  StripeProvider = stripe.StripeProvider;
}

// urlScheme สำหรับ Stripe redirect (3DS/OTP) — ตาม Expo doc เพื่อให้กลับเข้าแอปได้
const stripeUrlScheme =
  Constants.appOwnership === 'expo'
    ? Linking.createURL('/--/')
    : Linking.createURL('');
import AppSplashScreen from '@shared/components/AppSplashScreen'; 
import { AuthProvider } from '@app/providers/AuthContext'; 
import { CartProvider } from '@app/providers/CartContext';
import { AddressProvider } from '@app/providers/AddressContext';
import { WishlistProvider } from '@app/providers/WishlistContext';
import { ThemeProvider } from '@app/providers/ThemeContext';
import { CouponProvider } from '@app/providers/CouponContext';
import RootStackNavigator from '@navigation/RootStackNavigator';
import PushNotificationHandler from '@shared/components/PushNotificationHandler';
import { navigationRef } from '@navigation/RootNavigation';

// ใส่ Key pk_test_... ของคุณตรงนี้
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51T4wPcRpOAEoWRif5w9WXhcA4sohj7LCAgFMVYZxU9WbHS83cU2ckGQtVroAjXAKihNeDhyeTdVRHJXsBa0ydC3q00rP6YIdr7';

// ตั้งค่า Deep Linking
const linking = {
  prefixes: [Linking.createURL('/'), 'gtxshop://'], // รองรับทั้ง expo go และ app จริง
  config: {
    screens: {
      // ชื่อ Screen ใน RootStack
      OrderDetail: 'order/:orderId', // ถ้าเจอ gtxshop://order/123 ให้ไปหน้า OrderDetail พร้อม param orderId=123
      ProductDetail: 'product/:productId', // แถม: gtxshop://product/55 ไปหน้าสินค้า
      // ✅ เพิ่มใหม่: เมื่อเจอ gtxshop://reset-password/xyz ให้ไปหน้า ResetPassword พร้อมส่ง param token=xyz
      ResetPassword: 'reset-password/:token',
      // ✅ เพิ่มร้านค้า: เมื่อเจอ gtxshop://store/123 ให้ไปหน้า StoreProfile พร้อมส่ง param storeId=123
      StoreProfile: 'store/:storeId',
      // หน้าอื่นๆ ถ้าไม่ใส่ config จะเข้าถึงไม่ได้ผ่าน link
    },
  },
};

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // ✅ Preload ภาพพื้นหลัง Minecraft เพื่อให้แสดงทันที
  useEffect(() => {
    async function loadAssets() {
      try {
        await Asset.loadAsync([
          require('@assets/—Pngtree—minecraft game_15487175.png'),
        ]);
        setAssetsLoaded(true);
      } catch (error) {
        console.warn('Error loading assets:', error);
        setAssetsLoaded(true); // Continue even if asset loading fails
      }
    }
    loadAssets();
  }, []);

  // ✅ เช็คสถานะเมื่อเปิดแอป
  useEffect(() => {
    AsyncStorage.getItem('@isFirstLaunch').then((value) => {
      // ถ้า value เป็น null แสดงว่ายังไม่เคยเปิด (First Launch)
      // ถ้า value เป็น 'false' แสดงว่าเคยเปิดแล้ว
      if (value === null) {
        setIsFirstLaunch(true);
      } else {
        setIsFirstLaunch(false);
      }
    });
  }, []);

  // ถ้ายังโหลด assets หรือเช็คสถานะไม่เสร็จ ให้แสดง Splash Screen
  if (!assetsLoaded || isFirstLaunch === null) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppSplashScreen>
          <View style={{ flex: 1 }} />
        </AppSplashScreen>
      </GestureHandlerRootView>
    );
  }

  // ถ้ายังเช็คไม่เสร็จ ให้แสดง Splash Screen
  if (isFirstLaunch === null) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppSplashScreen>
          <View style={{ flex: 1 }} />
        </AppSplashScreen>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme={stripeUrlScheme}>
      <AppSplashScreen>
        <AuthProvider> 
          <ThemeProvider>
            <CartProvider>
              <AddressProvider>
                <WishlistProvider>
                  <CouponProvider>
                    <PushNotificationHandler />
                    <NavigationContainer linking={linking} ref={navigationRef}>
                      <StatusBar 
                        style="dark" 
                        backgroundColor="#FFF5EB" 
                        translucent={false}
                      />
                      <RootStackNavigator initialRouteName={isFirstLaunch ? 'Onboarding' : 'MainTabs'} />
                    </NavigationContainer>
                    <Toast 
                      position="top"
                      topOffset={200}
                      config={{
                        success: ({ text1, text2 }: any) => (
                          <View style={toastStyles.successContainer}>
                            <View style={toastStyles.content}>
                              <Text style={toastStyles.title}>{text1}</Text>
                              {text2 && <Text style={toastStyles.message}>{text2}</Text>}
                            </View>
                          </View>
                        ),
                        error: ({ text1, text2 }: any) => (
                          <View style={toastStyles.errorContainer}>
                            <View style={toastStyles.content}>
                              <Text style={toastStyles.title}>{text1}</Text>
                              {text2 && <Text style={toastStyles.message}>{text2}</Text>}
                            </View>
                          </View>
                        ),
                      }}
                    />
                  </CouponProvider>
                </WishlistProvider>
              </AddressProvider>
            </CartProvider>
          </ThemeProvider>
        </AuthProvider> 
      </AppSplashScreen>
    </StripeProvider>
    </GestureHandlerRootView>
  );
}

const toastStyles = StyleSheet.create({
  successContainer: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginRight: 12,
    marginTop: 55,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    maxWidth: '75%',
    alignSelf: 'flex-end',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  errorContainer: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginRight: 12,
    marginTop: 80,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    maxWidth: '75%',
    alignSelf: 'flex-end',
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A3428',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#8B7355',
  },
});

