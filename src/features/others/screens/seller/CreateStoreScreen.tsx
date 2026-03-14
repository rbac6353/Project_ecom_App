// screens/seller/CreateStoreScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import api from '@app/api/client';
import { useAuth } from '@app/providers/AuthContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function CreateStoreScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { refreshUser } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateStore = async () => {
    if (!storeName.trim()) {
      return Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อร้านค้า');
    }

    setIsCreating(true);
    try {
      // เรียก API สร้างร้านค้า
      // สมมติว่า backend มี endpoint POST /stores
      const response = await api.post('/stores', {
        name: storeName.trim(),
        description: description.trim() || null,
      });

      // Refresh ข้อมูล user เพื่อให้มี store ใหม่
      await refreshUser();

      Alert.alert(
        'สำเร็จ!',
        'สร้างร้านค้าสำเร็จแล้ว',
        [
          {
            text: 'ตกลง',
            onPress: () => {
              // กลับไปหน้า Profile หรือ SellerCenter
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to create store:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'ไม่สามารถสร้างร้านค้าได้ กรุณาลองอีกครั้ง';
      Alert.alert('เกิดข้อผิดพลาด', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="เปิดร้านค้า" />
      <ScrollView style={styles.content}>
        <View style={[styles.form, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>ชื่อร้านค้า *</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
            placeholder="กรอกชื่อร้านค้า"
            placeholderTextColor={colors.subText}
            value={storeName}
            onChangeText={setStoreName}
            maxLength={100}
          />

          <Text style={[styles.label, { color: colors.text }]}>คำอธิบายร้านค้า</Text>
          <TextInput
            style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
            placeholder="อธิบายเกี่ยวกับร้านค้าของคุณ (ไม่บังคับ)"
            placeholderTextColor={colors.subText}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />

          <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              คุณสามารถแก้ไขข้อมูลร้านค้าได้ภายหลังในหน้าตั้งค่าร้านค้า
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }, isCreating && styles.buttonDisabled]}
            onPress={handleCreateStore}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.createButtonText}>สร้างร้านค้า</Text>
            )}
          </TouchableOpacity>
        </View>
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
  form: {
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  createButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

