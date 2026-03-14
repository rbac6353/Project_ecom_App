// navigation/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@app/providers/ThemeContext';

// Import หน้าจอทั้ง 5
import HomeScreen from '@features/home/screens/HomeScreen';
import CategoriesScreen from '@features/product/screens/CategoriesScreen';
import SearchScreen from '@features/search/screens/SearchScreen';
import CartScreen from '@features/cart/screens/CartScreen';
import ProfileStackNavigator from './ProfileStackNavigator'; // 👈 Import Stack
import FloatingTabBar from '@shared/components/navigation/FloatingTabBar'; // 👈 Import Custom Floating Tab Bar

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'alert';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Categories') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'Cart') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#B0B0B0',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tab.home') }} />
      <Tab.Screen name="Categories" component={CategoriesScreen} options={{ title: t('tab.category') }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: t('tab.search') }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ title: t('tab.cart') }} />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator} // 👈 เปลี่ยนเป็น Stack
        options={{ title: t('tab.profile') }} // ✅ ใช้ i18n
        listeners={({ navigation }) => ({
          tabPress: (e: any) => {
            // Reset กลับไปที่ ProfileScreen เมื่อกด Profile tab
            const state = navigation.getState();
            const profileRoute = state?.routes?.find((r: any) => r.name === 'Profile');
            const profileState = profileRoute?.state;
            
            // ถ้ามี navigation state ใน ProfileStackNavigator
            if (profileState && profileState.routes && profileState.routes.length > 0) {
              const currentRoute = profileState.routes[profileState.index || 0];
              // ถ้าไม่ได้อยู่ที่ ProfileScreen หรือ AuthScreen ให้ navigate กลับไป
              if (currentRoute && currentRoute.name !== 'ProfileScreen' && currentRoute.name !== 'AuthScreen') {
                // ป้องกันการ navigate ตามปกติ
                e.preventDefault();
                // ใช้วิธีที่ทำงานได้ดีกว่าใน React Native: navigate ไปที่ Profile screen และ reset stack
                // ใน Tab Navigator, navigation.getParent() จะได้ Tab Navigator เอง
                // ต้องใช้ navigation.navigate เพื่อ navigate ไปที่ Profile screen และ reset stack
                // ใช้ CommonActions.reset เพื่อ reset stack ของ ProfileStackNavigator
                navigation.dispatch(
                  CommonActions.reset({
                    index: state.index,
                    routes: state.routes.map((route: any) => {
                      if (route.name === 'Profile') {
                        return {
                          ...route,
                          state: {
                            routes: [{ name: 'ProfileScreen' }],
                            index: 0,
                          },
                        };
                      }
                      return route;
                    }),
                  })
                );
              }
            } else {
              // ถ้ายังไม่มี state หรือ state ยังไม่ถูกสร้าง ให้ navigate ไปที่ ProfileScreen
              e.preventDefault();
              navigation.navigate('Profile', { 
                screen: 'ProfileScreen' 
              });
            }
          },
        })}
      />
    </Tab.Navigator>
  );
}

