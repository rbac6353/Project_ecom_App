import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import client from '@app/api/client';
import { useAuth } from '@app/providers/AuthContext';
import CourierJobCard from '@shared/components/courier/CourierJobCard';
import NewJobCard from '@shared/components/courier/NewJobCard';

const Tab = createMaterialTopTabNavigator();

type TaskTabType = 'PICKUP' | 'DELIVER' | 'HISTORY' | 'NEW_JOBS' | 'MY_TASKS';

// ✅ Tab "งานใหม่" - แสดงงานที่พร้อมรับ
const NewJobsTab = () => {
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [acceptingIds, setAcceptingIds] = React.useState<Set<number>>(new Set());

  const fetchNewJobs = async () => {
    try {
      setLoading(true);
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get('/shipments/available-jobs');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const list: any[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setJobs(list);
    } catch (error: any) {
      // ✅ Handle 429 error gracefully
      if (error?.response?.status === 429) {
        console.log('⚠️ Rate limit reached, retrying later...');
      } else {
        console.error('Error fetching new jobs:', error);
        Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดงานใหม่ได้');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchNewJobs();
    }, []),
  );

  const handleAccept = async (shipmentId: number) => {
    try {
      setAcceptingIds((prev) => new Set(prev).add(shipmentId));
      // ✅ ใช้ /accept แทน /pickup เพื่อจองงานก่อน (ยังไม่เปลี่ยนสถานะเป็น IN_TRANSIT)
      await client.patch(`/shipments/${shipmentId}/accept`);
      Alert.alert('สำเร็จ', 'รับงานเรียบร้อยแล้ว กรุณาไปรับพัสดุที่ร้านค้า');
      // ลบงานที่รับแล้วออกจากรายการ
      setJobs((prev) => prev.filter((j) => j.id !== shipmentId));
    } catch (error: any) {
      console.error('Accept job error:', error);
      Alert.alert(
        'ผิดพลาด',
        error.response?.data?.message || 'ไม่สามารถรับงานได้',
      );
    } finally {
      setAcceptingIds((prev) => {
        const next = new Set(prev);
        next.delete(shipmentId);
        return next;
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNewJobs();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <FlatList
      data={jobs}
      keyExtractor={(item) => `new-job-${item.id}`}
      renderItem={({ item }) => (
        <NewJobCard
          shipment={item}
          onAccept={handleAccept}
          isAccepting={acceptingIds.has(item.id)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.centerContainer}>
          <Ionicons name="briefcase-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>ไม่มีงานใหม่ในขณะนี้</Text>
          <Text style={styles.emptySubtext}>
            รอให้ร้านค้าเตรียมพัสดุและเรียกไรเดอร์
          </Text>
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.listContainer}
    />
  );
};

// ✅ Tab "งานปัจจุบัน" - แสดงงานที่ไรเดอร์รับแล้ว
const MyTasksTab = () => {
  const navigation = useNavigation<any>();
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchMyTasks = React.useCallback(async () => {
    try {
      setLoading(true);
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get('/shipments/my-active-jobs');
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      const list: any[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setTasks(list);
    } catch (error: any) {
      // ✅ Handle 429 error gracefully
      if (error?.response?.status === 429) {
        console.log('⚠️ Rate limit reached, retrying later...');
      } else {
        console.error('Error fetching my tasks:', error);
        Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดงานปัจจุบันได้');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchMyTasks();
    }, [fetchMyTasks]),
  );

  const handleAction = (shipment: any) => {
    const status = shipment.status;
    if (status === 'IN_TRANSIT') {
      // ยังไม่รับของ - ไปรับของ
      navigation.navigate('CourierScan', {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
      });
    } else if (status === 'OUT_FOR_DELIVERY') {
      // รับของแล้ว - ไปส่งของ
      navigation.navigate('DeliveryProof', {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
      });
    }
    // ✅ ไม่ต้อง refresh ที่นี่ เพราะ onRefresh จะถูกเรียกจาก CourierJobCard แล้ว
  };

  const getTaskType = (shipment: any): 'PICKUP' | 'DELIVER' => {
    if (shipment.status === 'IN_TRANSIT') {
      return 'PICKUP';
    }
    return 'DELIVER';
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyTasks();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => `task-${item.id}`}
      renderItem={({ item }) => (
        <CourierJobCard
          shipment={item}
          type={getTaskType(item)}
          onAction={() => handleAction(item)}
          onRefresh={fetchMyTasks} // ✅ ส่ง refresh callback
        />
      )}
      ListEmptyComponent={
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>ไม่มีงานปัจจุบัน</Text>
          <Text style={styles.emptySubtext}>
            ไปที่แท็บ "งานใหม่" เพื่อรับงาน
          </Text>
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.listContainer}
    />
  );
};

// ✅ Tab เดิม (เก็บไว้สำหรับ backward compatibility)
const TaskList = ({ type }: { type: 'PICKUP' | 'DELIVER' | 'HISTORY' }) => {
  const navigation = useNavigation<any>();
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const param = type === 'HISTORY' ? 'HISTORY' : 'ACTIVE';
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const res = await client.get('/shipments/tasks', {
        params: { type: param },
      });
      // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
      let list: any[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);

      if (type === 'PICKUP') {
        list = list.filter((s) => s.status === 'WAITING_PICKUP');
      } else if (type === 'DELIVER') {
        list = list.filter(
          (s) =>
            s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DELIVERY',
        );
      } else {
        list = list.filter((s) => s.status === 'DELIVERED');
      }

      setTasks(list);
    } catch (error: any) {
      // ✅ Handle 429 error gracefully
      if (error?.response?.status === 429) {
        console.log('⚠️ Rate limit reached, retrying later...');
      } else {
        console.error('Error fetching shipments for tab', type, error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTasks();
    }, []),
  );

  const handleAction = (shipment: any) => {
    if (type === 'PICKUP') {
      // เรียก pickup ผ่านหน้าจอถัดไปหรือ alert ใน step ถัดไป
      client
        .patch(`/shipments/${shipment.id}/pickup`)
        .then(fetchTasks)
        .catch((e) => console.error('pickup error', e));
    } else if (type === 'DELIVER') {
      navigation.navigate('DeliveryProof', {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => `task-${item.id}`}
      renderItem={({ item }) => (
        <CourierJobCard
          shipment={item}
          type={type}
          onAction={() => handleAction(item)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>ไม่มีงานในขณะนี้</Text>
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.listContainer}
    />
  );
};

export default function CourierDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: '#2c3e50' }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            สวัสดี, {user?.name || user?.email || 'Rider'}
          </Text>
          <Text style={styles.role}>พนักงานขนส่ง</Text>
        </View>
        {/* ปุ่มออกจากโหมดไรเดอร์ → เด้งกลับไปแท็บโปรไฟล์ (ฉัน) */}
        <TouchableOpacity
          onPress={() => {
            // ใช้ navigate ไปที่ RootStack → MainTabs → Profile tab
            navigation.navigate('MainTabs', { screen: 'Profile' });
          }}
        >
          <Ionicons name="log-out-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.scanBtn}
        onPress={() => navigation.navigate('CourierScan')}
      >
        <Ionicons name="scan-circle" size={40} color="#fff" />
        <Text style={styles.scanText}>สแกนบาร์โค้ดพัสดุ</Text>
      </TouchableOpacity>

      <Tab.Navigator
        screenOptions={{
          tabBarStyle: { backgroundColor: '#fff' },
          tabBarLabelStyle: { fontWeight: 'bold', fontSize: 12 },
          tabBarIndicatorStyle: { backgroundColor: '#2c3e50', height: 3 },
          tabBarActiveTintColor: '#2c3e50',
          tabBarInactiveTintColor: '#999',
        }}
      >
        <Tab.Screen
          name="NewJobsTab"
          options={{ title: '✨ งานใหม่' }}
        >
          {() => <NewJobsTab />}
        </Tab.Screen>
        <Tab.Screen
          name="MyTasksTab"
          options={{ title: '📋 งานปัจจุบัน' }}
        >
          {() => <MyTasksTab />}
        </Tab.Screen>
        <Tab.Screen
          name="HistoryTab"
          options={{ title: '🕒 ประวัติ' }}
        >
          {() => <TaskList type="HISTORY" />}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
  },
  greeting: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  role: { color: '#bdc3c7' },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 16,
    columnGap: 10,
  },
  scanText: { color: '#fff', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  listContainer: {
    paddingVertical: 16,
  },
});

