import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function AdminUserDetailsScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { userId } = route.params;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/users/admin/${userId}`);
      setUser(res.data);
    } catch (error) {
      Alert.alert('Error', 'ไม่สามารถดึงข้อมูลผู้ใช้ได้');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [userId]);

  const InfoRow = ({ icon, label, value }: any) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color="#666" style={{ width: 30 }} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  const handleBan = async () => {
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
            fetchDetail(); // Refresh
          } catch (error: any) {
            Alert.alert('ผิดพลาด', 'ไม่สามารถดำเนินการได้');
          }
        },
      },
    ]);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#D32F2F';
      case 'seller':
        return '#1976D2';
      default:
        return '#757575';
    }
  };

  if (loading)
    return (
      <ActivityIndicator size="large" color="#FF5722" style={{ marginTop: 50 }} />
    );
  if (!user) return null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="รายละเอียดผู้ใช้งาน" />

      <ScrollView style={styles.content}>
        {/* 1. Profile Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: user.enabled
                    ? getRoleBadgeColor(user.role)
                    : '#F44336',
                },
              ]}
            >
              <Text style={styles.avatarText}>
                {user.name?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={styles.name}>{user.name || 'ไม่ระบุชื่อ'}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: getRoleBadgeColor(user.role) + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      { color: getRoleBadgeColor(user.role) },
                    ]}
                  >
                    {user.role.toUpperCase()}
                  </Text>
                </View>
                {!user.enabled && (
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: '#FFEBEE', marginLeft: 5 },
                    ]}
                  >
                    <Text style={[styles.roleText, { color: '#D32F2F' }]}>
                      BANNED
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <InfoRow
            icon="calendar-outline"
            label="วันที่สมัคร"
            value={new Date(user.createdAt).toLocaleString('th-TH')}
          />
          <InfoRow
            icon="phone-portrait-outline"
            label="เบอร์โทรศัพท์"
            value={user.phone || '-'}
          />
          {user.address && (
            <InfoRow
              icon="location-outline"
              label="ที่อยู่"
              value={user.address}
            />
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleBan}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: user.enabled ? '#FFEBEE' : '#E8F5E9',
                },
              ]}
            >
              <Ionicons
                name={user.enabled ? 'ban-outline' : 'checkmark-circle-outline'}
                size={20}
                color={user.enabled ? '#F44336' : '#4CAF50'}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: user.enabled ? '#F44336' : '#4CAF50' },
                ]}
              >
                {user.enabled ? 'แบนผู้ใช้' : 'ปลดแบน'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#FF5722' }]}>
              ฿{user.stats?.totalSpent?.toLocaleString('th-TH') || '0'}
            </Text>
            <Text style={styles.statLabel}>ยอดซื้อรวม</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#2196F3' }]}>
              {user.stats?.totalOrders || 0}
            </Text>
            <Text style={styles.statLabel}>ออเดอร์ทั้งหมด</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {user.stats?.completedOrders || 0}
            </Text>
            <Text style={styles.statLabel}>สำเร็จแล้ว</Text>
          </View>
        </View>

        {/* 3. Recent Orders (5 ล่าสุด) */}
        <Text style={styles.sectionTitle}>
          ประวัติการสั่งซื้อล่าสุด ({user.orders?.length || 0})
        </Text>
        {user.orders && user.orders.length > 0 ? (
          user.orders.map((order: any) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => {
                // Navigate to order detail if needed
                // navigation.navigate('OrderDetail', { orderId: order.id });
              }}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>Order #{order.id}</Text>
                <Text
                  style={[
                    styles.orderStatus,
                    {
                      color:
                        order.orderStatus === 'CANCELLED'
                          ? '#F44336'
                          : order.orderStatus === 'DELIVERED'
                          ? '#4CAF50'
                          : '#2196F3',
                    },
                  ]}
                >
                  {order.orderStatus}
                </Text>
              </View>
              <Text style={styles.orderDate}>
                {new Date(order.createdAt).toLocaleString('th-TH')}
              </Text>
              <Text style={styles.orderTotal}>
                ยอดรวม: ฿{Number(order.cartTotal || 0).toLocaleString('th-TH')}
              </Text>
              {order.shippingAddress && (
                <Text style={styles.orderAddress} numberOfLines={1}>
                  📍 {order.shippingAddress}
                </Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>ยังไม่มีประวัติการสั่งซื้อ</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 15 },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#666', marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: 5 },
  roleBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: { fontSize: 10, fontWeight: 'bold', color: '#1976D2' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  infoRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
  infoLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#333' },
  actionButtons: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  actionBtnText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 10,
    marginLeft: 5,
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderId: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  orderStatus: { fontSize: 12, fontWeight: 'bold' },
  orderDate: { fontSize: 12, color: '#999', marginVertical: 2 },
  orderTotal: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 4 },
  orderAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
});

