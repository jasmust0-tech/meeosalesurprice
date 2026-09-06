export interface ProductDetailItem {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name?: string;
  title?: string;
  category: string;
  price?: number;
  wholesalePrice?: number;
  suggestedResellPrice?: number;
  originalPrice?: number;
  discount?: string;
  rating?: number;
  reviewsCount?: number;
  ratingsCount?: number;
  weight?: string;
  warranty?: string | ProductDetailItem[];
  image?: string;
  images?: string[];
  description?: string;
  highlights?: string[];
  details?: ProductDetailItem[];
  specifications?: ProductDetailItem[];
  manufacturerInfo?: ProductDetailItem[];
  sizes?: string[];
  colors?: string[];
  supplierName?: string;
  inStock?: boolean;
  createdAt?: string;
  [key: string]: any;
}
