import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import onboardingData from '@assets/data/onboardingData';
import { useTheme } from '@app/providers/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // ฟังก์ชันเมื่อเลื่อนสไลด์
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }, []);

  const viewConfig = { viewAreaCoveragePercentThreshold: 50 };

  // ฟังก์ชันจบการแนะนำ (บันทึกค่าและไปหน้า Auth)
  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('@isFirstLaunch', 'false');
      // Reset Stack ไปที่หน้า MainTabs (หรือ Auth ถ้าต้องการให้ login ก่อน)
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (err) {
      console.log('Error saving first launch:', err);
    }
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleFinish();
    }
  };

  const SlideItem = ({ item }: any) => (
    <View style={styles.slide}>
      <Image
        source={{ uri: (item.image && item.image.trim() !== '') ? item.image : 'https://via.placeholder.com/300x300.png?text=No+Image' }}
        style={styles.image}
        resizeMode="contain"
      />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.description, { color: colors.subText }]}>
          {item.description}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" />

      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={({ item }) => <SlideItem item={item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={16}
      />

      {/* Footer Area */}
      <View style={styles.footer}>
        {/* Paginator (Dots) */}
        <View style={styles.paginator}>
          {onboardingData.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === currentIndex ? 20 : 10,
                  backgroundColor:
                    i === currentIndex ? colors.primary : '#ccc',
                },
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.btnContainer}>
          {/* ปุ่มข้าม (แสดงเฉพาะหน้าแรกๆ) */}
          {currentIndex < onboardingData.length - 1 ? (
            <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.subText }]}>
                ข้าม
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}

          {/* ปุ่มถัดไป / เริ่มต้น */}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            {currentIndex === onboardingData.length - 1 ? (
              <Text style={styles.nextText}>เริ่มใช้งาน</Text>
            ) : (
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width,
    alignItems: 'center',
    padding: 20,
    paddingTop: 100,
  },
  image: {
    width: width * 0.8,
    height: height * 0.4,
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  footer: {
    height: 150,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  paginator: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  btnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    padding: 10,
  },
  skipText: {
    fontSize: 16,
  },
  nextBtn: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

