import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';

// เปิดใช้งาน LayoutAnimation บน Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function HelpCenterScreen() {
  // Default FAQs เมื่อ API ไม่มีข้อมูล
  const defaultFaqs = [
    {
      id: 1,
      question: 'จะสั่งซื้อสินค้าได้อย่างไร?',
      answer: '1. เลือกสินค้าที่ต้องการ\n2. กด "เพิ่มลงตะกร้า"\n3. ไปที่ตะกร้าสินค้า\n4. กด "ชำระเงิน"\n5. เลือกที่อยู่จัดส่งและวิธีชำระเงิน\n6. ยืนยันคำสั่งซื้อ',
    },
    {
      id: 2,
      question: 'รองรับวิธีชำระเงินอะไรบ้าง?',
      answer: '• PromptPay (พร้อมเพย์)\n• โอนเงินผ่านธนาคาร\n• เก็บเงินปลายทาง (COD)\n• บัตรเครดิต/เดบิต (เร็วๆ นี้)',
    },
    {
      id: 3,
      question: 'ระยะเวลาจัดส่งนานแค่ไหน?',
      answer: 'โดยทั่วไปสินค้าจะถึงภายใน 2-5 วันทำการ ขึ้นอยู่กับพื้นที่จัดส่งและผู้ขนส่งที่เลือก\n\n• กรุงเทพ/ปริมณฑล: 1-3 วัน\n• ต่างจังหวัด: 3-5 วัน',
    },
    {
      id: 4,
      question: 'จะติดตามพัสดุได้อย่างไร?',
      answer: '1. ไปที่ "ประวัติคำสั่งซื้อ"\n2. เลือกคำสั่งซื้อที่ต้องการติดตาม\n3. กด "ติดตามพัสดุ" เพื่อดูสถานะการจัดส่งแบบ real-time',
    },
    {
      id: 5,
      question: 'นโยบายการคืนสินค้าเป็นอย่างไร?',
      answer: 'คุณสามารถขอคืนสินค้าได้ภายใน 7 วัน หลังจากได้รับสินค้า โดยมีเงื่อนไข:\n\n• สินค้าต้องอยู่ในสภาพเดิม ยังไม่ได้ใช้งาน\n• มีหลักฐานการซื้อ\n• สินค้ามีตำหนิจากการผลิตหรือไม่ตรงตามที่สั่ง',
    },
    {
      id: 6,
      question: 'จะใช้คูปองส่วนลดอย่างไร?',
      answer: '1. เลือกสินค้าและไปที่หน้าชำระเงิน\n2. กด "เลือกคูปอง"\n3. เลือกคูปองที่ต้องการใช้\n4. ส่วนลดจะถูกคำนวณโดยอัตโนมัติ',
    },
    {
      id: 7,
      question: 'จะติดต่อผู้ขายได้อย่างไร?',
      answer: 'คุณสามารถแชทกับผู้ขายได้โดยตรงผ่านระบบแชทในแอป:\n\n1. ไปที่หน้าสินค้าหรือคำสั่งซื้อ\n2. กดปุ่ม "แชทกับร้าน"\n3. พิมพ์ข้อความและส่ง',
    },
    {
      id: 8,
      question: 'ลืมรหัสผ่าน ทำอย่างไร?',
      answer: '1. กด "ลืมรหัสผ่าน" ที่หน้าเข้าสู่ระบบ\n2. กรอกอีเมลที่ใช้ลงทะเบียน\n3. ตรวจสอบอีเมลเพื่อรีเซ็ตรหัสผ่าน\n4. ตั้งรหัสผ่านใหม่',
    },
  ];

  const [faqs, setFaqs] = useState(defaultFaqs);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchFaqs = async () => {
    try {
      const res = await client.get('/faqs');
      // ใช้ข้อมูลจาก API ถ้ามี ไม่งั้นใช้ default
      if (res.data && res.data.length > 0) {
        setFaqs(res.data);
      }
    } catch (error) {
      console.log('Using default FAQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // Animation
    setExpandedId(expandedId === id ? null : id); // ถ้ากดตัวเดิมให้ปิด ถ้ากดตัวใหม่ให้เปิด
  };

  const renderItem = ({ item }: any) => {
    const isExpanded = expandedId === item.id;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.header}
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.question}>{item.question}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#666"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.body}>
            <Text style={styles.answer}>{item.answer}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="ศูนย์ช่วยเหลือ" />

      <View style={styles.contactBox}>
        <Text style={styles.contactTitle}>ต้องการความช่วยเหลือเพิ่มเติม?</Text>
        <TouchableOpacity style={styles.contactBtn}>
          <Ionicons name="mail-outline" size={20} color="#FF5722" />
          <Text style={styles.contactText}>support@boxify.com</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF5722" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={faqs}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={styles.empty}>ไม่มีข้อมูล</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contactBox: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF5722',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  contactText: {
    color: '#FF5722',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  question: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  body: {
    padding: 15,
    paddingTop: 0,
    backgroundColor: '#fafafa',
  },
  answer: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
  },
});

