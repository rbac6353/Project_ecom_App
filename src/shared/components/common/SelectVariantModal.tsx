/**
 * Modal เลือกตัวเลือก (SKU/Variant) ก่อนเพิ่มลงตะกร้า
 * ใช้เมื่อกดปุ่ม + บน ProductCard ที่มี variants
 */
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

interface SelectVariantModalProps {
  visible: boolean;
  productId: number | null;
  productTitle?: string;
  onClose: () => void;
  onConfirm: (variantId: number) => Promise<void>;
}

export default function SelectVariantModal({
  visible,
  productId,
  productTitle = '',
  onClose,
  onConfirm,
}: SelectVariantModalProps) {
  const { colors } = useTheme();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && productId) {
      fetchProduct();
      setSelectedVariant(null);
      setSelectedAttributes({});
    } else if (!visible) {
      setProduct(null);
    }
  }, [visible, productId]);

  const fetchProduct = async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const res = await api.get(`/products/${productId}`);
      const data = res?.data || res;
      if (data?.variants && Array.isArray(data.variants)) {
        data.variants = data.variants.map((v: any) => {
          if (v.attributes && typeof v.attributes === 'string') {
            try {
              v.attributes = JSON.parse(v.attributes);
            } catch {
              v.attributes = null;
            }
          }
          return v;
        });
      }
      setProduct(data);
    } catch (e) {
      console.error('SelectVariantModal fetch error:', e);
      Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลสินค้าได้');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getAttributeTypes = (): { type: string; values: string[] }[] => {
    if (!product?.variants?.length) return [];
    const typesMap = new Map<string, Set<string>>();
    product.variants.forEach((v: any) => {
      if (v.attributes && typeof v.attributes === 'object') {
        Object.keys(v.attributes).forEach((key) => {
          if (!typesMap.has(key)) typesMap.set(key, new Set());
          typesMap.get(key)?.add(v.attributes[key]);
        });
      }
    });
    return Array.from(typesMap.entries()).map(([type, values]) => ({
      type,
      values: Array.from(values),
    }));
  };

  const findMatchingVariant = (attrs: Record<string, string>): any | null => {
    if (!product?.variants) return null;
    return (
      product.variants.find((v: any) => {
        if (!v.attributes || typeof v.attributes !== 'object') return false;
        return Object.keys(attrs).every((k) => v.attributes[k] === attrs[k]);
      }) || null
    );
  };

  const isValueAvailable = (type: string, value: string): boolean => {
    if (!product?.variants) return false;
    const current = selectedAttributes[type];
    if (current === value) return true;
    const test = { ...selectedAttributes, [type]: value };
    return !!findMatchingVariant(test);
  };

  const handleSelectAttribute = (type: string, value: string) => {
    const next = { ...selectedAttributes, [type]: value };
    setSelectedAttributes(next);
    setSelectedVariant(findMatchingVariant(next));
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกตัวเลือกสินค้า (สี/ไซส์ หรือรุ่น)');
      return;
    }
    if (selectedVariant.stock < 1) {
      Alert.alert('แจ้งเตือน', 'สินค้ารายการนี้หมดแล้ว');
      return;
    }
    try {
      setSubmitting(true);
      await onConfirm(selectedVariant.id);
      onClose();
    } catch (e) {
      console.error('Add to cart error:', e);
      Alert.alert('ผิดพลาด', 'ไม่สามารถเพิ่มลงตะกร้าได้');
    } finally {
      setSubmitting(false);
    }
  };

  const attributeTypes = getAttributeTypes();
  const imageUrl =
    product?.images?.[0]?.url || 'https://via.placeholder.com/300';
  const displayPrice = selectedVariant
    ? Number(selectedVariant.price)
    : product?.discountPrice ?? product?.price ?? 0;
  const stock = selectedVariant ? selectedVariant.stock : product?.quantity ?? 0;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.container,
            { backgroundColor: colors.card ?? '#FFFFFF' },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <SafeAreaView style={styles.safe} edges={['bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border ?? '#eee' }]}>
              <Text style={[styles.title, { color: colors.text ?? '#111' }]} numberOfLines={1}>
                เลือกตัวเลือกสินค้า
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={26} color={colors.text ?? '#111'} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary ?? '#FF5722'} />
                <Text style={[styles.loadingText, { color: colors.subText ?? '#666' }]}>กำลังโหลด...</Text>
              </View>
            ) : product ? (
              <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.productRow}>
                  <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />
                  <View style={styles.productInfo}>
                    <Text style={[styles.productTitle, { color: colors.text ?? '#111' }]} numberOfLines={2}>
                      {product.title || productTitle}
                    </Text>
                    <Text style={[styles.price, { color: colors.primary ?? '#FF5722' }]}>
                      ฿{Number(displayPrice).toLocaleString()}
                    </Text>
                    <Text style={[styles.stock, { color: colors.subText ?? '#666' }]}>คลัง: {stock}</Text>
                  </View>
                </View>

                {attributeTypes.length > 0 ? (
                  <View style={styles.section}>
                    {attributeTypes.map(({ type, values }) => (
                      <View key={type} style={styles.attrGroup}>
                        <Text style={[styles.attrLabel, { color: colors.text ?? '#111' }]}>{type}</Text>
                        <View style={styles.chipRow}>
                          {values.map((value) => {
                            const selected = selectedAttributes[type] === value;
                            const available = isValueAvailable(type, value);
                            return (
                              <TouchableOpacity
                                key={value}
                                disabled={!available}
                                style={[
                                  styles.chip,
                                  {
                                    backgroundColor: selected ? (colors.primary ?? '#FF5722') : (colors.background ?? '#f5f5f5'),
                                    borderColor: selected ? (colors.primary ?? '#FF5722') : (colors.border ?? '#ddd'),
                                  },
                                  !available && styles.chipDisabled,
                                ]}
                                onPress={() => handleSelectAttribute(type, value)}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    { color: selected ? '#fff' : (colors.text ?? '#111') },
                                    !available && { color: colors.subText ?? '#666' },
                                  ]}
                                >
                                  {value}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : product.variants?.length ? (
                  <View style={styles.section}>
                    <Text style={[styles.attrLabel, { color: colors.text ?? '#111' }]}>ตัวเลือก</Text>
                    <View style={styles.chipRow}>
                      {product.variants.map((v: any) => {
                        const selected = selectedVariant?.id === v.id;
                        const outOfStock = v.stock <= 0;
                        return (
                          <TouchableOpacity
                            key={v.id}
                            disabled={outOfStock}
                            style={[
                              styles.chip,
                              {
                                backgroundColor: selected ? (colors.primary ?? '#FF5722') : (colors.background ?? '#f5f5f5'),
                                borderColor: selected ? (colors.primary ?? '#FF5722') : (colors.border ?? '#ddd'),
                              },
                              outOfStock && styles.chipDisabled,
                            ]}
                            onPress={() => {
                              setSelectedVariant(outOfStock ? null : v);
                            }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                { color: selected ? '#fff' : (colors.text ?? '#111') },
                                outOfStock && { color: colors.subText ?? '#666' },
                              ]}
                            >
                              {v.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}

            {/* ปุ่มเพิ่มลงตะกร้า แนบล่างเสมอ (ไม่ต้องเลื่อน) */}
            {product && !loading && (
              <View style={[styles.footer, { borderTopColor: colors.border ?? '#eee' }]}>
                <TouchableOpacity
                  style={[
                    styles.addBtn,
                    { backgroundColor: colors.primary ?? '#FF5722' },
                    (!selectedVariant || submitting) && styles.addBtnDisabled,
                  ]}
                  onPress={handleAddToCart}
                  disabled={!selectedVariant || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.addBtnText}>เพิ่มลงตะกร้า</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 400,
    maxHeight: '92%',
  },
  safe: { flex: 1, minHeight: 360 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  loading: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 8 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  scrollContent: { paddingBottom: 12 },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  productRow: { flexDirection: 'row', paddingVertical: 12 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  productInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  productTitle: { fontSize: 15, marginBottom: 2 },
  price: { fontSize: 18, fontWeight: 'bold' },
  stock: { fontSize: 12, marginTop: 2 },
  section: { marginBottom: 12 },
  attrGroup: { marginBottom: 10 },
  attrLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipDisabled: { opacity: 0.5 },
  chipText: { fontSize: 14 },
  addBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
