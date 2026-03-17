import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import SignatureScreen from 'react-native-signature-canvas';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import client from '@app/api/client';
import type { CourierStackParamList } from '@navigation/CourierNavigator';

type DeliveryProofRouteProp = RouteProp<
  CourierStackParamList,
  'DeliveryProof'
>;

export default function DeliveryProofScreen() {
  const route = useRoute<DeliveryProofRouteProp>();
  const navigation = useNavigation<any>();
  const { orderId, shipmentId } = route.params;

  const [image, setImage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);

  const signatureRef = useRef<any>();

  // ✅ ดึงข้อมูลออเดอร์
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoadingOrder(true);
        const res = await client.get(`/orders/${orderId}`);
        setOrderDetails(res.data);
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setLoadingOrder(false);
      }
    };
    fetchOrderDetails();
  }, [orderId]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingLocation(true);
        const { status } =
          await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'ต้องการสิทธิ์ตำแหน่ง',
            'โปรดอนุญาตการเข้าถึงตำแหน่งเพื่อยืนยันจุดส่งของ',
          );
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch (e) {
        console.warn('Location error', e);
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const pickImage = async () => {
    const { status } =
      await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'ต้องการสิทธิ์กล้อง',
        'โปรดอนุญาตการใช้กล้องเพื่อถ่ายหลักฐานการจัดส่ง',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], // ✅ SDK 53+ format
      quality: 0.6,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSignatureOK = (sig: string) => {
    setSignature(sig);
  };

  const handleClearSignature = () => {
    signatureRef.current?.clearSignature();
    setSignature(null);
  };

  const handleSubmit = async () => {
    if (!image) {
      Alert.alert('แจ้งเตือน', 'กรุณาถ่ายรูปหลักฐานการจัดส่ง');
      return;
    }
    if (!signature) {
      Alert.alert('แจ้งเตือน', 'กรุณาให้ลูกค้าเซ็นรับของ');
      return;
    }

    try {
      setSubmitting(true);

      // ✅ 1. อัปโหลดรูป proof ขึ้น Cloudinary
      const proofFormData = new FormData();
      proofFormData.append('file', {
        uri: image,
        name: `delivery-proof-${orderId}.jpg`,
        type: 'image/jpeg',
      } as any);

      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const proofUploadRes = await client.post('/users/avatar', proofFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const proofResponseData = proofUploadRes?.data || proofUploadRes || {};
      const proofUrl = proofResponseData?.url || proofResponseData?.avatar || proofResponseData?.secure_url || '';

      if (!proofUrl) {
        throw new Error('ไม่พบ URL รูปหลักฐานจากการอัปโหลด');
      }

      // ✅ 2. อัปโหลดลายเซ็นขึ้น Cloudinary (ถ้ามี)
      let signatureUrl: string | undefined;
      if (signature) {
        try {
          // แปลง base64 signature เป็น blob/file
          const signatureFormData = new FormData();
          // react-native-signature-canvas ส่งมาเป็น base64 data URI
          // แปลงเป็น file object
          const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
          signatureFormData.append('file', {
            uri: signature,
            name: `signature-${orderId}.png`,
            type: 'image/png',
          } as any);

          // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
          const signatureUploadRes = await client.post(
            '/users/avatar',
            signatureFormData,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
            },
          );
          // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
          const signatureResponseData = signatureUploadRes?.data || signatureUploadRes || {};
          signatureUrl = signatureResponseData?.url || signatureResponseData?.avatar || signatureResponseData?.secure_url || '';
        } catch (sigError) {
          console.error('Error uploading signature:', sigError);
          // ถ้าอัปโหลดลายเซ็นไม่สำเร็จ ให้ใช้ base64 string แทน
          signatureUrl = signature;
        }
      }

      // ✅ 3. เรียก API complete delivery พร้อมข้อมูลครบถ้วน
      await client.patch(`/shipments/${shipmentId}/complete`, {
        proofImage: proofUrl,
        signatureImage: signatureUrl || signature,
        location,
        collectedCod: orderDetails?.paymentMethod === 'COD' ? true : undefined,
      });

      Toast.show({
        type: 'success',
        text1: 'ส่งมอบสำเร็จ',
        text2: 'บันทึกหลักฐานการจัดส่งเรียบร้อยแล้ว',
        position: 'top',
        topOffset: 60,
        visibilityTime: 2000,
      });

      // ✅ Navigate กลับไปที่ Dashboard และ refresh ข้อมูล
      Alert.alert(
        'สำเร็จ',
        'ส่งมอบพัสดุเรียบร้อยแล้ว\nสถานะออเดอร์เปลี่ยนเป็น "จัดส่งสำเร็จ"',
        [
          {
            text: 'ตกลง',
            onPress: () => {
              // ✅ Navigate กลับไปที่ Dashboard
              // useFocusEffect จะ refresh ข้อมูลอัตโนมัติเมื่อกลับมาหน้าจอ
              navigation.goBack();
            },
          },
        ],
      );
    } catch (e: any) {
      console.error('Submit delivery proof error', e);
      Toast.show({
        type: 'error',
        text1: 'เกิดข้อผิดพลาด',
        text2: 'ไม่สามารถบันทึกหลักฐานการจัดส่งได้',
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCall = () => {
    const phone = orderDetails?.shippingPhone;
    if (!phone) {
      Alert.alert('ไม่มีเบอร์โทร', 'ไม่พบเบอร์โทรศัพท์ของลูกค้า');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigate = () => {
    const address = orderDetails?.shippingAddress;
    if (!address) {
      Alert.alert('ไม่มีที่อยู่', 'ไม่พบที่อยู่จัดส่ง');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address,
    )}`;
    Linking.openURL(url);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={styles.title}>หลักฐานการจัดส่ง (Proof of Delivery)</Text>
      <Text style={styles.subTitle}>Order #{orderId}</Text>

      {/* ✅ แสดงข้อมูลลูกค้าและปุ่มโทร/นำทาง */}
      {orderDetails && (
        <View style={styles.customerInfoBox}>
          <View style={styles.customerInfoHeader}>
            <Ionicons name="person-circle" size={24} color="#2196F3" />
            <View style={styles.customerInfoText}>
              <Text style={styles.customerName}>
                {orderDetails.orderedBy?.name || 'ลูกค้า'}
              </Text>
              {orderDetails.shippingPhone && (
                <Text style={styles.customerPhone}>
                  📞 {orderDetails.shippingPhone}
                </Text>
              )}
            </View>
          </View>
          {orderDetails.shippingAddress && (
            <View style={styles.addressRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.addressText} numberOfLines={2}>
                {orderDetails.shippingAddress}
              </Text>
            </View>
          )}
          <View style={styles.customerActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleCall}
              disabled={!orderDetails.shippingPhone}
            >
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>โทรหา</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.navigateBtn]}
              onPress={handleNavigate}
              disabled={!orderDetails.shippingAddress}
            >
              <Ionicons name="map" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>นำทาง</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.locationBox}>
        <Ionicons name="location" size={20} color="#FF5722" />
        <Text style={styles.locationText}>
          {loadingLocation
            ? 'กำลังหาพิกัด...'
            : location
              ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
              : 'ไม่ได้รับสิทธิ์เข้าถึงตำแหน่ง'}
        </Text>
      </View>

      <Text style={styles.sectionHeader}>1. รูปถ่ายพัสดุ / จุดวางของ</Text>
      <TouchableOpacity style={styles.cameraBox} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.preview} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="camera" size={40} color="#ccc" />
            <Text style={{ color: '#999', marginTop: 6 }}>
              กดเพื่อถ่ายรูปหลักฐาน
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>2. ลายเซ็นผู้รับ</Text>
      <View style={styles.signatureBox}>
        {signature ? (
          <View>
            <Image
              source={{ uri: signature }}
              style={styles.signaturePreview}
            />
            <TouchableOpacity
              style={styles.resignBtn}
              onPress={handleClearSignature}
            >
              <Text style={{ color: 'red' }}>เซ็นใหม่</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleSignatureOK}
              webStyle={`
                .m-signature-pad--footer { display: none; margin: 0; }
                .m-signature-pad { box-shadow: none; border: none; }
              `}
              backgroundColor="#fff"
              style={styles.signatureCanvas}
            />
            <TouchableOpacity
              style={styles.confirmSignBtn}
              onPress={() => signatureRef.current?.readSignature()}
            >
              <Text style={{ color: '#fff' }}>ยืนยันลายเซ็น</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>ยืนยันการส่งมอบ</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  locationText: {
    marginLeft: 6,
    color: '#E65100',
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  cameraBox: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  signatureBox: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  signatureCanvas: {
    height: 180,
    backgroundColor: '#fff',
  },
  signaturePreview: {
    width: '100%',
    height: 160,
    resizeMode: 'contain',
    backgroundColor: '#fff',
  },
  confirmSignBtn: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    alignItems: 'center',
  },
  resignBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitBtn: {
    marginTop: 4,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  customerInfoBox: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  customerInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    marginLeft: 8,
    lineHeight: 18,
  },
  customerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  navigateBtn: {
    backgroundColor: '#4285F4',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

