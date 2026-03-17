import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAddress } from '@app/providers/AddressContext';
import { useTheme } from '@app/providers/ThemeContext';
import ScreenHeader from '@shared/components/common/ScreenHeader';

export default function AddressListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { addresses, deleteAddress, selectAddress, selectedAddress } = useAddress();
  
  const isSelectMode = route.params?.mode === 'select';

  const handleSelect = (address: any) => {
    if (isSelectMode) {
      selectAddress(address);
      navigation.goBack(); // กลับไปหน้า Checkout
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedAddress?.id === item.id;

    return (
      <TouchableOpacity 
        style={[
          styles.card,
          { backgroundColor: colors.card },
          isSelected && isSelectMode && { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.background },
        ]} 
        onPress={() => handleSelect(item)}
        disabled={!isSelectMode}
      >
        <View style={styles.cardContent}>
          <View style={styles.row}>
            <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.phone, { color: colors.subText }]}>{item.phone}</Text>
          </View>
          
          <Text style={[styles.addressText, { color: colors.text }]}>
            {item.addressLine}, {item.subDistrict}, {item.district}
          </Text>
          <Text style={[styles.addressText, { color: colors.text }]}>
            {item.province} {item.postalCode}
          </Text>

          {item.isDefault && (
            <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.defaultText}>ค่าเริ่มต้น</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
             {isSelectMode && isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} style={{ marginRight: 10 }}/>
             )}
             
             {!isSelectMode && (
                 <TouchableOpacity onPress={() => deleteAddress(item.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.subText} />
                 </TouchableOpacity>
             )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="ที่อยู่จัดส่ง" />

      <FlatList
        data={addresses}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
             <Ionicons name="location-outline" size={64} color={colors.border} />
             <Text style={[styles.emptyText, { color: colors.subText }]}>คุณยังไม่มีที่อยู่จัดส่ง</Text>
          </View>
        }
      />

      <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]} 
          onPress={() => navigation.navigate('AddAddress')}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>เพิ่มที่อยู่ใหม่</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 15 },
  card: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardContent: { flex: 1 },
  row: { flexDirection: 'row', marginBottom: 5, alignItems: 'center' },
  name: { fontWeight: 'bold', fontSize: 16, marginRight: 10 },
  phone: { fontSize: 14 },
  addressText: { fontSize: 14, marginBottom: 2 },
  defaultBadge: {
    marginTop: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  defaultText: { color: '#fff', fontSize: 10 },
  actions: { marginLeft: 10, justifyContent: 'center' },
  footer: {
    padding: 15,
    borderTopWidth: 1,
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 5 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10 }
});

