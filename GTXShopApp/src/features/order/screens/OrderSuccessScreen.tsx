import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';

export default function OrderSuccessScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  // ✅ Handle hardware back button: กลับไป Home เสมอ
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          }),
        );
        return true; // แสดงว่าเรา handle แล้ว
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => {
        subscription.remove();
      };
    }, [navigation]),
  );

  const handleBackHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      }),
    );
  };

  const handleViewOrders = () => {
    // ✅ Reset stack แล้วเปิดหน้าประวัติคำสั่งซื้อเลย เพื่อกันย้อนกลับมาหน้า Success
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          { name: 'OrderHistory', params: { initialTab: 'ที่ต้องจัดส่ง' } },
        ],
      }),
    );
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={100} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>สั่งซื้อสำเร็จ!</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>ขอบคุณที่ใช้บริการ</Text>
        <Text style={[styles.description, { color: colors.subText }]}>
          เราได้รับออเดอร์ของคุณเรียบร้อยแล้ว{'\n'}สินค้าจะถูกจัดส่งโดยเร็วที่สุด
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleBackHome}>
          <Text style={styles.primaryButtonText}>กลับหน้าแรก</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={handleViewOrders}>
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>ดูรายการสั่งซื้อ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  subtitle: { fontSize: 18, marginTop: 10 },
  description: { textAlign: 'center', marginTop: 10, lineHeight: 22 },
  footer: { width: '100%', marginBottom: 20 },
  primaryButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  secondaryButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 16 },
});

