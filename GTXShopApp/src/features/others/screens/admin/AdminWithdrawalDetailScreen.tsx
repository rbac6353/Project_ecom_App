import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import {
  getAdminWithdrawalDetail,
  approveWithdrawal,
  rejectWithdrawal,
  AdminWithdrawalRequest,
  WithdrawalStatus,
} from '@app/services/storeWalletService';
import {
  formatCurrency,
  formatThaiDateFull,
  getWithdrawalStatusStyle,
} from '@shared/utils/formatters';

export default function AdminWithdrawalDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { withdrawalId } = route.params ?? {};

  // State
  const [withdrawal, setWithdrawal] = useState<AdminWithdrawalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch Detail
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await getAdminWithdrawalDetail(withdrawalId);
        setWithdrawal(data);
      } catch (error) {
        console.error('Error fetching withdrawal detail:', error);
        Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    if (withdrawalId) {
      fetchDetail();
    }
  }, [withdrawalId, navigation]);

  // Pick Image
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงคลังรูปภาพ');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // ✅ SDK 53+ format
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProofImage(result.assets[0].uri);
    }
  };

  // Handle Approve
  const handleApprove = () => {
    if (!proofImage) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาอัปโหลดรูปสลิปการโอนเงินก่อนอนุมัติ');
      return;
    }

    Alert.alert(
      'ยืนยันการอนุมัติ',
      `อนุมัติคำขอถอนเงิน ${formatCurrency(withdrawal?.amount)}\nให้กับร้าน ${withdrawal?.store?.name || 'Unknown'}?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'อนุมัติ',
          style: 'default',
          onPress: async () => {
            setProcessing(true);
            try {
              await approveWithdrawal(withdrawalId, proofImage);
              Alert.alert('สำเร็จ', 'อนุมัติคำขอถอนเงินเรียบร้อยแล้ว', [
                { text: 'ตกลง', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              console.error('Approve error:', error);
              Alert.alert(
                'ผิดพลาด',
                error?.response?.data?.message || 'ไม่สามารถอนุมัติได้',
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  // Handle Reject
  const handleReject = () => {
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }

    setRejectModalVisible(false);
    setProcessing(true);

    try {
      await rejectWithdrawal(withdrawalId, rejectReason.trim());
      Alert.alert('สำเร็จ', 'ปฏิเสธคำขอถอนเงินเรียบร้อยแล้ว\n(เงินถูกคืนกลับเข้า Wallet ร้านค้าแล้ว)', [
        { text: 'ตกลง', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Reject error:', error);
      Alert.alert(
        'ผิดพลาด',
        error?.response?.data?.message || 'ไม่สามารถปฏิเสธได้',
      );
    } finally {
      setProcessing(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="รายละเอียดคำขอถอนเงิน" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      </View>
    );
  }

  if (!withdrawal) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="รายละเอียดคำขอถอนเงิน" />
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorText}>ไม่พบข้อมูล</Text>
        </View>
      </View>
    );
  }

  const statusStyle = getWithdrawalStatusStyle(withdrawal.status as WithdrawalStatus);
  const isPending = withdrawal.status === 'PENDING';

  return (
    <View style={styles.container}>
      <ScreenHeader title="รายละเอียดคำขอถอนเงิน" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={[styles.statusCard, { backgroundColor: statusStyle.bgColor }]}>
          <View style={[styles.statusIconBox, { backgroundColor: statusStyle.color }]}>
            <Ionicons name={statusStyle.icon as any} size={24} color="#fff" />
          </View>
          <Text style={[styles.statusLabel, { color: statusStyle.color }]}>
            {statusStyle.label}
          </Text>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountCardInner}>
            <Text style={styles.amountLabel}>จำนวนเงินที่ขอถอน</Text>
            <Text style={styles.amountValue}>{formatCurrency(withdrawal.amount)}</Text>
          </View>
        </View>

        {/* Store Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="storefront-outline" size={20} color="#FF5722" />
            <Text style={styles.sectionTitle}>ข้อมูลร้านค้า</Text>
          </View>
          <View style={styles.storeInfo}>
            {withdrawal.store?.logo ? (
              <Image source={{ uri: withdrawal.store.logo }} style={styles.storeLogo} />
            ) : (
              <View style={styles.storeLogoPlaceholder}>
                <Ionicons name="storefront" size={30} color="#999" />
              </View>
            )}
            <View style={styles.storeDetails}>
              <Text style={styles.storeName}>
                {withdrawal.store?.name || `ร้านค้า #${withdrawal.storeId}`}
              </Text>
              <Text style={styles.storeId}>Store ID: {withdrawal.storeId}</Text>
            </View>
          </View>
        </View>

        {/* Bank Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business-outline" size={20} color="#FF5722" />
            <Text style={styles.sectionTitle}>ข้อมูลบัญชีธนาคาร</Text>
          </View>
          <View style={styles.bankInfo}>
            <View style={styles.bankRow}>
              <View style={styles.bankIconBox}>
                <Ionicons name="business" size={16} color="#fff" />
              </View>
              <View style={styles.bankRowContent}>
                <Text style={styles.bankLabel}>ธนาคาร</Text>
                <Text style={styles.bankValue}>{withdrawal.bankName || '-'}</Text>
              </View>
            </View>
            <View style={styles.bankRow}>
              <View style={[styles.bankIconBox, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="card" size={16} color="#fff" />
              </View>
              <View style={styles.bankRowContent}>
                <Text style={styles.bankLabel}>เลขบัญชี</Text>
                <Text style={styles.bankValueMono}>{withdrawal.accountNumber || '-'}</Text>
              </View>
            </View>
            <View style={styles.bankRow}>
              <View style={[styles.bankIconBox, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="person" size={16} color="#fff" />
              </View>
              <View style={styles.bankRowContent}>
                <Text style={styles.bankLabel}>ชื่อบัญชี</Text>
                <Text style={styles.bankValue}>{withdrawal.accountName || '-'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Request Date */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color="#FF5722" />
            <Text style={styles.sectionTitle}>วันที่ขอถอน</Text>
          </View>
          <Text style={styles.dateText}>{formatThaiDateFull(withdrawal.createdAt)}</Text>
        </View>

        {/* Admin Note (if rejected) */}
        {withdrawal.status === 'REJECTED' && withdrawal.adminNote && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
              <Text style={[styles.sectionTitle, { color: '#D32F2F' }]}>เหตุผลการปฏิเสธ</Text>
            </View>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{withdrawal.adminNote}</Text>
            </View>
          </View>
        )}

        {/* Proof Image (if approved) */}
        {withdrawal.status === 'APPROVED' && withdrawal.proofImage && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="image-outline" size={20} color="#4CAF50" />
              <Text style={[styles.sectionTitle, { color: '#4CAF50' }]}>หลักฐานการโอนเงิน</Text>
            </View>
            <Image
              source={{ uri: withdrawal.proofImage }}
              style={styles.proofImageDisplay}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Proof Upload (for pending) */}
        {isPending && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cloud-upload-outline" size={20} color="#FF5722" />
              <Text style={styles.sectionTitle}>อัปโหลดสลิปการโอนเงิน</Text>
            </View>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              {proofImage ? (
                <Image source={{ uri: proofImage }} style={styles.proofImage} resizeMode="cover" />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <View style={styles.uploadIconBox}>
                    <Ionicons name="cloud-upload" size={32} color="#FF5722" />
                  </View>
                  <Text style={styles.uploadTitle}>แตะเพื่อเลือกรูปภาพ</Text>
                  <Text style={styles.uploadSubtitle}>รองรับไฟล์ JPG, PNG</Text>
                </View>
              )}
            </TouchableOpacity>
            {proofImage && (
              <TouchableOpacity
                style={styles.changeImageBtn}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={18} color="#FF5722" />
                <Text style={styles.changeImageText}>เปลี่ยนรูปภาพ</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Action Buttons (for pending) */}
        {isPending && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn, processing && styles.actionBtnDisabled]}
              onPress={handleApprove}
              disabled={processing}
              activeOpacity={0.8}
            >
              {processing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.actionBtnText}>อนุมัติ</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, processing && styles.actionBtnDisabled]}
              onPress={handleReject}
              disabled={processing}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={22} color="#fff" />
              <Text style={styles.actionBtnText}>ปฏิเสธ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Notice for Pending */}
        {isPending && (
          <View style={styles.infoNotice}>
            <Ionicons name="information-circle" size={20} color="#1976D2" />
            <Text style={styles.infoNoticeText}>
              หลังจากอนุมัติ ร้านค้าจะได้รับการแจ้งเตือนและเห็นสลิปที่อัปโหลด
              หากปฏิเสธ เงินจะถูกคืนกลับเข้า Wallet ของร้านค้าโดยอัตโนมัติ
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons name="close-circle" size={32} color="#D32F2F" />
              </View>
              <Text style={styles.modalTitle}>ปฏิเสธคำขอถอนเงิน</Text>
              <Text style={styles.modalSubtitle}>กรุณาระบุเหตุผลในการปฏิเสธ</Text>
            </View>

            <TextInput
              style={styles.reasonInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="พิมพ์เหตุผล เช่น ข้อมูลบัญชีไม่ถูกต้อง..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectReason('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={confirmReject}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>ยืนยันปฏิเสธ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  // Status Card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  statusIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Amount Card
  amountCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  amountCardInner: {
    backgroundColor: '#FF5722',
    padding: 28,
    alignItems: 'center',
  },
  amountLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginBottom: 6,
  },
  amountValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Section
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  // Store Info
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
  },
  storeLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeDetails: {
    marginLeft: 16,
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  storeId: {
    fontSize: 13,
    color: '#999',
  },
  // Bank Info
  bankInfo: {
    gap: 14,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bankRowContent: {
    flex: 1,
  },
  bankLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  bankValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  bankValueMono: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  // Date
  dateText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  // Note Box
  noteBox: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  noteText: {
    fontSize: 14,
    color: '#C62828',
    lineHeight: 22,
  },
  // Proof Image
  proofImageDisplay: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  // Upload
  uploadBox: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  uploadPlaceholder: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  uploadIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  proofImage: {
    width: '100%',
    height: 220,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6,
  },
  changeImageText: {
    fontSize: 14,
    color: '#FF5722',
    fontWeight: '600',
  },
  // Actions
  actionContainer: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  approveBtn: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  rejectBtn: {
    backgroundColor: '#F44336',
    shadowColor: '#F44336',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  // Info Notice
  infoNotice: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  reasonInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
    minHeight: 120,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmBtn: {
    backgroundColor: '#F44336',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
