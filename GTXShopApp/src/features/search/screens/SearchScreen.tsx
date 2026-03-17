// screens/SearchScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import { CameraProvider } from '@app/providers/CameraContext';
import { BlurView } from 'expo-blur';

import ScanTab from '@shared/components/search/ScanTab';

const SearchScreenContent = () => (
    <View style={styles.container}>
      {/* กล้องเต็มจอ + ปุ่มควบคุมจาก ScanTab */}
      <ScanTab />

      {/* เก็บแค่แถบด้านบน */}
      <BlurView intensity={80} tint="dark" style={styles.topBar}>
        <Text style={styles.titleText}>สแกนสินค้า</Text>
      </BlurView>
    </View>
);

export default function SearchScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { colors } = useTheme();

  if (!permission) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>กำลังโหลด...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContent}>
          <Ionicons name="camera-outline" size={80} color={colors.primary} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            อนุญาตการเข้าถึงกล้อง
          </Text>
          <Text style={[styles.permissionDescription, { color: colors.subText }]}>
            เราต้องการสิทธิ์ในการเข้าถึงกล้อง{'\n'}เพื่อสแกนบาร์โค้ดสินค้า
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>อนุญาต</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <CameraProvider>
      <SearchScreenContent />
    </CameraProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // แถบด้านบน
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // หน้าขออนุญาต
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
