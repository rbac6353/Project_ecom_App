// screens/store/MallStoresScreen.tsx - แสดงสินค้าของร้านค้า Mall (ไม่ใช่รายการร้าน)
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { LinearGradient } from 'expo-linear-gradient';
import ProductCard from '@shared/components/common/ProductCard';
import * as productService from '@app/services/productService';

const { width } = Dimensions.get('window');
const numColumns = 2;
const cardGap = 12;
const cardWidth = (width - 16 * 2 - cardGap) / numColumns;

interface ProductItem {
    id: number;
    title: string;
    price: number;
    discountPrice: number | null;
    imageUrl: string;
    storeName: string;
    product: any;
}

export default function MallStoresScreen() {
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchMallProducts = useCallback(async (pageNum: number = 1, isRefresh = false) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);
        if (isRefresh) setRefreshing(true);

        try {
            const response = await productService.getProducts(
                undefined,
                pageNum,
                12,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                'mall', // ✅ ดึงเฉพาะสินค้าของร้าน Mall
            );

            const mapped: ProductItem[] = (response.data || []).map((p: any) => ({
                id: p.id,
                title: p.title || '',
                price: (p.price != null ? p.price : 0),
                discountPrice: p.discountPrice != null ? p.discountPrice : null,
                imageUrl: p.images?.length > 0 ? p.images[0].url : 'https://via.placeholder.com/300',
                storeName: p.store?.name || 'Mall',
                product: p,
            }));

            if (isRefresh || pageNum === 1) {
                setProducts(mapped);
            } else {
                setProducts(prev => [...prev, ...mapped]);
            }
            setHasMore(response.page < response.last_page);
        } catch (error: any) {
            if (pageNum === 1) setProducts([]);
            if (__DEV__) console.warn('Error fetching mall products:', error?.message || error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchMallProducts(1, true);
    }, [fetchMallProducts]);

    const onRefresh = () => {
        setPage(1);
        setHasMore(true);
        fetchMallProducts(1, true);
    };

    const onEndReached = () => {
        if (loading || loadingMore || !hasMore) return;
        const next = page + 1;
        setPage(next);
        fetchMallProducts(next, false);
    };

    const renderProduct = ({ item }: { item: ProductItem }) => (
        <View style={[styles.cardWrapper, { width: cardWidth }]}>
            <ProductCard
                id={item.id}
                title={item.title}
                price={item.price}
                discountPrice={item.discountPrice}
                imageUrl={item.imageUrl}
                storeName={item.storeName}
                product={item.product}
            />
        </View>
    );

    if (loading && products.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ScreenHeader title="ร้านค้า Mall" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScreenHeader title="ร้านค้า Mall" />

            <LinearGradient
                colors={['#D0011B', '#FF5722']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.headerBanner}
            >
                <Ionicons name="storefront" size={32} color="#fff" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.bannerTitle}>สินค้าจากร้าน Mall</Text>
                    <Text style={styles.bannerSubtitle}>รับประกันคุณภาพ 100%</Text>
                </View>
            </LinearGradient>

            <FlatList
                data={products}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderProduct}
                numColumns={numColumns}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                onEndReached={onEndReached}
                onEndReachedThreshold={0.3}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cube-outline" size={64} color={colors.subText} />
                        <Text style={[styles.emptyText, { color: colors.subText }]}>
                            ยังไม่มีสินค้าจากร้าน Mall
                        </Text>
                    </View>
                )}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
        borderRadius: 12,
    },
    bannerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    bannerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    listContent: {
        padding: 16,
        paddingBottom: 24,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: cardGap,
    },
    cardWrapper: {
        marginBottom: 0,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
    },
    footerLoader: {
        paddingVertical: 16,
        alignItems: 'center',
    },
});
