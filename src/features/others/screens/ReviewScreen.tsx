// screens/ReviewScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@app/providers/ThemeContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';

const EmptyReviewTab = ({ message }: { message: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
      <Image 
        source={require('@assets/icon.png')} 
        style={styles.emptyImage} 
      />
      <Text style={[styles.emptyText, { color: colors.subText }]}>{message}</Text>
    </View>
  );
};

const ToReviewTab = () => <EmptyReviewTab message="ไม่มีสินค้าที่รอรีวิวในขณะนี้" />;
const CanFollowUpTab = () => <EmptyReviewTab message="ไม่มีรีวิวที่ติดตามผลได้" />;
const ReviewedTab = () => <EmptyReviewTab message="ยังไม่มีการรีวิว" />;
// -------------------

const Tab = createMaterialTopTabNavigator();

export default function ReviewScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="ทบทวน" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.subText,
          tabBarIndicatorStyle: { backgroundColor: colors.primary },
          tabBarStyle: { backgroundColor: colors.card },
        }}
      >
        <Tab.Screen name="รอรีวิว" component={ToReviewTab} />
        <Tab.Screen name="สามารถติดตามผลได้" component={CanFollowUpTab} />
        <Tab.Screen name="ตรวจสอบแล้ว" component={ReviewedTab} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyImage: { width: 100, height: 100, opacity: 0.5 },
  emptyText: { marginTop: 15, textAlign: 'center' },
});

