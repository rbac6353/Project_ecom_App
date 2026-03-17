// screens/HistoryScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ScreenHeader from '@shared/components/common/ScreenHeader';

// --- Tab Screens ---
const EmptyState = ({ title }: { title: string }) => (
  <View style={styles.emptyContainer}>
    <Image 
      source={require('@assets/icon.png')} 
      style={styles.emptyImage} 
    />
    <Text style={styles.emptyText}>ยังไม่มีประวัติการเรียกดู {title}</Text>
  </View>
);

const ProductHistoryTab = () => <EmptyState title="สินค้า" />;
const ShopHistoryTab = () => <EmptyState title="ร้านค้า" />;
// -------------------

const Tab = createMaterialTopTabNavigator();

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader 
        title="ประวัติ (0)" 
        rightAccessory={<Text>จัดการ</Text>} 
      />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#FF5722',
          tabBarInactiveTintColor: 'gray',
          tabBarIndicatorStyle: { backgroundColor: '#FF5722' },
        }}
      >
        <Tab.Screen name="ProductHistory" component={ProductHistoryTab} options={{ title: 'สินค้า' }} />
        <Tab.Screen name="ShopHistory" component={ShopHistoryTab} options={{ title: 'ร้านค้า' }} />
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

