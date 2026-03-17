import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
// Import ข้อมูลที่อยู่
import addressData from '@assets/data/thai_address.json';

interface ThaiAddressPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: {
    province: string;
    amphure: string;
    tambon: string;
    zipcode: number;
  }) => void;
}

export default function ThaiAddressPicker({ visible, onClose, onSelect }: ThaiAddressPickerProps) {
  const { colors } = useTheme();

  const [step, setStep] = useState(0); // 0=Prov, 1=Amp, 2=Tam
  const [selectedProvince, setSelectedProvince] = useState<any>(null);
  const [selectedAmphure, setSelectedAmphure] = useState<any>(null);
  const [selectedTambon, setSelectedTambon] = useState<any>(null);

  const [listData, setListData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Reset เมื่อเปิดใหม่
  useEffect(() => {
    if (visible) {
      setStep(0);
      setListData(addressData);
      setSelectedProvince(null);
      setSelectedAmphure(null);
      setSelectedTambon(null);
      setSearchQuery('');
    }
  }, [visible]);

  // Filter ข้อมูลตาม searchQuery
  const filteredData = listData.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (step === 2 && item.zip_code) {
      // Step 2: ค้นหารหัสไปรษณีย์ด้วย
      return item.name_th?.toLowerCase().includes(query) || item.zip_code?.toString().includes(query);
    }
    return item.name_th?.toLowerCase().includes(query);
  });

  // Logic การเลือก
  const handleSelect = (item: any) => {
    if (step === 0) {
      setSelectedProvince(item);
      setListData(item.amphure || []);
      setStep(1);
      setSearchQuery('');
    } else if (step === 1) {
      setSelectedAmphure(item);
      setListData(item.tambon || []);
      setStep(2);
      setSearchQuery('');
    } else if (step === 2) {
      // เลือกตำบลเสร็จแล้วจบเลย
      setSelectedTambon(item);
      onSelect({
        province: selectedProvince.name_th,
        amphure: selectedAmphure.name_th,
        tambon: item.name_th,
        zipcode: item.zip_code,
      });
      onClose();
    }

    // Scroll กลับไปบนสุดของ List ใหม่
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  };

  // ฟังก์ชันย้อนกลับไปแก้ Step เก่า
  const jumpToStep = (targetStep: number) => {
    if (targetStep === 0) {
      setListData(addressData);
      setSelectedProvince(null);
      setSelectedAmphure(null);
      setSelectedTambon(null);
    } else if (targetStep === 1) {
      setListData(selectedProvince.amphure || []);
      setSelectedAmphure(null);
      setSelectedTambon(null);
    } else if (targetStep === 2) {
      setListData(selectedAmphure.tambon || []);
      setSelectedTambon(null);
    }
    setStep(targetStep);
    setSearchQuery('');
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  };

  // UI ส่วนแสดง Step ที่เลือกไปแล้ว (Timeline)
  const renderBreadcrumbs = () => {
    return (
      <View style={[styles.breadcrumbContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerLabel, { color: colors.subText }]}>เลือกที่อยู่</Text>

        {/* Step 0: Province */}
        <TouchableOpacity
          style={styles.stepRow}
          onPress={() => jumpToStep(0)}
          disabled={step === 0}
        >
          <View style={styles.timelineCol}>
            <View
              style={[
                styles.dot,
                step > 0 ? [styles.activeDot, { backgroundColor: colors.primary }] : [styles.currentDot, { borderColor: colors.primary }],
              ]}
            />
            <View style={[styles.line, step > 0 && { backgroundColor: colors.primary }, { backgroundColor: colors.border }]} />
          </View>
          <Text style={[styles.stepText, step === 0 && styles.activeStepText, { color: step === 0 ? colors.primary : colors.text }]}>
            {selectedProvince ? selectedProvince.name_th : 'เลือกจังหวัด'}
          </Text>
        </TouchableOpacity>

        {/* Step 1: Amphure */}
        {step >= 1 && (
          <TouchableOpacity style={styles.stepRow} onPress={() => jumpToStep(1)} disabled={step === 1}>
            <View style={styles.timelineCol}>
              <View
                style={[
                  styles.dot,
                  step > 1 ? [styles.activeDot, { backgroundColor: colors.primary }] : [styles.currentDot, { borderColor: colors.primary }],
                ]}
              />
              <View style={[styles.line, step > 1 && { backgroundColor: colors.primary }, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.stepText, step === 1 && styles.activeStepText, { color: step === 1 ? colors.primary : colors.text }]}>
              {selectedAmphure ? selectedAmphure.name_th : 'เลือกอำเภอ/เขต'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Step 2: Tambon */}
        {step >= 2 && (
          <TouchableOpacity style={styles.stepRow} onPress={() => jumpToStep(2)} disabled={step === 2}>
            <View style={styles.timelineCol}>
              <View
                style={[
                  styles.dot,
                  step > 2 ? [styles.activeDot, { backgroundColor: colors.primary }] : [styles.currentDot, { borderColor: colors.primary }],
                ]}
              />
              {/* Last line hidden */}
            </View>
            <Text style={[styles.stepText, step === 2 && styles.activeStepText, { color: step === 2 ? colors.primary : colors.text }]}>
              {selectedTambon ? selectedTambon.name_th : 'เลือกตำบล/แขวง'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header Bar */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.icon} />
          </TouchableOpacity>
          <View style={[styles.searchBar, { backgroundColor: colors.inputBg || colors.background }]}>
            <Ionicons name="search" size={18} color={colors.subText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="ค้นหา..."
              placeholderTextColor={colors.subText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.subText} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Timeline Breadcrumbs */}
        {renderBreadcrumbs()}

        {/* Current Selection List */}
        <View style={[styles.listContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.listHeader, { backgroundColor: colors.card }]}>
            <Text style={[styles.listTitle, { color: colors.subText }]}>
              {step === 0 ? 'จังหวัด' : step === 1 ? 'อำเภอ/เขต' : 'ตำบล/แขวง'}
            </Text>
          </View>

          <FlatList
            ref={flatListRef}
            data={filteredData}
            keyExtractor={(item, index) => `${item.id || index}-${step}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                onPress={() => handleSelect(item)}
              >
                <Text style={[styles.itemText, { color: colors.text }]}>{item.name_th}</Text>
                {/* ถ้าเป็นขั้นตอนเลือกตำบล ให้โชว์รหัสไปรษณีย์ขวาสุด */}
                {step === 2 && item.zip_code && (
                  <Text style={[styles.zipcode, { color: colors.primary }]}>{item.zip_code}</Text>
                )}
                {step !== 2 && <Ionicons name="chevron-forward" size={16} color={colors.subText} />}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.subText }]}>ไม่พบข้อมูล</Text>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 5,
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    marginLeft: 5,
    fontSize: 14,
    paddingVertical: 0,
  },

  // Breadcrumbs (Timeline)
  breadcrumbContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  headerLabel: {
    fontSize: 12,
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    height: 40,
  },
  timelineCol: {
    width: 30,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  activeDot: {
    // backgroundColor will be set dynamically
  },
  currentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  line: {
    width: 1,
    flex: 1,
    marginVertical: 2,
  },
  activeLine: {
    // backgroundColor will be set dynamically
  },
  stepText: {
    fontSize: 16,
    marginTop: 0,
  },
  activeStepText: {
    fontWeight: 'bold',
  },

  // List Area
  listContainer: {
    flex: 1,
  },
  listHeader: {
    padding: 15,
  },
  listTitle: {
    fontSize: 14,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  itemText: {
    fontSize: 16,
  },
  zipcode: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    marginLeft: 15,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
