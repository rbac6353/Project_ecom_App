import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

// ✅ Import Stripe - Metro จะ resolve ไปยัง stub file บน web อัตโนมัติ
import { useStripe } from '@stripe/stripe-react-native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useCart } from '@app/providers/CartContext';
import { useAddress } from '@app/providers/AddressContext';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';
import { useCoupon } from '@app/providers/CouponContext';
import { Coupon } from '@shared/interfaces/coupon';
import * as orderService from '@app/services/orderService';
import client from '@app/api/client';

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const { cart, totalPrice, itemCount, refreshCart } = useCart();
  const { selectedAddress } = useAddress();
  const { user } = useAuth();
  const { colors } = useTheme();
  // ✅ useStripe จะ return functions ที่ไม่ทำอะไรบน web (จาก stub file)
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  
  // ✅ State สำหรับหลายคูปอง (Shopee-style)
  const [platformCoupon, setPlatformCoupon] = useState<Coupon | null>(null); // Platform Voucher (1 ใบ)
  const [shopCoupons, setShopCoupons] = useState<Map<number, Coupon>>(new Map()); // Shop Voucher (แต่ละร้าน 1 ใบ)
  const [shippingCoupon, setShippingCoupon] = useState<Coupon | null>(null); // ฟรีค่าส่ง (1 ใบ)
  
  // ✅ State สำหรับส่วนลด
  const [platformDiscount, setPlatformDiscount] = useState(0);
  const [shopDiscounts, setShopDiscounts] = useState<Map<number, number>>(new Map()); // ส่วนลดตามร้าน
  const [shippingDiscount, setShippingDiscount] = useState(0);
  
  // คำนวณส่วนลดรวม
  const totalDiscount = platformDiscount + Array.from(shopDiscounts.values()).reduce((sum, d) => sum + d, 0) + shippingDiscount;
  
  const { myCoupons, availableCoupons, selectedCoupon, selectCoupon } = useCoupon();
  // ✅ State สำหรับค่าส่ง (Dynamic)
  const [shippingCost, setShippingCost] = useState(40); // Default
  const [isFreeShipping, setIsFreeShipping] = useState(false);
  // ✅ State สำหรับวิธีการชำระเงิน
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'COD' | 'BANK_TRANSFER' | 'PROMPTPAY'>('STRIPE');

  // คำนวณยอดสุทธิ (ใช้ค่าจาก State แทน const)
  const GRAND_TOTAL = totalPrice + shippingCost - totalDiscount;

  // ✅ Effect: คำนวณค่าส่งใหม่เมื่อรายการสินค้าเปลี่ยน
  useEffect(() => {
    calculateShipping();
  }, [cart, totalPrice]);

  // ✅ Effect: คำนวณส่วนลดเมื่อ selectedCoupon เปลี่ยน
  useEffect(() => {
    if (selectedCoupon) {
      console.log('Selected coupon changed, calculating discount:', selectedCoupon.code);
      calculateDiscountFromCoupon(selectedCoupon);
    } else if (!couponCode) {
      // ถ้าไม่มี selectedCoupon และไม่มี couponCode ให้ reset discount
      console.log('No selected coupon, resetting discount');
      setPlatformDiscount(0);
      setShopDiscounts(new Map());
      setShippingDiscount(0);
    }
  }, [selectedCoupon, totalPrice]);


  // ✅ ฟังก์ชันคำนวณค่าส่ง
  const calculateShipping = async () => {
    if (!cart?.items || cart.items.length === 0) {
      setShippingCost(40);
      setIsFreeShipping(false);
      return;
    }

    try {
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      // ส่งรายการในตะกร้าไปให้ Backend คำนวณ
      const res = await client.post('/orders/preview-shipping', {
        items: cart.items,
      });

      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const shippingData = res?.data || res || {};
      setShippingCost(shippingData.shippingCost || 40);
      setIsFreeShipping(shippingData.isFreeShipping || false);
    } catch (error) {
      console.error('Calc shipping error', error);
      // ถ้า error ให้ใช้ค่า default
      setShippingCost(40);
      setIsFreeShipping(false);
    }
  };

  // คำนวณส่วนลดจาก selectedCoupon
  const calculateDiscountFromCoupon = async (coupon: Coupon) => {
    // เช็คขั้นต่ำ
    if (totalPrice < coupon.minPurchase) {
      // Reset discount ตามประเภทคูปอง
      if (coupon.type === 'SHIPPING') {
        setShippingDiscount(0);
        setShippingCoupon(null);
      } else if (coupon.storeId) {
        const newShopDiscounts = new Map(shopDiscounts);
        newShopDiscounts.delete(coupon.storeId);
        setShopDiscounts(newShopDiscounts);
        const newShopCoupons = new Map(shopCoupons);
        newShopCoupons.delete(coupon.storeId);
        setShopCoupons(newShopCoupons);
      } else {
        setPlatformDiscount(0);
        setPlatformCoupon(null);
      }
      return;
    }

    try {
      // เรียก API เพื่อ validate และคำนวณส่วนลด
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const response = await client.post('/coupons/apply', {
        code: coupon.code,
        cartTotal: totalPrice,
      });

      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const responseData = response?.data || response || {};
      const { discountAmount } = responseData;
      
      // กำหนดส่วนลดตามประเภทคูปอง
      if (coupon.type === 'SHIPPING') {
        setShippingDiscount(discountAmount);
        setShippingCoupon(coupon);
      } else if (coupon.storeId) {
        const newShopDiscounts = new Map(shopDiscounts);
        newShopDiscounts.set(coupon.storeId, discountAmount);
        setShopDiscounts(newShopDiscounts);
        const newShopCoupons = new Map(shopCoupons);
        newShopCoupons.set(coupon.storeId, coupon);
        setShopCoupons(newShopCoupons);
      } else {
        setPlatformDiscount(discountAmount);
        setPlatformCoupon(coupon);
      }
      
      setCouponCode(coupon.code);
      console.log(`✅ Discount from API: ${discountAmount} for coupon ${coupon.code}`);
    } catch (error: any) {
      console.log(`⚠️ API error for coupon ${coupon.code}:`, error.response?.status || error.message);
      // ถ้า API error ให้คำนวณส่วนลดจาก coupon object โดยตรง
      let calculatedDiscount = 0;
      
      if (coupon.discountAmount && coupon.discountAmount > 0) {
        // ลดเป็นบาท
        calculatedDiscount = coupon.discountAmount;
      } else if (coupon.discountPercent && coupon.discountPercent > 0) {
        // ลดเป็นเปอร์เซ็นต์
        calculatedDiscount = (totalPrice * coupon.discountPercent) / 100;
        
        // ถ้ามีเพดานส่วนลดสูงสุด (Max Discount)
        if (coupon.maxDiscount && coupon.maxDiscount > 0 && calculatedDiscount > coupon.maxDiscount) {
          calculatedDiscount = coupon.maxDiscount;
        }
      }
      
      // ใช้ส่วนลดที่คำนวณได้
      if (calculatedDiscount > 0) {
        // กำหนดส่วนลดตามประเภทคูปอง
        if (coupon.type === 'SHIPPING') {
          setShippingDiscount(calculatedDiscount);
          setShippingCoupon(coupon);
        } else if (coupon.storeId) {
          const newShopDiscounts = new Map(shopDiscounts);
          newShopDiscounts.set(coupon.storeId, calculatedDiscount);
          setShopDiscounts(newShopDiscounts);
          const newShopCoupons = new Map(shopCoupons);
          newShopCoupons.set(coupon.storeId, coupon);
          setShopCoupons(newShopCoupons);
        } else {
          setPlatformDiscount(calculatedDiscount);
          setPlatformCoupon(coupon);
        }
        setCouponCode(coupon.code);
        console.log(`✅ Calculated discount from coupon: ${calculatedDiscount} (fallback mode)`);
      } else {
        console.log('⚠️ Calculated discount is 0, resetting');
        // Reset discount ตามประเภทคูปอง
        if (coupon.type === 'SHIPPING') {
          setShippingDiscount(0);
          setShippingCoupon(null);
        } else if (coupon.storeId) {
          const newShopDiscounts = new Map(shopDiscounts);
          newShopDiscounts.delete(coupon.storeId);
          setShopDiscounts(newShopDiscounts);
          const newShopCoupons = new Map(shopCoupons);
          newShopCoupons.delete(coupon.storeId);
          setShopCoupons(newShopCoupons);
        } else {
          setPlatformDiscount(0);
          setPlatformCoupon(null);
        }
      }
    }
  };

  // ฟังก์ชันเช็คคูปอง
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกรหัสคูปอง');
      return;
    }

    try {
      setLoading(true);
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const response = await client.post('/coupons/apply', {
        code: couponCode.trim().toUpperCase(),
        cartTotal: totalPrice,
      });

      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const responseData = response?.data || response || {};
      const { discountAmount } = responseData;
      
      // TODO: ต้องดึงข้อมูลคูปองมาเพื่อรู้ว่าเป็น Platform หรือ Shop
      // สำหรับตอนนี้ให้ใช้เป็น Platform Voucher
      setPlatformDiscount(discountAmount);
      Alert.alert('สำเร็จ', `ใช้โค้ดส่วนลดลดไป ฿${discountAmount.toLocaleString()}`);
    } catch (error: any) {
      setPlatformDiscount(0);
      setPlatformCoupon(null);
      const msg = error.response?.data?.message || 'โค้ดไม่ถูกต้อง';
      Alert.alert('ใช้โค้ดไม่ได้', msg);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันเตรียม Payment Sheet
  const initializePaymentSheet = async (amount: number) => {
    try {
      // 1. ขอ clientSecret จาก Backend
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const response = await client.post('/payments/intent', { amount });
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const responseData = response?.data || response || {};
      const { clientSecret } = responseData;

      if (!clientSecret) {
        console.error('No clientSecret received from backend');
        return false;
      }

      // 2. ตั้งค่า Payment Sheet — ใช้ Linking.createURL เพื่อให้ redirect กลับเข้าแอปได้ทั้ง Expo Go และ standalone
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'BoxiFY',
        returnURL: Linking.createURL('stripe-redirect'),
        defaultBillingDetails: user ? { name: user.name || '' } : undefined,
      });

      if (error) {
        console.log('Stripe Error:', error);
        Alert.alert('Error', `ไม่สามารถเตรียมระบบชำระเงินได้: ${error.message}`);
        return false;
      }
      return true;

    } catch (error: any) {
      console.error('Initialize Payment Sheet Error:', error);
      const msg = error?.response?.data?.message;
      const text = typeof msg === 'string' ? msg : 'ระบบชำระเงินขัดข้อง กรุณาลองใหม่';
      Alert.alert('ข้อผิดพลาด', text);
      return false;
    }
  };

  const handlePlaceOrder = async () => {
    // 1. Validate ที่อยู่
    if (!selectedAddress) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกที่อยู่จัดส่ง', [
        { text: 'ตกลง', onPress: () => navigation.navigate('AddressList', { mode: 'select' }) }
      ]);
      return;
    }

    // 2. Validate ตะกร้า
    if (!cart || !cart.items || cart.items.length === 0) {
      Alert.alert('แจ้งเตือน', 'ตะกร้าสินค้าว่างเปล่า');
      return;
    }
    
    console.log('✅ Placing order with:', {
      hasAddress: !!selectedAddress,
      hasCart: !!cart,
      itemsCount: cart?.items?.length || 0,
      paymentMethod,
      totalDiscount,
      couponCode: selectedCoupon?.code || couponCode,
      grandTotal: GRAND_TOTAL,
    });

    setLoading(true);

    // ✅ ถ้าเป็น COD (ชำระปลายทาง) ไม่ต้องผ่าน Stripe
    if (paymentMethod === 'COD') {
      try {
        // เตรียมข้อมูลส่ง Backend
        const fullAddress = `${selectedAddress.name} (${selectedAddress.addressLine} ${selectedAddress.subDistrict} ${selectedAddress.district} ${selectedAddress.province} ${selectedAddress.postalCode})`;
        
        // สร้างออเดอร์โดยตรง (ไม่ต้องชำระเงิน)
        const createdOrder = await orderService.createOrder({
          shippingAddress: fullAddress,
          shippingPhone: selectedAddress.phone,
          couponCode: totalDiscount > 0 && selectedCoupon ? selectedCoupon.code : (totalDiscount > 0 ? couponCode.trim().toUpperCase() : undefined),
          paymentMethod: 'COD',
        });

        // Refresh ตะกร้า
        await refreshCart();

        // ✅ Reset stack → [MainTabs, OrderDetail] เพื่อกันย้อนกลับมาหน้า Checkout
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              {
                name: 'OrderDetail',
                params: {
                  orderId: createdOrder.id,
                  fromPayment: true,
                },
              },
            ],
          }),
        );

      } catch (err: any) {
        console.error('Create order error:', err);
        const backendMessage = err?.response?.data?.message;
        const message =
          typeof backendMessage === 'string'
            ? backendMessage
            : 'ไม่สามารถสร้างออเดอร์ได้ กรุณาลองใหม่อีกครั้ง';
        Alert.alert('ไม่สามารถสร้างออเดอร์', message);
      } finally {
        setLoading(false);
      }
      return; // ✅ ออกจากฟังก์ชัน
    }

    // ✅ ถ้าเป็น BANK_TRANSFER (โอนเงินธนาคาร) สร้างออเดอร์แล้วเด้งไปหน้าอัปโหลดสลิป
    if (paymentMethod === 'BANK_TRANSFER') {
      try {
        // เตรียมข้อมูลส่ง Backend
        const fullAddress = `${selectedAddress.name} (${selectedAddress.addressLine} ${selectedAddress.subDistrict} ${selectedAddress.district} ${selectedAddress.province} ${selectedAddress.postalCode})`;
        
        // สร้างออเดอร์ (สถานะ PENDING รออัปโหลดสลิป)
        const order = await orderService.createOrder({
          shippingAddress: fullAddress,
          shippingPhone: selectedAddress.phone,
          couponCode: totalDiscount > 0 && selectedCoupon ? selectedCoupon.code : (totalDiscount > 0 ? couponCode.trim().toUpperCase() : undefined),
          paymentMethod: 'BANK_TRANSFER',
        });

        // Refresh ตะกร้า
        await refreshCart();

        // ✅ Reset stack → [MainTabs, BankTransfer] กันย้อนกลับไป Checkout
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              {
                name: 'BankTransfer',
                params: {
                  orderId: order.id,
                  totalAmount: GRAND_TOTAL,
                },
              },
            ],
          }),
        );

      } catch (err: any) {
        console.error('Create order error:', err);
        const backendMessage = err?.response?.data?.message;
        const message =
          typeof backendMessage === 'string'
            ? backendMessage
            : 'ไม่สามารถสร้างออเดอร์ได้ กรุณาลองใหม่อีกครั้ง';
        Alert.alert('ไม่สามารถสร้างออเดอร์', message);
      } finally {
        setLoading(false);
      }
      return; // ✅ ออกจากฟังก์ชัน
    }

    // ✅ ถ้าเป็น PROMPTPAY (QR Code) สร้างออเดอร์แล้วเด้งไปหน้า QR Code
    if (paymentMethod === 'PROMPTPAY') {
      try {
        // เตรียมข้อมูลส่ง Backend
        const fullAddress = `${selectedAddress.name} (${selectedAddress.addressLine} ${selectedAddress.subDistrict} ${selectedAddress.district} ${selectedAddress.province} ${selectedAddress.postalCode})`;
        
        // สร้างออเดอร์ (สถานะ PENDING รอชำระเงิน)
        const order = await orderService.createOrder({
          shippingAddress: fullAddress,
          shippingPhone: selectedAddress.phone,
          couponCode: totalDiscount > 0 && selectedCoupon ? selectedCoupon.code : (totalDiscount > 0 ? couponCode.trim().toUpperCase() : undefined),
          paymentMethod: 'PROMPTPAY',
        });

        // Refresh ตะกร้า
        await refreshCart();

        // ✅ Reset stack → [MainTabs, PromptPay] กันย้อนกลับไป Checkout
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              {
                name: 'PromptPay',
                params: {
                  orderId: order.id,
                  totalAmount: GRAND_TOTAL,
                  paymentExpiredAt: order.paymentExpiredAt || undefined,
                },
              },
            ],
          }),
        );

      } catch (err: any) {
        console.error('Create order error:', err);
        const backendMessage = err?.response?.data?.message;
        const message =
          typeof backendMessage === 'string'
            ? backendMessage
            : 'ไม่สามารถสร้างออเดอร์ได้ กรุณาลองใหม่อีกครั้ง';
        Alert.alert('ไม่สามารถสร้างออเดอร์', message);
      } finally {
        setLoading(false);
      }
      return; // ✅ ออกจากฟังก์ชัน
    }

    // ✅ ถ้าเป็น STRIPE (ชำระผ่านบัตร) ให้ทำตามเดิม
    // STEP 1: เตรียมระบบจ่ายเงิน
    const isReady = await initializePaymentSheet(GRAND_TOTAL);
    if (!isReady) {
      setLoading(false);
      return;
    }

    // STEP 2: เปิดหน้าต่างจ่ายเงิน (Popup)
    const { error } = await presentPaymentSheet();

    if (error) {
      // User กดปิด หรือจ่ายไม่ผ่าน
      setLoading(false);
      if (error.code !== 'Canceled') {
        const rawMsg = error.message || '';
        const isApiKeyError = /API key|api key|Authorization.*Bearer/i.test(rawMsg);
        const message = isApiKeyError
          ? 'ระบบชำระเงินยังตั้งค่าไม่ครบ — กรุณาตรวจสอบว่า Backend มี STRIPE_SECRET_KEY ใน .env และ restart Backend'
          : rawMsg;
        Alert.alert('การชำระเงินล้มเหลว', message);
      }
      // ถ้า user cancel ไม่ต้องแสดง error
    } else {
      // STEP 3: จ่ายเงินสำเร็จ -> สร้างออเดอร์ลง Database
      try {
        // 3. เตรียมข้อมูลส่ง Backend (รวม Address field เป็น string เดียวตามที่ Backend ต้องการ)
        const fullAddress = `${selectedAddress.name} (${selectedAddress.addressLine} ${selectedAddress.subDistrict} ${selectedAddress.district} ${selectedAddress.province} ${selectedAddress.postalCode})`;
        
        // 4. ยิง API สร้างออเดอร์
        const createdOrder = await orderService.createOrder({
          shippingAddress: fullAddress,
          shippingPhone: selectedAddress.phone,
          couponCode: totalDiscount > 0 && selectedCoupon ? selectedCoupon.code : (totalDiscount > 0 ? couponCode.trim().toUpperCase() : undefined),
          paymentMethod: 'STRIPE',
        });

        // 5. Refresh ตะกร้า (เพราะ Backend ลบของในตะกร้าแล้ว Frontend ต้องอัปเดตตาม)
        await refreshCart();

        // 6. Reset stack → [MainTabs, OrderDetail] เพื่อให้ back flow ถูกต้อง
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              {
                name: 'OrderDetail',
                params: {
                  orderId: createdOrder.id,
                  fromPayment: true,
                },
              },
            ],
          }),
        );

      } catch (err: any) {
        console.error('Create order error:', err);
        const backendMessage = err?.response?.data?.message;
        const message =
          typeof backendMessage === 'string'
            ? backendMessage
            : 'ตัดเงินแล้ว แต่สร้างออเดอร์ไม่สำเร็จ กรุณาติดต่อแอดมิน';
        Alert.alert('สร้างออเดอร์ไม่สำเร็จ', message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="ทำการสั่งซื้อ" />

      <ScrollView style={styles.content}>
        <TouchableOpacity 
          style={[styles.section, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('AddressList', { mode: 'select' })}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="location-sharp" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>ที่อยู่ในการจัดส่ง</Text>
          </View>
          
          {selectedAddress ? (
            <View style={styles.addressInfo}>
              <Text style={[styles.addressName, { color: colors.text }]}>{selectedAddress.name} | {selectedAddress.phone}</Text>
              <Text style={[styles.addressText, { color: colors.subText }]} numberOfLines={2}>
                {selectedAddress.addressLine}, {selectedAddress.subDistrict}, {selectedAddress.district}, {selectedAddress.province} {selectedAddress.postalCode}
              </Text>
            </View>
          ) : (
            <Text style={[styles.placeholderText, { color: colors.primary }]}>กรุณาเลือกที่อยู่จัดส่ง</Text>
          )}
          
          <Ionicons name="chevron-forward" size={20} color={colors.border} style={styles.arrowIcon} />
        </TouchableOpacity>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>รายการสินค้า ({itemCount} ชิ้น)</Text>
          {cart?.items.map((item) => {
            // ✅ ใช้ราคาจาก variant (ถ้ามี) หรือ product.price
            const itemPrice = item.variant?.price
              ? Number(item.variant.price)
              : item.product.discountPrice || item.product.price || 0;
            const variantName = item.variant?.name || null;
            
            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                    {item.count}x {item.product.title}
                  </Text>
                  {/* ✅ แสดงตัวเลือกสินค้า (variant) */}
                  {variantName && (
                    <Text style={[styles.itemVariant, { color: colors.subText }]} numberOfLines={1}>
                      ตัวเลือก: {variantName}
                    </Text>
                  )}
                </View>
                <Text style={[styles.itemPrice, { color: colors.text }]}>
                  ฿{(itemPrice * item.count).toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>โค้ดส่วนลด</Text>
          
          {/* ปุ่มเลือกคูปองที่เก็บไว้ */}
          {myCoupons.length > 0 ? (
            <TouchableOpacity
              style={[styles.selectCouponButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => navigation.navigate('SelectCoupon')}
            >
              <Ionicons name="ticket-outline" size={20} color={colors.primary} />
              <Text style={[styles.selectCouponText, { color: colors.text }]}>
                เลือกคูปองที่เก็บไว้ ({myCoupons.length} คูปอง)
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.border} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.selectCouponButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => navigation.navigate('CouponsScreen')}
            >
              <Ionicons name="ticket-outline" size={20} color={colors.primary} />
              <Text style={[styles.selectCouponText, { color: colors.text }]}>
                ไปเก็บคูปอง
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.border} />
            </TouchableOpacity>
          )}

          <View style={styles.couponRow}>
            <TextInput
              style={[styles.couponInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder={myCoupons.length > 0 ? "หรือกรอกรหัสคูปอง" : "ใส่รหัสคูปอง"}
              placeholderTextColor={colors.subText}
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }, loading && styles.disabledButton]}
              onPress={handleApplyCoupon}
              disabled={loading || !couponCode.trim()}
            >
              <Text style={styles.applyText}>ใช้โค้ด</Text>
            </TouchableOpacity>
          </View>
          {totalDiscount > 0 && (
            <View style={styles.couponAppliedContainer}>
              <Text style={[styles.couponAppliedText, { color: '#4CAF50' }]}>
                ✓ ใช้คูปองลดไป ฿{totalDiscount.toLocaleString()}
                {platformCoupon && ` (Platform: ${platformCoupon.code})`}
                {Array.from(shopCoupons.values()).length > 0 && ` (Shop: ${Array.from(shopCoupons.values()).map(c => c.code).join(', ')})`}
                {shippingCoupon && ` (Shipping: ${shippingCoupon.code})`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  selectCoupon(null);
                  setCouponCode('');
                  setPlatformDiscount(0);
                  setPlatformCoupon(null);
                  setShopDiscounts(new Map());
                  setShopCoupons(new Map());
                  setShippingDiscount(0);
                  setShippingCoupon(null);
                }}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>วิธีการชำระเงิน</Text>
          
          {/* ✅ ตัวเลือกชำระผ่านบัตร */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              { 
                backgroundColor: paymentMethod === 'STRIPE' ? colors.primary + '20' : 'transparent',
                borderColor: paymentMethod === 'STRIPE' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setPaymentMethod('STRIPE')}
          >
            <View style={styles.paymentRow}>
              <Ionicons 
                name={paymentMethod === 'STRIPE' ? 'radio-button-on' : 'radio-button-off'} 
                size={24} 
                color={paymentMethod === 'STRIPE' ? colors.primary : colors.subText} 
              />
              <Ionicons name="card-outline" size={24} color="#635BFF" style={{ marginLeft: 8 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.paymentText, { color: colors.text }]}>บัตรเครดิต/เดบิต (Stripe)</Text>
                <Text style={[styles.paymentNote, { color: colors.subText, fontSize: 12, marginTop: 2 }]}>
                  ชำระเงินทันทีผ่านบัตร
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* ✅ ตัวเลือก PromptPay QR */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              { 
                backgroundColor: paymentMethod === 'PROMPTPAY' ? colors.primary + '20' : 'transparent',
                borderColor: paymentMethod === 'PROMPTPAY' ? colors.primary : colors.border,
                marginTop: 10,
              }
            ]}
            onPress={() => setPaymentMethod('PROMPTPAY')}
          >
            <View style={styles.paymentRow}>
              <Ionicons 
                name={paymentMethod === 'PROMPTPAY' ? 'radio-button-on' : 'radio-button-off'} 
                size={24} 
                color={paymentMethod === 'PROMPTPAY' ? colors.primary : colors.subText} 
              />
              <Ionicons name="qr-code-outline" size={24} color="#003D6B" style={{ marginLeft: 8 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.paymentText, { color: colors.text }]}>QR PromptPay</Text>
                <Text style={[styles.paymentNote, { color: colors.subText, fontSize: 12, marginTop: 2 }]}>
                  สแกน QR Code ชำระเงินทันที
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* ✅ ตัวเลือกโอนเงินธนาคาร */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              { 
                backgroundColor: paymentMethod === 'BANK_TRANSFER' ? colors.primary + '20' : 'transparent',
                borderColor: paymentMethod === 'BANK_TRANSFER' ? colors.primary : colors.border,
                marginTop: 10,
              }
            ]}
            onPress={() => setPaymentMethod('BANK_TRANSFER')}
          >
            <View style={styles.paymentRow}>
              <Ionicons 
                name={paymentMethod === 'BANK_TRANSFER' ? 'radio-button-on' : 'radio-button-off'} 
                size={24} 
                color={paymentMethod === 'BANK_TRANSFER' ? colors.primary : colors.subText} 
              />
              <Ionicons name="card-outline" size={24} color="#FF9800" style={{ marginLeft: 8 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.paymentText, { color: colors.text }]}>โอนเงินธนาคาร</Text>
                <Text style={[styles.paymentNote, { color: colors.subText, fontSize: 12, marginTop: 2 }]}>
                  โอนเงินและแนบสลิป
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* ✅ ตัวเลือกชำระปลายทาง */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              { 
                backgroundColor: paymentMethod === 'COD' ? colors.primary + '20' : 'transparent',
                borderColor: paymentMethod === 'COD' ? colors.primary : colors.border,
                marginTop: 10,
              }
            ]}
            onPress={() => setPaymentMethod('COD')}
          >
            <View style={styles.paymentRow}>
              <Ionicons 
                name={paymentMethod === 'COD' ? 'radio-button-on' : 'radio-button-off'} 
                size={24} 
                color={paymentMethod === 'COD' ? colors.primary : colors.subText} 
              />
              <Ionicons name="cash-outline" size={24} color="#4CAF50" style={{ marginLeft: 8 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.paymentText, { color: colors.text }]}>ชำระปลายทาง (COD)</Text>
                <Text style={[styles.paymentNote, { color: colors.subText, fontSize: 12, marginTop: 2 }]}>
                  ชำระเงินเมื่อได้รับสินค้า
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>ยอดรวมสินค้า</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>฿{totalPrice.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>ค่าจัดส่ง</Text>
            {isFreeShipping ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      textDecorationLine: 'line-through',
                      marginRight: 5,
                      color: colors.subText,
                    },
                  ]}
                >
                  ฿40
                </Text>
                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                  ฟรี
                </Text>
              </View>
            ) : (
              <Text style={[styles.summaryValue, { color: colors.text }]}>฿{shippingCost}</Text>
            )}
          </View>

          {totalDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#4CAF50' }]}>ส่วนลด</Text>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                -฿{totalDiscount.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>ยอดรวมทั้งสิ้น</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>฿{GRAND_TOTAL.toLocaleString()}</Text>
          </View>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.footerTotal}>
          <Text style={[styles.footerLabel, { color: colors.subText }]}>ยอดรวมที่ต้องชำระ</Text>
          <Text style={[styles.footerPrice, { color: colors.primary }]}>฿{GRAND_TOTAL.toLocaleString()}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.checkoutButton, { backgroundColor: colors.primary }, (loading || !selectedAddress || !cart || !cart.items || cart.items.length === 0) && styles.disabledButton]} 
          onPress={handlePlaceOrder}
          disabled={loading || !selectedAddress || !cart || !cart.items || cart.items.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkoutButtonText}>
              {!selectedAddress ? 'กรุณาเลือกที่อยู่' : 
               !cart || !cart.items || cart.items.length === 0 ? 'ตะกร้าว่าง' : 
               'สั่งซื้อสินค้า'}
            </Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  section: {
    marginBottom: 10,
    padding: 15,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  addressInfo: { marginLeft: 28, marginRight: 20 },
  addressName: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  addressText: { fontSize: 13, lineHeight: 20 },
  placeholderText: { marginLeft: 28 },
  arrowIcon: { position: 'absolute', right: 15, top: 15 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  itemInfo: { flex: 1, marginRight: 10 },
  itemName: { fontSize: 14 },
  itemVariant: { fontSize: 12, marginTop: 2 },
  itemPrice: { fontSize: 14 },
  paymentOption: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    marginTop: 5,
  },
  paymentRow: { flexDirection: 'row', alignItems: 'center' },
  paymentText: { fontSize: 14, fontWeight: '500' },
  paymentNote: { fontSize: 12 },
  selectCouponButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    gap: 8,
  },
  selectCouponText: {
    flex: 1,
    fontSize: 14,
  },
  couponRow: { flexDirection: 'row', marginTop: 10 },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
  },
  applyBtn: {
    marginLeft: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  applyText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  couponAppliedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  couponAppliedText: {
    fontSize: 12,
    flex: 1,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14 },
  totalRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 5 },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 18, fontWeight: 'bold' },
  footer: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  footerTotal: { justifyContent: 'center' },
  footerLabel: { fontSize: 12 },
  footerPrice: { fontSize: 18, fontWeight: 'bold' },
  checkoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 4,
    minWidth: 150,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.6 },
  checkoutButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

