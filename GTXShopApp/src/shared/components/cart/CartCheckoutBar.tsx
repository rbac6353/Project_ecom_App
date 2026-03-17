// components/cart/CartCheckoutBar.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CartCheckoutBarProps {
  totalPrice: number;
  itemCount: number;
  isAllSelected?: boolean;
  onSelectAll?: () => void;
  onCheckout: () => void;
}

const CartCheckoutBar: React.FC<CartCheckoutBarProps> = ({
  totalPrice,
  itemCount,
  isAllSelected = false,
  onSelectAll,
  onCheckout,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // FloatingTabBar มีความสูง 65px + safe area bottom + padding
  // ให้ CartCheckoutBar อยู่เหนือ FloatingTabBar โดยเพิ่ม bottom offset
  const bottomOffset = 65 + Math.max(insets.bottom, 16) + 10; // 65 (tab bar) + safe area + 10 (spacing)
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border, bottom: bottomOffset }]}>
      <TouchableOpacity style={styles.selectAllBtn} onPress={onSelectAll}>
        <Ionicons
          name={isAllSelected ? 'checkbox' : 'square-outline'}
          size={24}
          color={isAllSelected ? colors.primary : colors.border}
        />
        <Text style={[styles.selectAllText, { color: colors.text }]}>ทั้งหมด</Text>
      </TouchableOpacity>

      <View style={styles.totalInfo}>
        <Text style={[styles.totalLabel, { color: colors.text }]}>รวมเงิน:</Text>
        <Text style={[styles.totalPrice, { color: colors.primary }]}>฿{totalPrice.toLocaleString()}</Text>
      </View>

      <TouchableOpacity
        style={[styles.checkoutBtn, { backgroundColor: itemCount === 0 ? colors.border : colors.primary }]}
        onPress={onCheckout}
        disabled={itemCount === 0}
      >
        <Text style={styles.checkoutText}>ชำระเงิน ({itemCount})</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    width: 80,
  },
  selectAllText: {
    marginLeft: 5,
    fontSize: 12,
  },
  totalInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 10,
  },
  totalLabel: {
    fontSize: 12,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: 120,
    alignItems: 'center',
  },
  checkoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default CartCheckoutBar;
