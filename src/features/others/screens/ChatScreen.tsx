import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import client, { getApiBaseUrl } from '@app/api/client';
import * as ImagePicker from 'expo-image-picker';

// ใช้ API Base URL เดียวกับ client.ts
const SOCKET_URL = getApiBaseUrl();

export default function ChatScreen({ route }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // ถ้าเป็น User ทั่วไป -> คุยกับ Admin (RoomID = user.id)
  // ถ้าเป็น Admin -> รับ RoomID มาจากหน้ารายชื่อแชท (ที่เราจะทำเพิ่มทีหลัง)
  const roomId = route.params?.roomId || `chat_user_${user?.id}`;

  useEffect(() => {
    if (!user) return;

    console.log(`🔌 Connecting to Socket: ${SOCKET_URL}/chat`);
    console.log(`📦 Room ID: ${roomId}`);

    // 1. เชื่อมต่อ Socket
    socketRef.current = io(`${SOCKET_URL}/chat`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    // Event: เชื่อมต่อสำเร็จ
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setConnected(true);
      setLoading(false);

      // 2. Join Room
      socket.emit('joinRoom', { roomId, userId: user.id });
    });

    // Event: เชื่อมต่อไม่สำเร็จ
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setLoading(false);
    });

    // Event: หลุดการเชื่อมต่อ
    socket.on('disconnect', () => {
      console.log('⚠️ Socket disconnected');
      setConnected(false);
    });

    // 3. รับประวัติเก่า
    socket.on('history', (history: any) => {
      console.log('📜 Chat history received:', history.length, 'messages');
      setMessages(history || []);
      scrollToBottom();
    });

    // 4. รับข้อความใหม่
    socket.on('newMessage', (msg: any) => {
      console.log('💬 New message received:', msg);
      setMessages((prev) => {
        // ✅ ตรวจสอบว่ามีข้อความนี้อยู่แล้วหรือยัง (ป้องกัน duplicate)
        const exists = prev.some((m) => m.id === msg.id);
        if (exists) return prev;

        // ✅ ถ้ามีข้อความ optimistic อยู่แล้ว ให้แทนที่ด้วยข้อความจริงจาก server
        const optimisticIndex = prev.findIndex(
          (m) => m.isOptimistic &&
            m.message === msg.message &&
            m.senderId === msg.senderId &&
            Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 5000 // ภายใน 5 วินาที
        );

        if (optimisticIndex !== -1) {
          // แทนที่ข้อความ optimistic ด้วยข้อความจริง
          const newMessages = [...prev];
          newMessages[optimisticIndex] = { ...msg, isOptimistic: false };
          return newMessages;
        }

        return [...prev, msg];
      });
      scrollToBottom();
    });

    // ✅ Event: รับ error จาก server
    socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถส่งข้อความได้');
    });

    // ✅ Event: รับ confirmation ว่าส่งข้อความสำเร็จ (ถ้า server ส่งกลับมา)
    socket.on('messageSent', (data: any) => {
      console.log('✅ Message sent confirmation:', data);
    });

    return () => {
      console.log('🔌 Disconnecting socket');
      socket.disconnect();
    };
  }, [user, roomId]);

  const sendMessage = () => {
    if (!text.trim() || !socketRef.current || !connected || !user) return;

    const messageText = text.trim();
    console.log('📤 Sending message:', messageText);

    // ✅ Optimistic Update: เพิ่มข้อความเข้า state ทันที (ก่อนที่ server จะส่งกลับมา)
    const tempMessage = {
      id: `temp-${Date.now()}`, // Temporary ID
      roomId,
      senderId: user.id,
      sender: { id: user.id, name: user.name || 'You' },
      message: messageText,
      type: 'text',
      createdAt: new Date().toISOString(),
      isOptimistic: true, // Flag เพื่อระบุว่าเป็นข้อความชั่วคราว
    };

    // เพิ่มข้อความเข้า state ทันที
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    // ส่งข้อความไป Server
    socketRef.current.emit('sendMessage', {
      roomId,
      senderId: user.id,
      message: messageText,
    });

    setText('');
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderItem = ({ item }: any) => {
    const isMe = item.senderId === user?.id;
    const senderName = item.sender?.name || 'Unknown';

    return (
      <View
        style={[styles.msgContainer, isMe ? styles.msgRight : styles.msgLeft]}
      >
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {senderName[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isMe ? [styles.bubbleRight, { backgroundColor: colors.primary }] : [styles.bubbleLeft, { backgroundColor: colors.card }]
          ]}
        >
          {!isMe && (
            <Text style={[styles.senderName, { color: colors.subText }]}>{senderName}</Text>
          )}
          {item.type === 'image' && item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.imageMessage}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={[
                styles.msgText,
                isMe ? styles.textRight : [styles.textLeft, { color: colors.text }]
              ]}
            >
              {item.message}
            </Text>
          )}
          <Text style={[
            styles.time,
            { color: colors.subText },
            isMe && styles.timeRight
          ]}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {isMe && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="แชทกับร้านค้า" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.subText }]}>กำลังเชื่อมต่อ...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="แชทกับร้านค้า" />

      {!connected && (
        <View style={[styles.connectionStatus, { backgroundColor: colors.card }]}>
          <Ionicons name="warning-outline" size={16} color={colors.primary} />
          <Text style={[styles.connectionText, { color: colors.primary }]}>
            กำลังเชื่อมต่อใหม่...
          </Text>
        </View>
      )}

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.subText} />
          <Text style={[styles.emptyText, { color: colors.subText }]}>ยังไม่มีข้อความ</Text>
          <Text style={[styles.emptySubtext, { color: colors.subText }]}>
            เริ่มต้นการสนทนากับร้านค้า
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) =>
            item.id ? item.id.toString() : index.toString()
          }
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputArea, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {/* ปุ่มเลือกภาพ */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={async () => {
              if (!connected || !user) return;
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'], // ✅ SDK 53+ format
                  quality: 0.7,
                });
                if (!result.canceled && result.assets?.length > 0) {
                  const uri = result.assets[0].uri;
                  setUploading(true);
                  const formData = new FormData();
                  const filename = uri.split('/').pop() || 'image.jpg';
                  const match = /\.(\w+)$/.exec(filename);
                  const type = match ? `image/${match[1]}` : 'image/jpeg';
                  // @ts-ignore
                  formData.append('file', { uri, name: filename, type });

                  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
                  const res = await client.post('/users/avatar', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
                  const responseData = res?.data || res || {};
                  const imageUrl = responseData?.url || responseData?.secure_url || responseData?.avatar || '';

                  if (!imageUrl) {
                    throw new Error('ไม่พบ URL รูปภาพจากการอัปโหลด');
                  }

                  if (socketRef.current) {
                    socketRef.current.emit('sendMessage', {
                      roomId,
                      senderId: user.id,
                      message: '',
                      type: 'image',
                      imageUrl,
                    });
                  }
                }
              } catch (error: any) {
                console.error('Send image error:', error);
                Alert.alert('ผิดพลาด', 'ไม่สามารถส่งรูปภาพได้');
              } finally {
                setUploading(false);
              }
            }}
            disabled={!connected || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name="image-outline"
                size={24}
                color={connected ? colors.primary : colors.subText}
              />
            )}
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg || colors.background }]}
            value={text}
            onChangeText={setText}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor={colors.subText}
            multiline
            maxLength={500}
            editable={connected}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={[styles.sendBtn, !connected && styles.sendBtnDisabled]}
            disabled={!connected || !text.trim()}
          >
            <Ionicons
              name="send"
              size={24}
              color={connected && text.trim() ? colors.primary : colors.subText}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 5,
  },
  connectionText: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  msgContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  msgRight: { justifyContent: 'flex-end' },
  msgLeft: { justifyContent: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bubbleRight: {
    borderTopRightRadius: 4,
  },
  bubbleLeft: {
    borderTopLeftRadius: 4,
  },
  senderName: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '600',
  },
  msgText: { fontSize: 16, lineHeight: 20 },
  textRight: { color: '#fff' },
  textLeft: {},
  time: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    opacity: 0.7,
  },
  timeRight: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  iconBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageMessage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginTop: 4,
  },
});

