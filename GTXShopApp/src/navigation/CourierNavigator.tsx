import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CourierDashboardScreen from '@features/others/screens/courier/CourierDashboardScreen';
import CourierScanScreen from '@features/others/screens/courier/CourierScanScreen';
import DeliveryDetailScreen from '@features/others/screens/courier/DeliveryDetailScreen';
import DeliveryProofScreen from '@features/others/screens/courier/DeliveryProofScreen';

export type CourierStackParamList = {
  CourierDashboard: undefined;
  CourierScan: undefined;
  DeliveryDetail: { shipmentId: number };
  DeliveryProof: { orderId: number };
};

const Stack = createStackNavigator<CourierStackParamList>();

export default function CourierNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="CourierDashboard"
        component={CourierDashboardScreen}
      />
      <Stack.Screen name="CourierScan" component={CourierScanScreen} />
      <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
      <Stack.Screen name="DeliveryProof" component={DeliveryProofScreen} />
    </Stack.Navigator>
  );
}


