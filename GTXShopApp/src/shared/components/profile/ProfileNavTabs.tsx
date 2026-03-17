// components/profile/ProfileNavTabs.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';

const TabItem = ({ icon, title, onPress }: { icon: any; title: string; onPress: () => void }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress}>
      <Ionicons name={icon} size={28} color={colors.icon} />
      <Text style={[styles.tabText, { color: colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
};

export default function ProfileNavTabs({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <TabItem 
        icon="heart-outline" 
        title="รายการที่อยากได้" 
        onPress={() => navigation.navigate('WishlistScreen')} // 👈 3. เพิ่ม onPress
      />
      <TabItem 
        icon="eye-outline" 
        title="กำลังติดตาม" 
        onPress={() => navigation.getParent()?.getParent()?.navigate('Following')} // 👈 Navigate ไปยัง Following
      />
      <TabItem 
        icon="time-outline" 
        title="ประวัติ" 
        onPress={() => navigation.navigate('HistoryScreen')} // 👈 3. เพิ่ม onPress
      />
      <TabItem 
        icon="pricetag-outline" 
        title="คูปอง" 
        onPress={() => navigation.navigate('VouchersScreen')} // 👈 3. เพิ่ม onPress
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
  },
  tabItem: {
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    marginTop: 5,
  },
});

