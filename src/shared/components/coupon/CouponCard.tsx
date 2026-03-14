// components/coupon/CouponCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Coupon } from '@shared/interfaces/coupon';

interface CouponCardProps {
  coupon: Coupon;
  onPress?: () => void;
  actionLabel?: string; // เช่น "ใช้โค้ด", "เก็บ", "ใช้ทีหลัง"
  status?: 'COLLECTIBLE' | 'COLLECTED' | 'USED'; // เพิ่ม Status
}

export const CouponCard: React.FC<CouponCardProps> = ({ 
  coupon, 
  onPress, 
  actionLabel,
  status = 'COLLECTIBLE'
}) => {
  
  // กำหนดสีและไอคอนตามประเภทคูปอง
  const getTheme = () => {
    switch (coupon.type) {
      case 'SHIPPING':
        return { 
          color: '#26aa99', // เขียว (ส่งฟรี)
          icon: 'car-outline' as const, 
          bg: '#e0f7fa',
          label: 'FREE\nโค้ดส่งฟรี'
        };
      case 'DISCOUNT':
        return { 
          color: '#ee4d2d', // ส้ม (ส่วนลด)
          icon: 'ticket-outline' as const, 
          bg: '#ffebee',
          label: 'โค้ด\nส่วนลด'
        };
      case 'COIN':
        return { 
          color: '#f6a700', // เหลือง (Coins)
          icon: 'logo-bitcoin' as const, 
          bg: '#fff8e1',
          label: 'โค้ด\nรับเงินคืน'
        };
      default:
        return { 
          color: '#ee4d2d', 
          icon: 'ticket-outline' as const, 
          bg: '#fff',
          label: 'โค้ด\nส่วนลด'
        };
    }
  };

  const theme = getTheme();

  // Logic การแสดงผลปุ่ม
  const isUsed = status === 'USED' || (coupon.isUsed ?? false);
  const isCollected = status === 'COLLECTED';
  
  // กำหนด actionLabel ตาม status
  const getActionLabel = () => {
    if (actionLabel) return actionLabel;
    if (isUsed) return 'ใช้แล้ว';
    if (isCollected) return 'ใช้โค้ด';
    return 'เก็บ';
  };

  // สร้างข้อความส่วนลด
  const getDiscountText = () => {
    if (coupon.type === 'SHIPPING') {
      return `ส่งฟรี สูงสุด ฿${coupon.maxDiscount?.toLocaleString() || 0}`;
    }
    if (coupon.discountPercent) {
      return `ส่วนลด ${coupon.discountPercent}% ลด${coupon.maxDiscount ? ` สูงสุด ฿${coupon.maxDiscount.toLocaleString()}` : ''}`;
    }
    if (coupon.discountAmount) {
      return `ส่วนลด ฿${coupon.discountAmount.toLocaleString()}`;
    }
    return coupon.title;
  };

  // สร้างข้อความ platform badge
  const getPlatformText = () => {
    // ถ้ามี storeId = Platform Voucher, ไม่มี = Shop Voucher
    if (coupon.storeId) {
      return coupon.storeName || 'Shop Voucher';
    }
    
    // ถ้าไม่มี storeId = Platform Voucher
    if (!coupon.storeId) {
      return 'Platform Voucher';
    }
    
    // Fallback ใช้ platform เดิม
    switch (coupon.platform) {
      case 'MALL':
        return 'Mall';
      case 'LIVE':
        return 'Live';
      case 'SHOP':
        return 'ร้านโค้ดคุ้ม Xtra';
      default:
        return coupon.description || 'Platform Voucher';
    }
  };

  // Format วันหมดอายุ
  const formatExpiry = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return 'หมดอายุแล้ว';
      }
      if (diffDays === 0) {
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        return `หมดอายุใน: เหลือ ${diffHours} ชั่วโมง`;
      }
      if (diffDays === 1) {
        return 'หมดอายุใน: 1 วัน';
      }
      return `ใช้ได้ถึง ${date.toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })}`;
    } catch {
      return 'ใช้ได้ถึง ' + dateString;
    }
  };

  return (
    <View style={[styles.container, isUsed && styles.containerUsed]}>
      {/* ส่วนซ้าย: สีและไอคอน */}
      <View style={[styles.leftSection, { backgroundColor: isUsed ? '#ccc' : theme.color }]}>
        <View style={styles.iconCircle}>
          <Ionicons name={theme.icon} size={24} color={isUsed ? '#999' : theme.color} />
        </View>
        <Text style={styles.leftText}>{theme.label}</Text>
        
        {/* รอยปรุวงกลม (บน/ล่าง) */}
        <View style={styles.punchHoleTop} />
        <View style={styles.punchHoleBottom} />
      </View>

      {/* ส่วนขวา: รายละเอียด */}
      <View style={styles.rightSection}>
        {/* เส้นประคั่นกลาง */}
        <View style={styles.dashedLine} />

        <View style={styles.content}>
          {/* ป้ายกำกับ (Platform Voucher, Shop Voucher, etc.) */}
          <View style={[styles.badge, { borderColor: isUsed ? '#999' : theme.color }]}>
            <Text style={[styles.badgeText, { color: isUsed ? '#999' : theme.color }]}>
              {getPlatformText()}
            </Text>
          </View>

          <Text style={[styles.title, isUsed && styles.titleUsed]} numberOfLines={1}>
            {getDiscountText()}
          </Text>
          
          <Text style={styles.subtitle}>
            ขั้นต่ำ ฿{coupon.minPurchase.toLocaleString()}
            {coupon.type === 'COIN' && coupon.maxDiscount 
              ? ` สูงสุด ${coupon.maxDiscount.toLocaleString()} coins` 
              : ''}
          </Text>
          
          <View style={styles.footer}>
            <Text style={styles.expiry}>
              {formatExpiry(coupon.expiresAt)}
            </Text>
          </View>
        </View>

        {/* ปุ่มกด */}
        <View style={styles.actionSection}>
          {!isUsed && (
            <TouchableOpacity 
              onPress={onPress} 
              style={[
                styles.button, 
                isCollected 
                  ? { backgroundColor: theme.color, borderColor: theme.color }
                  : { borderColor: theme.color, backgroundColor: '#fff' }
              ]}
            >
              <Text style={[
                styles.buttonText, 
                isCollected 
                  ? { color: '#fff' }
                  : { color: theme.color }
              ]}>
                {getActionLabel()}
              </Text>
            </TouchableOpacity>
          )}
          {isUsed && (
            <Text style={styles.usedText}>ใช้แล้ว</Text>
          )}
          <Text style={styles.tnc}>เงื่อนไข</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 110,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 3, // Shadow Android
    shadowColor: '#000', // Shadow iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  containerUsed: {
    opacity: 0.7,
  },
  titleUsed: {
    color: '#999',
  },
  leftSection: {
    width: 110,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  leftText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  punchHoleTop: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f5f5f5', // สีเดียวกับ Background Screen
  },
  punchHoleBottom: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
  },
  dashedLine: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  expiry: {
    fontSize: 10,
    color: '#999',
  },
  actionSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: '#fff',
    marginBottom: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  usedText: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tnc: {
    fontSize: 10,
    color: '#1e88e5', // สีน้ำเงินสำหรับลิงก์
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 2,
  },
});

