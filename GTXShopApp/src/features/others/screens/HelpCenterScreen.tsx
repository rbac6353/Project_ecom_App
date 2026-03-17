// screens/HelpCenterScreen.tsx
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '@shared/components/common/ScreenHeader';

const FAQItem = ({ question }: { question: string }) => (
  <TouchableOpacity style={styles.faqItem}>
    <Text style={styles.faqText}>{question}</Text>
    <Ionicons name="chevron-forward-outline" size={20} color="gray" style={styles.faqIcon} />
  </TouchableOpacity>
);

const PopularFAQTab = () => (
  <ScrollView style={styles.tabContainer}>
    <FAQItem question="ฉันควรทำอย่างไรหากไม่สามารถรับรหัสยืนยันได้?" />
    <FAQItem question="การชำระเงินล้มเหลว" />
    <FAQItem question="วิธียกเลิกคำสั่งซื้อ" />
    <FAQItem question="ฉันไม่สามารถรับสินค้าเป็นเวลานาน" />
    <FAQItem question="ฉันยังไม่ได้รับสินค้าแต่สินค้าแสดงว่าเซ็นรับ ฉันจะทำอย่างไร?" />
    <FAQItem question="ฉันควรทำอย่างไรหากมีปัญหาตอนรับสินค้า?" />
  </ScrollView>
);

const AccountFAQTab = () => (
  <ScrollView style={styles.tabContainer}>
    <FAQItem question="วิธีเปลี่ยนรหัสผ่าน" />
    <FAQItem question="วิธีเปลี่ยนอีเมล" />
    <FAQItem question="วิธีลบบัญชี" />
  </ScrollView>
);

const PaymentFAQTab = () => (
  <ScrollView style={styles.tabContainer}>
    <FAQItem question="วิธีชำระเงิน" />
    <FAQItem question="การคืนเงิน" />
    <FAQItem question="ปัญหาเกี่ยวกับบัตรเครดิต" />
  </ScrollView>
);

const Tab = createMaterialTopTabNavigator();

export default function HelpCenterScreen() {
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScreenHeader title="ศูนย์ช่วยเหลือ" />

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>สวัสดีค่ะ!</Text>
        <Text style={styles.bannerSubtitle}>ฉันสามารถช่วยเหลือคุณได้อย่างไรในวันนี้?</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TextInput
            placeholder="โปรดเข้าสู่ระบบ"
            style={styles.searchInput}
            editable={false}
          />
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.faqContainer}>
        <View style={styles.faqHeader}>
          <Text style={styles.faqTitle}>คำถามที่แนะนำ</Text>
          <TouchableOpacity>
            <Text style={styles.faqViewMore}>ดูเพิ่มเติม {'>'}</Text>
          </TouchableOpacity>
        </View>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#FF5722',
            tabBarInactiveTintColor: 'gray',
            tabBarIndicatorStyle: { backgroundColor: '#FF5722', height: 3 },
            tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' },
            tabBarScrollEnabled: true,
          }}
        >
          <Tab.Screen name="ยอดนิยม" component={PopularFAQTab} />
          <Tab.Screen name="การจัดการบัญชี" component={AccountFAQTab} />
          <Tab.Screen name="การชำระเงิน" component={PaymentFAQTab} />
        </Tab.Navigator>
      </View>

      <View style={styles.footer}>
        <Ionicons name="headset-outline" size={20} color="#FF5722" />
        <Text style={styles.footerText}>บริการลูกค้า Taobao</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white'
  },
  banner: {
    height: 120,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFF3E0',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#555'
  },
  searchContainer: {
    backgroundColor: 'white',
    padding: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    backgroundColor: '#FF5722',
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  faqContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  faqViewMore: {
    fontSize: 12,
    color: 'gray'
  },
  tabContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  faqIcon: {
    marginLeft: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
});

