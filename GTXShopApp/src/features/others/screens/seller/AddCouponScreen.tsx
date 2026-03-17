import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useAuth } from '@app/providers/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function AddCouponScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  // ตรวจสอบ role
  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'seller';
  const userStoreId = user?.storeId; // Store ID ของ Seller

  // Basic fields
  const [code, setCode] = useState('');
  const [type, setType] = useState<'DISCOUNT' | 'SHIPPING' | 'COIN'>('DISCOUNT');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Date fields
  const [startDate, setStartDate] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('30');

  // Quantity limits
  const [totalQuantity, setTotalQuantity] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('1');

  // Target users
  const [targetUsers, setTargetUsers] = useState<'ALL' | 'NEW_USER' | 'EXISTING_USER'>('ALL');
  const [showTargetUsersModal, setShowTargetUsersModal] = useState(false);

  // Store selection
  const [storeId, setStoreId] = useState<number | null>(null);
  const [storeName, setStoreName] = useState('');
  const [stores, setStores] = useState<any[]>([]);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [myStore, setMyStore] = useState<any>(null);

  // Categories
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (isAdmin) {
      fetchStores(); // Admin สามารถเลือก Platform Voucher หรือ Shop Voucher
    } else if (isSeller) {
      fetchMyStore(); // Seller ต้องใช้ร้านตัวเองเท่านั้น (เรียก API ไปเอา storeId มา)
    }
  }, [isAdmin, isSeller]);

  const fetchMyStore = async () => {
    try {
      console.log('Fetching my store...');
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get(`/stores/my`);
      console.log('Fetch my store response:', JSON.stringify(res, null, 2));

      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const storesList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);

      console.log('Parsed stores list:', JSON.stringify(storesList, null, 2));

      if (storesList.length > 0) {
        const store = storesList[0];
        setMyStore(store);
        setStoreId(store.id);
        setStoreName(store.name);
        console.log('Set store ID:', store.id);
      } else {
        console.log('No stores found for this user');
      }
    } catch (error) {
      console.error('Error fetching my store:', error);
    }
  };

  const fetchStores = async () => {
    try {
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get('/stores/admin/all');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const storesList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setStores(storesList);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get('/categories');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const categoriesList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setCategories(categoriesList);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCreate = async () => {
    if (!code) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกรหัสคูปอง');
      return;
    }

    if (type === 'DISCOUNT' && !discountAmount && !discountPercent) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกส่วนลด (บาท หรือ เปอร์เซ็นต์)');
      return;
    }

    // Validate role-based restrictions
    if (isSeller && !storeId) {
      Alert.alert('แจ้งเตือน', 'Seller ต้องสร้าง Shop Voucher สำหรับร้านตัวเองเท่านั้น');
      return;
    }

    if (isAdmin && storeId) {
      // Admin สร้าง Shop Voucher ได้ แต่ต้องระบุร้าน
      // (ไม่ต้อง validate อะไร)
    }

    try {
      setLoading(true);
      const payload: any = {
        code: code.trim().toUpperCase(),
        type,
        discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
        discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        minPurchase: parseFloat(minPurchase) || 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        expiresInDays: parseInt(expiresInDays) || 30,
        totalQuantity: totalQuantity ? parseInt(totalQuantity) : undefined,
        perUserLimit: parseInt(perUserLimit) || 1,
        targetUsers,
        // Admin: storeId = null (Platform) หรือ storeId (Shop Voucher)
        // Seller: storeId = ร้านตัวเอง (บังคับ)
        storeId: isSeller ? (storeId || userStoreId) : (storeId || undefined),
        userId: user?.id || 1,
      };

      if (startDate) {
        payload.startDate = new Date(startDate).toISOString();
      }

      if (selectedCategories.length > 0) {
        payload.categoryIds = selectedCategories;
      }

      const response = await client.post('/coupons', payload);

      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const couponData = response?.data || response;
      console.log('✅ Coupon created:', couponData);
      const couponType = storeId ? 'Shop Voucher' : 'Platform Voucher';
      Alert.alert('สำเร็จ', `สร้าง${couponType}เรียบร้อย`, [
        { text: 'ตกลง', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('❌ Create coupon error:', error);
      const errorMessage =
        error.response?.data?.message || 'สร้างคูปองไม่สำเร็จ';
      Alert.alert('ผิดพลาด', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="สร้างคูปองใหม่" />
      <ScrollView style={styles.form}>
        {/* ประเภทคูปอง */}
        <Text style={[styles.label, { color: colors.text }]}>ประเภทคูปอง *</Text>
        <View style={styles.typeContainer}>
          {(['DISCOUNT', 'SHIPPING', 'COIN'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeButton,
                {
                  backgroundColor: type === t ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
                type === t && styles.typeButtonActive
              ]}
              onPress={() => setType(t)}
            >
              <Text style={[
                styles.typeButtonText,
                { color: type === t ? '#fff' : colors.text }
              ]}>
                {t === 'DISCOUNT' ? 'ส่วนลด' : t === 'SHIPPING' ? 'ฟรีค่าจัดส่ง' : 'เงินคืน'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>รหัสคูปอง (Code) *</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
          placeholder="เช่น SALE100"
          placeholderTextColor={colors.subText}
          autoCapitalize="characters"
        />

        {type === 'DISCOUNT' && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>ส่วนลด (บาท)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
              value={discountAmount}
              onChangeText={setDiscountAmount}
              keyboardType="numeric"
              placeholder="จำนวนเงินที่ลด (เช่น 50)"
              placeholderTextColor={colors.subText}
            />

            <Text style={[styles.label, { color: colors.text }]}>ส่วนลด (เปอร์เซ็นต์)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
              value={discountPercent}
              onChangeText={setDiscountPercent}
              keyboardType="numeric"
              placeholder="เปอร์เซ็นต์ที่ลด (เช่น 10)"
              placeholderTextColor={colors.subText}
            />

            <Text style={[styles.label, { color: colors.text }]}>ลดสูงสุด (บาท) - สำหรับส่วนลดเปอร์เซ็นต์</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
              value={maxDiscount}
              onChangeText={setMaxDiscount}
              keyboardType="numeric"
              placeholder="เช่น 200 (ถ้าไม่มีให้เว้นว่าง)"
              placeholderTextColor={colors.subText}
            />
          </>
        )}

        <Text style={[styles.label, { color: colors.text }]}>ซื้อขั้นต่ำ (บาท)</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          value={minPurchase}
          onChangeText={setMinPurchase}
          keyboardType="numeric"
          placeholder="0 = ไม่มีขั้นต่ำ"
          placeholderTextColor={colors.subText}
        />

        <Text style={[styles.label, { color: colors.text }]}>ชื่อคูปอง (Title)</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          value={title}
          onChangeText={setTitle}
          placeholder="เช่น ส่วนลด 15% ลดสูงสุด ฿200"
          placeholderTextColor={colors.subText}
        />

        <Text style={[styles.label, { color: colors.text }]}>คำอธิบาย (Description)</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          value={description}
          onChangeText={setDescription}
          placeholder="เช่น เมื่อชำระผ่าน AirPay"
          placeholderTextColor={colors.subText}
          multiline
          numberOfLines={2}
        />

        {/* ร้านค้า */}
        {isAdmin ? (
          <>
            <Text style={[styles.label, { color: colors.text }]}>ร้านค้า (Shop Voucher)</Text>
            <TouchableOpacity
              style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowStoreModal(true)}
            >
              <Text style={[styles.selectButtonText, { color: storeName ? colors.text : colors.subText }]}>
                {storeName || 'Platform Voucher (ใช้ได้ทุกร้าน) - คลิกเพื่อเลือกร้าน'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.subText} />
            </TouchableOpacity>
            <Text style={[styles.hint, { color: colors.subText }]}>
              💡 Admin: เลือก Platform Voucher (เว้นว่าง) หรือ Shop Voucher (เลือกร้าน)
            </Text>
          </>
        ) : isSeller ? (
          <>
            <Text style={[styles.label, { color: colors.text }]}>ร้านค้า (Shop Voucher)</Text>
            <View style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.card, opacity: 0.7 }]}>
              <Text style={[styles.selectButtonText, { color: colors.text }]}>
                {storeName || 'กำลังโหลดข้อมูลร้าน...'}
              </Text>
            </View>
            <Text style={[styles.hint, { color: colors.subText }]}>
              💡 Seller: คูปองนี้จะใช้ได้เฉพาะร้านของคุณเท่านั้น
            </Text>
          </>
        ) : null}

        {/* ผู้ใช้เป้าหมาย */}
        <Text style={[styles.label, { color: colors.text }]}>ผู้ใช้เป้าหมาย</Text>
        <TouchableOpacity
          style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => setShowTargetUsersModal(true)}
        >
          <Text style={[styles.selectButtonText, { color: colors.text }]}>
            {targetUsers === 'ALL' ? 'ทุกคน' : targetUsers === 'NEW_USER' ? 'ลูกค้าใหม่' : 'ลูกค้าเก่า'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.subText} />
        </TouchableOpacity>

        {/* หมวดหมู่สินค้า */}
        <Text style={[styles.label, { color: colors.text }]}>หมวดหมู่สินค้า (เว้นว่าง = ทุกหมวดหมู่)</Text>
        <TouchableOpacity
          style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={[styles.selectButtonText, { color: colors.text }]}>
            {selectedCategories.length > 0
              ? `เลือกแล้ว ${selectedCategories.length} หมวดหมู่`
              : 'เลือกหมวดหมู่ (เว้นว่าง = ทุกหมวดหมู่)'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.subText} />
        </TouchableOpacity>

        {/* จำนวนจำกัด */}
        <Text style={[styles.label, { color: colors.text }]}>จำนวนคูปองทั้งหมด (เว้นว่าง = ไม่จำกัด)</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          value={totalQuantity}
          onChangeText={setTotalQuantity}
          keyboardType="numeric"
          placeholder="เช่น 1000"
          placeholderTextColor={colors.subText}
        />

        <Text style={[styles.label, { color: colors.text }]}>จำนวนต่อผู้ใช้</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          value={perUserLimit}
          onChangeText={setPerUserLimit}
          keyboardType="numeric"
          placeholder="1"
          placeholderTextColor={colors.subText}
        />

        {/* ระยะเวลา */}
        <Text style={[styles.label, { color: colors.text }]}>วันเริ่มต้น (YYYY-MM-DD) - เว้นว่าง = เริ่มทันที</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2025-01-01"
          placeholderTextColor={colors.subText}
        />

        <Text style={[styles.label, { color: colors.text }]}>อายุการใช้งาน (วัน)</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          value={expiresInDays}
          onChangeText={setExpiresInDays}
          keyboardType="numeric"
          placeholder="30"
          placeholderTextColor={colors.subText}
        />

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }, loading && styles.disabledBtn]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? 'กำลังสร้าง...' : 'สร้างคูปอง'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal เลือกร้านค้า */}
      <Modal visible={showStoreModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>เลือกร้านค้า</Text>
              <TouchableOpacity onPress={() => setShowStoreModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setStoreId(null);
                setStoreName('Platform Voucher (ใช้ได้ทุกร้าน)');
                setShowStoreModal(false);
              }}
            >
              <Text style={[styles.modalItemText, { color: colors.text }]}>Platform Voucher (ใช้ได้ทุกร้าน)</Text>
            </TouchableOpacity>
            <FlatList
              data={stores}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setStoreId(item.id);
                    setStoreName(item.name);
                    setShowStoreModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal เลือกผู้ใช้เป้าหมาย */}
      <Modal visible={showTargetUsersModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>ผู้ใช้เป้าหมาย</Text>
              <TouchableOpacity onPress={() => setShowTargetUsersModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {(['ALL', 'NEW_USER', 'EXISTING_USER'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setTargetUsers(option);
                  setShowTargetUsersModal(false);
                }}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>
                  {option === 'ALL' ? 'ทุกคน' : option === 'NEW_USER' ? 'ลูกค้าใหม่' : 'ลูกค้าเก่า'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal เลือกหมวดหมู่ */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>เลือกหมวดหมู่</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedCategories.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => toggleCategory(item.id)}
                  >
                    <Text style={[styles.modalItemText, { color: colors.text }]}>{item.name}</Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, margin: 15 }]}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.btnText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 20 },
  label: { fontWeight: 'bold', marginBottom: 5, marginTop: 5 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    flex: 1,
  },
  btn: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledBtn: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    marginTop: -15,
    marginBottom: 15,
    fontStyle: 'italic',
  },
});
