// components/home/FlashSaleSection.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import api from '@app/api/client';
import FlashSaleItem from './FlashSaleItem';

export default function FlashSaleSection() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Logic นับถอยหลัง (Mock)
  const [timeLeft, setTimeLeft] = useState({ h: 2, m: 15, s: 30 });

  // ✅ ดึงข้อมูล Flash Sale จาก API
  useEffect(() => {
    fetchFlashSaleProducts();
  }, []);

  const fetchFlashSaleProducts = async () => {
    try {
      setLoading(true);
      // ⚠️ สำคัญ: api.get() return data โดยตรง (ไม่ใช่ response object)
      // เพราะ response interceptor แกะ response แล้ว
      const data = await api.get('/flash-sales/current') as any;

      console.log('⚡ Flash Sale Section API Response:', data);

      // ตรวจสอบและดึงข้อมูล products จาก response
      let products: any[] = [];
      let flashSaleItems: any[] = [];
      
      if (data && data.flashSale && data.flashSale.items) {
        // ใช้ข้อมูลจาก Flash Sale Campaign ใหม่
        flashSaleItems = data.flashSale.items;
        products = flashSaleItems.map((item: any) => item.product);
      } else if (Array.isArray(data)) {
        products = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        products = data.data;
      } else if (data && typeof data === 'object' && Array.isArray(data.items)) {
        products = data.items;
      } else {
        console.warn('⚠️ Flash Sale API returned invalid data structure:', data);
        setFlashSaleProducts([]);
        return;
      }

      // Map ข้อมูลสินค้าให้ตรงกับ FlashSaleItem
      const mappedProducts = products.map((p: any, index: number) => {
        // หา FlashSaleItem ที่ตรงกับสินค้านี้
        const flashSaleItem = flashSaleItems[index];
        
        const originalPrice = p.price || 0;
        // ใช้ราคา Flash Sale ถ้ามี (ตรงกับ database: discountPrice)
        const discountPrice = flashSaleItem?.discountPrice || p.discountPrice || originalPrice;
        const discount = originalPrice > 0
          ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
          : 0;

        // ใช้ข้อมูล sold และ stock จาก FlashSaleItem (ตรงกับ database: limitStock)
        const stock = flashSaleItem?.limitStock || p.quantity || 100;
        const sold = flashSaleItem?.sold || 0;

        // ดึงรูปภาพ - รองรับทั้ง secure_url และ url
        let imageUrl = 'https://via.placeholder.com/150';
        if (p.images && Array.isArray(p.images) && p.images.length > 0) {
          const firstImage = p.images[0];
          imageUrl = firstImage.secure_url || firstImage.url || imageUrl;
        } else if (p.imageUrl) {
          imageUrl = p.imageUrl;
        }
        console.log('⚡ Flash Sale:', p.title, '| Images:', p.images?.length || 0, '| URL:', imageUrl);

        return {
          id: p.id,
          image: imageUrl,
          price: discountPrice,
          originalPrice: originalPrice, // เพิ่มราคาเดิม
          discount: discount,
          sold: sold,
          stock: stock,
        };
      });

      setFlashSaleProducts(mappedProducts);
    } catch (error) {
      console.error('Error fetching flash sale products:', error);
      setFlashSaleProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) {
          s = 59;
          m--;
        }
        if (m < 0) {
          m = 59;
          h--;
        }
        if (h < 0) {
          h = 2;
          m = 59;
          s = 59;
        } // วนลูป
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  // ✅ ถ้าไม่มีสินค้า Flash Sale ให้ซ่อน section
  if (!loading && flashSaleProducts.length === 0) {
    return null;
  }

  // ✅ แสดง Loading state (ถ้าต้องการ)
  if (loading) {
    return null; // หรือแสดง skeleton loader
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.primary }]}>FLASH SALE</Text>
          <Ionicons name="flash" size={20} color={colors.primary} />

          <View style={styles.timerContainer}>
            <View style={[styles.timeBox, { backgroundColor: colors.text }]}>
              <Text style={styles.timeText}>{formatTime(timeLeft.h)}</Text>
            </View>
            <Text style={[styles.colon, { color: colors.text }]}>:</Text>
            <View style={[styles.timeBox, { backgroundColor: colors.text }]}>
              <Text style={styles.timeText}>{formatTime(timeLeft.m)}</Text>
            </View>
            <Text style={[styles.colon, { color: colors.text }]}>:</Text>
            <View style={[styles.timeBox, { backgroundColor: colors.text }]}>
              <Text style={styles.timeText}>{formatTime(timeLeft.s)}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('FlashSale')}>
          <Text style={[styles.seeMore, { color: colors.subText }]}>ดูทั้งหมด &gt;</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={flashSaleProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <FlashSaleItem item={item} originalPrice={item.originalPrice} />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 5,
    fontStyle: 'italic',
  },
  timerContainer: {
    flexDirection: 'row',
    marginLeft: 10,
    alignItems: 'center',
  },
  timeBox: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  timeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  colon: {
    marginHorizontal: 2,
    fontWeight: 'bold',
  },
  seeMore: {
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 10,
  },
});
