import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import * as reviewService from '@app/services/reviewService';

export default function MyReviewsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = async () => {
    try {
      const data = await reviewService.getMyReviews();
      setReviews(data);
    } catch (error: any) {
      console.error('Fetch reviews error:', error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดรีวิวได้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReviews();
    }, []),
  );

  const handleDelete = (reviewId: number) => {
    Alert.alert('ยืนยัน', 'ต้องการลบรีวิวนี้หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            await reviewService.deleteReview(reviewId);
            setReviews((prev) => prev.filter((r) => r.id !== reviewId));
            Alert.alert('สำเร็จ', 'ลบรีวิวเรียบร้อยแล้ว');
          } catch (error: any) {
            console.error('Delete review error:', error);
            Alert.alert(
              'ผิดพลาด',
              error.response?.data?.message || 'ไม่สามารถลบรีวิวได้',
            );
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: any) => {
    const product = item.product || {};
    const imageUrl =
      product.images && product.images.length > 0
        ? product.images[0].url || product.images[0]
        : 'https://via.placeholder.com/150';

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.productHeader}>
          <Image source={{ uri: imageUrl }} style={[styles.productImage, { backgroundColor: colors.background }]} />
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
              {product.title || product.name || 'Unknown Product'}
            </Text>
            <View style={styles.headerRow}>
              <Text style={[styles.date, { color: colors.subText }]}>
                {new Date(item.createdAt).toLocaleDateString('th-TH')}
              </Text>
              {item.isEdited && (
                <Text style={[styles.editedLabel, { color: colors.primary }]}> (แก้ไขแล้ว)</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.ratingRow}>
          {[...Array(5)].map((_, i) => (
            <Ionicons
              key={i}
              name={i < item.rating ? 'star' : 'star-outline'}
              size={20}
              color={colors.primary}
            />
          ))}
        </View>
        {item.comment && (
          <Text style={[styles.comment, { color: colors.text }]}>{item.comment}</Text>
        )}

        {item.sellerReply && (
          <View style={[styles.sellerReplyBox, { backgroundColor: colors.background, borderLeftColor: colors.primary }]}>
            <Text style={[styles.sellerReplyLabel, { color: colors.primary }]}>คำตอบจากร้านค้า:</Text>
            <Text style={[styles.sellerReplyText, { color: colors.text }]}>{item.sellerReply}</Text>
          </View>
        )}

        <View style={styles.actions}>
          {!item.isEdited ? (
            <TouchableOpacity
              style={[styles.btn, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() =>
                navigation.navigate('WriteReview', {
                  productId: item.productId,
                  productName: product.title || product.name || 'สินค้า',
                  productImage: imageUrl,
                  existingReview: item,
                })
              }
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={[styles.btnText, { color: colors.primary }]}>แก้ไข</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.disabledText, { color: colors.subText }]}>แก้ไขแล้ว</Text>
          )}

          <TouchableOpacity
            style={[styles.btn, styles.deleteBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.primary} />
            <Text style={[styles.btnText, { color: colors.primary }]}>ลบ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="รีวิวของฉัน" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="รีวิวของฉัน" />
        <View style={styles.center}>
          <Ionicons name="star-outline" size={64} color={colors.subText} />
          <Text style={[styles.emptyText, { color: colors.subText }]}>ยังไม่มีรีวิว</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="รีวิวของฉัน" />
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchReviews} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 10,
  },
  card: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
  },
  editedLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  ratingRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  comment: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  sellerReplyBox: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  sellerReplyLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sellerReplyText: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderRadius: 4,
  },
  deleteBtn: {
  },
  btnText: {
    marginLeft: 5,
    fontSize: 14,
  },
  disabledText: {
    fontSize: 12,
    marginRight: 10,
    alignSelf: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 10,
  },
});

