import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import {
  getAdminWithdrawalRequests,
  AdminWithdrawalRequest,
  WithdrawalStatus,
} from '@app/services/storeWalletService';
import {
  formatCurrency,
  formatThaiDate,
  getWithdrawalStatusStyle,
} from '@shared/utils/formatters';

type TabType = 'PENDING' | 'APPROVED' | 'REJECTED';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'PENDING', label: 'รออนุมัติ', icon: 'time-outline' },
  { key: 'APPROVED', label: 'อนุมัติแล้ว', icon: 'checkmark-circle-outline' },
  { key: 'REJECTED', label: 'ปฏิเสธ', icon: 'close-circle-outline' },
];

export default function AdminWithdrawalListScreen() {
  const navigation = useNavigation<any>();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch Data
  const fetchData = useCallback(async (status: WithdrawalStatus) => {
    try {
      const data = await getAdminWithdrawalRequests(status);
      setWithdrawals(data);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      setWithdrawals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData(activeTab);
    }, [activeTab, fetchData]),
  );

  // Handle Tab Change
  const handleTabChange = (tab: TabType) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setLoading(true);
      fetchData(tab);
    }
  };

  // Handle Refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(activeTab);
  };

  // Navigate to Detail
  const handleItemPress = (item: AdminWithdrawalRequest) => {
    navigation.navigate('AdminWithdrawalDetail', { withdrawalId: item.id });
  };

  // Render Item
  const renderItem = ({ item }: { item: AdminWithdrawalRequest }) => {
    const statusStyle = getWithdrawalStatusStyle(item.status as WithdrawalStatus);

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          {item.store?.logo ? (
            <Image source={{ uri: item.store.logo }} style={styles.storeLogo} />
          ) : (
            <View style={styles.storeLogoPlaceholder}>
              <Ionicons name="storefront" size={24} color="#999" />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.storeName} numberOfLines={1}>
              {item.store?.name || `ร้านค้า #${item.storeId}`}
            </Text>
            <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={12} color="#999" />
              <Text style={styles.date}>{formatThaiDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.itemRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bgColor }]}>
            <Ionicons name={statusStyle.icon as any} size={12} color={statusStyle.color} />
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {statusStyle.label}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>
      </TouchableOpacity>
    );
  };

  // Render Empty
  const renderEmpty = () => {
    const emptyMessages = {
      PENDING: {
        icon: 'time-outline',
        title: 'ไม่มีคำขอรอดำเนินการ',
        subtitle: 'คำขอถอนเงินใหม่จะปรากฏที่นี่',
      },
      APPROVED: {
        icon: 'checkmark-circle-outline',
        title: 'ไม่มีคำขอที่อนุมัติแล้ว',
        subtitle: 'คำขอที่อนุมัติแล้วจะปรากฏที่นี่',
      },
      REJECTED: {
        icon: 'close-circle-outline',
        title: 'ไม่มีคำขอที่ถูกปฏิเสธ',
        subtitle: 'คำขอที่ถูกปฏิเสธจะปรากฏที่นี่',
      },
    };

    const message = emptyMessages[activeTab];

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBox}>
          <Ionicons name={message.icon as any} size={48} color="#bbb" />
        </View>
        <Text style={styles.emptyTitle}>{message.title}</Text>
        <Text style={styles.emptySubtitle}>{message.subtitle}</Text>
      </View>
    );
  };

  // Get tab count badge color
  const getTabBadgeStyle = (tab: TabType) => {
    if (tab === activeTab) {
      return { backgroundColor: 'rgba(255,255,255,0.3)' };
    }
    switch (tab) {
      case 'PENDING':
        return { backgroundColor: '#FFF3E0' };
      case 'APPROVED':
        return { backgroundColor: '#E8F5E9' };
      case 'REJECTED':
        return { backgroundColor: '#FFEBEE' };
      default:
        return { backgroundColor: '#F5F5F5' };
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="จัดการคำขอถอนเงิน" />

      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{withdrawals.length}</Text>
          <Text style={styles.statLabel}>
            {activeTab === 'PENDING'
              ? 'รอดำเนินการ'
              : activeTab === 'APPROVED'
              ? 'อนุมัติแล้ว'
              : 'ปฏิเสธ'}
          </Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => handleTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? '#fff' : '#666'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      ) : (
        <FlatList
          data={withdrawals}
          keyExtractor={(item) => `withdrawal-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContainer,
            withdrawals.length === 0 && styles.listContainerEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FF5722']}
              tintColor="#FF5722"
            />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  // Stats Header
  statsHeader: {
    backgroundColor: '#FF5722',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  // Tab
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 4,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#FF5722',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  // List
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  listContainerEmpty: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f0f0f0',
  },
  storeLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
