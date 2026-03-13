// navigation/ProfileStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '@features/profile/screens/ProfileScreen';
import AuthScreen from '@features/auth/screens/AuthScreen';
import LoginScreen from '@features/auth/screens/LoginScreen';
import SettingsScreen from '@features/profile/screens/SettingsScreen';

// 👈 1. Import 4 หน้าจอใหม่
import WishlistScreen from '@features/others/screens/WishlistScreen';
import FollowingScreen from '@features/profile/screens/FollowingScreen';
import HistoryScreen from '@features/others/screens/HistoryScreen';
import VouchersScreen from '@features/others/screens/VouchersScreen';
import HelpCenterScreen from '@features/profile/screens/HelpCenterScreen';
import WalletScreen from '@features/profile/screens/WalletScreen';

const Stack = createStackNavigator();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="ProfileScreen"
    >
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="AuthScreen" component={AuthScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="WishlistScreen" component={WishlistScreen} />
      <Stack.Screen name="FollowingScreen" component={FollowingScreen} />
      <Stack.Screen name="HistoryScreen" component={HistoryScreen} />
      <Stack.Screen name="VouchersScreen" component={VouchersScreen} />
      <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
      <Stack.Screen name="MyWallet" component={WalletScreen} />
    </Stack.Navigator>
  );
}

