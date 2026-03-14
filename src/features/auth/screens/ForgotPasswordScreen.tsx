import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email) {
      return Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกอีเมล');
    }

    try {
      setLoading(true);
      await client.post('/auth/forgot-password', { email });
      Alert.alert(
        'ตรวจสอบอีเมล',
        'เราส่งลิงก์รีเซ็ตไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบ Inbox',
        [
          {
            text: 'ตกลง',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'ผิดพลาด',
        error.response?.data?.message || 'ส่งอีเมลไม่สำเร็จ',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="ลืมรหัสผ่าน" />
      <View style={styles.content}>
        <Text style={[styles.desc, { color: colors.subText }]}>
          กรอกอีเมลที่ใช้สมัครสมาชิก เราจะส่งลิงก์สำหรับตั้งรหัสใหม่ไปให้
        </Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          placeholder="อีเมลของคุณ"
          placeholderTextColor={colors.subText}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>ส่งลิงก์รีเซ็ต</Text>
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
  },
  desc: {
    marginBottom: 20,
    lineHeight: 22,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  btn: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

