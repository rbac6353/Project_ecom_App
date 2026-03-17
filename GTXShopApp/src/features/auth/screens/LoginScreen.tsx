// screens/LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppButton, AppTextInput, ScreenWrapper } from '@shared/components';

export default function LoginScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // รับ email จาก RegisterScreen (ถ้ามี)
  useEffect(() => {
    if (route.params?.registeredEmail) {
      setEmail(route.params.registeredEmail);
    }
  }, [route.params]);

  const handleLogin = async (customEmail?: string, customPassword?: string) => {
    const finalEmail = customEmail ?? email;
    const finalPassword = customPassword ?? password;

    if (!finalEmail || !finalPassword) {
        return Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกอีเมลและรหัสผ่าน');
    }

    const success = await login(finalEmail, finalPassword); // 🎯 3. เรียก API POST /auth/login
    
    if (success) {
      // Login สำเร็จ, เด้งไปหน้าแรก (Home)
      navigation.popToTop(); // กลับไปหน้าหลัก
      // Navigate ไปแท็บ Home ผ่าน Root Navigator
      const rootNavigation = navigation.getParent()?.getParent();
      if (rootNavigation) {
        rootNavigation.navigate('MainTabs', { screen: 'Home' });
      } else {
        navigation.navigate('MainTabs', { screen: 'Home' });
      }
    } else {
      Alert.alert('Login Failed', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง');
    }
  };

  return (
    <ScreenWrapper enableScroll keyboardVerticalOffset={100}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color={colors.icon} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: colors.text }]}>เข้าสู่ระบบด้วยบัญชีอีเมล</Text>
        
        <AppTextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          icon="mail-outline"
        />
        
        <AppTextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          isPassword
          icon="lock-closed-outline"
        />
        
        <AppButton
          title="เข้าสู่ระบบ"
          onPress={() => handleLogin()}
          isLoading={isLoading}
          variant="primary"
          style={styles.loginButton}
        />

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.subText }]}>หรือ</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <AppButton
          title="เข้าสู่ระบบด้วย Google"
          onPress={() => {}}
          variant="outline"
          style={styles.socialButton}
          textStyle={styles.socialButtonText}
        />
        <AppButton
          title="เข้าสู่ระบบด้วย Facebook"
          onPress={() => {}}
          variant="outline"
          style={styles.socialButton}
          textStyle={styles.socialButtonText}
        />

        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={() => {
            const rootNavigation = navigation.getParent()?.getParent();
            if (rootNavigation) {
              rootNavigation.navigate('ForgotPassword');
            } else {
              navigation.navigate('ForgotPassword');
            }
          }}
        >
          <Text style={[styles.forgotPasswordText, { color: colors.text }]}>ลืมรหัสผ่าน?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.registerLink}
          onPress={() => {
            const rootNavigation = navigation.getParent()?.getParent();
            if (rootNavigation) {
              rootNavigation.navigate('RegisterScreen');
            } else {
              navigation.navigate('RegisterScreen');
            }
          }}
        >
          <Text style={[styles.registerLinkText, { color: colors.primary }]}>ลงทะเบียนบัญชีใหม่</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    paddingTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 15,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'left',
    marginTop: 50,
  },
  loginButton: {
    marginTop: 30,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
  },
  socialButton: {
    marginTop: 10,
  },
  socialButtonText: {
    fontSize: 15,
  },
  forgotPasswordButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

