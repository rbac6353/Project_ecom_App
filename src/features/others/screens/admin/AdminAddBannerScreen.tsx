import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getApiBaseUrl } from '@app/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';

export default function AdminAddBannerScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const banner = route.params?.banner; // ✅ รับ banner จาก params (ถ้ามี = แก้ไข, ถ้าไม่มี = เพิ่มใหม่)
  const isEdit = !!banner;
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ โหลดข้อมูล banner เมื่อเป็นโหมดแก้ไข
  useEffect(() => {
    if (banner) {
      setTitle(banner.title || '');
      setLink(banner.link || '');
      setImageUri(banner.imageUrl || null);
    }
  }, [banner]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // ✅ SDK 53+ format
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9], // Banner aspect ratio
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    // ✅ ถ้าเป็นโหมดแก้ไข ไม่บังคับให้เลือกรูปใหม่ (ถ้าไม่เปลี่ยนรูป)
    if (!isEdit && !imageUri) {
      return Alert.alert('แจ้งเตือน', 'กรุณาเลือกรูปภาพ');
    }

    setLoading(true);
    try {
      const formData = new FormData();

      // ✅ ถ้ามีรูปใหม่ (หรือเป็นโหมดเพิ่มใหม่) ให้ append file
      const hasNewImage = imageUri && (!isEdit || imageUri !== banner?.imageUrl);
      if (hasNewImage) {
        const filename = imageUri.split('/').pop() || 'banner.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        console.log('📁 File info:', {
          uri: imageUri,
          filename,
          type,
          uriLength: imageUri.length,
        });

        // ✅ React Native FormData format
        // @ts-ignore - React Native FormData ต้องการ uri, name, type
        formData.append('file', {
          uri: imageUri,
          name: filename,
          type: type,
        } as any);
      }

      if (title) {
        formData.append('title', title);
      }
      if (link) {
        formData.append('link', link);
      }

      console.log(`📤 ${isEdit ? 'Updating' : 'Uploading'} banner:`, {
        isEdit,
        bannerId: banner?.id,
        hasNewImage,
        hasTitle: !!title,
        hasLink: !!link,
      });

      // ✅ ใช้ fetch API แทน axios เพื่อแก้ปัญหา Network Error บน Android
      const baseUrl = getApiBaseUrl();
      const endpoint = isEdit ? `/banners/${banner.id}` : '/banners';
      const method = isEdit ? 'PATCH' : 'POST';
      const token = await AsyncStorage.getItem('ultra_token');

      console.log(`🌐 Sending ${method} to ${baseUrl}${endpoint} using fetch...`);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // ไม่ต้องใส่ Content-Type สำหรับ FormData - fetch จะตั้งให้อัตโนมัติพร้อม boundary
        },
        body: formData,
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Response error data:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Banner upload success:', result);

      Alert.alert('สำเร็จ', isEdit ? 'แก้ไขแบนเนอร์แล้ว' : 'เพิ่มแบนเนอร์แล้ว', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e: any) {
      // ✅ Detailed error logging
      console.error(`❌ Error ${isEdit ? 'updating' : 'uploading'} banner:`);
      console.error('   Error name:', e.name);
      console.error('   Error message:', e.message);

      let errorMessage = e.message || 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isEdit ? 'แก้ไขแบนเนอร์' : 'เพิ่มแบนเนอร์'} />
      <View style={{ padding: 20 }}>
        <TouchableOpacity
          onPress={pickImage}
          style={[styles.imageBox, { backgroundColor: colors.card }]}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={[styles.placeholderText, { color: colors.subText }]}>
                แตะเพื่อเลือกรูป
              </Text>
              <Text style={[styles.placeholderHint, { color: colors.subText }]}>
                {isEdit ? '(ไม่เปลี่ยนรูป = คงรูปเดิม)' : '(แนะนำ: อัตราส่วน 16:9)'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="ชื่อแบนเนอร์ (Optional)"
          placeholderTextColor={colors.subText}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="ลิงก์ (เช่น boxify://product/1)"
          placeholderTextColor={colors.subText}
          value={link}
          onChangeText={setLink}
        />

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#FF5722' }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>บันทึก</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageBox: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    marginBottom: 5,
  },
  placeholderHint: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 16,
  },
  btn: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
});

