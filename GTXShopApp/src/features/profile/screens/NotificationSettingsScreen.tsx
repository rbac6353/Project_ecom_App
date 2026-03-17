import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState({
    orderUpdate: true,
    promotion: true,
    chat: true,
  });
  const [loading, setLoading] = useState(true);

  // โหลดข้อมูลเมื่อเข้าหน้า
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await client.get('/notification-settings');
      setSettings(res.data);
    } catch (error) {
      console.error('Fetch notification settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสลับสวิตช์ และยิง API ทันที
  const toggleSwitch = async (key: string, value: boolean) => {
    // 1. Optimistic Update (เปลี่ยน UI ก่อน เพื่อความลื่นไหล)
    setSettings((prev) => ({ ...prev, [key]: value }));

    try {
      // 2. ส่งไป Backend
      await client.patch('/notification-settings', { [key]: value });
    } catch (error) {
      console.error('Update notification settings error:', error);
      // ถ้าพัง ให้ดีดกลับ (Optional)
      setSettings((prev) => ({ ...prev, [key]: !value }));
    }
  };

  const SettingItem = ({ label, desc, value, onValueChange }: any) => (
    <View style={styles.item}>
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.desc}>{desc}</Text>
      </View>
      <Switch
        trackColor={{ false: '#e0e0e0', true: '#FFAB91' }} // สีตอนเปิด (พื้นหลัง)
        thumbColor={value ? '#FF5722' : '#f4f3f4'} // สีปุ่มวงกลม
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="ตั้งค่าการแจ้งเตือน" />

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FF5722"
          style={{ marginTop: 50 }}
        />
      ) : (
        <View style={styles.content}>
          <SettingItem
            label="สถานะคำสั่งซื้อ"
            desc="แจ้งเตือนเมื่อมีการชำระเงิน, จัดส่ง, หรือยกเลิก"
            value={settings.orderUpdate}
            onValueChange={(val: boolean) => toggleSwitch('orderUpdate', val)}
          />

          <View style={styles.divider} />

          <SettingItem
            label="แชทจากร้านค้า"
            desc="แจ้งเตือนเมื่อมีข้อความใหม่จากร้านค้า"
            value={settings.chat}
            onValueChange={(val: boolean) => toggleSwitch('chat', val)}
          />

          <View style={styles.divider} />

          <SettingItem
            label="โปรโมชั่นและข่าวสาร"
            desc="รับข่าวสารส่วนลด, Flash Sale, และดีลพิเศษ"
            value={settings.promotion}
            onValueChange={(val: boolean) => toggleSwitch('promotion', val)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});

