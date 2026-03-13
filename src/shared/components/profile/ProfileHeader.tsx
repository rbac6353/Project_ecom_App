// components/profile/ProfileHeader.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@app/providers/AuthContext'; // 👈 Import useAuth
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@app/providers/ThemeContext';

// 👈 1. รับ 'navigation' prop
interface ProfileHeaderProps {
  navigation: any;
}

export default function ProfileHeader({ navigation }: ProfileHeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth(); // 👈 เอา 'logout' ออกจากตรงนี้
  const { colors } = useTheme();

  // กำหนดค่า userId เพื่อป้องกัน undefined
  const userId = user?.email || user?.id || 'tb870683809744';

  // ฟังก์ชันสำหรับกดปุ่ม Settings
  const onSettingsPress = () => {
    navigation.getParent()?.getParent()?.navigate('Settings');
  };

  // ฟังก์ชันสำหรับกดปุ่ม Help
  const onHelpPress = () => {
    navigation.navigate('HelpCenterScreen');
  };

  // ฟังก์ชันสำหรับกดปุ่ม Notification
  const onNotificationPress = () => {
    navigation.navigate('Notification');
  };

  // ฟังก์ชันสำหรับกดปุ่ม Chat
  const onChatPress = () => {
    navigation.navigate('UserChatList');
  };

  return (
    <LinearGradient
      colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 10 }]}
    >
      {/* แถวบน: Greeting + Icons */}
      <View style={styles.topRow}>
        <Text style={styles.greeting}>สวัสดี เราควรเรียกคุณว่าอะไรดี?</Text>
        <View style={styles.iconRow}>
          {/* ปรับปรุง Notification icon */}
          <TouchableOpacity onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={24} color="white" />
          </TouchableOpacity>

          {/* ปรับปรุง Chat icon */}
          <TouchableOpacity onPress={onChatPress}>
            <Ionicons name="chatbubble-outline" size={24} color="white" />
          </TouchableOpacity>

          {/* 👈 ปุ่มช่วยเหลือ */}
          <TouchableOpacity onPress={onHelpPress}>
            <Ionicons name="headset-outline" size={24} color="white" />
          </TouchableOpacity>

          {/* 👈 2. อัปเดต onPress ของปุ่ม Settings */}
          <TouchableOpacity onPress={onSettingsPress}>
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* แถวล่าง: User ID */}
      <View style={styles.userRow}>
        <Text style={styles.userId}>{userId}</Text>
        <TouchableOpacity>
          <Ionicons name="copy-outline" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 15,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: 'white',
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  iconRow: {
    flexDirection: 'row',
    width: 140,
    justifyContent: 'space-between',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // สีพื้นหลังโปร่งแสง
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start', // ให้ความกว้างพอดีกับเนื้อหา
  },
  userId: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 5,
  },
});

