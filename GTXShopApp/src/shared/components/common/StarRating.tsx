import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number; // คะแนนปัจจุบัน (0-5)
  size?: number; // ขนาดไอคอน
  onRate?: (rating: number) => void; // ฟังก์ชันเมื่อกดดาว (ถ้าไม่มี = Read only)
  color?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 16,
  onRate,
  color = '#FFC107', // สีเหลืองทอง
}) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.container}>
      {stars.map((star) => {
        const iconName =
          rating >= star
            ? 'star'
            : rating >= star - 0.5
              ? 'star-half'
              : 'star-outline';

        return (
          <TouchableOpacity
            key={star}
            disabled={!onRate} // ถ้าไม่มีฟังก์ชัน onRate ให้กดไม่ได้
            onPress={() => onRate && onRate(star)}
            activeOpacity={0.7}
          >
            <Ionicons name={iconName} size={size} color={color} style={styles.star} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
});

export default StarRating;

