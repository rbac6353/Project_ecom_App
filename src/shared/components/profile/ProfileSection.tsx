// components/profile/ProfileSection.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';

// Props: title, children, และ navigation
interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
  navigation?: any;
}

export default function ProfileSection({ title, children, navigation }: ProfileSectionProps) {
  const { colors } = useTheme();
  const onViewMore = () => {
    if (title === "คำสั่งซื้อของฉัน") {
      navigation?.getParent()?.getParent()?.navigate('OrderHistory');
    }
  };

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: colors.card,
        shadowColor: colors.shadow,
      },
    ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity onPress={onViewMore}>
          <Text style={[styles.viewMore, { color: colors.subText }]}>ดูเพิ่มเติม ></Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { navigation });
          }
          if (typeof child === 'string' || typeof child === 'number') {
            return <Text key={String(child)} style={{ color: colors.text }}>{child}</Text>;
          }
          return child;
        })}
      </View>
    </View>
  );
}

// Component ย่อยสำหรับ Icon + Text (ใช้ใน "คำสั่งซื้อ")
interface SectionIconItemProps {
  icon: any;
  title: string;
  onPress?: () => void;
  navigation?: any;
  badge?: number; // เพิ่ม prop สำหรับ badge
}

export const SectionIconItem = ({ icon, title, onPress, badge }: SectionIconItemProps) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.iconItem} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={28} color={colors.icon} />
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.iconText, { color: colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewMore: {
    fontSize: 12,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  // Styles for SectionIconItem
  iconItem: {
    alignItems: 'center',
    flex: 1, // 👈 ทำให้แบ่งพื้นที่เท่ากัน
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  iconText: {
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
  },
});

