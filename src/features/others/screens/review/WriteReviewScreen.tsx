import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import StarRating from '@shared/components/common/StarRating';
import * as ImagePicker from 'expo-image-picker';
import * as reviewService from '@app/services/reviewService';
import { Ionicons } from '@expo/vector-icons';

// รับพารามิเตอร์สินค้าที่จะรีวิว
type ParamList = {
  params: {
    productId: number;
    productName: string;
    productImage: string;
    existingReview?: any; // ✅ เพิ่มสำหรับการแก้ไข
  };
};

export default function WriteReviewScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<ParamList, 'params'>>();
  const navigation = useNavigation<any>();
  const { productId, productName, productImage, existingReview } = route.params;

  const isEdit = !!existingReview;

  const [rating, setRating] = useState(
    existingReview?.rating || 5,
  );
  const [comment, setComment] = useState(
    existingReview?.comment || '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>(existingReview?.images || []);

  const handlePickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // ✅ SDK 53+ format
      quality: 0.7,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri).slice(0, 3);
      setImages(uris);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('แจ้งเตือน', 'กรุณาให้คะแนนสินค้า');
      return;
    }

    // ✅ ถ้าเป็นการแก้ไข แจ้งเตือนว่าแก้ได้ครั้งเดียว
    if (isEdit) {
      Alert.alert(
        'ยืนยันการแก้ไข',
        'คุณสามารถแก้ไขรีวิวได้เพียง 1 ครั้งเท่านั้น ยืนยันที่จะบันทึกหรือไม่?',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ยืนยัน',
            onPress: async () => {
              try {
                setSubmitting(true);
                await reviewService.updateReview(
                  existingReview.id,
                  rating,
                  comment,
                  images,
                );
                Alert.alert('สำเร็จ', 'แก้ไขรีวิวเรียบร้อยแล้ว', [
                  { text: 'ตกลง', onPress: () => navigation.goBack() },
                ]);
              } catch (error: any) {
                console.error('Review update error:', error);
                Alert.alert(
                  'ผิดพลาด',
                  error.response?.data?.message ||
                  'ไม่สามารถแก้ไขรีวิวได้',
                );
              } finally {
                setSubmitting(false);
              }
            },
          },
        ],
      );
      return;
    }

    // ✅ สร้างรีวิวใหม่
    try {
      setSubmitting(true);
      await reviewService.createReview(productId, rating, comment, images);
      Alert.alert('สำเร็จ', 'ขอบคุณสำหรับรีวิวครับ!', [
        { text: 'ตกลง', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Review submission error:', error);
      Alert.alert(
        'ผิดพลาด',
        error.response?.data?.message || 'ไม่สามารถส่งรีวิวได้',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isEdit ? 'แก้ไขรีวิว' : 'เขียนรีวิว'} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.productInfo}>
          <Image
            source={{ uri: productImage || 'https://via.placeholder.com/150' }}
            style={[styles.image, { backgroundColor: colors.background }]}
          />
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {productName}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.label, { color: colors.text }]}>คะแนนสินค้า</Text>
        <View style={styles.ratingContainer}>
          <StarRating rating={rating} size={40} onRate={setRating} />
          <Text style={[styles.ratingText, { color: colors.primary }]}>{rating}/5</Text>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>ความคิดเห็น</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg || colors.background }]}
          placeholder="สินค้าเป็นอย่างไรบ้าง? บอกให้เรารู้หน่อย..."
          placeholderTextColor={colors.subText}
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
          textAlignVertical="top"
        />

        {/* รูปแนบในรีวิว */}
        <Text style={[styles.label, { color: colors.text }]}>รูปภาพประกอบรีวิว (ไม่บังคับ)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {images.map((uri, index) => (
            <Image
              key={index}
              source={{ uri }}
              style={styles.previewImg}
            />
          ))}
          <TouchableOpacity style={styles.addImgBtn} onPress={handlePickImages}>
            <Ionicons name="camera" size={24} color={colors.subText} />
            <Text style={{ fontSize: 10, color: colors.subText, marginTop: 4 }}>เพิ่มรูป</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }, submitting && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>ส่งรีวิว</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 15,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    height: 120,
    fontSize: 16,
    marginBottom: 30,
  },
  submitButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewImg: {
    width: 70,
    height: 70,
    borderRadius: 6,
    marginRight: 10,
  },
  addImgBtn: {
    width: 70,
    height: 70,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

