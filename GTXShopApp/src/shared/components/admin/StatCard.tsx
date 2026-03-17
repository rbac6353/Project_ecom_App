import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: any;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon,
  color,
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.title, { color: colors.subText }]}>{title}</Text>
        {subValue && <Text style={[styles.sub, { color: colors.primary }]}>{subValue}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  content: { justifyContent: 'center' },
  value: { fontSize: 20, fontWeight: 'bold' },
  title: { fontSize: 12, marginTop: 2 },
  sub: { fontSize: 10, marginTop: 4, fontWeight: '600' },
});

export default StatCard;

