// Stub สำหรับ react-native-pager-view บน web
// ใช้ ScrollView แบบ horizontal แทน PagerView

import React, { useRef, useEffect } from 'react';
import { ScrollView, View, NativeScrollEvent, NativeSyntheticEvent, ViewStyle, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PagerViewProps {
  style?: ViewStyle;
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children: React.ReactNode;
}

const PagerView: React.FC<PagerViewProps> = ({ 
  style, 
  initialPage = 0, 
  onPageSelected, 
  children 
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const pageWidth = React.useRef<number>(SCREEN_WIDTH);

  useEffect(() => {
    // Scroll ไปยัง initialPage เมื่อ component mount
    if (scrollViewRef.current && pageWidth.current > 0) {
      scrollViewRef.current.scrollTo({
        x: initialPage * pageWidth.current,
        animated: false,
      });
    }
  }, [initialPage]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onPageSelected || pageWidth.current === 0) return;
    
    const offsetX = event.nativeEvent.contentOffset.x;
    const currentPage = Math.round(offsetX / pageWidth.current);
    
    onPageSelected({
      nativeEvent: {
        position: currentPage,
      },
    });
  };

  const handleLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
    pageWidth.current = event.nativeEvent.layout.width;
    // Scroll ไปยัง initialPage หลังจากรู้ width
    if (scrollViewRef.current && initialPage > 0) {
      scrollViewRef.current.scrollTo({
        x: initialPage * pageWidth.current,
        animated: false,
      });
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onScroll={handleScroll}
      onLayout={handleLayout}
      scrollEventThrottle={16}
      style={style}
      contentContainerStyle={{ flexDirection: 'row' }}
    >
      {React.Children.map(children, (child, index) => (
        <View 
          key={index} 
          style={{ 
            width: pageWidth.current > 0 ? pageWidth.current : SCREEN_WIDTH,
            flexShrink: 0,
          }}
        >
          {child}
        </View>
      ))}
    </ScrollView>
  );
};

export default PagerView;

