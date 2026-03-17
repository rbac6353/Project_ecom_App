// interfaces/home.ts
export interface Category {
  id: number;
  name: string;
  image: string; // URL หรือ JSON string (ตาม ecom1.sql)
}

export interface Product {
  id: number;
  title: string;
  price: number;
  discountPrice: number | null;
  imageUrl: string;
  storeName: string;
}

export interface ProductResponse {
  data: Product[];
  total: number;
  page: number;
  last_page: number;
}

