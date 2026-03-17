// components/cart/EditCartItemModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import api from '@app/api/client';
import { CartItem as CartItemType } from '@shared/interfaces/cart';

interface EditCartItemModalProps {
  visible: boolean;
  item: CartItemType | null;
  onClose: () => void;
  onConfirm: (variantId: number | null, quantity: number) => Promise<void>;
}

export default function EditCartItemModal({
  visible,
  item,
  onClose,
  onConfirm,
}: EditCartItemModalProps) {
  const { colors } = useTheme();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // โหลดข้อมูลสินค้าเมื่อเปิด modal
  useEffect(() => {
    if (visible && item) {
      fetchProductDetail();
      // ตั้งค่า variant และ quantity เริ่มต้น
      setSelectedVariant(item.variant || null);
      setQuantity(item.count);
      
      // ตั้งค่า selectedAttributes จาก variant ที่มีอยู่
      if (item.variant && (item.variant as any).attributes && typeof (item.variant as any).attributes === 'object') {
        setSelectedAttributes((item.variant as any).attributes);
      } else {
        setSelectedAttributes({});
      }
    }
  }, [visible, item]);

  const fetchProductDetail = async () => {
    if (!item?.productId) return;

    try {
      setLoading(true);
      const productData = await api.get(`/products/${item.productId}`);
      const data = productData?.data || productData;

      if (data?.variants && Array.isArray(data.variants)) {
        data.variants = data.variants.map((v: any) => {
          if (v.attributes && typeof v.attributes === 'string') {
            try {
              v.attributes = JSON.parse(v.attributes);
            } catch (e) {
              v.attributes = null;
            }
          }
          return v;
        });
      }

      setProduct(data);

      // ตั้งค่า variant ที่เลือก (ถ้ามี)
      if (item.variantId && data.variants) {
        const currentVariant = data.variants.find((v: any) => v.id === item.variantId);
        if (currentVariant) {
          setSelectedVariant(currentVariant);
          // ตั้งค่า selectedAttributes จาก variant
          if (currentVariant.attributes && typeof currentVariant.attributes === 'object') {
            setSelectedAttributes(currentVariant.attributes);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching product:', error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลสินค้าได้');
    } finally {
      setLoading(false);
    }
  };

  // ✅ ใช้ logic เดียวกับ ProductDetailScreen
  const getAttributeTypes = (): { type: string; values: string[] }[] => {
    if (!product?.variants || product.variants.length === 0) return [];

    const typesMap = new Map<string, Set<string>>();
    product.variants.forEach((v: any) => {
      if (v.attributes && typeof v.attributes === 'object') {
        Object.keys(v.attributes).forEach((key) => {
          if (!typesMap.has(key)) {
            typesMap.set(key, new Set());
          }
          typesMap.get(key)?.add(v.attributes[key]);
        });
      }
    });

    const types: { type: string; values: string[] }[] = [];
    typesMap.forEach((values, type) => {
      types.push({ type, values: Array.from(values) });
    });
    return types;
  };

  // ✅ หา variant ที่ตรงกับ attributes
  const findMatchingVariant = (attributes: Record<string, string>): any | null => {
    if (!product?.variants) return null;

    return product.variants.find((v: any) => {
      if (!v.attributes || typeof v.attributes !== 'object') return false;
      const variantAttrs = v.attributes;

      // เช็คว่า variant ตรงกับ attributes ที่เลือกทั้งหมดหรือไม่
      return Object.keys(attributes).every((key) => variantAttrs[key] === attributes[key]);
    }) || null;
  };

  // ✅ เช็คว่า value สามารถเลือกได้หรือไม่
  const isValueAvailable = (type: string, value: string): boolean => {
    if (!product?.variants) return false;

    // ถ้า value นี้ถูกเลือกอยู่แล้ว ให้ available เสมอ
    const currentSelectedValue = selectedAttributes[type];
    if (currentSelectedValue === value) {
      return true;
    }

    // สร้าง attributes ชั่วคราวเพื่อเช็ค
    const testAttributes = { ...selectedAttributes, [type]: value };

    // ถ้ามี selected attributes อื่นๆ ให้เช็คว่ามี variant ที่ตรงกันหรือไม่
    const otherSelectedKeys = Object.keys(testAttributes).filter((key) => key !== type);

    if (otherSelectedKeys.length > 0) {
      // เช็คว่ามี variant ที่ตรงกับ testAttributes หรือไม่
      const matchingVariant = product.variants.find((v: any) => {
        if (!v.attributes || typeof v.attributes !== 'object') return false;
        const variantAttrs = v.attributes;

        return Object.keys(testAttributes).every((key) => variantAttrs[key] === testAttributes[key]);
      });

      return !!matchingVariant;
    }

    // ถ้ายังไม่ได้เลือก attribute อื่นๆ ให้ available ทั้งหมด
    return true;
  };

  // ✅ จัดการเลือก attribute
  const handleSelectAttribute = (type: string, value: string) => {
    setSelectedAttributes((prevAttributes) => {
      const newAttributes = { ...prevAttributes };
      // ในแต่ละกลุ่มเลือกได้ทีละ 1 ตัว (แทนที่ค่าเดิม)
      newAttributes[type] = value;

      // หา variant ที่ตรงกับ attributes
      const matchedVariant = findMatchingVariant(newAttributes);
      if (matchedVariant) {
        setSelectedVariant(matchedVariant);
        // Reset quantity ถ้า stock น้อยกว่า quantity ปัจจุบัน
        if (matchedVariant.stock < quantity) {
          setQuantity(1);
        }
      } else {
        setSelectedVariant(null);
      }

      return newAttributes;
    });
  };

  const handleConfirm = async () => {
    if (!selectedVariant && product?.variants && product.variants.length > 0) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกตัวเลือกสินค้า');
      return;
    }

    if (quantity < 1) {
      Alert.alert('แจ้งเตือน', 'จำนวนต้องมากกว่า 0');
      return;
    }

    if (selectedVariant && selectedVariant.stock < quantity) {
      Alert.alert('แจ้งเตือน', `สินค้าเหลือเพียง ${selectedVariant.stock} ชิ้น`);
      return;
    }

    try {
      setSubmitting(true);
      await onConfirm(selectedVariant?.id || null, quantity);
      onClose();
    } catch (error: any) {
      console.error('Error updating cart item:', error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถอัปเดตสินค้าได้');
    } finally {
      setSubmitting(false);
    }
  };

  const imageUrl =
    product?.images?.[0]?.url ||
    item?.product?.imageUrl ||
    'https://via.placeholder.com/300';

  const displayPrice = selectedVariant
    ? Number(selectedVariant.price)
    : product?.discountPrice || product?.price || item?.product?.price || 0;

  const stock = selectedVariant ? selectedVariant.stock : product?.quantity || 0;

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>แก้ไขสินค้า</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Product Image & Price */}
            <View style={styles.imageSection}>
              <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
              <View style={styles.priceSection}>
                <Text style={[styles.price, { color: colors.primary }]}>฿{displayPrice.toLocaleString()}</Text>
                <Text style={[styles.stock, { color: colors.subText }]}>คลัง: {stock}</Text>
              </View>
            </View>

            {/* Variants Selection - ใช้ logic เดียวกับ ProductDetailScreen */}
            {product?.variants && product.variants.length > 0 && (() => {
              const attributeTypes = getAttributeTypes();

              // ✅ ถ้ามี attributes ให้แสดงแบบแยกกลุ่ม
              if (attributeTypes.length > 0) {
                return (
                  <View style={styles.variantsSection}>
                    {attributeTypes.map((attrType, typeIndex) => {
                      const selectedValue = selectedAttributes[attrType.type];

                      return (
                        <View key={typeIndex} style={styles.variantGroup}>
                          <Text style={[styles.variantLabel, { color: colors.text }]}>
                            {attrType.type === 'COLOR' ? 'สี' : attrType.type === 'SIZE' ? 'Size' : attrType.type}
                          </Text>
                          <View style={styles.variantOptions}>
                            {attrType.values.map((value, valueIndex) => {
                              const isSelected = selectedValue === value;
                              const isAvailable = isValueAvailable(attrType.type, value);

                              return (
                                <TouchableOpacity
                                  key={valueIndex}
                                  disabled={!isAvailable}
                                  style={[
                                    styles.variantOption,
                                    {
                                      backgroundColor: isSelected ? colors.primary : colors.card,
                                      borderColor: isSelected ? colors.primary : colors.border,
                                    },
                                    !isAvailable && { opacity: 0.5 },
                                  ]}
                                  onPress={() => handleSelectAttribute(attrType.type, value)}
                                >
                                  <Text
                                    style={[
                                      styles.variantText,
                                      { color: isSelected ? '#fff' : colors.text },
                                      !isAvailable && { color: colors.subText },
                                    ]}
                                  >
                                    {value}
                                  </Text>
                                  {isSelected && (
                                    <Ionicons name="checkmark" size={16} color="#fff" style={{ marginLeft: 4 }} />
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              }

              // ✅ ถ้าไม่มี attributes ให้แสดงแบบเดิม (backward compatibility)
              return (
                <View style={styles.variantsSection}>
                  <View style={styles.variantGroup}>
                    <Text style={[styles.variantLabel, { color: colors.text }]}>ตัวเลือก</Text>
                    <View style={styles.variantOptions}>
                      {product.variants.map((variant: any) => {
                        const isSelected = selectedVariant?.id === variant.id;
                        const isOutOfStock = variant.stock <= 0;

                        return (
                          <TouchableOpacity
                            key={variant.id}
                            style={[
                              styles.variantOption,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.card,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                              isOutOfStock && { opacity: 0.5 },
                            ]}
                            onPress={() => {
                              if (!isOutOfStock) {
                                setSelectedVariant(variant);
                                if (variant.stock < quantity) {
                                  setQuantity(1);
                                }
                              }
                            }}
                            disabled={isOutOfStock}
                          >
                            <Text
                              style={[
                                styles.variantText,
                                { color: isSelected ? '#fff' : colors.text },
                                isOutOfStock && { color: colors.subText },
                              ]}
                            >
                              {variant.name}
                            </Text>
                            {isSelected && (
                              <Ionicons name="checkmark" size={16} color="#fff" style={{ marginLeft: 4 }} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Quantity Selection */}
            <View style={styles.quantitySection}>
              <Text style={[styles.quantityLabel, { color: colors.text }]}>จำนวน</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={[styles.quantityButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => {
                    if (quantity > 1) {
                      setQuantity(quantity - 1);
                    }
                  }}
                  disabled={quantity <= 1}
                >
                  <Ionicons name="remove" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.quantityText, { color: colors.text }]}>{quantity}</Text>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    { backgroundColor: colors.primary },
                    quantity >= stock && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    if (quantity < stock) {
                      setQuantity(quantity + 1);
                    }
                  }}
                  disabled={quantity >= stock}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Confirm Button */}
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>ยืนยัน</Text>
            )}
          </TouchableOpacity>
        </View>
          </SafeAreaView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  priceSection: {
    flex: 1,
    justifyContent: 'center',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stock: {
    fontSize: 14,
  },
  variantsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  variantGroup: {
    marginBottom: 24,
  },
  variantLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  variantOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  variantText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
