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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = route.params || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      return Alert.alert('Error', 'Token ไม่ถูกต้อง');
    }

    if (!newPassword || !confirmPassword) {
      return Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกรหัสผ่านทั้งสองช่อง');
    }

    if (newPassword.length < 6) {
      return Alert.alert('รหัสผ่านสั้นเกินไป', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    }

    if (newPassword !== confirmPassword) {
      return Alert.alert('รหัสผ่านไม่ตรงกัน', 'กรุณากรอกรหัสผ่านให้ตรงกัน');
    }

    try {
      setLoading(true);
      await client.post('/auth/reset-password', { token, newPassword });
      Alert.alert('สำเร็จ', 'เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่', [
        {
          text: 'ตกลง',
          onPress: () => {
            // Reset navigation stack และไปหน้า Login
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Profile' } }],
            });
            // Navigate ไป LoginScreen
            setTimeout(() => {
              const rootNavigation = navigation.getParent()?.getParent();
              if (rootNavigation) {
                rootNavigation.navigate('LoginScreen');
              } else {
                navigation.navigate('LoginScreen');
              }
            }, 100);
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'ผิดพลาด',
        error.response?.data?.message || 'เปลี่ยนรหัสไม่สำเร็จ',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="ตั้งรหัสผ่านใหม่" />
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>รหัสผ่านใหม่</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          placeholder="อย่างน้อย 6 ตัวอักษร"
          placeholderTextColor={colors.subText}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <Text style={[styles.label, { color: colors.text }]}>ยืนยันรหัสผ่าน</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          placeholder="กรอกรหัสผ่านอีกครั้ง"
          placeholderTextColor={colors.subText}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>บันทึกรหัสผ่านใหม่</Text>
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
  label: {
    fontWeight: 'bold',
    marginBottom: 10,
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
    marginTop: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

