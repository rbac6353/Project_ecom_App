import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/RootStackNavigator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function AdminUserListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // ⚠️ สำคัญ: client.get() return data โดยตรง (ไม่ใช่ response object)
      const data = await client.get(
        `/users/admin/all?page=1&keyword=${keyword || ''}`,
      );
      console.log('👥 Users API Response:', data);
      // ตรวจสอบ structure ของ response
      if (data && typeof data === 'object') {
        // ถ้าเป็น paginated response (มี data property)
        if ('data' in data && Array.isArray(data.data)) {
          setUsers(data.data);
        } else if (Array.isArray(data)) {
          // ถ้าเป็น array โดยตรง
          setUsers(data);
        } else {
          console.warn('⚠️ Unexpected users response structure:', data);
          setUsers([]);
        }
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching users:', error);
      Alert.alert('Error', error?.response?.data?.message || 'ดึงข้อมูลไม่สำเร็จ');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, []),
  );

  // ✅ ฟังก์ชันเปลี่ยน Role (ยิง API จริง)
  const updateRole = async (
    id: number,
    newRole: string,
    userName: string,
  ) => {
    try {
      await client.patch(`/users/admin/${id}/role`, { role: newRole });
      Alert.alert(
        'สำเร็จ',
        `เปลี่ยนสิทธิ์คุณ "${userName}" เป็น ${newRole.toUpperCase()} แล้ว`,
      );
      fetchUsers(); // โหลดข้อมูลใหม่เพื่ออัปเดต UI
    } catch (error: any) {
      const msg =
        error.response?.data?.message || 'เปลี่ยนสิทธิ์ไม่สำเร็จ';
      Alert.alert('ผิดพลาด', msg);
    }
  };

  // ✅ ฟังก์ชันแสดง Popup เลือก Role
  const handleChangeRole = (user: any) => {
    Alert.alert(
      'เปลี่ยนระดับผู้ใช้งาน',
      `เลือกสิทธิ์ใหม่สำหรับ: ${user.name || user.email}`,
      [
        {
          text: '👤 Customer (ลูกค้า)',
          onPress: () => updateRole(user.id, 'user', user.name || user.email),
        },
        {
          text: '🏪 Seller (คนขาย)',
          onPress: () =>
            updateRole(user.id, 'seller', user.name || user.email),
        },
        {
          text: '🚚 Courier (ขนส่ง)',
          onPress: () =>
            updateRole(user.id, 'courier', user.name || user.email),
        },
        {
          text: '👑 Admin (ผู้ดูแล)',
          onPress: () =>
            updateRole(user.id, 'admin', user.name || user.email),
          style: 'destructive', // สีแดง เตือนใจ
        },
        { text: 'ยกเลิก', style: 'cancel' },
      ],
    );
  };

  // Helper เลือกสี Badge ตาม Role
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#D32F2F'; // แดง
      case 'seller':
        return '#1976D2'; // น้ำเงิน
      case 'courier':
        return '#FF9800'; // ส้ม สำหรับพนักงานขนส่ง
      default:
        return '#757575'; // เทา
    }
  };

  const handleBan = (user: any) => {
    const action = user.enabled ? 'แบน' : 'ปลดแบน';
    Alert.alert('ยืนยัน', `ต้องการ ${action} ผู้ใช้ "${user.email}" หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ยืนยัน',
        style: user.enabled ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await client.patch(`/users/admin/${user.id}/ban`);
            Alert.alert('สำเร็จ', `${action} ผู้ใช้เรียบร้อย`);
            fetchUsers(); // Refresh
          } catch (error: any) {
            Alert.alert('ผิดพลาด', 'ไม่สามารถดำเนินการได้');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card },
        !item.enabled && [styles.bannedCard, { backgroundColor: colors.background }]
      ]}
      onPress={() =>
        navigation.navigate('AdminUserDetails', { userId: item.id })
      }
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: getRoleBadgeColor(item.role) },
        ]}
      >
        <Text style={styles.avatarText}>
          {item.role.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.email, { color: colors.text }]} numberOfLines={1}>
          {item.email}
        </Text>
        <View style={styles.roleRow}>
          <Text style={[styles.name, { color: colors.subText }]}>{item.name || 'ไม่ระบุชื่อ'}</Text>
          <View
            style={[
              styles.roleTag,
              {
                backgroundColor: getRoleBadgeColor(item.role) + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.roleText,
                { color: getRoleBadgeColor(item.role) },
              ]}
            >
              {item.role.toUpperCase()}
            </Text>
          </View>
        </View>
        {!item.enabled && (
          <Text style={[styles.bannedText, { color: colors.primary }]}>🚫 บัญชีถูกระงับ</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {/* ปุ่มเปลี่ยน Role */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleChangeRole(item);
          }}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons
            name="account-key"
            size={24}
            color="#FF9800"
          />
        </TouchableOpacity>

        {/* ปุ่มแบน */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleBan(item);
          }}
          style={styles.iconBtn}
        >
          <Ionicons
            name={item.enabled ? 'ban-outline' : 'checkmark-circle-outline'}
            size={24}
            color={item.enabled ? '#F44336' : '#4CAF50'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="จัดการผู้ใช้งาน" />

      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.subText} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="ค้นหาจากอีเมล..."
          placeholderTextColor={colors.subText}
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={fetchUsers}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.subText }]}>ไม่พบผู้ใช้</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    padding: 10,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },

  card: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 1,
  },
  bannedCard: { opacity: 0.8 },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

  email: { fontSize: 14, fontWeight: 'bold' },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  name: { fontSize: 12, marginRight: 8 },
  roleTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleText: { fontSize: 10, fontWeight: 'bold' },

  bannedText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },

  actions: { flexDirection: 'row' },
  iconBtn: {
    padding: 8,
    marginLeft: 5,
    borderRadius: 8,
  },
  emptyText: { textAlign: 'center', marginTop: 50 },
});

