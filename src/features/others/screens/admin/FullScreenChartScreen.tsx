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
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
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
const screenHeight = Dimensions.get('window').height;

type RouteParams = {
  chartType: 'revenue' | 'orders';
  period: number;
};

export default function FullScreenChartScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  const { chartType = 'revenue', period = 7 } = params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [chartData, setChartData] = useState({
    dailyRevenue: [],
    dailyOrders: [],
  });

  const fetchChartData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await client.get(`/orders/admin/time-stats?days=${selectedPeriod}`);
      setChartData(res.data);
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

  const formatCurrency = (num: number) =>
    `฿${num.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;

  const formatNumber = (num: number) => num.toLocaleString('th-TH');

  const generateSmartLabels = (data: any[]) => {
    if (!data || data.length === 0) return [];

    const MAX_LABELS = chartType === 'revenue' ? 8 : 6;
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
          return `${dayNames[date.getDay()]}\n${date.getDate()}/${date.getMonth() + 1}`;
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

  const chartData_prepared = useMemo(() => {
    if (chartType === 'revenue') {
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
    } else {
      if (!chartData.dailyOrders.length) return null;
      const points = chartData.dailyOrders.map((d: any) => d.count || 0);
      return {
        labels: generateSmartLabels(chartData.dailyOrders),
        datasets: [{ data: points }],
      };
    }
  }, [chartData, selectedPeriod, chartType]);

  const orderSegments = useMemo(() => {
    if (chartType !== 'orders' || !chartData.dailyOrders.length) return 3;
    const max = Math.max(
      ...chartData.dailyOrders.map((d: any) => d.count || 0),
      0,
    );
    if (max <= 3) return 3;
    if (max <= 5) return max;
    return 6;
  }, [chartData.dailyOrders, chartType]);

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
        r: selectedPeriod <= 7 ? '6' : selectedPeriod <= 30 ? '4' : '0',
        strokeWidth: '2',
        stroke: '#fff',
        fill: '#FF5722',
      },
      propsForLabels: {
        fontSize: 12,
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

  const barChartConfig = useMemo(
    () => ({
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(120, 120, 120, ${opacity})`,
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
      formatYLabel: (value: string) =>
        Math.round(parseFloat(value || '0')).toString(),
    }),
    [selectedPeriod],
  );

  const summary = useMemo(() => {
    if (chartType === 'revenue') {
      const revenues = chartData.dailyRevenue.map((i: any) => i.revenue || 0);
      const totalRev = revenues.reduce((a, b) => a + b, 0);
      return {
        total: totalRev,
        avg: revenues.length ? totalRev / revenues.length : 0,
        max: Math.max(...revenues, 0),
        min: Math.min(...revenues.filter((r) => r > 0), 0) || 0,
      };
    } else {
      const orders = chartData.dailyOrders.map((i: any) => i.count || 0);
      const totalOrd = orders.reduce((a, b) => a + b, 0);
      return {
        total: totalOrd,
        avg: orders.length ? totalOrd / orders.length : 0,
        max: Math.max(...orders, 0),
        min: 0,
      };
    }
  }, [chartData, chartType]);

  const shouldShowDots = selectedPeriod <= 30;

  if (!LineChart || !BarChart) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={chartType === 'revenue' ? 'กราฟยอดขาย' : 'กราฟออเดอร์'} />
        <View style={styles.errorCenter}>
          <Ionicons name="alert-circle" size={48} color="#FF5722" />
          <Text style={styles.errorText}>กราฟยังไม่พร้อมใช้งาน</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={chartType === 'revenue' ? 'กราฟยอดขาย' : 'กราฟออเดอร์'}
      />

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
          {/* Summary Stats */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>รวมทั้งหมด</Text>
                <Text style={[styles.summaryValue, { color: '#FF5722' }]}>
                  {chartType === 'revenue'
                    ? formatCurrency(summary.total)
                    : formatNumber(summary.total)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>ค่าเฉลี่ย</Text>
                <Text style={[styles.summaryValue, { color: '#2196F3' }]}>
                  {chartType === 'revenue'
                    ? formatCurrency(summary.avg)
                    : formatNumber(Math.round(summary.avg))}
                </Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>สูงสุด</Text>
                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                  {chartType === 'revenue'
                    ? formatCurrency(summary.max)
                    : formatNumber(summary.max)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>ต่ำสุด</Text>
                <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                  {chartType === 'revenue'
                    ? formatCurrency(summary.min)
                    : formatNumber(summary.min)}
                </Text>
              </View>
            </View>
          </View>

          {/* Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>
                  {chartType === 'revenue' ? 'แนวโน้มยอดขาย' : 'จำนวนออเดอร์'}
                </Text>
                <Text style={styles.chartSubtitle}>
                  {selectedPeriod === 7
                    ? 'ย้อนหลัง 7 วัน'
                    : selectedPeriod === 30
                    ? 'ย้อนหลัง 30 วัน'
                    : 'ย้อนหลัง 90 วัน'}
                </Text>
              </View>
            </View>

            {chartData_prepared ? (
              <>
                {chartType === 'revenue' ? (
                  <LineChart
                    data={chartData_prepared}
                    width={screenWidth - 40}
                    height={screenHeight * 0.5}
                    chartConfig={lineChartConfig}
                    bezier
                    style={styles.chartStyle}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    fromZero={true}
                    segments={4}
                    xLabelsOffset={-10}
                    yLabelsOffset={10}
                    withDots={shouldShowDots}
                  />
                ) : (
                  <BarChart
                    data={chartData_prepared}
                    width={screenWidth - 40}
                    height={screenHeight * 0.5}
                    chartConfig={barChartConfig}
                    style={styles.chartStyle}
                    withInnerLines={false}
                    fromZero={true}
                    segments={orderSegments}
                    showValuesOnTopOfBars={selectedPeriod <= 7}
                    yAxisLabel=""
                    yAxisSuffix=""
                    xLabelsOffset={-10}
                    yLabelsOffset={10}
                  />
                )}

                {/* Data Table */}
                <View style={styles.dataTable}>
                  <Text style={styles.tableTitle}>รายละเอียดรายวัน</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableCell, styles.tableHeaderCell, { width: 100 }]}>
                          วันที่
                        </Text>
                        <Text style={[styles.tableCell, styles.tableHeaderCell, { width: 120 }]}>
                          {chartType === 'revenue' ? 'ยอดขาย' : 'จำนวนออเดอร์'}
                        </Text>
                      </View>
                      {(chartType === 'revenue'
                        ? chartData.dailyRevenue
                        : chartData.dailyOrders
                      )
                        .slice()
                        .reverse()
                        .map((item: any, index: number) => {
                          const date = new Date(item.date);
                          const dateStr = date.toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          });
                          const value =
                            chartType === 'revenue' ? item.revenue : item.count;
                          return (
                            <View key={index} style={styles.tableRow}>
                              <Text style={[styles.tableCell, { width: 100 }]}>
                                {dateStr}
                              </Text>
                              <Text style={[styles.tableCell, { width: 120 }]}>
                                {chartType === 'revenue'
                                  ? formatCurrency(value)
                                  : formatNumber(value)}
                              </Text>
                            </View>
                          );
                        })}
                    </View>
                  </ScrollView>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>ยังไม่มีข้อมูลในช่วงนี้</Text>
              </View>
            )}
          </View>
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
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
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
  chartTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  chartSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  chartStyle: {
    borderRadius: 16,
    paddingRight: 35,
  },
  dataTable: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    fontSize: 14,
    color: '#333',
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    color: '#666',
  },
  emptyState: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
});

