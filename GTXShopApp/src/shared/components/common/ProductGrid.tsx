// components/common/ProductGrid.tsx
import React from 'react';
import { StyleSheet, View, FlatList, Text, Dimensions } from 'react-native';
import ProductCard from './ProductCard';
import ProductSkeleton from './ProductSkeleton';
import { useTheme } from '@app/providers/ThemeContext';

const { width } = Dimensions.get('window');

interface Product {
    id: number;
    title: string;
    price: number;
    discountPrice: number | null;
    imageUrl: string;
    storeName: string;
}

interface ProductGridProps {
    products: Product[];
    headerTitle?: string;
    loading?: boolean;
    // TODO: เพิ่ม onEndReached สำหรับ Infinite Scroll
}

export default function ProductGrid({ products, headerTitle, loading = false }: ProductGridProps) {
    const { colors } = useTheme();
    const renderItem = ({ item }: { item: any }) => (
        // ✅ ส่ง product object เพื่อให้ ProductCard ดึง store.isMall ได้
        <ProductCard product={item.product || item} {...item} />
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {headerTitle ? <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text> : null}
                <View style={styles.grid}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <ProductSkeleton key={i} />
                    ))}
                </View>
            </View>
        );
    }

    if (products.length === 0) {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {headerTitle ? <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text> : null}
            <FlatList
                data={products}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                // 💡 ตั้งค่า ListHeaderComponent และ ContentContainerStyle
                ListHeaderComponent={<View style={{ height: 10 }} />}
                contentContainerStyle={styles.listContent}
                scrollEnabled={false} // 👈 ให้ ScrollView ของ HomeScreen จัดการการเลื่อนแทน
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {},
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 5,
    },
    listContent: {
        paddingHorizontal: 5,
        paddingBottom: 20, // เว้นขอบด้านล่าง
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 5,
        paddingBottom: 20,
    },
});

