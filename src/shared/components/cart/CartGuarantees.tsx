// components/cart/CartGuarantees.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';

// Component ย่อย
const GuaranteeItem = ({ icon, title, subtitle }: { icon: any, title: string, subtitle: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.item}>
      <Ionicons name={icon} size={24} color={colors.icon} style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={[styles.itemTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.itemSubtitle, { color: colors.subText }]}>{subtitle}</Text>
      </View>
    </View>
  );
};

export default function CartGuarantees() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={[styles.title, { color: colors.text }]}>Taobao การรับประกัน</Text>
      <GuaranteeItem 
        icon="shield-checkmark-outline" 
        title="การชำระเงินที่ปลอดภัย" 
        subtitle="ชำระปลอดภัย ผ่านระบบเข้ารหัส" 
      />
      <GuaranteeItem 
        icon="lock-closed-outline" 
        title="รหัสความปลอดภัยและความเป็นส่วนตัว" 
        subtitle="ข้อมูลส่วนตัวของคุณได้รับการปกป้อง" 
      />
      <GuaranteeItem 
        icon="bus-outline" 
        title="รับประกันการจัดส่ง" 
        subtitle="ชดเชยกรณีจัดส่งล่าช้า..." 
      />
      <GuaranteeItem 
        icon="headset-outline" 
        title="บริการลูกค้า" 
        subtitle="สนับสนุน 24 ชั่วโมง..." 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemSubtitle: {
    fontSize: 12,
  },
});

