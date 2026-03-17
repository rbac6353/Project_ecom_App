// screens/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import api from '@app/api/client';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigation = useNavigation<any>();

  const handleRegister = async () => {
    if (!email || !password || !name) {
      return Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบถ้วน');
    }

    // ตรวจสอบรูปแบบ Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Alert.alert('Email ไม่ถูกต้อง', 'กรุณากรอก Email ให้ถูกต้อง');
    }

    // ตรวจสอบความยาว Password
    if (password.length < 6) {
      return Alert.alert('รหัสผ่านสั้นเกินไป', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    }
    
    setIsRegistering(true);
    try {
      // 🎯 API: POST /auth/register
      const response = await api.post('/auth/register', { 
        email, 
        password, 
        name 
      });

      // ✅ หลังจากสมัครสำเร็จ ให้เด้งไปหน้า Login
      Alert.alert(
        'สำเร็จ!',
        response.data.message || 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ',
        [
          {
            text: 'ตกลง',
            onPress: () => {
              // Navigate ไป LoginScreen และส่ง email ไปด้วย
              const rootNavigation = navigation.getParent()?.getParent();
              if (rootNavigation) {
                // Navigate ไป Profile tab แล้วไปที่ LoginScreen
                rootNavigation.navigate('MainTabs', {
                  screen: 'Profile',
                  params: {
                    screen: 'LoginScreen',
                    params: {
                      registeredEmail: email,
                    },
                  },
                });
              } else {
                // Fallback: navigate ผ่าน navigation ปัจจุบัน
                navigation.navigate('MainTabs', {
                  screen: 'Profile',
                  params: {
                    screen: 'LoginScreen',
                    params: {
                      registeredEmail: email,
                    },
                  },
                });
              }
            },
          },
        ],
      );
      

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'การลงทะเบียนล้มเหลว';
      Alert.alert('ลงทะเบียนไม่สำเร็จ', errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back-outline" size={28} color={colors.icon} />
      </TouchableOpacity>
      
      <Text style={[styles.title, { color: colors.text }]}>สร้างบัญชีใหม่</Text>
      
      <TextInput
        style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
        placeholder="ชื่อ-นามสกุล"
        placeholderTextColor={colors.subText}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <TextInput
        style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
        placeholder="Email"
        placeholderTextColor={colors.subText}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextInput
        style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
        placeholder="Password"
        placeholderTextColor={colors.subText}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
      />
      
      <TouchableOpacity 
        style={[
          styles.registerButton, 
          { backgroundColor: colors.primary },
          isRegistering && { backgroundColor: colors.disabledButton || colors.subText }
        ]} 
        onPress={handleRegister} 
        disabled={isRegistering}
      >
        {isRegistering ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.registerButtonText}>ลงทะเบียน</Text>
        )}
      </TouchableOpacity>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30 },
  backButton: { position: 'absolute', top: 50, left: 15, zIndex: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40, textAlign: 'left', marginTop: 50 },
  input: {
    height: 50,
    borderBottomWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 5,
    fontSize: 16,
  },
  registerButton: {
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

