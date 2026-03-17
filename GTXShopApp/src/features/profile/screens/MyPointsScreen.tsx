import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';

// Mock Data ประวัติแต้ม (สำหรับ Demo โปรเจคจบ)
const HISTORY = [
  { id: '1', title: 'ได้รับจากคำสั่งซื้อ #1024', points: '+50', date: 'วันนี้', type: 'earn' },
  { id: '2', title: 'แลกคูปองส่วนลด', points: '-100', date: 'เมื่อวาน', type: 'use' },
  { id: '3', title: 'ได้รับจากคำสั่งซื้อ #1002', points: '+200', date: '20/11/2025', type: 'earn' },
  { id: '4', title: 'โบนัสสมัครสมาชิกใหม่', points: '+500', date: '01/11/2025', type: 'earn' },
];

export default function MyPointsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const balance = user?.points || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="BoxiFY Coins ของฉัน" />

      {/* Banner แสดงยอดแต้ม */}
      <View style={styles.banner}>
        <Ionicons name="wallet" size={40} color="#FFC107" />
        <Text style={styles.balanceLabel}>ยอดคงเหลือ</Text>
        <Text style={styles.balanceValue}>{balance}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>ประวัติรายการ</Text>

      <FlatList
        data={HISTORY}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={styles.itemDate}>{item.date}</Text>
            </View>
            <Text
              style={[
                styles.itemPoints,
                { color: item.type === 'earn' ? '#4CAF50' : '#F44336' },
              ]}
            >
              {item.points}
            </Text>
          </View>
        )}
        contentContainerStyle={{ padding: 15 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    backgroundColor: '#333',
    alignItems: 'center',
    padding: 30,
  },
  balanceLabel: { color: '#ccc', marginTop: 10 },
  balanceValue: { color: '#FFC107', fontSize: 48, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 15, marginTop: 15 },
  item: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  itemTitle: { fontSize: 14 },
  itemDate: { fontSize: 12, color: '#999', marginTop: 2 },
  itemPoints: { fontSize: 16, fontWeight: 'bold' },
});