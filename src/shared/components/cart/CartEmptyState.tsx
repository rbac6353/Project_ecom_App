// components/cart/CartEmptyState.tsx
import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@app/providers/ThemeContext';

export default function CartEmptyState() {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Image 
        source={require('@assets/icon.png')}
        style={styles.image} 
      />
      <Text style={[styles.title, { color: colors.text }]}>รถเข็นชอปปิงของคุณว่างเปล่า</Text>
      <Text style={[styles.subtitle, { color: colors.subText }]}>เพิ่มรายการโปรดของคุณลงไป</Text>
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]}>
        <Text style={styles.buttonText}>ค้นหาสินค้า</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  image: {
    width: 100,
    height: 100,
    opacity: 0.7,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  button: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

