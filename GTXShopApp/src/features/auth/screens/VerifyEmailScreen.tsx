import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import { AuthContext } from '@app/providers/AuthContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { email } = route.params || {};
  const { loginWithSocial } = useContext(AuthContext);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!email) {
      Alert.alert('ผิดพลาด', 'ไม่พบอีเมล');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกรหัส 6 หลัก');
      return;
    }

    try {
      setLoading(true);
      const res = await client.post('/auth/verify-email', { email, otp });

      Alert.alert('สำเร็จ', 'ยืนยันตัวตนเรียบร้อย ยินดีต้อนรับ!', [
        {
          text: 'ตกลง',
          onPress: () => {
            // Login อัตโนมัติ
            if (res.data.access_token && res.data.user) {
              loginWithSocial(res.data.access_token, res.data.user);
            } else {
              navigation.navigate('Login');
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'ผิดพลาด',
        error.response?.data?.message || 'รหัสไม่ถูกต้อง',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('ผิดพลาด', 'ไม่พบอีเมล');
      return;
    }

    try {
      setResending(true);
      // สมัครใหม่เพื่อส่ง OTP อีกครั้ง (หรือสร้าง API endpoint ใหม่สำหรับ resend)
      // สำหรับตอนนี้ เราจะแจ้งให้ user รู้ว่าต้องสมัครใหม่
      Alert.alert(
        'ส่งรหัสอีกครั้ง',
        'กรุณาสมัครสมาชิกใหม่เพื่อรับรหัส OTP ใหม่',
      );
    } catch (error: any) {
      Alert.alert('ผิดพลาด', 'ไม่สามารถส่งรหัสได้');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="ยืนยันอีเมล" />

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>กรอกรหัส OTP</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>
          เราได้ส่งรหัส 6 หลักไปที่{'\n'}
          <Text style={[styles.emailText, { color: colors.primary }]}>{email}</Text>
        </Text>

        <TextInput
          style={[styles.otpInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          placeholder="0 0 0 0 0 0"
          placeholderTextColor={colors.subText}
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          textAlign="center"
          autoFocus
        />

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>ยืนยัน</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={resending}
        >
          <Text style={[styles.resendText, { color: colors.primary }]}>
            {resending ? 'กำลังส่ง...' : 'ส่งรหัสอีกครั้ง'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 30,
    alignItems: 'center',
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 30,
    textAlign: 'center',
    fontSize: 14,
  },
  emailText: {
    fontWeight: 'bold',
  },
  otpInput: {
    width: '80%',
    height: 60,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 30,
    letterSpacing: 10,
    marginBottom: 30,
  },
  btn: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  resendBtn: {
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
  },
});

