// components/search/PhotoSearchTab.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@app/providers/ThemeContext';

export default function PhotoSearchTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { backgroundColor: '#1C1C1C', paddingBottom: 90 + insets.bottom }]}>
      <Text style={styles.text}>หน้าค้นหาด้วยรูปภาพจากอัลบั้ม</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
  },
});

