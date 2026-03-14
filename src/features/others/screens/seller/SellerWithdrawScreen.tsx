import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { requestWithdrawal } from '@app/services/storeWalletService';
import { formatCurrency } from '@shared/utils/formatters';

// Thai Bank List
const THAI_BANKS = [
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย', color: '#138F2D' },
  { code: 'SCB', name: 'ธนาคารไทยพาณิชย์', color: '#4E2A84' },
  { code: 'BBL', name: 'ธนาคารกรุงเทพ', color: '#1E4598' },
  { code: 'KTB', name: 'ธนาคารกรุงไทย', color: '#1BA5E0' },
  { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา', color: '#FEC43B' },
  { code: 'TTB', name: 'ธนาคารทหารไทยธนชาต', color: '#0066B3' },
  { code: 'GSB', name: 'ธนาคารออมสิน', color: '#EB198D' },
  { code: 'BAAC', name: 'ธ.ก.ส.', color: '#4B9B3E' },
  { code: 'CIMB', name: 'ธนาคารซีไอเอ็มบีไทย', color: '#7B0D1E' },
  { code: 'UOB', name: 'ธนาคารยูโอบี', color: '#0B3B8E' },
  { code: 'LHBANK', name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์', color: '#6CBB3C' },
];

export default function SellerWithdrawScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // ดึง params จาก route
  const { storeId, balance } = route.params ?? {};
  const currentBalance = Number(balance ?? 0);

  // Form State
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Validation
  const isValidAmount = () => {
    const numAmount = Number(amount);
    return numAmount > 0 && numAmount <= currentBalance;
  };

  const isFormValid = () => {
    return (
      isValidAmount() &&
      bankName.trim() !== '' &&
      accountNumber.trim() !== '' &&
      accountName.trim() !== ''
    );
  };

  // Handle Submit
  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    const numAmount = Number(amount);
    if (numAmount > currentBalance) {
      Alert.alert(
        'ยอดเงินไม่เพียงพอ',
        `ยอดคงเหลือ: ${formatCurrency(currentBalance)}`,
      );
      return;
    }

    Alert.alert(
      'ยืนยันการถอนเงิน',
      `ถอนเงิน ${formatCurrency(numAmount)}\nไปยัง ${bankName}\nเลขบัญชี ${accountNumber}\nชื่อบัญชี ${accountName}`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          onPress: async () => {
            setSubmitting(true);
            try {
              await requestWithdrawal(storeId, {
                amount: numAmount,
                bankName,
                accountNumber: accountNumber.trim(),
                accountName: accountName.trim(),
              });

              Alert.alert(
                'สำเร็จ',
                'คำขอถอนเงินถูกส่งเรียบร้อยแล้ว\nรอการอนุมัติจากผู้ดูแลระบบ',
                [{ text: 'ตกลง', onPress: () => navigation.goBack() }],
              );
            } catch (error: any) {
              console.error('Withdrawal error:', error);
              Alert.alert(
                'ผิดพลาด',
                error?.response?.data?.message ||
                  error?.message ||
                  'ไม่สามารถส่งคำขอถอนเงินได้',
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  // Handle Quick Amount
  const handleQuickAmount = (percent: number) => {
    const quickAmount = Math.floor(currentBalance * percent * 100) / 100;
    setAmount(quickAmount.toString());
  };

  // Get selected bank color
  const getSelectedBankColor = () => {
    const bank = THAI_BANKS.find((b) => b.name === bankName);
    return bank?.color || '#666';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="ถอนเงิน" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Info */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardInner}>
            <Ionicons name="wallet" size={32} color="rgba(255,255,255,0.9)" />
            <Text style={styles.balanceLabel}>ยอดเงินคงเหลือ</Text>
            <Text style={styles.balanceValue}>{formatCurrency(currentBalance)}</Text>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={20} color="#FF5722" />
            <Text style={styles.sectionTitle}>จำนวนเงินที่ต้องการถอน</Text>
          </View>
          <View style={[
            styles.amountInputContainer,
            amount !== '' && !isValidAmount() && styles.amountInputError,
          ]}>
            <Text style={styles.currencySymbol}>฿</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#bbb"
            />
          </View>
          {amount !== '' && !isValidAmount() && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color="#D32F2F" />
              <Text style={styles.errorText}>
                {Number(amount) > currentBalance
                  ? 'ยอดเงินคงเหลือไม่เพียงพอ'
                  : 'จำนวนเงินต้องมากกว่า 0'}
              </Text>
            </View>
          )}

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountRow}>
            {[
              { label: '25%', value: 0.25 },
              { label: '50%', value: 0.5 },
              { label: '75%', value: 0.75 },
              { label: 'ทั้งหมด', value: 1 },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.quickAmountBtn,
                  Number(amount) === Math.floor(currentBalance * item.value * 100) / 100 &&
                    styles.quickAmountBtnActive,
                ]}
                onPress={() => handleQuickAmount(item.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    Number(amount) === Math.floor(currentBalance * item.value * 100) / 100 &&
                      styles.quickAmountTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bank Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business-outline" size={20} color="#FF5722" />
            <Text style={styles.sectionTitle}>ข้อมูลบัญชีธนาคาร</Text>
          </View>

          {/* Bank Selector */}
          <TouchableOpacity
            style={[
              styles.bankSelector,
              bankName && { borderColor: getSelectedBankColor() },
            ]}
            onPress={() => setShowBankPicker(!showBankPicker)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.bankIconBox,
                { backgroundColor: bankName ? getSelectedBankColor() : '#eee' },
              ]}
            >
              <Ionicons
                name="business"
                size={18}
                color={bankName ? '#fff' : '#999'}
              />
            </View>
            <Text style={[styles.bankSelectorText, !bankName && styles.placeholder]}>
              {bankName || 'เลือกธนาคาร'}
            </Text>
            <Ionicons
              name={showBankPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>

          {/* Bank Picker Dropdown */}
          {showBankPicker && (
            <View style={styles.bankDropdown}>
              <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                {THAI_BANKS.map((bank) => (
                  <TouchableOpacity
                    key={bank.code}
                    style={[
                      styles.bankOption,
                      bankName === bank.name && styles.bankOptionSelected,
                    ]}
                    onPress={() => {
                      setBankName(bank.name);
                      setShowBankPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.bankOptionIcon, { backgroundColor: bank.color }]}
                    >
                      <Text style={styles.bankOptionIconText}>
                        {bank.code.substring(0, 2)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.bankOptionText,
                        bankName === bank.name && styles.bankOptionTextSelected,
                      ]}
                    >
                      {bank.name}
                    </Text>
                    {bankName === bank.name && (
                      <Ionicons name="checkmark-circle" size={20} color="#FF5722" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Account Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              <Ionicons name="card-outline" size={14} color="#666" /> เลขบัญชี
            </Text>
            <TextInput
              style={styles.textInput}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              placeholder="กรอกเลขบัญชี 10-15 หลัก"
              placeholderTextColor="#bbb"
              maxLength={15}
            />
          </View>

          {/* Account Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              <Ionicons name="person-outline" size={14} color="#666" /> ชื่อบัญชี
            </Text>
            <TextInput
              style={styles.textInput}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="กรอกชื่อ-นามสกุลเจ้าของบัญชี"
              placeholderTextColor="#bbb"
            />
          </View>
        </View>

        {/* Notice */}
        <View style={styles.notice}>
          <View style={styles.noticeIconBox}>
            <Ionicons name="time-outline" size={20} color="#E65100" />
          </View>
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>ระยะเวลาดำเนินการ</Text>
            <Text style={styles.noticeText}>
              คำขอถอนเงินจะถูกดำเนินการภายใน 1-3 วันทำการ หลังจากผู้ดูแลระบบอนุมัติ
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, !isFormValid() && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isFormValid() || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>ส่งคำขอถอนเงิน</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Summary */}
        {isFormValid() && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>สรุปการถอนเงิน</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>จำนวนเงิน</Text>
              <Text style={styles.summaryValue}>{formatCurrency(amount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>ธนาคาร</Text>
              <Text style={styles.summaryValue}>{bankName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>เลขบัญชี</Text>
              <Text style={styles.summaryValue}>{accountNumber}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  // Balance Card
  balanceCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  balanceCardInner: {
    backgroundColor: '#FF5722',
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 32,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  // Amount Input
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
  },
  amountInputError: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF8F8',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF5722',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    paddingVertical: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '500',
  },
  // Quick Amount
  quickAmountRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickAmountBtnActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF5722',
  },
  quickAmountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  quickAmountTextActive: {
    color: '#FF5722',
  },
  // Bank Selector
  bankSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  bankIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankSelectorText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  placeholder: {
    color: '#aaa',
    fontWeight: '400',
  },
  bankDropdown: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bankOptionSelected: {
    backgroundColor: '#FFF8E1',
  },
  bankOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankOptionIconText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  bankOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  bankOptionTextSelected: {
    color: '#E65100',
    fontWeight: '600',
  },
  // Input Group
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  // Notice
  notice: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  noticeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE082',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#F57C00',
    lineHeight: 20,
  },
  // Submit Button
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    padding: 18,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: '#bdbdbd',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#E8F5E9',
    padding: 18,
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#558B2F',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
});
