// components/cart/CartItem.tsx
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { CartItem as CartItemType } from '@shared/interfaces/cart';
import { useTheme } from '@app/providers/ThemeContext';
import EditCartItemModal from './EditCartItemModal';
import { useCart } from '@app/providers/CartContext';

interface CartItemProps {
  item: CartItemType;
  isSelected: boolean; // รับค่าว่าถูกเลือกอยู่ไหม
  onToggle: () => void; // ฟังก์ชันกด Checkbox
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  isSelected,
  onToggle,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { updateCartItemVariant } = useCart();
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  const product = item.product || {};
  const imageUrl = product.imageUrl || product.images?.[0]?.url || 'https://via.placeholder.com/150';
  const productName = product.title || product.name || 'Unknown Product';

  const displayPrice = item.variant?.price
    ? Number(item.variant.price)
    : product.discountPrice || product.price || 0;
  const variantName = item.variant ? item.variant.name : null;

  const handleEdit = () => {
    setEditModalVisible(true);
  };

  const handleConfirmEdit = async (variantId: number | null, quantity: number) => {
    await updateCartItemVariant(item.id, variantId, quantity);
  };

  const handleProductPress = () => {
    if (item.productId) {
      navigation.navigate('ProductDetail', { productId: item.productId });
    }
  };

  // ส่วนที่แสดงเมื่อปัดซ้าย (ปุ่มลบสีแดง)
  const renderRightActions = () => {
    return (
      <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.heart }]} onPress={onRemove}>
        <Ionicons name="trash-outline" size={24} color="#fff" />
        <Text style={styles.deleteText}>ลบ</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        {/* 1. Checkbox */}
        <TouchableOpacity
          onPress={onToggle}
          style={[
            styles.checkbox,
            {
              backgroundColor: isSelected ? colors.primary : 'transparent',
              borderColor: isSelected ? colors.primary : colors.border,
            },
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </TouchableOpacity>

        {/* 2. รูปสินค้า - กดได้เพื่อไปหน้า ProductDetail */}
        <TouchableOpacity onPress={handleProductPress} activeOpacity={0.7}>
          <Image
            source={{ uri: (imageUrl && imageUrl.trim() !== '') ? imageUrl : 'https://via.placeholder.com/90' }}
            style={[styles.image, { backgroundColor: colors.backgroundSecondary }]}
          />
        </TouchableOpacity>

        {/* 3. รายละเอียด - กดได้เพื่อไปหน้า ProductDetail */}
        <TouchableOpacity
          style={styles.details}
          onPress={handleProductPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {productName}
          </Text>
          <Text style={[styles.weight, { color: colors.subText }]}>100 gm</Text>

          {/* ✅ แสดงชื่อตัวเลือก (เช่น สีดำ - M) - กดได้เพื่อแก้ไข */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation(); // ป้องกันไม่ให้ trigger handleProductPress
              handleEdit();
            }}
            style={[styles.variationTag, { backgroundColor: colors.backgroundSecondary }]}
          >
            <Text style={[styles.variationText, { color: colors.subText }]}>
              {variantName ? `ตัวเลือก: ${variantName}` : 'แตะเพื่อเลือกตัวเลือก'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.subText} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <View style={styles.footerRow}>
            {/* ✅ แสดงราคาที่ถูกต้อง */}
            <Text style={[styles.price, { color: colors.text }]}>฿{displayPrice.toLocaleString()}</Text>

            {/* 4. ปุ่ม +/- จำนวน */}
            <View style={styles.qtyContainer}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation(); // ป้องกันไม่ให้ trigger handleProductPress
                  onDecrease();
                }}
                style={styles.qtyBtn}
              >
                <Ionicons name="remove" size={16} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.qtyText, { color: colors.text }]}>{item.count}</Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation(); // ป้องกันไม่ให้ trigger handleProductPress
                  onIncrease();
                }}
                style={[styles.qtyBtn, styles.addBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity style={styles.inlineDeleteButton} onPress={onRemove}>
          <Ionicons name="trash-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Edit Modal */}
      <EditCartItemModal
        visible={editModalVisible}
        item={item}
        onClose={() => setEditModalVisible(false)}
        onConfirm={handleConfirmEdit}
      />
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  image: { width: 70, height: 70, borderRadius: 12 },
  details: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  name: { fontSize: 16, fontWeight: '600' },
  weight: { fontSize: 12, marginTop: 4 },
  variationTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  variationText: { fontSize: 10 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  price: { fontSize: 18, fontWeight: 'bold' },

  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    backgroundColor: '#FF8C42',
  },
  qtyText: { fontSize: 14, fontWeight: '600', marginHorizontal: 10 },

  // Swipe Delete Styles
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  inlineDeleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default CartItem;
