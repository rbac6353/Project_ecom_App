// screens/seller/StoreSettingsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import { useAuth } from '@app/providers/AuthContext';
import client, { getApiBaseUrl } from '@app/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import ScreenHeader from '@shared/components/common/ScreenHeader';

// แปลง logo เป็น URL เต็มถ้าเป็น path แบบสัมพัทธ์ (backend อาจส่ง /uploads/...)
function resolveLogoUrl(logo: string | null | undefined, baseUrl: string): string | null {
  if (!logo || typeof logo !== 'string' || logo.trim() === '') return null;
  if (logo.startsWith('http://') || logo.startsWith('https://')) return logo;
  if (logo.startsWith('file://') || logo.startsWith('content://')) return logo;
  const base = baseUrl.replace(/\/$/, '');
  return `${base}${logo.startsWith('/') ? '' : '/'}${logo}`;
}

export default function StoreSettingsScreen() {
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation<any>();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<any>(null);

  // ดึงข้อมูลร้านค้า
  const fetchStore = async () => {
    try {
      // ✅ ใช้ user.stores จาก context ก่อน (ไม่ต้องเรียก API ถ้ามีอยู่แล้ว)
      if (user?.stores && user.stores.length > 0) {
        const currentStore = user.stores[0];
        const baseUrl = getApiBaseUrl();
        setStore(currentStore);
        setName(currentStore.name || '');
        setDescription(currentStore.description || '');
        setLogo(resolveLogoUrl(currentStore.logo, baseUrl) || currentStore.logo || null);
        return;
      }

      // ✅ ถ้าไม่มี stores ใน context ให้ refresh user
      await refreshUser();

      // ✅ หลังจาก refreshUser() แล้ว ให้เรียก API เพื่อดึงข้อมูลล่าสุด
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const profileResponse = await client.get('/auth/profile');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const userData = profileResponse?.data || profileResponse || {};
      const stores = userData?.stores || [];

      if (stores.length > 0) {
        const currentStore = stores[0];
        const baseUrl = getApiBaseUrl();
        setStore(currentStore);
        setName(currentStore.name || '');
        setDescription(currentStore.description || '');
        setLogo(resolveLogoUrl(currentStore.logo, baseUrl) || currentStore.logo || null);
      } else {
        setStore(null);
      }
    } catch (error: any) {
      console.error('Error fetching store:', error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลร้านค้าได้');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchStore();
    }, [user]) // ✅ เพิ่ม user เป็น dependency เพื่อให้ refresh เมื่อ user เปลี่ยน
  );

  // เลือกรูปโลโก้
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงรูปภาพ');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // ✅ SDK 53+ format
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogo(result.assets[0].uri);
      setLogoFile({
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'logo.jpg',
      });
    }
  };

  // บันทึกการตั้งค่า
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อร้านค้า');
      return;
    }

    if (!store) {
      Alert.alert('ผิดพลาด', 'ไม่พบข้อมูลร้านค้า');
      return;
    }

    setSaving(true);
    try {
      const API_BASE_URL = getApiBaseUrl();
      const token = await AsyncStorage.getItem('ultra_token');

      console.log('📤 Saving store to:', `${API_BASE_URL}/stores/me`);

      // ✅ ใช้ JSON body + Base64 แทน FormData (แก้ปัญหา network error บน Android Emulator)
      const bodyData: any = { name, description };

      // ✅ ถ้ามีรูปใหม่ แปลงเป็น Base64
      if (logoFile && logoFile.uri) {
        try {
          console.log('📷 Converting image to base64...');
          const base64 = await FileSystem.readAsStringAsync(logoFile.uri, {
            encoding: 'base64',
          });
          // ส่งเป็น data URI format
          bodyData.logoBase64 = `data:image/jpeg;base64,${base64}`;
          console.log('✅ Image converted to base64');
        } catch (imgError) {
          console.error('Error converting image:', imgError);
          Alert.alert('ผิดพลาด', 'ไม่สามารถอ่านไฟล์รูปภาพได้');
          setSaving(false);
          return;
        }
      } else if (logo && !logo.startsWith('file://') && !logo.startsWith('content://')) {
        // ถ้ามี logo URL เดิม ให้ส่งไปด้วย
        bodyData.logo = logo;
      }

      const response = await fetch(`${API_BASE_URL}/stores/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      console.log('✅ Store saved successfully:', responseData);

      // อัปเดต state จาก response เพื่อให้โลโก้ขึ้นทันที (API อาจส่ง store หรือ logo กลับมา)
      const updatedStore = responseData?.data?.store ?? responseData?.store ?? responseData?.data ?? responseData;
      if (updatedStore && typeof updatedStore === 'object') {
        setStore((prev: any) => ({ ...prev, ...updatedStore }));
        if (updatedStore.logo != null && updatedStore.logo !== '') {
          const logoUrl = resolveLogoUrl(updatedStore.logo, API_BASE_URL);
          if (logoUrl) setLogo(logoUrl);
        }
      }
      setLogoFile(null);
      await refreshUser(); // ให้ context มีร้านล่าสุด (รวม logo)
      fetchStore();
    } catch (error: any) {
      console.error('Save store error:', error);
      Alert.alert(
        'ผิดพลาด',
        error.message || error.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลได้'
      );
    } finally {
      setSaving(false);
    }
  };

  // ปิด-เปิดร้านค้า
  const handleToggleStatus = async () => {
    if (!store) return;

    const action = store.isActive ? 'ปิด' : 'เปิด';
    Alert.alert(
      `ยืนยัน${action}ร้านค้า`,
      `คุณต้องการ${action}ร้านค้า "${store.name}" ใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: action,
          onPress: async () => {
            try {
              await client.patch('/stores/me/toggle-status');
              Alert.alert('สำเร็จ', `${action}ร้านค้าเรียบร้อยแล้ว`);
              fetchStore();
            } catch (error: any) {
              console.error('Toggle status error:', error);
              Alert.alert(
                'ผิดพลาด',
                error.response?.data?.message || 'ไม่สามารถเปลี่ยนสถานะได้'
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="ตั้งค่าร้านค้า" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="ตั้งค่าร้านค้า" />
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={64} color={colors.subText} />
          <Text style={[styles.emptyText, { color: colors.subText }]}>
            คุณยังไม่มีร้านค้า
          </Text>
          <TouchableOpacity
            style={[styles.createStoreBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('CreateStore')}
          >
            <Text style={styles.createStoreBtnText}>สร้างร้านค้าใหม่</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="ตั้งค่าร้านค้า" />

      <ScrollView style={styles.content}>
        {/* Store Status Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              สถานะร้านค้า
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: store.isActive ? '#E8F5E9' : '#FFEBEE',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: store.isActive ? '#2E7D32' : '#C62828' },
                ]}
              >
                {store.isActive ? '✅ เปิดอยู่' : '❌ ปิดอยู่'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { backgroundColor: store.isActive ? '#4CAF50' : '#9E9E9E' },
            ]}
            onPress={handleToggleStatus}
          >
            <Ionicons
              name={store.isActive ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color="#fff"
            />
            <Text style={styles.toggleBtnText}>
              {store.isActive ? 'ปิดร้านค้า' : 'เปิดร้านค้า'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Store Info Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            ข้อมูลร้านค้า
          </Text>

          {/* Logo */}
          <View style={styles.logoSection}>
            <Text style={[styles.label, { color: colors.text }]}>โลโก้ร้านค้า</Text>
            <TouchableOpacity
              style={styles.logoContainer}
              onPress={handlePickImage}
            >
              {logo ? (
                <Image key={logo} source={{ uri: logo }} style={styles.logo} />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: colors.subText + '20' }]}>
                  <Ionicons name="camera" size={32} color={colors.subText} />
                </View>
              )}
              <View style={styles.logoOverlay}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text }]}>
              ชื่อร้านค้า *
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.background, color: colors.text },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="กรอกชื่อร้านค้า"
              placeholderTextColor={colors.subText}
            />
          </View>

          {/* Description */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text }]}>
              คำอธิบายร้านค้า
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: colors.background, color: colors.text },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="อธิบายเกี่ยวกับร้านค้าของคุณ"
              placeholderTextColor={colors.subText}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Store Info Display */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            ข้อมูลเพิ่มเติม
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subText }]}>
              สถานะการยืนยัน:
            </Text>
            <Text
              style={[
                styles.infoValue,
                { color: store.isVerified ? '#4CAF50' : '#FF9800' },
              ]}
            >
              {store.isVerified ? '✅ อนุมัติแล้ว' : '⚠️ รอการอนุมัติ'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subText }]}>
              คะแนน:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              ⭐ {store.rating || '0.00'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subText }]}>
              ผู้ติดตาม:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {store.followerCount || 0} คน
            </Text>
          </View>
          {store.isMall && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.subText }]}>
                ประเภท:
              </Text>
              <Text style={[styles.infoValue, { color: '#2196F3' }]}>
                🏪 Mall (ร้านทางการ)
              </Text>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary },
            saving && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.saveBtnText}>บันทึกการตั้งค่า</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  toggleBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoSection: {
    marginBottom: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginTop: 10,
    position: 'relative',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  createStoreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  createStoreBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

