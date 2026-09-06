export interface ProductDetailItem {
  label: string;
  value: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  title?: string;
  comment: string;
  verifiedPurchase?: boolean;
  location?: string;
  images?: string[];
  helpfulCount?: number;
}

export interface Product {
  id: string;
  title: string;
  category: string;
  wholesalePrice: number;
  suggestedResellPrice: number;
  originalPrice?: number;
  discount?: string;
  rating: number;
  reviewsCount: number;
  ratingsCount?: number;
  weight?: string;
  warranty?: string | ProductDetailItem[];
  image: string;
  images: string[];
  description: string;
  sizes: string[];
  colors: string[];
  supplierName: string;
  inStock: boolean;
  highlights?: string[];
  details?: ProductDetailItem[];
  specifications?: ProductDetailItem[];
  manufacturerInfo?: ProductDetailItem[];
  reviews?: Review[];
  createdAt: string;
  [key: string]: any;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  resellPrice: number; // Price set by reseller to customer
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
  pincode: string;
  items: CartItem[];
  totalWholesaleAmount: number;
  totalResellAmount: number;
  totalMarginEarned: number;
  paymentMethod: 'COD' | 'UPI' | 'ONLINE';
  status: 'Pending' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  image: string;
}
