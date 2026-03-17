import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

interface FlashSaleItem {
  id: number;
  discountPrice: number; // ตรงกับ database: discountPrice
  limitStock: number; // ตรงกับ database: limitStock
  sold: number;
  product?: {
    id: number;
    title: string;
    price: number;
  };
}

interface FlashSale {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  items?: FlashSaleItem[];
}

export default function AdminFlashSaleListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [campaigns, setCampaigns] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setError(null);
      // client.get() คืน data โดยตรง
      const data = await client.get('/flash-sales/admin/all');

      const list: FlashSale[] = Array.isArray(data) ? data : [];
      setCampaigns(list);
    } catch (e: any) {
      console.error('❌ Error fetching flash sale campaigns:', e?.response || e);
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'ไม่สามารถโหลดรายการ Flash Sale ได้';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchCampaigns();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCampaigns();
  };

  const renderStatus = (campaign: FlashSale) => {
    const now = new Date();
    const start = new Date(campaign.startTime);
    const end = new Date(campaign.endTime);

    let label = 'สิ้นสุดแล้ว';
    let color = '#9E9E9E';

    if (now < start) {
      label = 'กำลังจะเริ่ม';
      color = '#FF9800';
    } else if (now >= start && now <= end && campaign.isActive) {
      label = 'กำลังจัดโปร';
      color = '#4CAF50';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
        <Ionicons name="flash" size={14} color={color} />
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderCampaign = (c: FlashSale) => {
    const start = new Date(c.startTime);
    const end = new Date(c.endTime);
    const items = c.items || [];
    const totalStock = items.reduce((sum, i) => sum + (i.limitStock || 0), 0);
    const totalSold = items.reduce((sum, i) => sum + (i.sold || 0), 0);

    return (
      <View key={c.id} style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {c.name}
          </Text>
          {renderStatus(c)}
        </View>
        <Text style={[styles.timeText, { color: colors.subText }]}>
          {start.toLocaleString()} - {end.toLocaleString()}
        </Text>
        <Text style={[styles.metaText, { color: colors.subText }]}>
          สินค้าในโปร: {items.length} รายการ
        </Text>
        <Text style={[styles.metaText, { color: colors.subText }]}>
          ใช้โควตาแล้ว: {totalSold}/{totalStock} ชิ้น
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="จัดการ Flash Sale" />
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AdminCreateFlashSale')}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createButtonText}>สร้างแคมเปญใหม่</Text>
      </TouchableOpacity>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle" size={32} color="#FF5722" />
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          </View>
        ) : campaigns.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="flash-off" size={40} color={colors.subText} />
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              ยังไม่มีแคมเปญ Flash Sale
            </Text>
          </View>
        ) : (
          <View>
            {campaigns.map(renderCampaign)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  center: {
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

