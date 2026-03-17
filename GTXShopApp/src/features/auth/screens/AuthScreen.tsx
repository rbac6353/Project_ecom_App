// screens/AuthScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import { useAuth } from '@app/providers/AuthContext';

export default function AuthScreen() {
  const { colors } = useTheme();
  const { token, isLoading } = useAuth();
  const navigation = useNavigation<any>();

  // เช็คว่าถ้าล็อกอินแล้วให้ redirect ไปหน้าแรก
  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading && token) {
        // ถ้าล็อกอินแล้ว และยังอยู่ที่ AuthScreen ให้เด้งกลับไปหน้าโปรไฟล์แทน
        // ป้องกันอาการกดแท็บ "ฉัน" แล้วหน้ากระพริบ / เด้งกลับไปหน้าอื่น
        // ใช้ replace ใน Stack เดียวกัน (ProfileStackNavigator)
        navigation.replace('ProfileScreen' as never);
      }
    }, [isLoading, token, navigation])
  );

  const onLoginWithEmail = () => {
    navigation.navigate('LoginScreen');
  };

  const onSocialLogin = (platform: string) => {
    if (platform === 'Line' || platform === 'Apple' || platform === 'Phone') {
      console.log(`${platform} login not implemented yet`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.title}>BoxiFY</Text>
          <Text style={styles.welcomeText}>
            ยินดีต้อนรับ! เข้าสู่ระบบเพื่อเปิดประสบการณ์ชอปปิงที่เป็นประโยชน์
          </Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>ยินดีต้อนรับ! ลงทะเบียนหรือเข้าสู่ระบบ</Text>

          {/* Email Login */}
          <AuthButton
            icon="mail-outline"
            text="ดำเนินการต่อด้วย อีเมล"
            color="#00BCD4"
            onPress={onLoginWithEmail}
          />

          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: colors.subText }]}>
              *ได้อ่านและยอมรับแล้ว{' '}
              <Text style={[styles.linkText, { color: colors.primary }]}>
                ข้อกำหนดการบริการผู้ใช้, นโยบายความเป็นส่วนตัว
              </Text>{' '}
              และ <Text style={[styles.linkText, { color: colors.primary }]}>ข้อตกลงการลงทะเบียน</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AuthButton = ({
  icon,
  text,
  color,
  onPress,
  disabled = false,
}: any) => (
  <TouchableOpacity
    style={[styles.button, { borderColor: color, opacity: disabled ? 0.5 : 1 }]}
    onPress={onPress}
    disabled={disabled}
  >
    <Ionicons name={icon as any} size={24} color={color} style={styles.buttonIcon} />
    <Text style={[styles.buttonText, { color: color }]}>{text}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  welcomeText: { fontSize: 16, color: 'white' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  buttonIcon: { marginRight: 15 },
  buttonText: { fontSize: 16, fontWeight: 'bold' },
  termsContainer: { marginTop: 20 },
  termsText: { fontSize: 12, textAlign: 'center' },
  linkText: { textDecorationLine: 'underline' },
});
