export interface Deal {
  id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  imageUrl: string;
  productUrl: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  brand?: string;
  inStock?: boolean;
  couponCode?: string;
}
