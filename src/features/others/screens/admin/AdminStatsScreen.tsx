import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/RootStackNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

// Dynamic import setup
let LineChart: any = null;
let BarChart: any = null;

try {
  const chartKit = require('react-native-chart-kit');
  LineChart = chartKit.LineChart;
  BarChart = chartKit.BarChart;
} catch (error) {
  console.warn('⚠️ Chart Kit not found');
}

const screenWidth = Dimensions.get('window').width;

export default function AdminStatsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  // Tooltip
  const [tooltipPos, setTooltipPos] = useState({
    x: 0,
    y: 0,
    visible: false,
    value: 0,
    label: '',
  });

  const [chartData, setChartData] = useState({
    dailyRevenue: [],
    dailyOrders: [],
  });

  const fetchChartData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setTooltipPos((prev) => ({ ...prev, visible: false }));
      const res = await client.get(`/orders/admin/time-stats?days=${selectedPeriod}`);
      console.log('📈 Chart Data:', res.data);
      
      // ตรวจสอบและ set chartData พร้อม default values
      if (res.data && typeof res.data === 'object') {
        setChartData({
          dailyRevenue: Array.isArray(res.data.dailyRevenue) ? res.data.dailyRevenue : [],
          dailyOrders: Array.isArray(res.data.dailyOrders) ? res.data.dailyOrders : [],
        });
      } else {
        console.warn('⚠️ Invalid chart data response:', res.data);
        setChartData({
          dailyRevenue: [],
          dailyOrders: [],
        });
      }
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChartData();
    }, [selectedPeriod]),
  );

  // --- Helper Functions ---
  const formatCurrency = (num: number) =>
    `฿${num.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;

  const formatNumber = (num: number) => num.toLocaleString('th-TH');

  // สร้าง label แบบ smart
  const generateSmartLabels = (data: any[]) => {
    if (!data || data.length === 0) return [];

    const MAX_LABELS = 5;
    const totalPoints = data.length;
    const interval = Math.ceil(totalPoints / MAX_LABELS);

    return data.map((item, index) => {
      if (index === 0 || index === totalPoints - 1 || index % interval === 0) {
        const dateStr =
          typeof item.date === 'string'
            ? item.date
            : item.date?.toISOString?.()?.split('T')[0];
        const date = new Date(dateStr || item.date);

        if (isNaN(date.getTime())) return '';

        if (selectedPeriod <= 7) {
          const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
          return dayNames[date.getDay()];
        }
        if (selectedPeriod <= 30) {
          return `${date.getDate()}/${date.getMonth() + 1}`;
        }
        const year = date.getFullYear().toString().slice(-2);
        return `${date.getMonth() + 1}/${year}`;
      }
      return '';
    });
  };

  // --- Data Preparation ---
  const revenueData = useMemo(() => {
    if (!chartData.dailyRevenue.length) return null;

    return {
      labels: generateSmartLabels(chartData.dailyRevenue),
      datasets: [
        {
          data: chartData.dailyRevenue.map((d: any) => d.revenue),
          color: (opacity = 1) => `rgba(255, 87, 34, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  }, [chartData.dailyRevenue, selectedPeriod]);

  // ✅ จำนวนออเดอร์ (แก้ให้เหมือนตัวอย่าง)
  const ordersData = useMemo(() => {
    if (!chartData.dailyOrders.length) return null;

    const points = chartData.dailyOrders.map((d: any) => d.count || 0);

    return {
      labels: generateSmartLabels(chartData.dailyOrders),
      datasets: [
        {
          data: points,
        },
      ],
    };
  }, [chartData.dailyOrders, selectedPeriod]);

  // ✅ ใช้กำหนดจำนวนเส้นแกน Y ให้ดูพอดี (0–3, 0–5 ฯลฯ)
  const orderSegments = useMemo(() => {
    if (!chartData.dailyOrders.length) return 3;

    const max = Math.max(
      ...chartData.dailyOrders.map((d: any) => d.count || 0),
      0,
    );

    if (max <= 3) return 3;
    if (max <= 5) return max; // 0–4 หรือ 0–5
    return 6; // ไม่ให้ถี่เกินไปถ้ามากกว่า 5
  }, [chartData.dailyOrders]);

  // 🔸 กำหนดพฤติกรรม dot ตามช่วงเวลา
  const shouldShowDots = selectedPeriod <= 30; // 7 / 30 วันมี dot, 90 วันไม่ต้อง

  // --- Chart Configurations (useMemo เพื่อให้เปลี่ยนตาม period) ---
  const lineChartConfig = useMemo(
    () => ({
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      fillShadowGradient: '#FF5722',
      fillShadowGradientFrom: '#FF5722',
      fillShadowGradientTo: '#ffffff',
      fillShadowGradientOpacity: 0.35,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(255, 87, 34, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(120, 120, 120, ${opacity})`,
      propsForDots: {
        // 🔸 ช่วงสั้น = จุดใหญ่, ช่วงยาว = จุดเล็ก / ไม่ต้องเห็น
        r: selectedPeriod <= 7 ? '5' : selectedPeriod <= 30 ? '3' : '0',
        strokeWidth: '2',
        stroke: '#fff',
        fill: '#FF5722',
      },
      propsForLabels: {
        fontSize: 11,
        fontWeight: '600',
      },
      propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: '#F0F0F0',
        strokeWidth: 1,
      },
      formatYLabel: (value: string) => {
        const num = parseFloat(value);
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
        return num.toString();
      },
    }),
    [selectedPeriod],
  );

  // ✅ config ของ BarChart ให้เป็นแท่งฟ้าไล่สีเหมือนในรูป
  const barChartConfig = useMemo(
    () => ({
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(120, 120, 120, ${opacity})`,
      // ไล่สีแท่งกราฟ
      fillShadowGradient: '#2196F3',
      fillShadowGradientFrom: '#64B5F6',
      fillShadowGradientTo: '#2196F3',
      fillShadowGradientOpacity: 1,
      barPercentage: selectedPeriod <= 7 ? 0.4 : selectedPeriod <= 30 ? 0.55 : 0.65,
      categoryPercentage: 0.7,
      propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: '#F0F0F0',
        strokeWidth: 1,
      },
      // ให้แกน Y เป็นจำนวนเต็ม 0,1,2,3,...
      formatYLabel: (value: string) =>
        Math.round(parseFloat(value || '0')).toString(),
    }),
    [selectedPeriod],
  );

  // Handle Click on Line Chart
  const handleDataPointClick = (data: any) => {
    const { value, x, y, index } = data;
    const rawItem = chartData.dailyRevenue[index] as any;
    const dateStr = rawItem
      ? new Date(rawItem.date).toLocaleDateString('th-TH')
      : '';

    setTooltipPos({
      x,
      y,
      visible: true,
      value,
      label: dateStr,
    });
  };

  // Summary
  const summary = useMemo(() => {
    // ตรวจสอบว่า dailyRevenue และ dailyOrders เป็น array หรือไม่
    const revenues = Array.isArray(chartData?.dailyRevenue)
      ? chartData.dailyRevenue.map((i: any) => i?.revenue || 0)
      : [];
    const orders = Array.isArray(chartData?.dailyOrders)
      ? chartData.dailyOrders.map((i: any) => i?.count || 0)
      : [];
    
    const totalRev = revenues.reduce((a, b) => a + b, 0);
    const totalOrd = orders.reduce((a, b) => a + b, 0);

    return {
      totalRevenue: totalRev,
      totalOrders: totalOrd,
      avgRevenue: revenues.length ? totalRev / revenues.length : 0,
      avgOrders: orders.length ? totalOrd / orders.length : 0,
      maxRevenue: revenues.length > 0 ? Math.max(...revenues, 0) : 0,
      maxOrders: orders.length > 0 ? Math.max(...orders, 0) : 0,
      avgOrderValue: totalOrd > 0 ? totalRev / totalOrd : 0,
    };
  }, [chartData]);

  if (!LineChart || !BarChart) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="กราฟสถิติ" />
        <View style={styles.errorCenter}>
          <Ionicons name="alert-circle" size={48} color="#FF5722" />
          <Text style={styles.errorText}>กราฟยังไม่พร้อมใช้งาน</Text>
          <Text style={styles.errorSubtext}>
            กรุณา restart Metro bundler และ reload app
          </Text>
          <Text style={styles.errorSubtext}>
            หรือรัน: npm install react-native-chart-kit react-native-svg
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onTouchStart={() => setTooltipPos((prev) => ({ ...prev, visible: false }))}
    >
      <ScreenHeader title="กราฟสถิติ" />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[7, 30, 90].map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.tabBtn, selectedPeriod === days && styles.tabBtnActive]}
            onPress={() => setSelectedPeriod(days)}
          >
            <Text
              style={[
                styles.tabText,
                selectedPeriod === days && styles.tabTextActive,
              ]}
            >
              {days} วัน
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF5722" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchChartData(true)}
              colors={['#FF5722']}
            />
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <View
                style={[
                  styles.card,
                  styles.summaryCard,
                  { borderLeftColor: '#FF5722', borderLeftWidth: 4 },
                ]}
              >
                <Ionicons name="cash" size={24} color="#FF5722" />
                <Text style={styles.cardLabel}>ยอดขายรวม</Text>
                <Text style={[styles.cardValue, { color: '#FF5722' }]}>
                  {formatCurrency(summary.totalRevenue)}
                </Text>
              </View>
              <View
                style={[
                  styles.card,
                  styles.summaryCard,
                  { borderLeftColor: '#2196F3', borderLeftWidth: 4 },
                ]}
              >
                <Ionicons name="document-text" size={24} color="#2196F3" />
                <Text style={styles.cardLabel}>ออเดอร์รวม</Text>
                <Text style={[styles.cardValue, { color: '#2196F3' }]}>
                  {formatNumber(summary.totalOrders)}
                </Text>
              </View>
            </View>
            <View style={[styles.summaryRow, { marginTop: -5 }]}>
              <View
                style={[
                  styles.card,
                  styles.summaryCard,
                  { borderLeftColor: '#4CAF50', borderLeftWidth: 4 },
                ]}
              >
                <Ionicons name="trending-up" size={24} color="#4CAF50" />
                <Text style={styles.cardLabel}>เฉลี่ย/วัน</Text>
                <Text style={[styles.cardValue, { color: '#4CAF50' }]}>
                  {formatCurrency(summary.avgRevenue)}
                </Text>
              </View>
              <View
                style={[
                  styles.card,
                  styles.summaryCard,
                  { borderLeftColor: '#FF9800', borderLeftWidth: 4 },
                ]}
              >
                <Ionicons name="cart" size={24} color="#FF9800" />
                <Text style={styles.cardLabel}>AOV (เฉลี่ย/บิล)</Text>
                <Text style={[styles.cardValue, { color: '#FF9800' }]}>
                  {formatCurrency(summary.avgOrderValue)}
                </Text>
              </View>
            </View>
          </View>

          {/* Revenue Chart */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate('FullScreenChart', {
                chartType: 'revenue',
                period: selectedPeriod,
              })
            }
          >
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>แนวโน้มยอดขาย</Text>
                  <Text style={styles.chartSubtitle}>
                    {selectedPeriod === 7
                      ? 'ย้อนหลัง 7 วัน'
                      : selectedPeriod === 30
                      ? 'ย้อนหลัง 30 วัน'
                      : 'ย้อนหลัง 90 วัน'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.maxBadge}>
                    สูงสุด {formatCurrency(summary.maxRevenue)}
                  </Text>
                  <Ionicons
                    name="expand-outline"
                    size={20}
                    color="#FF5722"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </View>
              {revenueData ? (
                <View>
                  {tooltipPos.visible && (
                    <View
                      style={[
                        styles.tooltip,
                        {
                          top: tooltipPos.y - 50,
                          left: Math.min(tooltipPos.x - 30, screenWidth - 100),
                        },
                      ]}
                    >
                      <Text style={styles.tooltipLabel}>{tooltipPos.label}</Text>
                      <Text style={styles.tooltipValue}>
                        {formatCurrency(tooltipPos.value)}
                      </Text>
                      <View style={styles.tooltipArrow} />
                    </View>
                  )}

                  <LineChart
                    data={revenueData}
                    width={screenWidth - 30}
                    height={240}
                    chartConfig={lineChartConfig}
                    bezier
                    style={styles.chartStyle}
                    onDataPointClick={handleDataPointClick}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    fromZero={true}
                    segments={4}
                    xLabelsOffset={-10}
                    yLabelsOffset={10}
                    withDots={shouldShowDots} // 🔸 จุดแสดงเฉพาะช่วงสั้น
                  />
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>ยังไม่มีข้อมูลในช่วงนี้</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Orders Chart */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate('FullScreenChart', {
                chartType: 'orders',
                period: selectedPeriod,
              })
            }
          >
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>จำนวนออเดอร์</Text>
                  <Text style={styles.chartSubtitle}>
                    {selectedPeriod === 7
                      ? 'ย้อนหลัง 7 วัน'
                      : selectedPeriod === 30
                      ? 'ย้อนหลัง 30 วัน'
                      : 'ย้อนหลัง 90 วัน'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.maxBadge}>
                    สูงสุด {formatNumber(summary.maxOrders)} ออเดอร์
                  </Text>
                  <Ionicons
                    name="expand-outline"
                    size={20}
                    color="#2196F3"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </View>
              {ordersData ? (
                <BarChart
                  data={ordersData}
                  width={screenWidth - 30}
                  height={220}
                  chartConfig={barChartConfig}
                  style={styles.chartStyle}
                  withInnerLines={false}
                  fromZero={true}
                  segments={orderSegments} // ✅ ให้สเกลแกน Y พอดีเหมือนในภาพ
                  showValuesOnTopOfBars={selectedPeriod <= 7} // ✅ โชว์ตัวเลขบนแท่งเฉพาะ 7 วัน
                  yAxisLabel=""
                  yAxisSuffix=""
                  xLabelsOffset={-10}
                  yLabelsOffset={10}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>ยังไม่มีข้อมูลในช่วงนี้</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  errorCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 100,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },

  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 6,
  },
  tabBtnActive: { backgroundColor: '#FF5722' },
  tabText: { fontSize: 14, color: '#757575', fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  summaryContainer: {
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  summaryCard: {
    width: (screenWidth - 40) / 2,
  },
  cardLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: { fontSize: 18, fontWeight: 'bold' },

  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 16,
    padding: 15,
    paddingBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  chartSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },

  // 🔸 badge ขวาบน "สูงสุด …"
  maxBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,87,34,0.06)',
    fontSize: 11,
    color: '#FF5722',
    fontWeight: '600',
  },

  chartStyle: {
    borderRadius: 16,
    paddingRight: 35,
  },

  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 100,
    alignItems: 'center',
    minWidth: 100,
  },
  tooltipLabel: { color: '#ccc', fontSize: 10, marginBottom: 2 },
  tooltipValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  tooltipArrow: {
    position: 'absolute',
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(30, 30, 30, 0.9)',
  },

  emptyState: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
});
