// src/context/CouponContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coupon } from '@shared/interfaces/coupon';
import { useAuth } from '@app/providers/AuthContext';
import * as couponService from '@app/services/couponService';

// Mock Master Data (คูปองส่วนกลางที่ทุกคนเห็น)
const MASTER_COUPONS: Coupon[] = [
  {
    id: 101,
    code: 'SHIPFREE',
    type: 'SHIPPING',
    title: 'ส่งฟรี สูงสุด ฿40',
    minPurchase: 99,
    maxDiscount: 40,
    expiresAt: '2025-12-31',
    isUsed: false,
    platform: 'ALL',
    description: 'เมื่อชำระผ่าน AirPay',
  },
  {
    id: 102,
    code: 'MALL15',
    type: 'DISCOUNT',
    title: 'ส่วนลด 15%',
    discountPercent: 15,
    minPurchase: 500,
    maxDiscount: 150,
    expiresAt: '2025-12-31',
    isUsed: false,
    platform: 'MALL',
    description: 'เฉพาะร้าน Shopee Mall',
  },
  {
    id: 103,
    code: 'NEWUSER50',
    type: 'DISCOUNT',
    title: 'ส่วนลด ฿50',
    discountAmount: 50,
    minPurchase: 0,
    expiresAt: '2025-12-31',
    isUsed: false,
    platform: 'ALL',
    description: 'ลูกค้าใหม่เท่านั้น',
  },
  {
    id: 104,
    code: 'DISC30',
    type: 'DISCOUNT',
    title: 'ส่วนลด 30% ลดสูงสุด ฿200',
    discountPercent: 30,
    minPurchase: 300,
    maxDiscount: 200,
    expiresAt: '2025-12-25',
    isUsed: false,
    platform: 'LIVE',
    description: 'ร้านไลฟ์โค้ดโทด',
  },
  {
    id: 105,
    code: 'COIN25',
    type: 'COIN',
    title: 'เงินคืน 25% Coins',
    minPurchase: 500,
    maxDiscount: 2000,
    expiresAt: '2025-12-31',
    isUsed: false,
    platform: 'SHOP',
    description: 'ร้านโค้ดคุ้ม Xtra',
  },
];

interface CouponContextType {
  availableCoupons: Coupon[]; // คูปองที่ยังไม่ได้เก็บ
  myCoupons: Coupon[]; // คูปองของฉัน (เก็บแล้ว)
  collectCoupon: (coupon: Coupon) => Promise<void>; // ฟังก์ชันเก็บคูปอง
  useCoupon: (couponId: number) => void; // ฟังก์ชันใช้คูปอง (ตอน Checkout)
  selectedCoupon: Coupon | null; // คูปองที่เลือกใช้ใน Checkout
  selectCoupon: (coupon: Coupon | null) => void;
  refreshCoupons: () => Promise<void>; // รีเฟรชข้อมูล
}

const CouponContext = createContext<CouponContextType | undefined>(undefined);

