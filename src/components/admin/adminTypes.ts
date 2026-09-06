export interface UpiConfig {
  address: string;
  notePrefix: string;
}

export interface FirebaseConfigData {
  apiKey: string;
  projectId: string;
  appId: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
}

export interface CashfreeConfig {
  enabled: boolean;
  environment: 'sandbox' | 'prod';
  clientId: string;
  secretKey: string;
}

export interface AppSettings {
  siteName: string;
  upi: UpiConfig;
  firebase: FirebaseConfigData;
  pixels: string[];
  gaCodes: string[];
  cashfree?: CashfreeConfig;
}

export interface AdminOrderItem {
  productId: string;
  product?: {
    title?: string;
    image?: string;
  } | null;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  resellPrice?: number;
  price?: number;
}

export interface AdminOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
  pincode: string;
  items?: AdminOrderItem[];
  totalWholesaleAmount?: number;
  totalResellAmount?: number;
  totalMarginEarned?: number;
  paymentMethod?: string;
  status: string;
  createdAt?: string;
  paymentAmount?: number;
  paymentDate?: string;
  paymentUtr?: string;
  [key: string]: any;
}

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  lastOrderAt: string;
  orderCount: number;
  totalSpent: number;
}

export interface AdminStats {
  totalOrders: number;
  paidOrders: number;
  totalCollection: number;
  pendingOrders: number;
  margin: number;
  todayOrders: number;
  totalUsers: number;
  revenue: number;
  remainingToCollect: number;
  statusCounts: Record<string, number>;
}
