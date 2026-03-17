// components/home/HomeLoginBanner.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useAuth } from '@app/providers/AuthContext'; // 👈 1. Import useAuth
import { useNavigation } from '@react-navigation/native'; // 👈 2. Import useNavigation

export default function HomeLoginBanner() {
  const { token, isLoading } = useAuth(); // 👈 3. ดึงสถานะ Login
  const navigation = useNavigation<any>(); // 👈 4. เอาไว้กดปุ่ม

  const onLoginPress = () => {
    // 👈 5. เมื่อกดปุ่ม ให้เด้งไปหน้า Auth
    // (เราส่ง 'Profile' ก่อน เพราะ AuthScreen อยู่ใน Profile Stack)
    navigation.navigate('Profile', { screen: 'AuthScreen' });
  };

  // ✍️ ถ้ากำลังโหลด หรือ Login แล้ว (มี token) ให้ซ่อนแบนเนอร์นี้
  if (isLoading || token) {
    return null;
  }

  // ✍️ ถ้ายังไม่ Login (ไม่มี token) ให้แสดงแบนเนอร์
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>ยินดีต้อนรับเข้าสู่ Taobao!</Text>
        <Text style={styles.subtitle}>รับสิทธิพิเศษผู้ใช้ใหม่ ขั้นต่ำ ฿289</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={onLoginPress}>
        <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333333', // สีเทาเข้ม
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#BDBDBD', // สีเทาอ่อน
    fontSize: 12,
  },
  button: {
    backgroundColor: '#FF5722', // สีส้ม
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