export const CouponProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // State
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [userCoupons, setUserCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(false);
  
  // ใช้ ref เพื่อป้องกันการเรียก API ซ้ำๆ
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);

  // ฟังก์ชัน loadCoupons ที่ wrap ด้วย useCallback
  const loadCoupons = useCallback(async () => {
    // ป้องกันการเรียกซ้ำภายใน 2 วินาที
    const now = Date.now();
    if (isLoadingRef.current || (now - lastLoadTimeRef.current < 2000)) {
      return;
    }
    
    isLoadingRef.current = true;
    lastLoadTimeRef.current = now;
    
    try {
      setLoading(true);
      
      // โหลดคูปองของฉันจาก AsyncStorage ก่อน
      let myCouponsFromStorage: Coupon[] = [];
      if (user) {
        try {
          const key = `collected_coupons_${user.id}`;
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            myCouponsFromStorage = Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          console.error('Error loading from AsyncStorage:', e);
        }
      }
      
      // ดึงคูปองของฉันจาก API (ถ้ามี)
      let myCouponsFromAPI: Coupon[] = [];
      try {
        myCouponsFromAPI = await couponService.getMyCoupons();
      } catch (error: any) {
        // ถ้าเป็น 429 หรือ error อื่นๆ ให้ข้ามไปใช้ AsyncStorage
        if (error.response?.status !== 429) {
          console.log('API endpoint /coupons/my not available, using AsyncStorage');
        }
      }
      
      // รวมคูปองจาก API และ AsyncStorage (ถ้ามีทั้งสอง)
      const allMyCoupons = myCouponsFromAPI.length > 0 ? myCouponsFromAPI : myCouponsFromStorage;
      setUserCoupons(allMyCoupons);
      
      // ดึงคูปองที่ยังไม่ได้เก็บ
      let available: Coupon[] = [];
      try {
        available = await couponService.getAvailableCoupons();
      } catch (error: any) {
        // ถ้าเป็น 429 หรือ error อื่นๆ ให้ใช้ MASTER_COUPONS ทันที
        if (error.response?.status === 429) {
          console.log('Rate limit exceeded, using MASTER_COUPONS');
        } else {
          console.log('API endpoint /coupons not available, using MASTER_COUPONS');
        }
      }
      
      // ถ้า API ไม่มีข้อมูล หรือ error ให้ใช้ MASTER_COUPONS
      if (available.length === 0) {
        available = MASTER_COUPONS;
      }
      
      // Filter availableCoupons: ใช้ isCollected flag จาก API
      // API จะส่ง isCollected มาด้วยแล้ว
      setAvailableCoupons(available);
    } catch (error) {
      console.error('Error loading coupons:', error);
      // Fallback ไปใช้ mock data (ใช้ state ปัจจุบันผ่าน functional update)
      setAvailableCoupons(prev => {
        // ใช้ AsyncStorage เพื่อหา collected codes
        return prev.length > 0 ? prev : MASTER_COUPONS;
      });
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [user]); // ลบ userCoupons ออกจาก dependency

  // โหลดคูปองจาก Backend API เมื่อ user เปลี่ยน
  useEffect(() => {
    if (user) {
      loadCoupons();
    } else {
      // ถ้ายังไม่ได้ login ให้ใช้ mock data
      setAvailableCoupons(MASTER_COUPONS);
      setUserCoupons([]);
    }
  }, [user, loadCoupons]);

  // ฟังก์ชันเก็บคูปอง
  const collectCoupon = async (coupon: Coupon) => {
    if (!user) {
      throw new Error('กรุณาเข้าสู่ระบบก่อนเก็บคูปอง');
    }

    // เช็คว่ามีคูปองนี้อยู่แล้วหรือไม่
    if (userCoupons.some(c => c.code === coupon.code)) {
      throw new Error('คุณเก็บคูปองนี้ไว้แล้ว');
    }

    // สร้างคูปองใหม่ที่เป็นของ User คนนี้
    const newMyCoupon: Coupon = {
      ...coupon,
      id: Date.now() + Math.floor(Math.random() * 1000), // Gen ID ใหม่
      isUsed: false,
    };

    try {
      // เรียก API เพื่อเก็บคูปอง (ใช้ couponId)
      const collectedCoupon = await couponService.collectCoupon(coupon.id);
      
      // อัปเดต state ด้วยข้อมูลจาก API
      const updatedCoupons = [...userCoupons, collectedCoupon];
      setUserCoupons(updatedCoupons);
      
      // อัปเดต availableCoupons - mark เป็น collected
      setAvailableCoupons(prev => 
        prev.map(c => c.id === coupon.id ? { ...c, isCollected: true } : c)
      );
      
      // บันทึกใน AsyncStorage เป็น backup
      try {
        const key = `collected_coupons_${user.id}`;
        await AsyncStorage.setItem(key, JSON.stringify(updatedCoupons));
      } catch (e) {
        console.error('Error saving to AsyncStorage:', e);
      }
    } catch (error: any) {
      // ถ้า API error ให้ throw error เพื่อให้ UI แสดงข้อความ
      throw error;
    }
  };

  // ฟังก์ชันใช้คูปอง (เปลี่ยน status isUsed = true)
  const useCoupon = (couponId: number) => {
    const updatedCoupons = userCoupons.map(c => 
      c.id === couponId ? { ...c, isUsed: true } : c
    );
    setUserCoupons(updatedCoupons);
    
    // บันทึกใน AsyncStorage เป็น fallback
    if (user) {
      try {
        const key = `collected_coupons_${user.id}`;
        AsyncStorage.setItem(key, JSON.stringify(updatedCoupons));
      } catch (e) {
        console.error('Error saving to AsyncStorage:', e);
      }
    }
    setSelectedCoupon(null);
  };

  // รีเฟรชข้อมูล (wrap ด้วย useCallback)
  const refreshCoupons = useCallback(async () => {
    if (user) {
      // Reset ref เพื่อให้สามารถเรียกได้อีกครั้ง
      isLoadingRef.current = false;
      lastLoadTimeRef.current = 0;
      await loadCoupons();
    } else {
      // ถ้ายังไม่ได้ login ให้ใช้ mock data
      setAvailableCoupons(MASTER_COUPONS);
      setUserCoupons([]);
    }
  }, [user, loadCoupons]);

  return (
    <CouponContext.Provider value={{ 
      availableCoupons, 
      myCoupons: userCoupons, 
      collectCoupon, 
      useCoupon,
      selectedCoupon,
      selectCoupon: setSelectedCoupon,
      refreshCoupons,
    }}>
      {children}
    </CouponContext.Provider>
  );
};

export const useCoupon = () => {
  const context = useContext(CouponContext);
  if (!context) throw new Error('useCoupon must be used within a CouponProvider');
  return context;
};

