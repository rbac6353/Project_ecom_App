import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Image as RNImage,
  Platform,
  Linking,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
// ✅ ใช้ Backend API แทน promptpay-qr library (เพราะ library อาจไม่รองรับ React Native)
import { Ionicons } from '@expo/vector-icons';
import { Clipboard } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useTheme } from '@app/providers/ThemeContext';
import PaymentTimer from '@shared/components/order/PaymentTimer';
import * as orderService from '@app/services/orderService';

type PromptPayRouteProp = RouteProp<
  {
    params: {
      orderId: number;
      totalAmount: number;
      paymentExpiredAt?: string;
    };
  },
  'params'
>;

export default function PromptPayScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<PromptPayRouteProp>();
  const { colors } = useTheme();
  const { orderId, totalAmount, paymentExpiredAt } = route.params;
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(true); // ✅ สถานะการ polling
  const svgRef = useRef<any>(null);

  useEffect(() => {
    // ✅ ใช้ Backend API เพื่อสร้าง PromptPay QR Code payload
    const fetchQRPayload = async () => {
      try {
        // ⚠️ หมายเหตุ: 
        // 1. Backend TransformInterceptor wrap response เป็น { success: true, data: {...}, timestamp: '...' }
        // 2. Frontend API client interceptor จะ unwrap และ return response.data
        // 3. ดังนั้น response ที่ได้คือ { success: true, payload: "...", qrCode: "...", amount: 1000 }
        const response: any = await client.get(`/payments/qr-code?amount=${totalAmount}`);

        console.log('✅ QR Code API Response:', JSON.stringify(response, null, 2)); // Debug log

        // ตรวจสอบ response structure
        let payload: string | null = null;

        if (typeof response === 'string') {
          // ถ้า response เป็น string โดยตรง (ไม่น่าจะเกิด)
          payload = response;
        } else if (response?.payload) {
          // ✅ กรณีปกติ: response.payload (หลัง unwrap จาก interceptor)
          payload = response.payload;
        } else if (response?.data?.payload) {
          // Fallback: ถ้ายังมี data wrapper อยู่
          payload = response.data.payload;
        } else if (response?.data && typeof response.data === 'object') {
          // ถ้า response.data เป็น object แต่ไม่มี payload
          console.warn('⚠️ Response has data but no payload:', response.data);
        }

        if (payload && typeof payload === 'string' && payload.length > 0) {
          console.log('✅ Setting QR Code payload:', payload.substring(0, 50) + '...');
          setQrCodeValue(payload);
        } else {
          console.error('❌ Unexpected response structure:', JSON.stringify(response, null, 2));
          throw new Error(`No QR payload from backend. Response: ${JSON.stringify(response)}`);
        }
      } catch (error: any) {
        console.error('❌ Error fetching QR payload from backend:', error);
        console.error('Error details:', {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
          config: error?.config?.url,
        });

        // แสดง error message ที่ชัดเจนขึ้น
        let errorMessage = 'ไม่สามารถสร้าง QR Code ได้';
        if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.response?.status === 401) {
          errorMessage = 'กรุณาเข้าสู่ระบบก่อน';
        } else if (error?.response?.status === 400) {
          errorMessage = 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
        }

        Alert.alert('ผิดพลาด', errorMessage);
      }
    };

    fetchQRPayload();
  }, [totalAmount]);

  // ✅ Polling Mechanism: ตรวจสอบสถานะออเดอร์อัตโนมัติทุก 3 วินาที
  useEffect(() => {
    if (!orderId) {
      return;
    }

    console.log('🔄 [Polling] Starting order status polling for order #' + orderId);

    const interval = setInterval(async () => {
      try {
        console.log('🔄 [Polling] Checking order status for order #' + orderId);

        // เรียก API เพื่อตรวจสอบสถานะออเดอร์
        const orderData = await orderService.getOrderDetail(orderId);

        // ตรวจสอบ orderStatus จาก response
        // Backend จะ return order object ที่มี orderStatus field
        const orderStatus = orderData?.orderStatus || orderData?.status;

        console.log('🔄 [Polling] Order #' + orderId + ' status:', orderStatus);

        // ✅ Condition: ถ้า orderStatus ไม่ใช่ 'PENDING' หรือ 'VERIFYING' แสดงว่าชำระเงินแล้ว
        // Status ที่ถือว่า "ชำระเงินแล้ว": PENDING_CONFIRMATION, PROCESSING, SHIPPED, DELIVERED
        // Status ที่ยัง "รอชำระเงิน": PENDING, VERIFYING
        if (
          orderStatus &&
          orderStatus !== 'PENDING' &&
          orderStatus !== 'VERIFYING'
        ) {
          console.log('✅ [Polling] Payment confirmed! Order status:', orderStatus);

          // Clear interval และหยุด polling
          clearInterval(interval);
          setIsPolling(false);

          // Navigate ไปหน้า OrderDetail
          Alert.alert(
            'สำเร็จ',
            'ชำระเงินเรียบร้อยแล้ว',
            [
              {
                text: 'ตกลง',
                onPress: () => {
                  navigation.replace('OrderDetail', { orderId });
                },
              },
            ],
            { cancelable: false } // ไม่ให้กดนอก Alert เพื่อปิด
          );
        }
      } catch (error: any) {
        // ✅ Handle Throttling Error (429 Too Many Requests)
        if (error?.response?.status === 429 || error?.message?.includes('ThrottlerException')) {
          console.log('⚠️ [Polling] Rate limit exceeded, will retry after delay');
          // ไม่ต้องทำอะไร เพียงแค่รอรอบถัดไป (interval จะทำงานต่อ)
          // หรืออาจจะเพิ่ม delay ก่อน retry
          return;
        }

        console.log('⚠️ [Polling] Error checking order status:', error?.message || error);
        // ไม่แสดง Alert เมื่อ polling error เพื่อไม่รบกวนผู้ใช้
        // Polling จะลองใหม่ในรอบถัดไป
      }
    }, 5000); // ✅ เปลี่ยนเป็น 5 วินาที (5000ms) เพื่อลด Rate Limit

    // ✅ Cleanup: Clear interval เมื่อ component unmount
    return () => {
      console.log('🔄 [Polling] Stopping order status polling for order #' + orderId);
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [orderId, navigation]);

  // เลือกรูปสลิป
  const pickSlipImage = async () => {
    try {
      console.log('📸 [pickSlipImage] Starting image picker...');

      // ขอ permission
      console.log('📸 [pickSlipImage] Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📸 [pickSlipImage] Permission status:', status);

      if (status !== 'granted') {
        console.warn('📸 [pickSlipImage] Permission denied');
        Alert.alert(
          'ต้องการสิทธิ์',
          'แอปต้องการสิทธิ์ในการเข้าถึงรูปภาพเพื่ออัปโหลดสลิป กรุณาเปิดสิทธิ์ใน Settings',
          [
            { text: 'ยกเลิก', style: 'cancel' },
            {
              text: 'ไปที่ Settings',
              onPress: () => {
                // เปิด Settings ของอุปกรณ์
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return;
      }

      console.log('📸 [pickSlipImage] Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // ✅ SDK 53+ format
        allowsEditing: true, // ✅ ให้ crop ได้ (optional)
        quality: 0.7, // ✅ ลดคุณภาพเหลือ 70% เพื่อลดขนาดไฟล์และเพิ่มความเร็วในการอัปโหลด
      });

      console.log('📸 [pickSlipImage] Image picker result:', {
        canceled: result.canceled,
        assetsCount: result.assets?.length || 0,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📸 [pickSlipImage] Selected image:', {
          uri: asset.uri?.substring(0, 50) + '...',
          width: asset.width,
          height: asset.height,
        });

        setSlipImage(asset.uri);

        // คำนวณ aspect ratio จากภาพ
        if (asset.width && asset.height) {
          const ratio = asset.width / asset.height;
          console.log('📸 [pickSlipImage] Aspect ratio:', ratio);
          setImageAspectRatio(ratio);
        } else {
          // ถ้าไม่มี width/height จาก asset ให้ใช้ Image.getSize()
          console.log('📸 [pickSlipImage] Getting image size...');
          RNImage.getSize(asset.uri, (width, height) => {
            const ratio = width / height;
            console.log('📸 [pickSlipImage] Image size:', { width, height, ratio });
            setImageAspectRatio(ratio);
          }, (error) => {
            console.error('❌ [pickSlipImage] Error getting image size:', error);
            setImageAspectRatio(null);
          });
        }
      } else {
        console.log('📸 [pickSlipImage] User canceled image selection');
      }
    } catch (error: any) {
      console.error('❌ [pickSlipImage] Error:', error);
      Alert.alert(
        'เกิดข้อผิดพลาด',
        `ไม่สามารถเปิดแกลเลอรีได้: ${error.message || 'Unknown error'}`,
        [{ text: 'ตกลง' }]
      );
    }
  };

  // อัปโหลดสลิปและตรวจสอบอัตโนมัติ
  const handleUploadSlip = async () => {
    if (!slipImage) {
      Alert.alert('แจ้งเตือน', 'กรุณาแนบหลักฐานการโอนเงิน');
      return;
    }

    try {
      setUploading(true);

      // สร้าง FormData
      const formData = new FormData();
      const filename = slipImage.split('/').pop();
      const match = /\.(\w+)$/.exec(filename as string);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // @ts-ignore
      formData.append('file', {
        uri: slipImage,
        name: filename || 'slip.jpg',
        type,
      });

      // ส่งไปยัง Backend Endpoint /orders/${orderId}/slip
      // Backend จะตรวจสอบสลิปอัตโนมัติผ่าน EasySlip API
      const response = await client.post(`/orders/${orderId}/slip`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Handle Success Response
      // Backend จะ return message: 'ตรวจสอบสลิปสำเร็จ ชำระเงินเรียบร้อย'
      const responseData = response?.data || response || {};
      const message = responseData?.message || 'ตรวจสอบสลิปสำเร็จ ชำระเงินเรียบร้อย';

      Alert.alert('สำเร็จ', message, [
        {
          text: 'ตกลง',
          onPress: () => {
            // Navigate ไปหน้า OrderDetail หรือ OrderSuccess
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'OrderDetail',
                  params: { orderId },
                },
              ],
            });
          },
        },
      ]);
    } catch (error: any) {
      // ✅ แปลง error message เป็นข้อความที่เข้าใจง่าย
      let errorMessage = 'ตรวจสอบสลิปไม่ผ่าน กรุณาตรวจสอบสลิปอีกครั้ง';

      if (error.response?.status === 400) {
        const backendMessage = error.response?.data?.message || '';

        // ตรวจสอบ error message จาก backend
        if (backendMessage.includes('เคยถูกใช้') || backendMessage.includes('duplicate') || backendMessage.includes('สลิปซ้ำ')) {
          errorMessage = 'สลิปนี้เคยถูกใช้ในออเดอร์อื่นแล้ว กรุณาใช้สลิปใหม่';
        } else if (backendMessage.includes('less than order total') || backendMessage.includes('ยอดเงินไม่ถูกต้อง')) {
          errorMessage = 'ยอดเงินไม่ถูกต้อง กรุณาตรวจสอบยอดเงินอีกครั้ง';
        } else if (backendMessage.includes('Unable to extract amount') || backendMessage.includes('ไม่สามารถอ่านยอดเงิน')) {
          errorMessage = 'ไม่สามารถอ่านยอดเงินจากสลิปได้ กรุณาตรวจสอบสลิปอีกครั้ง';
        } else if (backendMessage.includes('verification failed') || backendMessage.includes('ตรวจสอบไม่ผ่าน')) {
          errorMessage = 'ไม่สามารถตรวจสอบสลิปได้ กรุณาตรวจสอบสลิปอีกครั้ง';
        } else if (backendMessage.includes('EasySlip API error')) {
          errorMessage = 'ไม่สามารถตรวจสอบสลิปได้ กรุณาลองใหม่อีกครั้ง';
        } else if (backendMessage.trim() !== '') {
          // ถ้ามี message จาก backend ให้ใช้ message นั้น
          errorMessage = backendMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('ตรวจสอบสลิปไม่ผ่าน', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleCopyAmount = () => {
    Clipboard.setString(totalAmount.toFixed(2));
    Alert.alert('สำเร็จ', 'คัดลอกยอดเงินแล้ว');
  };

  // ✅ Handler สำหรับปุ่มกลับ - ไปยัง OrderDetail
  const handleBack = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'OrderDetail', params: { orderId: orderId } }],
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScreenHeader title="ชำระผ่าน QR PromptPay" onBack={handleBack} />

      {/* ✅ Payment Timer - แสดงถ้ามี paymentExpiredAt */}
      {paymentExpiredAt && (
        <PaymentTimer
          expiredAt={paymentExpiredAt}
          onExpire={() => {
            Alert.alert('หมดเวลา', 'เวลาชำระเงินหมดอายุแล้ว', [
              {
                text: 'ตกลง',
                onPress: () => {
                  // เช็คว่ามีหน้าจอให้กลับไปได้หรือไม่
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    // ถ้าไม่มี ให้ navigate ไปยัง OrderDetail หรือ OrderHistory
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'OrderDetail', params: { orderId: orderId } }],
                    });
                  }
                },
              },
            ]);
          }}
        />
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.logoContainer, { backgroundColor: '#003D6B' }]}>
          <Text style={styles.logoText}>PromptPay</Text>
          <Text style={styles.logoSubtext}>ชำระเงินง่าย สะดวก รวดเร็ว</Text>
        </View>

        <View style={[styles.qrCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.shopName, { color: colors.text }]}>ร้าน BoxiFY</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.amount, { color: colors.primary }]}>
              ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </Text>
            <TouchableOpacity onPress={handleCopyAmount} style={styles.copyAmountBtn}>
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.qrWrapper, { backgroundColor: '#fff' }]}>
            {qrCodeValue ? (
              <QRCode
                value={qrCodeValue}
                size={250}
                getRef={(c) => (svgRef.current = c)}
                backgroundColor="white"
                color="black"
              />
            ) : (
              <ActivityIndicator size="large" color={colors.primary} />
            )}
          </View>

          <Text style={[styles.hint, { color: colors.subText }]}>
            สแกน QR Code เพื่อชำระเงินผ่านแอปธนาคาร
          </Text>
          <Text style={[styles.subHint, { color: colors.subText }]}>
            (KPlus, SCB Easy, Krungthai NEXT, ฯลฯ)
          </Text>

          {/* ✅ แสดงสถานะการตรวจสอบอัตโนมัติ */}
          {isPolling && (
            <View style={styles.pollingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.pollingText, { color: colors.subText }]}>
                กำลังตรวจสอบสถานะการชำระเงิน...
              </Text>
            </View>
          )}
        </View>

        {/* ข้อมูลเพิ่มเติม */}
        <View style={[styles.infoBox, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="information-circle-outline" size={20} color="#1976D2" />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoTitle, { color: '#1976D2' }]}>วิธีชำระเงิน</Text>
            <Text style={[styles.infoText, { color: '#1976D2' }]}>
              1. เปิดแอปธนาคารของคุณ{'\n'}
              2. เลือก "สแกน QR" หรือ "PromptPay"{'\n'}
              3. สแกน QR Code บนหน้าจอนี้{'\n'}
              4. ตรวจสอบยอดเงินและกดยืนยัน{'\n'}
              5. อัปโหลดสลิปการโอนเงินด้านล่าง
            </Text>
          </View>
        </View>

        {/* ส่วนอัปโหลดสลิป */}
        <View style={styles.slipSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>แนบหลักฐานการโอนเงิน</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
            อัปโหลดสลิปเพื่อตรวจสอบอัตโนมัติ
          </Text>
          <TouchableOpacity
            style={[styles.uploadBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              console.log('👆 [TouchableOpacity] Button pressed, calling pickSlipImage...');
              pickSlipImage();
            }}
            disabled={uploading}
            activeOpacity={0.7} // ✅ เพิ่ม visual feedback เมื่อกด
          >
            {slipImage ? (
              <Image
                source={{ uri: slipImage }}
                style={[
                  styles.previewImage,
                  imageAspectRatio ? { aspectRatio: imageAspectRatio } : {},
                ]}
                resizeMode="contain"
                pointerEvents="none" // ✅ ป้องกัน Image block การกด
              />
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="cloud-upload-outline" size={40} color={colors.subText} />
                <Text style={[styles.uploadHint, { color: colors.subText }]}>
                  แตะเพื่อเลือกรูปสลิป
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            { backgroundColor: colors.primary },
            (uploading || !slipImage) && styles.disabledBtn,
          ]}
          onPress={handleUploadSlip}
          disabled={uploading || !slipImage}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.confirmText}>อัปโหลดสลิปและตรวจสอบ</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  logoSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  qrCard: {
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    marginBottom: 20,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginRight: 10,
  },
  copyAmountBtn: {
    padding: 5,
  },
  qrWrapper: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  hint: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  subHint: {
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  slipSection: {
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 10,
  },
  uploadBox: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
    minHeight: 150, // ✅ เพิ่ม minHeight เพื่อให้กดง่ายขึ้น
  },
  previewImage: {
    width: '100%',
  },
  uploadHint: {
    marginTop: 10,
    fontSize: 14,
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  pollingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

