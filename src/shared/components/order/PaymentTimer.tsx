import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';

interface PaymentTimerProps {
  expiredAt: string; // รับเวลาเป็น String ISO
  onExpire?: () => void; // ฟังก์ชันที่จะเรียกเมื่อหมดเวลา
}

export default function PaymentTimer({ expiredAt, onExpire }: PaymentTimerProps) {
  const { colors } = useTheme();
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(expiredAt).getTime();
      const distance = end - now;

      if (distance < 0) {
        setIsExpired(true);
        setTimeLeft('00:00');
        if (onExpire) {
          onExpire(); // แจ้งพ่อว่าหมดเวลาแล้ว
        }
        return;
      }

      // คำนวณ นาที:วินาที
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    // คำนวณทันทีครั้งแรก
    calculateTimeLeft();

    // อัปเดตทุก 1 วินาที
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiredAt, onExpire]);

  // ถ้าหมดเวลาแล้ว ไม่ต้องโชว์
  if (isExpired || timeLeft === '00:00') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: '#FFEBEE' }]}>
      <Ionicons name="time-outline" size={18} color="#D32F2F" />
      <Text style={styles.text}>กรุณาชำระภายใน {timeLeft} นาที</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  text: {
    color: '#D32F2F',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
});

