// components/cart/CartHeader.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';

const FilterChip = ({ title }: { title: string }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[styles.chip, { backgroundColor: colors.background }]}>
      <Text style={[styles.chipText, { color: colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
};

interface CartHeaderProps {
  title?: string;
}

export default function CartHeader({ title = 'รถเข็น' }: CartHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity>
          <Ionicons name="create-outline" size={24} color={colors.icon} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.address, { color: colors.subText }]}>แตะเพื่อเพิ่มที่อยู่การจัดส่ง ></Text>
      
      <View style={styles.chipContainer}>
        <FilterChip title="ส่งฟรี" />
        <FilterChip title="ลดราคา" />
        <FilterChip title="ซื้อเป็นประจำ" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  address: {
    fontSize: 14,
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: 'row',
  },
  chip: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 10,
  },
  chipText: {
    fontSize: 12,
  },
});

