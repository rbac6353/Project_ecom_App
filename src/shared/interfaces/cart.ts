import { Product } from './home';

// โครงสร้างของ Variant (ตัวเลือกสินค้า)
export interface ProductVariant {
  id: number;
  name: string;
  price: number | null;
  stock: number;
}

// โครงสร้างของสินค้าแต่ละชิ้นในตะกร้า
export interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  variantId?: number | null; // ✅ เพิ่ม variantId
  count: number;
  product: Product; // สัมพันธ์กับ Product entity
  variant?: ProductVariant | null; // ✅ เพิ่ม variant relation
}

// โครงสร้างของตะกร้าสินค้าหลัก
export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
}

