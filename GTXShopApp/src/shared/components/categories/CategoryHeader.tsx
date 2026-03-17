// components/categories/CategoryHeader.tsx
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';

export default function CategoryHeader() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const handleSearch = () => {
    navigation.navigate('SearchInput');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity 
        style={[styles.searchBar, { backgroundColor: colors.background, marginTop: -insets.top + 5 }]} 
        onPress={handleSearch}
        activeOpacity={0.8}
      >
        <Text style={[styles.placeholderText, { color: colors.subText }]}>ป้อนคำเพื่อค้นหา</Text>
        
        <Ionicons name="camera-outline" size={24} color={colors.subText} style={styles.cameraIcon} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.searchButton, { backgroundColor: '#000000', marginTop: -insets.top + 5 }]} 
        onPress={handleSearch}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="search" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 15,
  },
  placeholderText: {
    fontSize: 14,
    flex: 1,
  },
  cameraIcon: {
    marginLeft: 10,
  },
  searchButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

