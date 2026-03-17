import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, updateProfile } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState(''); // ปล่อยว่างไว้ถ้าไม่แก้
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // Loading ตอนอัปโหลดรูป

  // ✅ ฟังก์ชันเลือกและอัปโหลดรูป
  const handlePickAvatar = async () => {
    // 1. ขอสิทธิ์เข้าถึง Gallery
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('ต้องการสิทธิ์', 'คุณต้องอนุญาตให้เข้าถึงคลังภาพเพื่อเปลี่ยนรูปโปรไฟล์');
      return;
    }

    // 2. เลือกรูป
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // ✅ SDK 53+ format
      allowsEditing: true, // ให้ครอปรูปได้
      aspect: [1, 1], // บังคับสี่เหลี่ยมจัตุรัส
      quality: 0.8, // ลดคุณภาพนิดหน่อยให้ไฟล์ไม่ใหญ่เกิน
    });

    if (!result.canceled) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  // ✅ ฟังก์ชันส่งรูปไป Backend
  const uploadAvatar = async (uri: string) => {
    try {
      setUploading(true);

      // เตรียม FormData
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename as string);
      const type = match ? `image/${match[1]}` : `image`;

      // @ts-ignore (React Native FormData รับ object ได้)
      formData.append('file', { uri, name: filename, type });

      // ยิง API
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const responseData = res?.data || res || {};
      const avatarUrl = responseData?.url || responseData?.avatar || responseData?.secure_url || '';

      if (!avatarUrl) {
        throw new Error('ไม่พบ URL รูปภาพจากการอัปโหลด');
      }

      // อัปเดต Context ให้แอปเห็นรูปใหม่ทันที
      await updateProfile({ picture: avatarUrl });

      Alert.alert('สำเร็จ', 'เปลี่ยนรูปโปรไฟล์เรียบร้อย');
    } catch (error) {
      console.error('Upload avatar error:', error);
      Alert.alert('ผิดพลาด', 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่อ');
      return;
    }

    setLoading(true);
    // เตรียมข้อมูลส่ง (ถ้า password ว่าง ไม่ต้องส่งไป)
    const updateData: any = { name };
    if (password.trim().length > 0) {
      updateData.password = password;
    }

    const success = await updateProfile(updateData);
    setLoading(false);

    if (success) {
      Alert.alert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย', [
        { text: 'ตกลง', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="แก้ไขข้อมูลส่วนตัว" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.form}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={uploading}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                <Text style={[styles.avatarText, { color: colors.text }]}>{user?.name?.[0] || 'U'}</Text>
              </View>
            )}

            <View style={[styles.cameraIcon, { backgroundColor: colors.primary }]}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={18} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>ชื่อ-นามสกุล</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="ชื่อของคุณ"
            placeholderTextColor={colors.subText}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>อีเมล</Text>
          <TextInput
            style={[styles.input, styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.subText }]}
            value={user?.email || ''}
            editable={false}
          />
          <Text style={[styles.hint, { color: colors.subText }]}>อีเมลไม่สามารถเปลี่ยนแปลงได้</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>เปลี่ยนรหัสผ่าน (ถ้ามี)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={password}
            onChangeText={setPassword}
            placeholder="กรอกรหัสผ่านใหม่"
            placeholderTextColor={colors.subText}
            secureTextEntry
          />
          <Text style={[styles.hint, { color: colors.subText }]}>ปล่อยว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>บันทึกการเปลี่ยนแปลง</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 30,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  disabledInput: {},
  hint: {
    fontSize: 12,
    marginTop: 5,
  },
  saveButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

