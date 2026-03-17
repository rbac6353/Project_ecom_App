import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/ThemeContext';
import { OrderReturnStatus } from '@shared/interfaces/returns';

interface Props {
  status: OrderReturnStatus;
}

const labels: Record<OrderReturnStatus, string> = {
  REQUESTED: 'รอดำเนินการ',
  APPROVED: 'อนุมัติ',
  REFUNDED: 'คืนเงินแล้ว',
  REJECTED: 'ปฏิเสธ',
  CANCELLED: 'ยกเลิกแล้ว',
};

const colorsMap: Record<
  OrderReturnStatus,
  { bg: string; text: string }
> = {
  REQUESTED: { bg: '#FFF3E0', text: '#FB8C00' }, // orange
  APPROVED: { bg: '#E8F5E9', text: '#43A047' }, // green
  REFUNDED: { bg: '#E3F2FD', text: '#1E88E5' }, // blue
  REJECTED: { bg: '#FFEBEE', text: '#E53935' }, // red
  CANCELLED: { bg: '#F5F5F5', text: '#757575' }, // grey
};

const ReturnStatusBadge: React.FC<Props> = ({ status }) => {
  const { colors } = useTheme();
  const config = colorsMap[status] || colorsMap.REQUESTED;
  const label = labels[status] || status;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.text + '55',
        },
      ]}
    >
      <Text style={[styles.text, { color: config.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default ReturnStatusBadge;


