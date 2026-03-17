import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import StatCard from '@shared/components/admin/StatCard';

export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    totalUsers: 0,
    bannedUsers: 0,
    totalStores: 0,
    pendingStores: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      console.log('🔄 Fetching platform stats...');
      // ⚠️ สำคัญ: client.get() return data โดยตรง (ไม่ใช่ response object)
      // เพราะ response interceptor แกะ response แล้ว
      const data = await client.get('/orders/admin/platform-stats');
      console.log('📊 Platform Stats Response:', JSON.stringify(data, null, 2));
      console.log('📊 Response type:', typeof data, 'isArray:', Array.isArray(data));
      
      // ตรวจสอบและ set stats พร้อม default values
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const newStats = {
          totalRevenue: data.totalRevenue ?? 0,
          totalOrders: data.totalOrders ?? 0,
          completedOrders: data.completedOrders ?? 0,
          totalUsers: data.totalUsers ?? 0,
          bannedUsers: data.bannedUsers ?? 0,
          totalStores: data.totalStores ?? 0,
          pendingStores: data.pendingStores ?? 0,
        };
        console.log('✅ Setting stats:', newStats);
        setStats(newStats);
      } else {
        console.warn('⚠️ Invalid platform stats response structure:', {
          data: data,
          type: typeof data,
          isArray: Array.isArray(data),
          keys: data && typeof data === 'object' ? Object.keys(data) : null,
        });
        setError('รูปแบบข้อมูลไม่ถูกต้อง');
        // ใช้ default values
        setStats({
          totalRevenue: 0,
          totalOrders: 0,
          completedOrders: 0,
          totalUsers: 0,
          bannedUsers: 0,
          totalStores: 0,
          pendingStores: 0,
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching platform stats:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        fullError: error,
      });
      
      // ตั้งค่า error message ตาม status code
      if (error?.response?.status === 401) {
        setError('กรุณาเข้าสู่ระบบใหม่ (Token หมดอายุ)');
        console.error('🔒 Authentication failed - User may not be logged in or token expired');
      } else if (error?.response?.status === 403) {
        setError('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ (ต้องเป็น Admin)');
        console.error('🚫 Forbidden - User may not have admin role');
      } else if (error?.response?.status === 404) {
        setError('ไม่พบ API endpoint (ตรวจสอบว่า Backend ทำงานอยู่)');
        console.error('🔍 Endpoint not found - Check if backend is running');
      } else if (error?.response?.status >= 500) {
        setError('เกิดข้อผิดพลาดจาก Server');
      } else {
        setError(error?.response?.data?.message || error?.message || 'ไม่สามารถโหลดข้อมูลได้');
      }
      
      // ใช้ default values เมื่อเกิด error
      setStats({
        totalRevenue: 0,
        totalOrders: 0,
        completedOrders: 0,
        totalUsers: 0,
        bannedUsers: 0,
        totalStores: 0,
        pendingStores: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, []),
  );

  const MenuCard = ({ title, icon, color, onPress, subtitle }: any) => (
    <TouchableOpacity style={[styles.menuCard, { backgroundColor: colors.card }]} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={[styles.menuTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.menuSubtitle, { color: colors.subText }]}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.subText} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Super Admin Dashboard" />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
          />
        }
      >
        <View style={[styles.revenueCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.revTitle, { color: colors.subText }]}>รายได้รวมทั้งแพลตฟอร์ม</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color="#FF5722" />
              <Text style={[styles.errorText, { color: '#FF5722' }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={fetchData}
              >
                <Text style={styles.retryButtonText}>ลองใหม่</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
            <Text style={[styles.revValue, { color: colors.text }]}>
                ฿{(stats?.totalRevenue ?? 0).toLocaleString()}
            </Text>
          <Text style={[styles.revSub, { color: colors.subText }]}>
                {stats?.totalOrders ?? 0} คำสั่งซื้อทั้งหมด ({stats?.completedOrders ?? 0}{' '}
            สำเร็จ)
          </Text>
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>ภาพรวมระบบ</Text>

        {/* 2. Stats Grid (ใช้ StatCard) */}
        <View style={styles.grid}>
          <StatCard
            title="ผู้ใช้งาน"
            value={stats?.totalUsers ?? 0}
            subValue={
              (stats?.bannedUsers ?? 0) > 0
                ? `${stats?.bannedUsers ?? 0} ถูกระงับ`
                : 'สถานะปกติ'
            }
            icon="people"
            color="#2196F3"
          />
          <StatCard
            title="ร้านค้า"
            value={stats?.totalStores ?? 0}
            subValue={
              (stats?.pendingStores ?? 0) > 0
                ? `${stats?.pendingStores ?? 0} รออนุมัติ`
                : 'อนุมัติครบ'
            }
            icon="storefront"
            color="#4CAF50"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>เมนูจัดการ</Text>

        <MenuCard
          title="จัดการผู้ใช้งาน (Users)"
          subtitle="แบน, ปลดแบน, เปลี่ยนสิทธิ์"
          icon="people"
          color="#2196F3"
          onPress={() => navigation.navigate('AdminUserList')}
        />

        <MenuCard
          title="จัดการร้านค้า (Stores)"
          subtitle="อนุมัติร้าน, ลบร้านผิดกฎ"
          icon="storefront"
          color="#4CAF50"
          onPress={() => navigation.navigate('AdminStoreList')}
        />

        <MenuCard
          title="จัดการหมวดหมู่ (Categories)"
          subtitle="เพิ่ม, แก้ไข, ลบหมวดหมู่สินค้า"
          icon="grid"
          color="#673AB7"
          onPress={() => navigation.navigate('AdminCategoryList')}
        />

        <MenuCard
          title="จัดการแบนเนอร์ (Banners)"
          subtitle="อัปโหลด, เปิด/ปิด, ลบแบนเนอร์หน้าแรก"
          icon="images"
          color="#FF9800"
          onPress={() => navigation.navigate('AdminBannerList')}
        />

        <MenuCard
          title="จัดการคูปอง (Coupons)"
          subtitle="สร้าง Platform Voucher, จัดการคูปองทั้งหมด"
          icon="ticket"
          color="#26aa99"
          onPress={() => navigation.navigate('AdminCouponList')}
        />

        <MenuCard
          title="จัดการคำขอถอนเงิน"
          subtitle="อนุมัติ/ปฏิเสธคำขอถอนเงินของร้านค้า"
          icon="wallet"
          color="#00BCD4"
          onPress={() => navigation.navigate('AdminWithdrawalList')}
        />

        <MenuCard
          title="จัดการ Flash Sale (Platform)"
          subtitle="สร้างและดูรอบ Flash Sale ทั้งแพลตฟอร์ม"
          icon="flash"
          color="#FF5722"
          onPress={() => navigation.navigate('AdminFlashSaleList')}
        />

        <MenuCard
          title="ดูออเดอร์ทั้งหมด"
          subtitle="ตรวจสอบสถานะการจัดส่ง"
          icon="documents"
          color="#FF9800"
          onPress={() => navigation.navigate('AdminOrderList')}
        />

        <MenuCard
          title="บันทึกกิจกรรม (Logs)"
          subtitle="ตรวจสอบประวัติการทำงาน"
          icon="time"
          color="#607D8B"
          onPress={() => navigation.navigate('AdminActivityLog')}
        />

        <MenuCard
          title="กราฟสถิติ (Charts)"
          subtitle="ยอดขายและออเดอร์ตามเวลา"
          icon="stats-chart"
          color="#9C27B0"
          onPress={() => navigation.navigate('AdminStats')}
        />

        <MenuCard
          title="คำร้องเรียนรีวิว"
          subtitle="พิจารณาคำร้องลบรีวิว"
          icon="flag"
          color="#F44336"
          onPress={() => navigation.navigate('AdminReviewReports')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 15 },
  revenueCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  revTitle: { fontSize: 14, marginBottom: 5 },
  revValue: { fontSize: 32, fontWeight: 'bold' },
  revSub: { fontSize: 12, marginTop: 5 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: { fontSize: 16, fontWeight: 'bold' },
  menuSubtitle: { fontSize: 12, marginTop: 2 },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
