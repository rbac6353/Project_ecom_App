// components/common/ScreenHeader.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@app/providers/ThemeContext';

interface ScreenHeaderProps {
  title: string;
  rightAccessory?: React.ReactNode;
  onBack?: () => void; // ✅ custom back handler
  hideBack?: boolean;  // ✅ ซ่อนปุ่ม back ทางซ้าย
}

export default function ScreenHeader({ title, rightAccessory, onBack, hideBack }: ScreenHeaderProps) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBack) {
      // ถ้ามี onBack prop ให้ใช้ฟังก์ชันนั้น
      onBack();
    } else if (navigation.canGoBack()) {
      // ถ้าไม่มี onBack แต่มีหน้าจอให้กลับไปได้
      navigation.goBack();
    } else {
      // ถ้าไม่มีหน้าจอให้กลับไปได้ ให้ไปยัง MainTabs
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {hideBack ? (
        <View style={styles.button} />
      ) : (
        <TouchableOpacity onPress={handleBack} style={styles.button}>
          <Ionicons name="arrow-back-outline" size={28} color={colors.icon} />
        </TouchableOpacity>
      )}
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.button}>
        {rightAccessory && typeof rightAccessory !== 'string' && typeof rightAccessory !== 'number' ? rightAccessory : null}
        {rightAccessory && (typeof rightAccessory === 'string' || typeof rightAccessory === 'number') ? (
          <Text style={{ color: colors.text }}>{String(rightAccessory)}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  button: {
    width: 40,
    alignItems: 'center',
  },
});

