import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

const { width } = Dimensions.get('window');
const cardWidth = (width / 2) - 15;

export default function ProductSkeleton() {
  // SkeletonItem คือ Component ย่อยช่วยทำอนิเมชั่นกระพริบ
  const SkeletonItem = ({ width, height, style }: any) => {
    const opacity = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }, [opacity]);

    return (
      <Animated.View
        style={[
          { width, height, backgroundColor: '#e0e0e0', borderRadius: 4, opacity },
          style,
        ]}
      />
    );
  };

  return (
    <View style={styles.card}>
      {/* Image Placeholder */}
      <SkeletonItem width="100%" height={cardWidth} style={{ marginBottom: 10 }} />

      {/* Text Placeholders */}
      <SkeletonItem width="80%" height={15} style={{ marginBottom: 6 }} />
      <SkeletonItem width="40%" height={12} style={{ marginBottom: 4 }} />
      <SkeletonItem width="50%" height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    margin: 5,
    marginBottom: 10,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

