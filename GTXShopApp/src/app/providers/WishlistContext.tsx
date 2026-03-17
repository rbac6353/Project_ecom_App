import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as wishlistService from '@app/services/wishlistService';

interface WishlistContextProps {
  wishlistIds: number[]; // เก็บแค่ ID เพื่อเช็คสถานะปุ่มหัวใจได้เร็วๆ
  toggleWishlist: (productId: number) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  refreshWishlist: () => Promise<void>;
}

export const WishlistContext = createContext<WishlistContextProps>({
  wishlistIds: [],
  toggleWishlist: async () => {},
  isInWishlist: () => false,
  refreshWishlist: async () => {},
});

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setWishlistIds([]);
      return;
    }
    try {
      const items = await wishlistService.getWishlist();
      // ✅ เพิ่มการเช็ค type ก่อน map
      if (!Array.isArray(items)) {
        console.warn('Wishlist items is not an array:', items);
        setWishlistIds([]);
        return;
      }
      // เก็บเฉพาะ productId ลง array
      const ids = items.map((item: any) => item.product?.id || item.productId).filter(Boolean);
      setWishlistIds(ids);
    } catch (error: any) {
      // ถ้าเป็น 401 (Unauthorized) ไม่ต้องแสดง error เพราะเราจัดการแล้วใน interceptor
      if (error.response?.status === 401) {
        // Token หมดอายุหรือไม่ถูกต้อง - interceptor จัดการแล้ว
        setWishlistIds([]);
        return;
      }
      console.error('Failed to fetch wishlist', error);
      setWishlistIds([]);
    }
  }, [user]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const toggleWishlist = async (productId: number) => {
    if (!user) {
      // หรือเด้งไปหน้า Login
      return;
    }

    const isLiked = wishlistIds.includes(productId);

    // Optimistic Update (อัปเดต UI ทันที)
    if (isLiked) {
      setWishlistIds((prev) => prev.filter((id) => id !== productId));
      try {
        await wishlistService.removeFromWishlist(productId);
      } catch (error) {
        console.error('Failed to remove from wishlist', error);
        // Rollback on error
        setWishlistIds((prev) => [...prev, productId]);
      }
    } else {
      setWishlistIds((prev) => [...prev, productId]);
      try {
        await wishlistService.addToWishlist(productId);
      } catch (error) {
        console.error('Failed to add to wishlist', error);
        // Rollback on error
        setWishlistIds((prev) => prev.filter((id) => id !== productId));
      }
    }
  };

  const isInWishlist = (productId: number) => wishlistIds.includes(productId);

  return (
    <WishlistContext.Provider
      value={{ wishlistIds, toggleWishlist, isInWishlist, refreshWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
};

