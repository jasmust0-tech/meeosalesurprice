import { Product } from '../types';

export const hiddenTestProduct: Product = {
  id: 'PRODUCT-LOVEP1',
  title: 'Love Special Test Product',
  category: 'women-kurti',
  wholesalePrice: 1,
  suggestedResellPrice: 1,
  originalPrice: 99,
  discount: '99% OFF',
  rating: 4.9,
  reviewsCount: 1,
  image: 'https://placehold.co/400x400/f3f4f6/6b7280?text=Product',
  images: [
    'https://placehold.co/400x400/f3f4f6/6b7280?text=Product'
  ],
  description: 'Special test product for payment verification.',
  sizes: ['Free Size'],
  colors: ['Default'],
  supplierName: 'MR International Fashion',
  inStock: true,
  createdAt: new Date().toISOString(),
};