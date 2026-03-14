import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import { Order } from '@shared/interfaces/order';

interface ShippingLabelProps {
  order: Order & { orderedBy?: { name: string; email?: string } };
  onClose?: () => void;
}

const ShippingLabel: React.FC<ShippingLabelProps> = ({ order, onClose }) => {
  const { colors } = useTheme();
  const customerName = order.orderedBy?.name || 'ลูกค้าทั่วไป';
  const qrValue = order.id.toString(); // QR Code จะมี orderId

  const handleShare = async () => {
    try {
      await Share.share({
        message: `ออเดอร์ #${order.id}\nลูกค้า: ${customerName}\nที่อยู่: ${order.shippingAddress}\nQR Code สำหรับไรเดอร์สแกน`,
        title: `Shipping Label - Order #${order.id}`,
      });
    } catch (error: any) {
      Alert.alert('Error', 'ไม่สามารถแชร์ได้');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          📦 Shipping Label
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* QR Code Section */}
        <View style={[styles.qrSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.qrTitle, { color: colors.text }]}>
            สแกนเพื่อรับพัสดุ
          </Text>
          <View style={styles.qrContainer}>
            <QRCode
              value={qrValue}
              size={200}
              color={colors.text}
              backgroundColor={colors.background}
            />
          </View>
          <Text style={[styles.orderIdText, { color: colors.subText }]}>
            Order #{order.id}
          </Text>
        </View>

        {/* Customer Info */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ข้อมูลลูกค้า
            </Text>
          </View>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {customerName}
          </Text>
          {order.orderedBy?.email && (
            <Text style={[styles.infoSubText, { color: colors.subText }]}>
              {order.orderedBy.email}
            </Text>
          )}
        </View>

        {/* Shipping Address */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ที่อยู่จัดส่ง
            </Text>
          </View>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {order.shippingAddress || 'ไม่ระบุที่อยู่'}
          </Text>
          {order.shippingPhone && (
            <Text style={[styles.infoSubText, { color: colors.subText }]}>
              📞 {order.shippingPhone}
            </Text>
          )}
        </View>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <View style={[styles.section, { borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                รายการสินค้า ({order.items.length} รายการ)
              </Text>
            </View>
            {order.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={[styles.itemText, { color: colors.text }]}>
                  • {item.product?.title || item.productName || 'สินค้า'}
                  {item.count > 1 && ` x${item.count}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Order Summary */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>
              ยอดรวม:
            </Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              ฿{order.total.toLocaleString()}
            </Text>
          </View>
          {order.paymentMethod && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.subText }]}>
                วิธีชำระ:
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {order.paymentMethod === 'COD' ? 'ชำระปลายทาง' : 'ชำระแล้ว'}
              </Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={[styles.instructionsBox, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="information-circle" size={20} color="#1976D2" />
          <Text style={styles.instructionsText}>
            ไรเดอร์สามารถสแกน QR Code นี้เพื่อรับพัสดุและอัปเดตสถานะการจัดส่ง
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: colors.primary }]}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={styles.shareBtnText}>แชร์</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  qrSection: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoSubText: {
    fontSize: 12,
    marginTop: 4,
  },
  itemRow: {
    marginBottom: 6,
  },
  itemText: {
    fontSize: 13,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  instructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#1976D2',
    marginLeft: 8,
  },
  actions: {
    marginTop: 12,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ShippingLabel;

