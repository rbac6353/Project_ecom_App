import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAddress } from '@app/providers/AddressContext';
import { useTheme } from '@app/providers/ThemeContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import ThaiAddressPicker from '@shared/components/common/ThaiAddressPicker';

export default function AddAddressScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { addAddress } = useAddress();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [subDistrict, setSubDistrict] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  
  // State สำหรับ Address Picker Modal
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // ฟังก์ชันเมื่อเลือกที่อยู่เสร็จ
  const onAddressSelected = (addr: {
    province: string;
    amphure: string;
    tambon: string;
    zipcode: number;
  }) => {
    setProvince(addr.province);
    setDistrict(addr.amphure);
    setSubDistrict(addr.tambon);
    setPostalCode(addr.zipcode.toString());
  };

  const handleSave = async () => {
    if (!name || !phone || !addressLine || !postalCode) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    await addAddress({
      name,
      phone,
      addressLine,
      subDistrict,
      district,
      province,
      postalCode,
      isDefault
    });

    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="เพิ่มที่อยู่ใหม่" />
      
      <ScrollView style={styles.form}>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>ข้อมูลผู้รับ</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} 
            placeholder="ชื่อ-นามสกุล" 
            placeholderTextColor={colors.subText}
            value={name} onChangeText={setName} 
          />
          <TextInput 
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} 
            placeholder="เบอร์โทรศัพท์" 
            placeholderTextColor={colors.subText}
            keyboardType="phone-pad"
            value={phone} onChangeText={setPhone} 
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>ที่อยู่</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg || colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="บ้านเลขที่, ซอย, หมู่, ถนน"
            placeholderTextColor={colors.subText}
            value={addressLine}
            onChangeText={setAddressLine}
          />

          {/* ✅ ปุ่มเลือก จังหวัด/อำเภอ/ตำบล (แทน TextInput เดิม) */}
          <TouchableOpacity
            style={[styles.addressSelector, { backgroundColor: colors.inputBg || colors.background, borderColor: colors.border }]}
            onPress={() => setShowAddressPicker(true)}
          >
            <View style={{ flex: 1 }}>
              {province ? (
                <>
                  <Text style={[styles.selectedText, { color: colors.text }]}>
                    {subDistrict}, {district}, {province}, {postalCode}
                  </Text>
                  <Text style={[styles.helperText, { color: colors.primary }]}>กดเพื่อเปลี่ยน</Text>
                </>
              ) : (
                <Text style={[styles.placeholderText, { color: colors.subText }]}>
                  เลือก จังหวัด / อำเภอ / ตำบล
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subText} />
          </TouchableOpacity>
        </View>

        <View style={[styles.switchRow, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>ตั้งเป็นที่อยู่เริ่มต้น</Text>
          <Switch 
            value={isDefault} 
            onValueChange={setIsDefault} 
            trackColor={{ false: "#767577", true: colors.primary }}
          />
        </View>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>บันทึก</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ✅ ใส่ Modal ไว้ตรงนี้ */}
      <ThaiAddressPicker
        visible={showAddressPicker}
        onClose={() => setShowAddressPicker(false)}
        onSelect={onAddressSelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 15 },
  section: { marginBottom: 20, padding: 15, borderRadius: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    fontSize: 14
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  label: { fontSize: 14 },
  saveButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 4,
    padding: 15,
    marginBottom: 10,
    minHeight: 50,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  }
});

