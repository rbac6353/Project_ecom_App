import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function SellerFlashSaleInfoScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Flash Sale ร้านค้า" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.iconRow}>
            <Ionicons name="flash" size={28} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>
              ระบบ Flash Sale ของแพลตฟอร์ม
            </Text>
          </View>
          <Text style={[styles.text, { color: colors.subText }]}>
            ขณะนี้รอบ Flash Sale บน BoxiFY ถูกจัดการโดยทีมแอดมินของแพลตฟอร์ม
            เพื่อให้ได้ดีลที่ดึงดูดลูกค้ามากที่สุด และควบคุมคุณภาพของสินค้าและโปรโมชั่น
          </Text>
          <Text style={[styles.text, { color: colors.subText }]}>
            หากคุณต้องการเสนอสินค้าของร้านเข้าร่วม Flash Sale แนะนำให้ติดต่อแอดมิน
            เพื่อพูดคุยและตกลงรายละเอียด เช่น ราคาพิเศษและจำนวนโควตาที่ต้องการปล่อยขาย
          </Text>
          <Text style={[styles.text, { color: colors.subText }]}>
            ในเฟสถัดไป ระบบจะเพิ่มหน้าจอให้ร้านค้าสามารถส่งคำขอเข้าร่วม Flash Sale
            ได้โดยตรงจากศูนย์ผู้ขาย (Seller Center)
          </Text>
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
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});

