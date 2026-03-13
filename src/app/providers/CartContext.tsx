import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from './AuthContext'; // Import useAuth hook เพื่อเช็ค User
import * as cartService from '@app/services/cartService';
import { Cart } from '@shared/interfaces/cart';

interface CartContextProps {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;    // จำนวนสินค้าทั้งหมดในตะกร้า (สำหรับ Badge)
  totalPrice: number;   // ราคารวมทั้งหมด
  addToCart: (productId: number, count?: number, variantId?: number) => Promise<boolean>;
  removeFromCart: (itemId: number) => Promise<void>; // ✅ เปลี่ยนจาก productId เป็น itemId
  updateQuantity: (itemId: number, count: number) => Promise<void>; // ✅ เปลี่ยนจาก productId เป็น itemId
  updateCartItemVariant: (itemId: number, variantId: number | null, quantity: number) => Promise<void>; // ✅ อัปเดต variant และ quantity
  refreshCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextProps>({
  cart: null,
  loading: false,
  itemCount: 0,
  totalPrice: 0,
  addToCart: async () => false,
  removeFromCart: async () => {},
  updateQuantity: async () => {},
  updateCartItemVariant: async () => {},
  refreshCart: async () => {},
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth(); // ดึง user และ token มาใช้
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // คำนวณจำนวนชิ้นรวม (สำหรับแสดงที่ไอคอนตะกร้า)
  const itemCount = cart?.items?.reduce((sum, item) => sum + item.count, 0) || 0;

  // คำนวณราคารวม (ใช้ราคาจาก variant หรือ product)
  const totalPrice = cart?.items?.reduce((sum, item) => {
    // ✅ ใช้ราคาจาก variant (ถ้ามี) หรือ product.price
    const itemPrice = item.variant?.price
      ? Number(item.variant.price)
      : item.product.discountPrice || item.product.price || 0;
    return sum + itemPrice * item.count;
  }, 0) || 0;

  // ฟังก์ชัน normalize response จาก backend ให้ตรงกับ interface
  const normalizeCart = (apiCart: any): Cart | null => {
    if (!apiCart) return null;
    
    console.log('normalizeCart - apiCart:', JSON.stringify(apiCart, null, 2)); // Debug
    
    // Backend ส่ง productOnCarts แต่ Frontend ต้องการ items
    // ตรวจสอบทั้ง productOnCarts และ items (เผื่อ backend ส่งมาเป็น items แล้ว)
    const rawItems = apiCart.productOnCarts || apiCart.items || [];
    console.log('normalizeCart - rawItems:', rawItems);
    
    const items = rawItems.map((item: any) => {
      const product = item.product || {};
      const variant = item.variant || null; // ✅ ดึง variant
      
      // ดึง imageUrl จาก images array (ถ้ามี)
      let imageUrl = 'https://via.placeholder.com/150';
      if (product.images && product.images.length > 0) {
        imageUrl = product.images[0].url || product.images[0] || imageUrl;
      }
      
      // ✅ ใช้ราคาจาก variant (ถ้ามี) หรือ productOnCart.price หรือ product.price
      const itemPrice =
        variant?.price ||
        item.price ||
        product.discountPrice ||
        product.price ||
        0;
      
      return {
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        variantId: item.variantId || null, // ✅ เพิ่ม variantId
        count: item.count,
        variant: variant
          ? {
              id: variant.id,
              name: variant.name,
              price: variant.price,
              stock: variant.stock,
            }
          : null, // ✅ เพิ่ม variant object
        product: {
          id: product.id || item.productId,
          title: product.title || 'Unknown Product',
          price: itemPrice, // ใช้ราคาจาก variant หรือ productOnCart
          discountPrice: product.discountPrice || null,
          imageUrl: imageUrl,
          storeName: product.store?.name || 'BoxiFY Mall',
        },
      };
    });

    return {
      id: apiCart.id,
      userId: apiCart.orderedById || apiCart.userId,
      items: items,
    };
  };

  // ฟังก์ชันโหลดข้อมูลตะกร้าใหม่
  const refreshCart = React.useCallback(async () => {
    if (!token || !user) {
      setCart(null);
      return;
    }
    try {
      setLoading(true);
      const data = await cartService.getCart();
      console.log('Raw cart data from API:', JSON.stringify(data, null, 2)); // Debug: ดู raw data
      const normalized = normalizeCart(data);
      setCart(normalized);
      console.log('Cart loaded (normalized):', normalized);
    } catch (error: any) {
      // ถ้าเป็น 401 (Unauthorized) ไม่ต้องแสดง error เพราะเราจัดการแล้วใน interceptor
      if (error.response?.status === 401) {
        // Token หมดอายุหรือไม่ถูกต้อง - interceptor จัดการแล้ว
        setCart(null);
        return;
      }
      console.error('Error fetching cart:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
    } finally {
      setLoading(false);
    }
  }, [token, user]); // เพิ่ม user ใน dependency

  // โหลดตะกร้าทุกครั้งที่ User หรือ Token เปลี่ยนแปลง (Login สำเร็จ)
  useEffect(() => {
    if (token) {
      refreshCart();
    } else {
      setCart(null);
    }
  }, [token]);

  // ฟังก์ชันเพิ่มสินค้า
  const addToCart = async (
    productId: number,
    count: number = 1,
    variantId?: number,
  ): Promise<boolean> => {
    if (!token) {
      Alert.alert('กรุณาเข้าสู่ระบบ', 'คุณต้องเข้าสู่ระบบเพื่อซื้อสินค้า');
      return false;
    }
    try {
      setLoading(true);
      console.log('Adding to cart:', { productId, count, variantId });
      const updatedCart = await cartService.addToCart(productId, count, variantId);
      console.log('Add to cart response:', updatedCart);
      const normalized = normalizeCart(updatedCart);
      setCart(normalized);
      // Refresh cart เพื่อให้แน่ใจว่าข้อมูลตรงกับ backend
      await refreshCart();
      
      // แสดง Toast แทน Alert
      Toast.show({
        type: 'success',
        text1: 'เพิ่มลงตะกร้าสำเร็จ',
        text2: 'สินค้าอยู่ในตะกร้าของคุณแล้ว 🛒',
        position: 'top',
        topOffset: 60,
        visibilityTime: 2000,
      });
      
      return true;
    } catch (error: any) {
      console.error('Add to cart error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      
      // แสดง Toast แทน Alert
      Toast.show({
        type: 'error',
        text1: 'เกิดข้อผิดพลาด',
        text2: error.response?.data?.message || 'ไม่สามารถเพิ่มสินค้าได้',
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันลบสินค้า (ใช้ itemId แทน productId เพื่อรองรับ variants)
  const removeFromCart = async (itemId: number) => {
    try {
      setLoading(true);
      const updatedCart = await cartService.removeFromCart(itemId);
      const normalized = normalizeCart(updatedCart);
      setCart(normalized);
      
      Toast.show({
        type: 'success',
        text1: 'ลบสินค้าสำเร็จ',
        text2: 'สินค้าถูกลบออกจากตะกร้าแล้ว',
        position: 'top',
        topOffset: 60,
        visibilityTime: 2000,
      });
    } catch (error: any) {
      console.error('Remove from cart error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      
      Toast.show({
        type: 'error',
        text1: 'เกิดข้อผิดพลาด',
        text2: 'ลบสินค้าไม่สำเร็จ',
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันอัปเดตจำนวน (ใช้ itemId แทน productId เพื่อรองรับ variants)
  const updateQuantity = async (itemId: number, count: number) => {
    if (count < 1) return; // ห้ามลดต่ำกว่า 1 (ถ้าจะลบให้ใช้ปุ่มลบ)

    try {
      setLoading(true);
      const updatedCart = await cartService.updateCartItem(itemId, count);
      const normalized = normalizeCart(updatedCart);
      setCart(normalized);
    } catch (error: any) {
      console.error('Update quantity error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      
      Toast.show({
        type: 'error',
        text1: 'เกิดข้อผิดพลาด',
        text2: 'อัปเดตจำนวนไม่สำเร็จ',
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ ฟังก์ชันอัปเดต variant และ quantity (ลบ item เดิมและเพิ่มใหม่)
  const updateCartItemVariant = async (itemId: number, variantId: number | null, quantity: number) => {
    if (quantity < 1) return;

    try {
      setLoading(true);
      
      // หา item ที่จะอัปเดต
      const currentItem = cart?.items?.find((item) => item.id === itemId);
      if (!currentItem) {
        throw new Error('ไม่พบสินค้าในตะกร้า');
      }

      const productId = currentItem.productId;

      // ลบ item เดิม
      await cartService.removeFromCart(itemId);

      // เพิ่ม item ใหม่ด้วย variant ใหม่และ quantity ใหม่
      await cartService.addToCart(productId, quantity, variantId || undefined);

      // Refresh cart เพื่อให้ได้ข้อมูลล่าสุด
      await refreshCart();

      Toast.show({
        type: 'success',
        text1: 'อัปเดตสินค้าสำเร็จ',
        text2: 'สินค้าในตะกร้าถูกอัปเดตแล้ว',
        position: 'top',
        topOffset: 60,
        visibilityTime: 2000,
      });
    } catch (error: any) {
      console.error('Update cart item variant error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      
      Toast.show({
        type: 'error',
        text1: 'เกิดข้อผิดพลาด',
        text2: error.response?.data?.message || 'อัปเดตสินค้าไม่สำเร็จ',
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
      });
      throw error; // Re-throw เพื่อให้ modal จัดการ error
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      itemCount,
      totalPrice,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateCartItemVariant,
      refreshCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

// Custom Hook (เพื่อให้ใช้ง่าย)
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

