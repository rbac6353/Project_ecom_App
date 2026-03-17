import React, { useState } from 'react';
import { View, Animated, StyleSheet, ImageStyle } from 'react-native';

interface FadeInImageProps {
  uri: string;
  style?: ImageStyle;
}

const FadeInImage: React.FC<FadeInImageProps> = ({ uri, style }) => {
  const [opacity] = useState(new Animated.Value(0));

  const onLoad = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  // ป้องกัน empty string
  const validUri = uri && uri.trim() !== '' ? uri : 'https://via.placeholder.com/300x300.png?text=No+Image';

  return (
    <View style={[style, { overflow: 'hidden', backgroundColor: '#f0f0f0' }]}>
      <Animated.Image
        source={{ uri: validUri }}
        style={[style, { opacity }]}
        onLoad={onLoad}
        resizeMode="cover"
      />
    </View>
  );
};

export default FadeInImage;

