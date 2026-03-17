// screens/CartScreen.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, FlatList, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@app/providers/CartContext';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';

// Import Components (ใช้ของเดิม)
import CartEmptyState from '@shared/components/cart/CartEmptyState';
import CartGuarantees from '@shared/components/cart/CartGuarantees';
import CartItem from '@shared/components/cart/CartItem';

export default function CartScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { cart, loading, refreshCart, removeFromCart, updateQuantity } = useCart();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. โหลดข้อมูลเมื่อเข้าหน้า
  useEffect(() => {
    if (user) refreshCart();
  }, [user]);

  // 2. Sync selectedItems เมื่อ Cart เปลี่ยน
  useEffect(() => {
    if (cart?.items) {
      const currentIds = cart.items.map((i) => i.id);
      setSelectedIds((prev) => prev.filter((id) => currentIds.includes(id)));
    }
  }, [cart]);

  // 3. ฟังก์ชัน Refresh (ดึงลงเพื่อรีโหลด)
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshCart();
    setIsRefreshing(false);
  }, [refreshCart]);

  const handleToggle = (itemId: number) => {
    if (selectedIds.includes(itemId)) {
      setSelectedIds((prev) => prev.filter((id) => id !== itemId));
    } else {
      setSelectedIds((prev) => [...prev, itemId]);
    }
  };

  const handleSelectAll = () => {
    if (!cart?.items) return;
    if (selectedIds.length === cart.items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cart.items.map((i) => i.id));
    }
  };

  const selectedTotal = useMemo(() => {
    if (!cart?.items) return 0;
    return cart.items
      .filter((item) => selectedIds.includes(item.id))
      .reduce((sum, item) => {
        const price = item.variant?.price
          ? Number(item.variant.price)
          : item.product.discountPrice || item.product.price || 0;
        return sum + price * item.count;
      }, 0);
  }, [cart, selectedIds]);

  const selectedCount = useMemo(() => {
    if (!cart?.items) return 0;
    return cart.items
      .filter((item) => selectedIds.includes(item.id))
      .reduce((sum, item) => sum + item.count, 0);
  }, [cart, selectedIds]);

  const isAllSelected = cart?.items && cart.items.length > 0 && selectedIds.length === cart.items.length;

  const handleCheckout = () => {
    if (selectedCount === 0) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกสินค้าอย่างน้อย 1 ชิ้น');
      return;
    }
    // ส่ง items ที่เลือกไปยังหน้า Checkout (หรือเก็บใน Context)
    navigation.navigate('Checkout', { selectedIds });
  };

  // State: ยังไม่ Login
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header navigation={navigation} title="My Cart" />
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={64} color={colors.subText} />
          <Text style={[styles.loginText, { color: colors.text }]}>
            กรุณาเข้าสู่ระบบเพื่อดูตะกร้าสินค้า
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.checkoutText}>เข้าสู่ระบบ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // State: Loading
  if (loading && !cart) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header navigation={navigation} title="My Cart" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // State: ตะกร้าว่าง
  const isEmpty = !cart || !cart.items || cart.items.length === 0;
  if (!loading && isEmpty) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header navigation={navigation} title="My Cart" />
        <View style={{ flex: 1 }}>
          {/* ใส่ Refresh Control ให้หน้า Empty State ด้วยเผื่อเน็ตหลุดแล้วโหลดไม่ขึ้น */}
          <FlatList
            data={[]}
            renderItem={null}
            ListEmptyComponent={
              <View style={{ marginTop: 50 }}>
                <CartEmptyState />
                <TouchableOpacity
                  style={[styles.shopButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('Home')}
                >
                  <Text style={styles.checkoutText}>เลือกซื้อสินค้าเลย</Text>
                </TouchableOpacity>
              </View>
            }
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* 1. Header */}
      <Header navigation={navigation} title={`My Cart (${cart?.items?.length || 0})`} />

      {/* 2. Select All & List Header */}
      <View style={[styles.itemsHeader, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.selectAllButton} onPress={handleSelectAll}>
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isAllSelected ? colors.primary : 'transparent',
                borderColor: isAllSelected ? colors.primary : colors.border,
              },
            ]}
          >
            {isAllSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={[styles.selectAllText, { color: colors.text }]}>เลือกทั้งหมด</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          // Logic ลบรายการที่เลือก
          selectedIds.forEach(id => removeFromCart(id));
          setSelectedIds([]);
        }}>
          <Text style={{ color: colors.primary, fontSize: 14 }}>ลบที่เลือก</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Product List */}
      <FlatList
        data={cart!.items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <CartItem
            item={item}
            isSelected={selectedIds.includes(item.id)}
            onToggle={() => handleToggle(item.id)}
            onIncrease={() => updateQuantity(item.id, item.count + 1)}
            onDecrease={() => {
              if (item.count > 1) updateQuantity(item.id, item.count - 1);
            }}
            onRemove={() => removeFromCart(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={<CartGuarantees />}
        refreshControl={
          <RefreshControl refreshing={loading || isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />

      {/* 4. Fixed Bottom Bar (Checkout) */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, paddingBottom: 90 + insets.bottom }]}>
        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: colors.subText }]}>ยอดรวม:</Text>
          <Text style={[styles.totalPrice, { color: colors.primary }]}>฿{selectedTotal.toLocaleString()}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.checkoutButton,
            { backgroundColor: selectedCount > 0 ? colors.primary : colors.border }
          ]}
          onPress={handleCheckout}
          disabled={selectedCount === 0}
        >
          <Text style={styles.checkoutText}>ชำระเงิน ({selectedCount})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// แยก Header ออกมาให้โค้ดสะอาดขึ้น
const Header = ({ navigation, title }: any) => {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <View style={{ width: 28 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    textAlign: 'center',
  },
  loginButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  shopButton: {
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: -20, // ปรับตำแหน่งให้สวยงามต่อจาก EmptyState
  },

  // List Styles
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 120, // เว้นพื้นที่ให้ Bottom Bar + Tab Bar
  },

  // Bottom Bar Styles (ส่วนสำคัญที่แก้)
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  checkoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    minWidth: 140,
    alignItems: 'center',
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
