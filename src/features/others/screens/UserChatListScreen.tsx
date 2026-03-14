import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@app/providers/ThemeContext';
import client from '@app/api/client';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';

export default function UserChatListScreen() {
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchChats = async () => {
        try {
            const res = await client.get('/chat/conversations');
            setChats(res as any);
        } catch (error: any) {
            console.error('❌ Error fetching chats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchChats();
        }, []),
    );

    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'เมื่อสักครู่';
        if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
        if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
        if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
        });
    };

    const renderItem = ({ item }: any) => {
        // สำหรับ User ทั่วไป เราจะคุยกับ "Store"
        const target = item.store;
        const targetName = target?.name || 'ร้านค้า (ไม่ทราบชื่อ)';
        const targetImage = target?.avatar || target?.logo;

        return (
            <TouchableOpacity
                style={[styles.chatItem, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('Chat', { roomId: item.roomId })}
            >
                {/* Avatar ร้านค้า */}
                <View style={[styles.avatarContainer, { backgroundColor: colors.background }]}>
                    {targetImage ? (
                        <Image source={{ uri: targetImage }} style={styles.avatarImage} />
                    ) : (
                        <Ionicons name="storefront-outline" size={24} color={colors.primary} />
                    )}
                </View>

                <View style={styles.chatContent}>
                    <View style={styles.topRow}>
                        <Text style={[styles.userName, { color: colors.text }]}>
                            {targetName}
                        </Text>
                        <Text style={[styles.time, { color: colors.subText }]}>{formatTime(item.lastMessageDate)}</Text>
                    </View>
                    <Text style={[styles.lastMessage, { color: colors.subText }]} numberOfLines={1}>
                        {item.lastMessage || 'ไม่มีข้อความ'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScreenHeader title="รายการแชท" />

            {loading ? (
                <ActivityIndicator
                    size="large"
                    color={colors.primary}
                    style={{ marginTop: 50 }}
                />
            ) : (
                <FlatList
                    data={chats}
                    keyExtractor={(item: any) => item.roomId}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 0 }}
                    ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchChats();
                            }}
                            colors={[colors.primary]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color={colors.subText} />
                            <Text style={[styles.emptyText, { color: colors.subText }]}>ยังไม่มีการสนทนา</Text>
                            <Text style={[styles.emptySubText, { color: colors.subText }]}>
                                แชทกับร้านค้าจะแสดงที่นี่
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    chatItem: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    chatContent: {
        flex: 1,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
        alignItems: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    time: {
        fontSize: 12,
        marginLeft: 10,
    },
    lastMessage: {
        fontSize: 14,
    },
    divider: {
        height: 1,
        marginLeft: 80,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
        paddingHorizontal: 20,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubText: {
        textAlign: 'center',
        marginTop: 8,
        fontSize: 14,
    },
});
