import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import {
  Wallet,
  WalletTransaction,
  WalletTransactionType,
} from '@shared/interfaces/wallet';
import * as walletService from '@app/services/walletService';

const WalletScreen: React.FC = () => {
  const { colors } = useTheme();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [w, txs] = await Promise.all([
        walletService.getMyWallet(),
        walletService.getTransactions(),
      ]);
      setWallet(w);
      setTransactions(txs);
    } catch (e: any) {
      console.error('Failed to load wallet:', e);
      setError('ไม่สามารถโหลดข้อมูลกระเป๋าเงินได้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const isPositive =
      item.type === WalletTransactionType.DEPOSIT ||
      item.type === WalletTransactionType.REFUND;

    const sign = isPositive ? '+' : '-';
    const amountColor = isPositive ? '#4CAF50' : '#F44336';

    const dateLabel = new Date(item.createdAt).toLocaleString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.txItem, { borderBottomColor: colors.border }]}>
        <View style={styles.txLeft}>
          <Text style={[styles.txTitle, { color: colors.text }]}>
            {item.description || item.type}
          </Text>
          {item.referenceId ? (
            <Text style={[styles.txRef, { color: colors.subText }]}>
              {item.referenceId}
            </Text>
          ) : null}
          <Text style={[styles.txDate, { color: colors.subText }]}>{dateLabel}</Text>
        </View>
        <Text style={[styles.txAmount, { color: amountColor }]}>
          {sign}
          {Math.abs(item.amount).toFixed(2)} THB
        </Text>
      </View>
    );
  };

  const balance = wallet?.balance ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="กระเป๋าเงินของฉัน" />

      <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
        <Ionicons name="wallet" size={40} color={colors.primary} />
        <Text style={[styles.balanceLabel, { color: colors.subText }]}>
          ยอดคงเหลือ
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.balanceValue, { color: colors.text }]}>
            ฿ {balance.toFixed(2)}
          </Text>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          activeOpacity={0.8}
          onPress={() => {}}
        >
          <Ionicons
            name="arrow-down-circle-outline"
            size={22}
            color={colors.primary}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>ถอนเงิน</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          activeOpacity={0.8}
          onPress={() => {}}
        >
          <Ionicons
            name="add-circle-outline"
            size={22}
            color={colors.primary}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>เติมเงิน</Text>
        </TouchableOpacity>
      </View>

      {error && !loading && (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { color: colors.error || '#F44336' }]}>
            {error}
          </Text>
        </View>
      )}

      <View style={[styles.listContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          ประวัติธุรกรรม
        </Text>
        {loading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTransaction}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: colors.subText }]}>
                  ยังไม่มีประวัติธุรกรรม
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

export default WalletScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
  },
  balanceLabel: {
    marginTop: 8,
    fontSize: 14,
  },
  balanceValue: {
    marginTop: 6,
    fontSize: 32,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  loadingArea: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  errorBox: {
    marginTop: 8,
    marginHorizontal: 16,
  },
  errorText: {
    fontSize: 13,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txLeft: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  txRef: {
    fontSize: 12,
    marginTop: 2,
  },
  txDate: {
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 13,
  },
});

