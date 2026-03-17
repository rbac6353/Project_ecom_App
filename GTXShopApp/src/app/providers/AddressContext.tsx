import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Address } from '@shared/interfaces/address';
import { useAuth } from './AuthContext';

interface AddressContextProps {
  addresses: Address[];
  defaultAddress: Address | null;
  selectedAddress: Address | null; // ที่อยู่ที่ถูกเลือกชั่วคราว (สำหรับหน้า Checkout)
  loadAddresses: () => Promise<void>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  selectAddress: (address: Address) => void; // เลือกที่อยู่เพื่อใช้
}

export const AddressContext = createContext<AddressContextProps>({
  addresses: [],
  defaultAddress: null,
  selectedAddress: null,
  loadAddresses: async () => {},
  addAddress: async () => {},
  deleteAddress: async () => {},
  selectAddress: () => {},
});

export const AddressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth(); // ใช้ user.id เพื่อแยกที่อยู่ของใครของมัน
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const STORAGE_KEY = `@boxify_addresses_${user?.id || 'guest'}`;

  // โหลดที่อยู่เมื่อเริ่มต้น
  useEffect(() => {
    if (user) {
      loadAddresses();
    } else {
      setAddresses([]);
      setSelectedAddress(null);
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) {
        const loadedAddresses: Address[] = JSON.parse(jsonValue);
        setAddresses(loadedAddresses);
        
        // หา Default address
        const def = loadedAddresses.find(a => a.isDefault);
        if (def) setSelectedAddress(def);
      }
    } catch (e) {
      console.error("Failed to load addresses", e);
    }
  };

  const saveToStorage = async (newAddresses: Address[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAddresses));
      setAddresses(newAddresses);
    } catch (e) {
      console.error("Failed to save addresses", e);
    }
  };

  const addAddress = async (addressData: Omit<Address, 'id'>) => {
    const newId = Date.now().toString();
    let newAddresses = [...addresses];

    // ถ้าเป็นที่อยู่แรก หรือ user ติ๊ก isDefault ให้เคลียร์ default เก่า
    if (newAddresses.length === 0 || addressData.isDefault) {
      newAddresses = newAddresses.map(a => ({ ...a, isDefault: false }));
      // บังคับเป็น true ถ้าเป็นที่อยู่แรก
      if (newAddresses.length === 0) addressData.isDefault = true; 
    }

    const newAddress: Address = { id: newId, ...addressData };
    newAddresses.push(newAddress);
    
    await saveToStorage(newAddresses);
    if (newAddress.isDefault) setSelectedAddress(newAddress);
  };

  const deleteAddress = async (id: string) => {
    const newAddresses = addresses.filter(a => a.id !== id);
    await saveToStorage(newAddresses);
    
    // ถ้าลบตัวที่เลือกอยู่ ให้เคลียร์ค่า
    if (selectedAddress?.id === id) {
        setSelectedAddress(newAddresses.length > 0 ? newAddresses[0] : null);
    }
  };

  const selectAddress = (address: Address) => {
    setSelectedAddress(address);
  };

  // หา Default ตัวปัจจุบัน
  const defaultAddress = addresses.find(a => a.isDefault) || (addresses.length > 0 ? addresses[0] : null);

  return (
    <AddressContext.Provider value={{
      addresses,
      defaultAddress,
      selectedAddress: selectedAddress || defaultAddress, // ถ้ายังไม่เลือก ให้ใช้ default
      loadAddresses,
      addAddress,
      deleteAddress,
      selectAddress,
    }}>
      {children}
    </AddressContext.Provider>
  );
};

// Custom Hook
export const useAddress = () => {
  const context = useContext(AddressContext);
  if (context === undefined) {
    throw new Error('useAddress must be used within an AddressProvider');
  }
  return context;
};

