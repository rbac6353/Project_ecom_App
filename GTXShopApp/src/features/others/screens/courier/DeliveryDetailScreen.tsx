import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Placeholder สำหรับรายละเอียดงานจัดส่ง
export default function DeliveryDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>หน้ารายละเอียดงานจัดส่ง (Placeholder)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16 },
});


