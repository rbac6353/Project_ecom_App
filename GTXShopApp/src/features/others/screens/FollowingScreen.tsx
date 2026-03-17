// screens/FollowingScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ScreenHeader from '@shared/components/common/ScreenHeader';

// --- Tab Screens ---
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Image 
      source={require('@assets/icon.png')} 
      style={styles.emptyImage} 
    />
    <Text style={styles.emptyText}>ยังไม่มีการติดตามที่เกี่ยวข้อง</Text>
  </View>
);

const FollowingTab = () => <EmptyState />;
const FrequentTab = () => <EmptyState />;
const PurchasedTab = () => <EmptyState />;
// -------------------

const Tab = createMaterialTopTabNavigator();

export default function FollowingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="การติดตามร้านค้า" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#FF5722',
          tabBarInactiveTintColor: 'gray',
          tabBarIndicatorStyle: { backgroundColor: '#FF5722' },
        }}
      >
        <Tab.Screen name="Following" component={FollowingTab} options={{ title: 'กำลังติดตาม' }} />
        <Tab.Screen name="Frequent" component={FrequentTab} options={{ title: 'ดูบ่อย' }} />
        <Tab.Screen name="Purchased" component={PurchasedTab} options={{ title: 'ซื้อแล้ว' }} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f4f4f4' },
  emptyImage: { width: 100, height: 100, opacity: 0.5 },
  emptyText: { color: 'gray', marginTop: 15, textAlign: 'center' },
});

