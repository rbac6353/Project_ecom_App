import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Vibration,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import client from '@app/api/client';
import * as orderService from '@app/services/orderService';
import { useAuth } from '@app/providers/AuthContext';

export default function CourierScanScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  const [scanResult, setScanResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualOrderId, setManualOrderId] = useState('');
  const [confirmingReceived, setConfirmingReceived] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // ✅ ฟังก์ชันสำหรับตรวจสอบ Order ID (ใช้ได้ทั้งจาก QR และ manual input)
  const checkOrderId = async (orderId: string) => {
    // ✅ รองรับทั้งแบบมี prefix "ORDER-" และไม่มี (orderId โดยตรง)
    let cleanOrderId = String(orderId).trim();
    // ลบ prefix ถ้ามี
    if (cleanOrderId.startsWith('ORDER-')) {
      cleanOrderId = cleanOrderId.replace('ORDER-', '').trim();
    }

    // ตรวจสอบว่ามีค่า
    if (!cleanOrderId) {
      Alert.alert('ไม่พบข้อมูล', 'กรุณากรอกหมายเลขออเดอร์หรือเลขพัสดุ');
      return;
    }

    setLoading(true);
    try {
      // ✅ เรียก API โดยตรงไม่ผ่าน cache เพื่อให้ได้ข้อมูลล่าสุด
      const response = await client.get(
        `/shipments/orders/${encodeURIComponent(cleanOrderId)}/preview`,
      );

      console.log('📦 Preview raw response:', JSON.stringify(response, null, 2));

      // ✅ กันเหนียว: unwrap response ถ้ามี .data ซ้อนอยู่ (Axios จะ wrap ใน .data)
      const data = response?.data ?? response;

      console.log('📦 Preview data:', JSON.stringify(data, null, 2));

      // ✅ ตรวจสอบว่า data มีข้อมูลหรือไม่
      if (!data || typeof data !== 'object') {
        Alert.alert('ไม่พบข้อมูล', `ไม่พบพัสดุหมายเลข ${cleanOrderId}`);
        setLoading(false);
        return;
      }

      // ✅ ตรวจสอบ availableAction จาก backend (backend จะกำหนด action ที่ทำได้)
      // PICKUP = รับของ, DELIVER = ส่งของ, NONE = ไม่มี action
      if (data.availableAction === 'NONE') {
        Alert.alert(
          'ไม่สามารถทำรายการได้',
          `ออเดอร์นี้อยู่ในสถานะ "${data.orderStatus || 'ไม่ทราบ'}" และไม่สามารถทำรายการได้\n\nสถานะพัสดุ: ${data.shipmentStatus || 'ไม่ทราบ'}`,
        );
        setLoading(false);
        return;
      }

      // ✅ ถ้ามี action ที่ทำได้ (PICKUP หรือ DELIVER) ให้แสดง modal
      setScanResult(data);
      setShowModal(true);
      setShowManualInput(false);
      setManualOrderId('');
    } catch (error: any) {
      // ✅ จัดการ error 429 โดยไม่แสดง error หรือแสดงข้อความที่เหมาะสม
      if (error.response?.status === 429) {
        // ไม่ log error 429 เพื่อไม่ให้ console เต็ม
        Alert.alert(
          'กำลังโหลดข้อมูล',
          'ระบบกำลังประมวลผล กรุณารอสักครู่แล้วลองอีกครั้ง',
        );
      } else {
        console.error('Preview error', error);
        const errorMessage =
          error.response?.data?.message ||
          `ไม่พบพัสดุหมายเลข ${cleanOrderId}`;
        Alert.alert('ไม่พบข้อมูล', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = async ({ data }: any) => {
    if (scanned) {
      return;
    }
    setScanned(true);
    Vibration.vibrate();
    await checkOrderId(data);
  };

  const handleConfirmPickup = async () => {
    if (!scanResult || scanResult.availableAction !== 'PICKUP') {
      return;
    }

    try {
      setConfirming(true);

      // ✅ เรียก API เพื่อยืนยันการรับของ
      await client.patch(`/shipments/${scanResult.shipmentId}/pickup`);

      Alert.alert(
        'สำเร็จ',
        'ยืนยันรับพัสดุเรียบร้อยแล้ว\nสถานะออเดอร์เปลี่ยนเป็น "กำลังขนส่ง"',
        [
          {
            text: 'ตกลง',
            onPress: () => {
              setShowModal(false);
              setScanned(false);
              // ✅ Navigate กลับไปที่ Dashboard (จะ refresh อัตโนมัติเมื่อ focus)
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('Pickup error', error);
      const errorMessage =
        error.response?.data?.message || 'ไม่สามารถยืนยันรับของได้';
      Alert.alert('ผิดพลาด', errorMessage);
    } finally {
      setConfirming(false);
    }
  };

  // ✅ ฟังก์ชันยืนยันการรับของ (สำหรับลูกค้า)
  const handleConfirmReceived = async () => {
    if (!scanResult) return;

    try {
      setConfirmingReceived(true);
      await orderService.completeOrder(scanResult.id);

      // ✅ Refresh ข้อมูลออเดอร์จาก API เพื่อให้แน่ใจว่าข้อมูลเป็นปัจจุบัน
      try {
        const res = await client.get(
          `/shipments/orders/${scanResult.id}/preview`,
        );
        setScanResult({
          ...res.data,
          orderStatus: 'COMPLETED',
          availableAction: 'NONE',
        });
      } catch (refreshError) {
        // ถ้า refresh ไม่ได้ ให้อัปเดตสถานะออเดอร์เป็น COMPLETED
        setScanResult({
          ...scanResult,
          orderStatus: 'COMPLETED',
          availableAction: 'NONE',
        });
      }

      Alert.alert(
        'สำเร็จ',
        'ยืนยันการรับสินค้าเรียบร้อยแล้ว\nขอบคุณที่ใช้บริการ BoxiFY',
        [
          {
            text: 'ตกลง',
            onPress: () => {
              setShowModal(false);
              setScanned(false);
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('Confirm received error:', error);

      // ✅ จัดการ error 400 (Bad Request) - อาจเป็นเพราะออเดอร์ถูกยืนยันไปแล้ว
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'ไม่สามารถยืนยันการรับสินค้าได้';
        if (errorMessage.includes('สถานะ') || errorMessage.includes('COMPLETED')) {
          // อัปเดตสถานะเป็น COMPLETED แม้ว่าจะ error
          setScanResult({
            ...scanResult,
            orderStatus: 'COMPLETED',
            availableAction: 'NONE',
          });
          Alert.alert(
            'แจ้งเตือน',
            'ออเดอร์นี้ถูกยืนยันการรับของไปแล้ว',
          );
        } else {
          Alert.alert('ผิดพลาด', errorMessage);
        }
      } else if (error.response?.status === 429) {
        // ✅ จัดการ error 429
        Alert.alert(
          'กำลังประมวลผล',
          'ระบบกำลังประมวลผล กรุณารอสักครู่แล้วลองอีกครั้ง',
        );
      } else {
        const errorMessage =
          error.response?.data?.message || 'ไม่สามารถยืนยันการรับสินค้าได้';
        Alert.alert('ผิดพลาด', errorMessage);
      }
    } finally {
      setConfirmingReceived(false);
    }
  };

  // ✅ ฟังก์ชันสำหรับไรเดอร์ยืนยันส่งของสำเร็จ
  const handleConfirmDelivery = async () => {
    if (!scanResult || !scanResult.shipmentId) return;

    try {
      setConfirmingReceived(true);

      // ✅ เรียก API ของไรเดอร์ส่งสำเร็จ
      await client.patch(`/shipments/${scanResult.shipmentId}/complete`, {
        collectedCod: false, // ถ้าเป็น COD ให้ส่ง true
      });

      Alert.alert(
        'สำเร็จ',
        'ยืนยันส่งพัสดุเรียบร้อยแล้ว\nออเดอร์เสร็จสมบูรณ์',
        [
          {
            text: 'ตกลง',
            onPress: () => {
              setShowModal(false);
              setScanned(false);
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('Delivery complete error:', error);
      const errorMessage =
        error.response?.data?.message || 'ไม่สามารถยืนยันการส่งได้';
      Alert.alert('ผิดพลาด', errorMessage);
    } finally {
      setConfirmingReceived(false);
    }
  };

  const handleAction = async () => {
    if (!scanResult) return;

    // ✅ ตรวจสอบว่าเป็นไรเดอร์หรือไม่
    const isCourier = user?.role?.toLowerCase() === 'courier';

    if (scanResult.availableAction === 'PICKUP') {
      // ✅ ไรเดอร์: ยืนยันรับของจากร้าน
      await handleConfirmPickup();
    } else if (scanResult.availableAction === 'DELIVER') {
      if (isCourier) {
        // ✅ ไรเดอร์: ยืนยันส่งของสำเร็จ
        Alert.alert(
          'ยืนยันการส่งสำเร็จ',
          `คุณต้องการยืนยันว่าส่งพัสดุ Order #${scanResult.id} เรียบร้อยแล้วใช่หรือไม่?`,
          [
            { text: 'ยกเลิก', style: 'cancel' },
            {
              text: 'ยืนยันส่งสำเร็จ',
              onPress: handleConfirmDelivery,
            },
          ],
        );
      } else {
        // ✅ ลูกค้า: ยืนยันรับของ
        Alert.alert(
          'ยืนยันการรับของ',
          `คุณต้องการยืนยันว่าคุณได้รับสินค้า Order #${scanResult.id} แล้วใช่หรือไม่?`,
          [
            { text: 'ยกเลิก', style: 'cancel' },
            {
              text: 'ยืนยัน',
              onPress: handleConfirmReceived,
            },
          ],
        );
      }
    } else {
      Alert.alert(
        'แจ้งเตือน',
        'งานนี้เสร็จสิ้นแล้ว หรือสถานะไม่รองรับการทำรายการ',
      );
      setShowModal(false);
      setScanned(false);
    }
  };

  if (!permission || !permission.granted) {
    return (
      <View style={styles.center}>
        <Text>กรุณาอนุญาตให้แอปใช้งานกล้อง</Text>
        <TouchableOpacity
          style={[styles.btn, { marginTop: 16 }]}
          onPress={requestPermission}
        >
          <Text style={styles.btnText}>อนุญาตการเข้าถึงกล้อง</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'code128'],
        }}
      />

      {/* Overlay frame */}
      <View style={styles.overlay}>
        <View style={styles.topDim} />
        <View style={styles.middleRow}>
          <View className="sideDim" style={styles.sideDim} />
          <View style={styles.scanFrame}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
          <View style={styles.sideDim} />
        </View>
        <View style={styles.bottomDim}>
          <Text style={styles.hintText}>ส่อง QR Code บนกล่องพัสดุ</Text>
          {loading && (
            <ActivityIndicator
              size="large"
              color="#fff"
              style={{ marginTop: 20 }}
            />
          )}
          {/* ✅ ปุ่มกรอก Order ID แทนการสแกน */}
          <TouchableOpacity
            style={styles.manualInputBtn}
            onPress={() => setShowManualInput(true)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.manualInputText}>กรอก Order ID แทน</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Close button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close-circle" size={40} color="#fff" />
      </TouchableOpacity>

      {/* ✅ Modal สำหรับกรอก Order ID แทนการสแกน */}
      <Modal visible={showManualInput} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>กรอก Order ID</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowManualInput(false);
                  setManualOrderId('');
                }}
              >
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.manualInputLabel}>
              กรุณากรอกหมายเลขออเดอร์ (Order ID)
            </Text>
            <TextInput
              style={styles.orderIdInput}
              placeholder="เช่น 70, ORDER-70 หรือเลขพัสดุ"
              value={manualOrderId}
              onChangeText={setManualOrderId}
              // keyboardType="numeric" // ✅ ปิดเพื่อให้พิมพ์ตัวอักษรได้ (สำหรับ Tracking Number)
              autoFocus
            />

            <TouchableOpacity
              style={[
                styles.btn,
                styles.pickupBtn,
                (!manualOrderId.trim() || loading) && styles.btnDisabled,
              ]}
              onPress={() => checkOrderId(manualOrderId)}
              disabled={!manualOrderId.trim() || loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.btnText}>กำลังตรวจสอบ...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="search" size={20} color="#fff" />
                  <Text style={styles.btnText}>ตรวจสอบออเดอร์</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Result Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📦 พัสดุ #{scanResult?.id ?? ''}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setScanned(false);
                }}
              >
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={20} color="#2196F3" />
                <Text style={styles.infoHeaderText}>ข้อมูลออเดอร์</Text>
              </View>
              <InfoRow
                label="Order ID"
                value={`#${scanResult?.id || ''}`}
                icon="receipt-outline"
              />
              <InfoRow
                label="ร้านค้า"
                value={scanResult?.storeName || '-'}
                icon="storefront-outline"
              />
              <InfoRow
                label="ลูกค้า"
                value={scanResult?.customerName || '-'}
                icon="person-outline"
              />
              <InfoRow
                label="ที่อยู่จัดส่ง"
                value={scanResult?.shippingAddress || '-'}
                icon="location-outline"
                multiline
              />
              <InfoRow
                label="จำนวนสินค้า"
                value={`${scanResult?.totalItems || 0} รายการ`}
                icon="cube-outline"
              />
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>สถานะ:</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        scanResult?.shipmentStatus === 'WAITING_PICKUP'
                          ? '#FFF3E0'
                          : '#E3F2FD',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          scanResult?.shipmentStatus === 'WAITING_PICKUP'
                            ? '#FF9800'
                            : '#2196F3',
                      },
                    ]}
                  >
                    {scanResult?.shipmentStatus === 'WAITING_PICKUP'
                      ? 'รอรับของ'
                      : scanResult?.shipmentStatus || '-'}
                  </Text>
                </View>
              </View>
            </View>

            {scanResult?.availableAction === 'PICKUP' && (
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.pickupBtn,
                  confirming && styles.btnDisabled,
                ]}
                onPress={handleAction}
                disabled={confirming}
              >
                {confirming ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.btnText}>กำลังยืนยัน...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.btnText}>✅ ยืนยันการรับของ</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {scanResult?.availableAction === 'DELIVER' && scanResult?.orderStatus !== 'COMPLETED' && (
              <TouchableOpacity
                style={[
                  styles.btn,
                  { backgroundColor: '#4CAF50' },
                  (confirmingReceived || scanResult?.orderStatus === 'COMPLETED') && styles.btnDisabled,
                ]}
                onPress={handleAction}
                disabled={confirmingReceived || scanResult?.orderStatus === 'COMPLETED'}
              >
                {confirmingReceived ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.btnText}>กำลังยืนยัน...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.btnText}>✅ ยืนยันการรับของ</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* ✅ แสดงข้อความเมื่อออเดอร์ถูกยืนยันแล้ว */}
            {scanResult?.orderStatus === 'COMPLETED' && (
              <View style={[styles.btn, { backgroundColor: '#ccc' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#666" />
                <Text style={[styles.btnText, { color: '#666' }]}>✅ ยืนยันการรับของแล้ว</Text>
              </View>
            )}

            {scanResult?.availableAction === 'NONE' && (
              <View style={[styles.btn, { backgroundColor: '#ccc' }]}>
                <Text style={styles.btnText}>รายการนี้เสร็จสิ้นแล้ว</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const InfoRow = ({
  label,
  value,
  color,
  icon,
  multiline = false,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: string;
  multiline?: boolean;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoRowLeft}>
      {icon && <Ionicons name={icon as any} size={16} color="#999" />}
      <Text style={styles.infoLabel}>{label}:</Text>
    </View>
    <Text
      style={[
        styles.infoValue,
        { color: color || '#333' },
        multiline && styles.infoValueMultiline,
      ]}
      numberOfLines={multiline ? 3 : 2}
    >
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject },
  topDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  bottomDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: 20,
  },
  middleRow: { flexDirection: 'row', height: 250 },
  sideDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scanFrame: {
    width: 250,
    borderColor: 'transparent',
    borderWidth: 0,
    position: 'relative',
  },
  hintText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  closeBtn: { position: 'absolute', top: 50, right: 20 },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderColor: '#00FF00',
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderColor: '#00FF00',
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderColor: '#00FF00',
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderColor: '#00FF00',
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  infoBox: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  infoValue: {
    flex: 1,
    fontWeight: '600',
    fontSize: 13,
    color: '#333',
  },
  infoValueMultiline: {
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statusLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  btn: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pickupBtn: {
    backgroundColor: '#FF9800',
  },
  btnDisabled: {
    backgroundColor: '#BDBDBD',
    opacity: 0.7,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  manualInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  manualInputText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  manualInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  orderIdInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
});

