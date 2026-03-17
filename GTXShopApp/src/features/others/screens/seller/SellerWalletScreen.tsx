import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useAuth } from '@app/providers/AuthContext';
import client from '@app/api/client';
import {
  getStoreWalletBalance,
  getStoreTransactions,
  getStoreWithdrawalRequests,
  StoreWallet,
  StoreWalletTransaction,
  StoreWithdrawalRequest,
  StoreTransactionType,
  WithdrawalStatus,
} from '@app/services/storeWalletService';
import {
  formatCurrency,
  formatCurrencyWithSign,
  formatThaiDate,
  getWithdrawalStatusStyle,
  getTransactionTypeStyle,
  getAmountColor,
} from '@shared/utils/formatters';

type TabType = 'transactions' | 'withdrawals';

export default function SellerWalletScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // State
  const [wallet, setWallet] = useState<StoreWallet | null>(null);
  const [transactions, setTransactions] = useState<StoreWalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<StoreWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [storeId, setStoreId] = useState<number | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);

  // ดึง storeId จาก user context หรือ API
  useEffect(() => {
    const fetchStoreId = async () => {
      setStoreLoading(true);
      
      // ลองดึงจาก user context ก่อน
      if (user?.stores && user.stores.length > 0) {
        setStoreId(user.stores[0].id);
        setStoreLoading(false);
        return;
      }

      // ถ้าไม่มีใน context ให้เรียก API
      try {
        const userData = await client.get('/auth/profile');
        const stores = userData?.stores || [];
        if (stores.length > 0) {
          setStoreId(stores[0].id);
        } else {
          setStoreId(null);
        }
      } catch (error) {
        console.error('Error fetching store:', error);
        setStoreId(null);
      } finally {
        setStoreLoading(false);
      }
    };

    fetchStoreId();
  }, [user]);

  // Fetch Wallet Data
  const fetchData = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      const [walletData, txData, withdrawalData] = await Promise.all([
        getStoreWalletBalance(storeId),
        getStoreTransactions(storeId),
        getStoreWithdrawalRequests(storeId),
      ]);

      setWallet(walletData);
      setTransactions(txData);
      setWithdrawals(withdrawalData);
    } catch (error: any) {
      console.error('Error fetching wallet data:', error);
      // ถ้า error 404 หมายความว่ายังไม่มี wallet ให้สร้างค่าเริ่มต้น
      if (error?.response?.status === 404) {
        setWallet({ id: 0, storeId: storeId, balance: 0, createdAt: '', updatedAt: '' });
        setTransactions([]);
        setWithdrawals([]);
      } else {
        Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลกระเป๋าเงินได้');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  // useFocusEffect เพื่อ refresh ทุกครั้งที่กลับมาหน้านี้
  useFocusEffect(
    useCallback(() => {
      if (storeId) {
        setLoading(true);
        fetchData();
      }
    }, [storeId, fetchData]),
  );

  // Handle Refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Navigate to Withdraw Screen
  const handleWithdraw = () => {
    if (!wallet || Number(wallet.balance) <= 0) {
      Alert.alert('แจ้งเตือน', 'ยอดเงินคงเหลือไม่เพียงพอสำหรับการถอน');
      return;
    }
    navigation.navigate('SellerWithdraw', {
      storeId,
      balance: wallet.balance,
    });
  };

  // Render Transaction Item
  const renderTransactionItem = ({ item }: { item: StoreWalletTransaction }) => {
    const numAmount = Number(item.amount);
    const isPositive = numAmount > 0;
    const typeStyle = getTransactionTypeStyle(item.type as StoreTransactionType);

    return (
      <View style={styles.listItem}>
        <View style={[styles.typeIcon, { backgroundColor: typeStyle.bgColor }]}>
          <Ionicons
            name={typeStyle.icon as any}
            size={20}
            color={typeStyle.color}
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{typeStyle.label}</Text>
          <Text style={styles.itemDesc} numberOfLines={1}>
            {item.description || item.referenceId || '-'}
          </Text>
          <Text style={styles.itemDate}>{formatThaiDate(item.createdAt)}</Text>
        </View>
        <Text style={[styles.itemAmount, { color: getAmountColor(numAmount) }]}>
          {formatCurrencyWithSign(numAmount)}
        </Text>
      </View>
    );
  };

  // Render Withdrawal Item
  const renderWithdrawalItem = ({ item }: { item: StoreWithdrawalRequest }) => {
    const statusStyle = getWithdrawalStatusStyle(item.status as WithdrawalStatus);

    return (
      <View style={styles.listItem}>
        <View style={[styles.typeIcon, { backgroundColor: statusStyle.bgColor }]}>
          <Ionicons name="wallet-outline" size={20} color={statusStyle.color} />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>
            ถอนเงิน {formatCurrency(item.amount)}
          </Text>
          <Text style={styles.itemDesc} numberOfLines={1}>
            {item.bankName} - {item.accountNumber}
          </Text>
          <Text style={styles.itemDate}>{formatThaiDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bgColor }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {statusStyle.label}
          </Text>
        </View>
      </View>
    );
  };

  // Empty Components
  const TransactionEmptyComponent = () => (
    <View style={styles.emptyList}>
      <Ionicons name="receipt-outline" size={64} color="#ccc" />
      <Text style={styles.emptyListTitle}>ไม่พบรายการ</Text>
      <Text style={styles.emptyListText}>
        รายการเดินบัญชีจะปรากฏที่นี่เมื่อมียอดขาย
      </Text>
    </View>
  );

  const WithdrawalEmptyComponent = () => (
    <View style={styles.emptyList}>
      <Ionicons name="wallet-outline" size={64} color="#ccc" />
      <Text style={styles.emptyListTitle}>ไม่พบรายการ</Text>
      <Text style={styles.emptyListText}>
        ประวัติการถอนเงินจะปรากฏที่นี่
      </Text>
    </View>
  );

  // Loading State (รอดึงข้อมูลร้านค้า)
  if (storeLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="กระเป๋าเงินร้านค้า" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      </View>
    );
  }

  // ถ้าไม่มีร้านค้า
  if (!storeId) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="กระเป๋าเงินร้านค้า" />
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>คุณยังไม่มีร้านค้า</Text>
        </View>
      </View>
    );
  }

  // Loading State (รอดึงข้อมูล wallet)
  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="กระเป๋าเงินร้านค้า" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="กระเป๋าเงินร้านค้า" />

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceCardInner}>
          <Text style={styles.balanceLabel}>ยอดเงินคงเหลือ</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(wallet?.balance ?? 0)}
          </Text>
          <TouchableOpacity 
            style={styles.withdrawBtn} 
            onPress={handleWithdraw}
            activeOpacity={0.8}
          >
            <Ionicons name="wallet-outline" size={20} color="#fff" />
            <Text style={styles.withdrawBtnText}>ถอนเงิน</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="receipt-outline" 
            size={18} 
            color={activeTab === 'transactions' ? '#fff' : '#666'} 
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'transactions' && styles.activeTabText,
            ]}
          >
            รายการเดินบัญชี
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'withdrawals' && styles.activeTab]}
          onPress={() => setActiveTab('withdrawals')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="time-outline" 
            size={18} 
            color={activeTab === 'withdrawals' ? '#fff' : '#666'} 
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'withdrawals' && styles.activeTabText,
            ]}
          >
            ประวัติการถอน
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {activeTab === 'transactions' ? (
        <FlatList
          data={transactions}
          keyExtractor={(item) => `tx-${item.id}`}
          renderItem={renderTransactionItem}
          contentContainerStyle={[
            styles.listContainer,
            transactions.length === 0 && styles.listContainerEmpty,
          ]}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={['#FF5722']}
              tintColor="#FF5722"
            />
          }
          ListEmptyComponent={TransactionEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={withdrawals}
          keyExtractor={(item) => `wd-${item.id}`}
          renderItem={renderWithdrawalItem}
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
          ListEmptyComponent={WithdrawalEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
  },
  // Balance Card
  balanceCard: {
    margin: 15,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  balanceCardInner: {
    backgroundColor: '#FF5722',
    padding: 28,
    alignItems: 'center',
    // Gradient effect using linear gradient would be nice here
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 38,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 1,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  withdrawBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Tab
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
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
  // List
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  listContainerEmpty: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  typeIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  itemDesc: {
    fontSize: 12,
    color: '#888',
    marginBottom: 3,
  },
  itemDate: {
    fontSize: 11,
    color: '#aaa',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyListTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptyListText: {
    marginTop: 8,
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
