// components/search/ScanTab.tsx
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useCamera } from '@app/providers/CameraContext';
import { useNavigation } from '@react-navigation/native'; // 👈 1. Import Navigation
import { visualSearch } from '@app/services/searchService'; // 👈 2. Import Service

export default function ScanTab() {
  const { facing, enableTorch } = useCamera();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [isSearching, setIsSearching] = useState(false); // 👈 4. สถานะ Loading
  const cameraRef = useRef<any>(null);
  const navigation = useNavigation<any>(); // 👈 3. ใช้ Hook
  const insets = useSafeAreaInsets();

  // 5. ฟังก์ชันประมวลผลและค้นหา
  const processImage = async (uri: string) => {
    setIsSearching(true);
    try {
      const { products, otherProducts } = await visualSearch(uri);
      const total = (products?.length || 0) + (otherProducts?.length || 0);

      Alert.alert('ค้นหาสำเร็จ', `พบสินค้า ${total} รายการ`, [
        {
          text: 'ดูผลลัพธ์',
          onPress: () => {
            navigation.navigate('ProductList', {
              products,
              otherProducts: otherProducts || [],
              query: 'ผลการค้นหาด้วยภาพ',
            });
          }
        }
      ]);

    } catch (e: any) {
      Alert.alert('ผิดพลาด', e.message || 'ไม่สามารถค้นหาสินค้าจากภาพได้');
    } finally {
      setIsSearching(false);
    }
  };

  // 6. ฟังก์ชันถ่ายภาพ (Take Picture)
  const takePicture = async () => {
    if (cameraRef.current && permission?.granted) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        processImage(photo.uri); // 👈 ประมวลผล
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถถ่ายภาพได้');
      }
    }
  };

  // ฟังก์ชันเปิด/ปิดไฟฉาย
  const toggleFlashlight = () => {
    setFlashlightOn(!flashlightOn);
  };

  // 7. ฟังก์ชันเปิดอัลบั้ม (Open Album)
  const openAlbum = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องการสิทธิ์', 'เราต้องการสิทธิ์ในการเข้าถึงอัลบั้มของคุณ');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // ✅ SDK 53+ format
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      processImage(result.assets[0].uri); // 👈 ประมวลผล
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>เราต้องการสิทธิ์ในการเข้าถึงกล้อง</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>อนุญาต</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isSearching ? ( // 8. แสดง Loading เมื่อกำลังค้นหา
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={styles.loadingText}>กำลังค้นหาสินค้า...</Text>
        </View>
      ) : null}

      {/* กล้อง */}
      <CameraView style={StyleSheet.absoluteFillObject} facing={facing} enableTorch={enableTorch} ref={cameraRef} />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* พื้นที่กลาง - วงเล็บและไฟฉาย */}
        <View style={styles.centerArea}>
          {/* วงเล็บด้านบน */}
          <View style={styles.topBrackets}>
            <View style={styles.bracketTopLeft} />
            <View style={styles.bracketTopRight} />
          </View>

          {/* ไฟฉายตรงกลาง */}
          <View style={styles.flashlightContainer}>
            <TouchableOpacity style={styles.flashlightButton} onPress={toggleFlashlight}>
              <Ionicons name={flashlightOn ? "flash" : "flash-outline"} size={36} color="white" />
              <Text style={styles.flashlightText}>แตะเพื่อเปิดไฟฉาย</Text>
            </TouchableOpacity>
          </View>

          {/* วงเล็บด้านล่าง */}
          <View style={styles.bottomBrackets}>
            <View style={styles.bracketBottomLeft} />
            <View style={styles.bracketBottomRight} />
          </View>
        </View>

        {/* ส่วนควบคุมด้านล่าง */}
        <View style={[styles.controlsContainer, { paddingBottom: 90 + insets.bottom }]}>
          <View style={styles.controlsRow}>
            {/* อัลบั้ม - ซ้าย */}
            <TouchableOpacity style={styles.sideButton} onPress={openAlbum}>
              <Ionicons name="images-outline" size={28} color="white" />
              <Text style={styles.sideButtonText}>อัลบั้ม</Text>
            </TouchableOpacity>

            {/* ปุ่มชัตเตอร์ - กลางจอจริง (absolute) */}
            <View style={styles.shutterWrapper}>
              <TouchableOpacity style={styles.shutterButton} onPress={takePicture}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  topBrackets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  bottomBrackets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  bracketTopLeft: {
    width: 60,
    height: 60,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: 'white',
    borderTopLeftRadius: 4,
  },
  bracketTopRight: {
    width: 60,
    height: 60,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: 'white',
    borderTopRightRadius: 4,
  },
  bracketBottomLeft: {
    width: 60,
    height: 60,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: 'white',
    borderBottomLeftRadius: 4,
  },
  bracketBottomRight: {
    width: 60,
    height: 60,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: 'white',
    borderBottomRightRadius: 4,
  },
  flashlightContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashlightButton: {
    alignItems: 'center',
  },
  flashlightText: {
    color: 'white',
    fontSize: 13,
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  controlsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 90,
    position: 'relative',
    justifyContent: 'flex-start',
  },
  sideButton: {
    alignItems: 'center',
    minWidth: 60,
    // ปุ่มอัลบั้มจะอยู่ซ้ายสุด
  },
  sideButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  shutterWrapper: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -35 }],
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B35',
  },
  permissionText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
});
