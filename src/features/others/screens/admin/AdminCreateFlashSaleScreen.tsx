import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

interface Product {
  id: number;
  title: string;
  price: number;
  quantity: number;
  images?: Array<{ url?: string; secure_url?: string }>;
}

interface FlashSaleItem {
  productId: number;
  product?: Product;
  discountPrice: number;
  limitStock: number;
}

export default function AdminCreateFlashSaleScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  // Campaign Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
  const [endTime, setEndTime] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
  
  // Modals
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<FlashSaleItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // Load Products
  useEffect(() => {
    loadProducts();
  }, [searchQuery]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      // ใช้ keyword แทน search ตาม API ที่มี
      const params: any = { limit: 100 };
      if (searchQuery) {
        params.keyword = searchQuery;
      }
      
      const data = await client.get('/products', { params }) as any;

      // API อาจ return { data: [], total: ... } หรือ array โดยตรง
      const productList = Array.isArray(data) 
        ? data 
        : (data?.data || []);
      setProducts(productList);
    } catch (error: any) {
      console.error('Error loading products:', error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดสินค้าได้');
    } finally {
      setLoadingProducts(false);
    }
  };

  const addProductToCampaign = (product: Product) => {
    // เช็คว่าเพิ่มไปแล้วหรือยัง
    if (selectedProducts.some((item) => item.productId === product.id)) {
      Alert.alert('แจ้งเตือน', 'สินค้านี้ถูกเพิ่มไปแล้ว');
      return;
    }

    // เพิ่มสินค้าใหม่ (ราคาลดเริ่มต้น = ราคาปกติ - 10%)
    const discountPrice = Math.round(product.price * 0.9);
    const limitStock = Math.min(product.quantity, 50); // เริ่มต้นที่ 50 หรือจำนวนที่มี

    setSelectedProducts([
      ...selectedProducts,
      {
        productId: product.id,
        product,
        discountPrice,
        limitStock,
      },
    ]);
  };

  const removeProduct = (productId: number) => {
    setSelectedProducts(selectedProducts.filter((item) => item.productId !== productId));
  };

  const updateProductPrice = (productId: number, discountPrice: number) => {
    setSelectedProducts(
      selectedProducts.map((item) =>
        item.productId === productId ? { ...item, discountPrice } : item,
      ),
    );
  };

  const updateProductStock = (productId: number, limitStock: number) => {
    setSelectedProducts(
      selectedProducts.map((item) =>
        item.productId === productId ? { ...item, limitStock } : item,
      ),
    );
  };

  // Helper: รวม Date + Time เป็น Date object
  const combineDateTime = (date: Date, time: Date): Date => {
    const combined = new Date(date);
    combined.setHours(time.getHours());
    combined.setMinutes(time.getMinutes());
    combined.setSeconds(0);
    combined.setMilliseconds(0);
    return combined;
  };

  // Helper: Format Date สำหรับแสดงผล
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Helper: Format Time สำหรับแสดงผล
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('ผิดพลาด', 'กรุณากรอกชื่อแคมเปญ');
      return;
    }

    const start = combineDateTime(startDate, startTime);
    const end = combineDateTime(endDate, endTime);

    if (start >= end) {
      Alert.alert('ผิดพลาด', 'เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุด');
      return;
    }

    if (selectedProducts.length === 0) {
      Alert.alert('ผิดพลาด', 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    // Validate each product
    for (const item of selectedProducts) {
      if (!item.product) continue;

      if (item.discountPrice >= item.product.price) {
        Alert.alert(
          'ผิดพลาด',
          `ราคาลดของ "${item.product.title}" ต้องน้อยกว่าราคาปกติ`,
        );
        return;
      }

      if (item.limitStock > item.product.quantity) {
        Alert.alert(
          'ผิดพลาด',
          `จำนวนโควตาของ "${item.product.title}" ต้องไม่เกินจำนวนที่มี (${item.product.quantity})`,
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        items: selectedProducts.map((item) => ({
          productId: item.productId,
          discountPrice: item.discountPrice,
          limitStock: item.limitStock,
        })),
      };

      await client.post('/flash-sales/admin/create', payload);

      Alert.alert('สำเร็จ', 'สร้าง Flash Sale Campaign สำเร็จ', [
        {
          text: 'ตกลง',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error creating flash sale:', error);
      const errorMessage =
        error.response?.data?.message || error.message || 'ไม่สามารถสร้างแคมเปญได้';
      Alert.alert('ผิดพลาด', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="สร้าง Flash Sale Campaign" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Campaign Info Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>ข้อมูลแคมเปญ</Text>

          <Text style={[styles.label, { color: colors.text }]}>ชื่อแคมเปญ *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="เช่น Flash Sale รอบเที่ยง"
            placeholderTextColor={colors.subText}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, { color: colors.text }]}>คำอธิบาย</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="คำอธิบายแคมเปญ (Optional)"
            placeholderTextColor={colors.subText}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.label, { color: colors.text }]}>เวลาเริ่มต้น *</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={[styles.dateTimeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>
                {formatDate(startDate)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateTimeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>
                {formatTime(startTime)}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>เวลาสิ้นสุด *</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={[styles.dateTimeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>
                {formatDate(endDate)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateTimeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowEndTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>
                {formatTime(endTime)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Products Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              สินค้าในแคมเปญ ({selectedProducts.length})
            </Text>
            <TouchableOpacity
              style={[styles.addProductButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowProductModal(true)}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.addProductButtonText}>เลือกสินค้า</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Products List */}
          {selectedProducts.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="cube-outline" size={48} color={colors.subText} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                ยังไม่มีสินค้าในแคมเปญ
              </Text>
              <Text style={[styles.emptyHint, { color: colors.subText }]}>
                กดปุ่ม "เลือกสินค้า" เพื่อเพิ่มสินค้า
              </Text>
            </View>
          ) : (
            <View>
              {selectedProducts.map((item) => {
                const product = item.product;
                if (!product) return null;

                return (
                  <View
                    key={item.productId}
                    style={[styles.selectedProductPreview, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <View style={styles.selectedProductPreviewHeader}>
                      <Text style={[styles.selectedProductPreviewTitle, { color: colors.text }]} numberOfLines={1}>
                        {product.title}
                      </Text>
                      <TouchableOpacity onPress={() => removeProduct(item.productId)}>
                        <Ionicons name="close-circle" size={20} color="#FF5722" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.selectedProductPreviewPrice, { color: colors.subText }]}>
                      ฿{product.price.toLocaleString()} → ฿{item.discountPrice.toLocaleString()} ({item.limitStock} ชิ้น)
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Selected Products with Price/Stock Input */}
        {selectedProducts.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ตั้งค่าราคาและโควตา
            </Text>

            {selectedProducts.map((item) => {
              const product = item.product;
              if (!product) return null;

              return (
                <View
                  key={item.productId}
                  style={[styles.selectedProductCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <View style={styles.selectedProductHeader}>
                    <Text style={[styles.selectedProductTitle, { color: colors.text }]} numberOfLines={2}>
                      {product.title}
                    </Text>
                    <TouchableOpacity onPress={() => removeProduct(item.productId)}>
                      <Ionicons name="close-circle" size={24} color="#FF5722" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: colors.subText }]}>ราคาปกติ:</Text>
                    <Text style={[styles.priceValue, { color: colors.text }]}>
                      ฿{product.price.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>ราคาลด *</Text>
                      <TextInput
                        style={[styles.numberInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="0"
                        placeholderTextColor={colors.subText}
                        value={item.discountPrice.toString()}
                        onChangeText={(text) => {
                          const num = parseFloat(text) || 0;
                          updateProductPrice(item.productId, num);
                        }}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>โควตา *</Text>
                      <TextInput
                        style={[styles.numberInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="0"
                        placeholderTextColor={colors.subText}
                        value={item.limitStock.toString()}
                        onChangeText={(text) => {
                          const num = parseInt(text) || 0;
                          updateProductStock(item.productId, num);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <Text style={[styles.hint, { color: colors.subText }]}>
                    สต็อกที่มี: {product.quantity} | ส่วนลด:{' '}
                    {Math.round(((product.price - item.discountPrice) / product.price) * 100)}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>สร้างแคมเปญ</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Picker Modals */}
      {/* Start Date Picker */}
      <Modal
        visible={showStartDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStartDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>เลือกวันที่เริ่มต้น</Text>
              <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <DatePickerList
              currentDate={startDate}
              onSelect={(date) => {
                setStartDate(date);
                setShowStartDatePicker(false);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Start Time Picker */}
      <Modal
        visible={showStartTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStartTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>เลือกเวลาเริ่มต้น</Text>
              <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TimePickerList
              currentTime={startTime}
              onSelect={(time) => {
                setStartTime(time);
                setShowStartTimePicker(false);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* End Date Picker */}
      <Modal
        visible={showEndDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>เลือกวันที่สิ้นสุด</Text>
              <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <DatePickerList
              currentDate={endDate}
              onSelect={(date) => {
                setEndDate(date);
                setShowEndDatePicker(false);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* End Time Picker */}
      <Modal
        visible={showEndTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEndTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>เลือกเวลาสิ้นสุด</Text>
              <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TimePickerList
              currentTime={endTime}
              onSelect={(time) => {
                setEndTime(time);
                setShowEndTimePicker(false);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Product Selector Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProductModal(false)}
      >
        <SafeAreaView style={[styles.modalFullScreen, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>เลือกสินค้า</Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.modalSearchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.subText} />
            <TextInput
              style={[styles.modalSearchInput, { color: colors.text }]}
              placeholder="ค้นหาสินค้า..."
              placeholderTextColor={colors.subText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.subText} />
              </TouchableOpacity>
            )}
          </View>

          {/* Product List */}
          {loadingProducts ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedProducts.some((p) => p.productId === item.id);
                const imageUrl =
                  item.images?.[0]?.secure_url ||
                  item.images?.[0]?.url ||
                  'https://via.placeholder.com/100';

                return (
                  <TouchableOpacity
                    style={[
                      styles.modalProductItem,
                      {
                        backgroundColor: colors.card,
                        borderBottomColor: colors.border,
                        opacity: isSelected ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (!isSelected) {
                        addProductToCampaign(item);
                        setShowProductModal(false);
                      }
                    }}
                    disabled={isSelected}
                  >
                    <View style={styles.modalProductImageContainer}>
                      <Text style={styles.modalProductImagePlaceholder}>📦</Text>
                    </View>
                    <View style={styles.modalProductInfo}>
                      <Text style={[styles.modalProductTitle, { color: colors.text }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={[styles.modalProductPrice, { color: colors.primary }]}>
                        ฿{item.price.toLocaleString()}
                      </Text>
                      <Text style={[styles.modalProductStock, { color: colors.subText }]}>
                        สต็อก: {item.quantity}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <View style={styles.modalEmpty}>
                  <Ionicons name="cube-outline" size={48} color={colors.subText} />
                  <Text style={[styles.modalEmptyText, { color: colors.subText }]}>
                    ไม่พบสินค้า
                  </Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 15,
  },
  section: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  dateText: {
    fontSize: 14,
  },
  productList: {
    marginTop: 10,
    gap: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImagePlaceholder: {
    fontSize: 24,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 12,
  },
  selectedProductCard: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  selectedProductHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  selectedProductTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addProductButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 12,
    marginTop: 6,
  },
  selectedProductPreview: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  selectedProductPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectedProductPreviewTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
  },
  selectedProductPreviewPrice: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalFullScreen: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerContainer: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 16,
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalProductImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalProductImagePlaceholder: {
    fontSize: 24,
  },
  modalProductInfo: {
    flex: 1,
  },
  modalProductTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  modalProductStock: {
    fontSize: 12,
  },
  modalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyText: {
    fontSize: 16,
    marginTop: 12,
  },
});

// Helper Components for Date/Time Picker
function DatePickerList({ currentDate, onSelect }: { currentDate: Date; onSelect: (date: Date) => void }) {
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(currentDate);

  // สร้างรายการวันที่ (30 วันถัดไป)
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }

  return (
    <FlatList
      data={dates}
      keyExtractor={(item, index) => index.toString()}
      renderItem={({ item }) => {
        const isSelected = item.toDateString() === selectedDate.toDateString();
        return (
          <TouchableOpacity
            style={[
              styles.pickerItem,
              {
                backgroundColor: isSelected ? colors.primary + '20' : 'transparent',
                borderColor: isSelected ? colors.primary : 'transparent',
              },
            ]}
            onPress={() => {
              setSelectedDate(item);
              onSelect(item);
            }}
          >
            <Text style={[styles.pickerItemText, { color: isSelected ? colors.primary : colors.text }]}>
              {item.toLocaleDateString('th-TH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </TouchableOpacity>
        );
      }}
    />
  );
}

function TimePickerList({ currentTime, onSelect }: { currentTime: Date; onSelect: (time: Date) => void }) {
  const { colors } = useTheme();
  const [selectedTime, setSelectedTime] = useState(currentTime);

  // สร้างรายการเวลา (ทุก 30 นาที)
  const times: Date[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = new Date();
      time.setHours(hour, minute, 0, 0);
      times.push(time);
    }
  }

  return (
    <FlatList
      data={times}
      keyExtractor={(item, index) => index.toString()}
      renderItem={({ item }) => {
        const itemTimeStr = `${String(item.getHours()).padStart(2, '0')}:${String(item.getMinutes()).padStart(2, '0')}`;
        const selectedTimeStr = `${String(selectedTime.getHours()).padStart(2, '0')}:${String(selectedTime.getMinutes()).padStart(2, '0')}`;
        const isSelected = itemTimeStr === selectedTimeStr;

        return (
          <TouchableOpacity
            style={[
              styles.pickerItem,
              {
                backgroundColor: isSelected ? colors.primary + '20' : 'transparent',
                borderColor: isSelected ? colors.primary : 'transparent',
              },
            ]}
            onPress={() => {
              setSelectedTime(item);
              onSelect(item);
            }}
          >
            <Text style={[styles.pickerItemText, { color: isSelected ? colors.primary : colors.text }]}>
              {item.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </Text>
            {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </TouchableOpacity>
        );
      }}
    />
  );
}
