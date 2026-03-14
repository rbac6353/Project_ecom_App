import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image as RNImage,
  Platform,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Clipboard } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useTheme } from '@app/providers/ThemeContext';
import * as orderService from '@app/services/orderService';

type BankTransferRouteProp = RouteProp<
  {
    params: {
      orderId: number;
      totalAmount: number;
    };
  },
  'params'
>;

export default function BankTransferScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<BankTransferRouteProp>();
  const { colors } = useTheme();
  const { orderId, totalAmount } = route.params;
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  // Mock Data ธนาคาร
  const bankInfo = {
    name: 'ธนาคารกสิกรไทย (KBank)',
    accountName: 'บจก. จีทีเอ็กซ์ ช็อป',
    accountNumber: '0820844920',
    logo: 'https://cdn-icons-png.flaticon.com/512/2534/2534199.png', // รูปไอคอนธนาคาร
  };

  const pickImage = async () => {
    try {
      console.log('📸 [pickImage] Starting image picker...');

      // ขอ permission
      console.log('📸 [pickImage] Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📸 [pickImage] Permission status:', status);

      if (status !== 'granted') {
        console.warn('📸 [pickImage] Permission denied');
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

      console.log('📸 [pickImage] Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // ✅ SDK 53+ format
        allowsEditing: true, // ✅ ให้ crop ได้ (optional)
        quality: 0.7, // ✅ ลดคุณภาพเหลือ 70% เพื่อลดขนาดไฟล์และเพิ่มความเร็วในการอัปโหลด
      });

      console.log('📸 [pickImage] Image picker result:', {
        canceled: result.canceled,
        assetsCount: result.assets?.length || 0,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📸 [pickImage] Selected image:', {
          uri: asset.uri?.substring(0, 50) + '...',
          width: asset.width,
          height: asset.height,
        });

        setSlipImage(asset.uri);

        // คำนวณ aspect ratio จากภาพ
        if (asset.width && asset.height) {
          const ratio = asset.width / asset.height;
          console.log('📸 [pickImage] Aspect ratio:', ratio);
          setImageAspectRatio(ratio);
        } else {
          // ถ้าไม่มี width/height จาก asset ให้ใช้ Image.getSize()
          console.log('📸 [pickImage] Getting image size...');
          RNImage.getSize(asset.uri, (width, height) => {
            const ratio = width / height;
            console.log('📸 [pickImage] Image size:', { width, height, ratio });
            setImageAspectRatio(ratio);
          }, (error) => {
            console.error('❌ [pickImage] Error getting image size:', error);
            setImageAspectRatio(null);
          });
        }
      } else {
        console.log('📸 [pickImage] User canceled image selection');
      }
    } catch (error: any) {
      console.error('❌ [pickImage] Error:', error);
      Alert.alert(
        'เกิดข้อผิดพลาด',
        `ไม่สามารถเปิดแกลเลอรีได้: ${error.message || 'Unknown error'}`,
        [{ text: 'ตกลง' }]
      );
    }
  };

  const handleCopyAccountNumber = () => {
    try {
      Clipboard.setString(bankInfo.accountNumber);
      Alert.alert('สำเร็จ', 'คัดลอกเลขบัญชีแล้ว');
    } catch (error) {
      Alert.alert('ผิดพลาด', 'ไม่สามารถคัดลอกได้');
    }
  };

  const handleConfirm = async () => {
    if (!slipImage) {
      Alert.alert('แจ้งเตือน', 'กรุณาแนบหลักฐานการโอนเงิน');
      return;
    }

    try {
      setUploading(true);
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

      await client.post(`/orders/${orderId}/slip`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('สำเร็จ', 'ส่งหลักฐานเรียบร้อย ทางร้านจะตรวจสอบโดยเร็วที่สุด', [
        {
          text: 'ตกลง',
          onPress: () => {
            // Navigate ไปหน้าสำเร็จ หรือกลับไป OrderHistory
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Profile' } }],
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScreenHeader title="โอนเงินธนาคาร" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ยอดเงิน */}
        <View style={[styles.amountBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.amountLabel, { color: colors.subText }]}>ยอดที่ต้องชำระ</Text>
          <Text style={[styles.amountValue, { color: colors.primary }]}>
            ฿{totalAmount.toLocaleString()}
          </Text>
        </View>

        {/* ข้อมูลบัญชี */}
        <View style={[styles.bankCard, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Image source={{ uri: bankInfo.logo }} style={styles.bankLogo} />
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={[styles.bankName, { color: colors.text }]}>{bankInfo.name}</Text>
              <Text style={[styles.accName, { color: colors.subText }]}>{bankInfo.accountName}</Text>
              <Text style={[styles.accNum, { color: colors.text }]}>{bankInfo.accountNumber}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleCopyAccountNumber}>
            <Text style={[styles.copyText, { color: colors.primary }]}>คัดลอก</Text>
          </TouchableOpacity>
        </View>

        {/* อัปโหลดสลิป */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>แนบหลักฐานการโอน</Text>
        <TouchableOpacity
          style={[styles.uploadBox, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            console.log('👆 [TouchableOpacity] Button pressed, calling pickImage...');
            pickImage();
          }}
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

        {/* คำแนะนำ */}
        <View style={[styles.infoBox, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="information-circle-outline" size={20} color="#1976D2" />
          <Text style={[styles.infoText, { color: '#1976D2' }]}>
            กรุณาโอนเงินตามยอดที่ระบุ และแนบหลักฐานการโอนเงิน ทางร้านจะตรวจสอบภายใน 24 ชั่วโมง
          </Text>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            { backgroundColor: colors.primary },
            uploading && styles.disabledBtn,
          ]}
          onPress={handleConfirm}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>แจ้งชำระเงิน</Text>
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
    flex: 1,
    padding: 20,
  },
  amountBox: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },
  amountLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  bankCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bankLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  bankName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  accName: {
    fontSize: 12,
    marginBottom: 4,
  },
  accNum: {
    fontSize: 18,
    letterSpacing: 1,
    marginTop: 5,
    fontWeight: '600',
  },
  copyText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  uploadBox: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 20,
    minHeight: 150, // ✅ เพิ่ม minHeight เพื่อให้กดง่ายขึ้น
  },
  previewImage: {
    width: '100%',
  },
  uploadHint: {
    marginTop: 10,
    fontSize: 14,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
  },
  confirmBtn: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

