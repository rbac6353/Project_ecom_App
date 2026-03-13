// components/home/HomeDealSection.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function HomeDealSection() {
  return (
    <View style={styles.dealContainer}>
      <View style={styles.dealHeader}>
        <Text style={styles.dealTitle}>ดีลพิเศษ B5 สำหรับผู้ใช้ใหม่ ช้อปเลย</Text>
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>หมดอายุ</Text>
          <Text style={styles.dealTimer}>70:51:11</Text>
        </View>
      </View>
      
      <View style={styles.dealBody}>
        {/* Card 1 - Large Card */}
        <TouchableOpacity style={styles.dealCardLarge}>
          <Text style={styles.dealCardPrice}>฿90</Text>
          <Text style={styles.dealCardText}>การเติมเงิน</Text>
          <View style={styles.dealCardButton}>
            <Text style={styles.dealCardButtonText}>ช้อปเลย</Text>
          </View>
        </TouchableOpacity>
        
        {/* Card 2 & 3 - Small Cards */}
        <View style={styles.dealCardsRight}>
          <TouchableOpacity style={styles.dealCardSmall}>
            <View style={styles.dealCardImagePlaceholder} />
            <Text style={styles.dealCardOldPrice}>฿365.10</Text>
            <Text style={styles.dealCardNewPrice}>฿5.48</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dealCardSmall}>
            <View style={styles.dealCardImagePlaceholder} />
            <Text style={styles.dealCardOldPrice}>฿135.27</Text>
            <Text style={styles.dealCardNewPrice}>฿4.99</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dealContainer: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    padding: 12,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  timerContainer: {
    alignItems: 'flex-end',
  },
  timerLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  dealTimer: {
    color: '#FF5722',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dealBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dealCardLarge: {
    width: '32%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    justifyContent: 'center',
  },
  dealCardPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 5,
  },
  dealCardText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  dealCardButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  dealCardButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  dealCardsRight: {
    width: '65%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dealCardSmall: {
    width: '48%',
    alignItems: 'center',
  },
  dealCardImagePlaceholder: {
    width: '100%',
    height: 90,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  dealCardOldPrice: {
    textDecorationLine: 'line-through',
    color: '#999',
    fontSize: 11,
    marginBottom: 2,
  },
  dealCardNewPrice: {
    color: '#FF5722',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

