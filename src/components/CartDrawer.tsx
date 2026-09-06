import React from 'react';
import { X, Trash2, ShoppingBag, ShieldCheck, Truck, Plus, Minus, ChevronRight, RotateCcw, Sparkles, Tag } from 'lucide-react';
import { CartItem } from '../types';

export interface CartCheckoutData {
  items: Array<{
    id: string;
    productId: string;
    product: any;
    quantity: number;
    selectedSize: string;
    selectedColor: string;
    resellPrice: number;
    price: number;
  }>;
  totalQuantity: number;
  subtotal: number;
  volumeDiscountAmount: number;
  totalPrice: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemoveItem: (id: string) => void;
  onUpdateQuantity?: (id: string, newQuantity: number) => void;
  onCheckout: (data?: CartCheckoutData) => void;
}

export function CartDrawer({ 
  isOpen, 
  onClose, 
  cartItems, 
  onRemoveItem, 
  onUpdateQuantity, 
  onCheckout 
}: CartDrawerProps) {
  // Only count/display items that actually have a product, so removing
  // (or a stale server item without product) updates the price correctly.
  const cartVisible = cartItems.filter(item => item && item.product);
  const totalQuantity = cartVisible.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const subtotal = cartVisible.reduce((sum, item) => sum + ((Number(item.resellPrice) || 0) * (Number(item.quantity) || 1)), 0);

  // Volume discount calculation for cart
  let volumeDiscountRate = 0;
  let nextTierMessage = '';
  let progressPercent = 0;

  if (totalQuantity === 1) {
    volumeDiscountRate = 0;
    nextTierMessage = 'Add 1 more item to get 5% Multi-Unit Discount!';
    progressPercent = 50;
  } else if (totalQuantity === 2) {
    volumeDiscountRate = 0.05;
    nextTierMessage = '🎉 5% discount applied! Add 1 more item for 10% OFF!';
    progressPercent = 66;
  } else if (totalQuantity >= 3) {
    volumeDiscountRate = 0.10;
    nextTierMessage = '🔥 10% Volume Discount applied to your entire order!';
    progressPercent = 100;
  }

  const volumeDiscountAmount = Math.round(subtotal * volumeDiscountRate);
  const finalTotalPrice = subtotal - volumeDiscountAmount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="relative w-screen max-w-md bg-gray-50 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <h2 className="text-base font-bold text-gray-900">Cart ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})</h2>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
            {cartVisible.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-2xs">
                <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mb-4">
                  <ShoppingBag className="w-10 h-10 text-[#9f2089]" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Your cart is empty</h3>
                <p className="text-gray-500 text-sm mt-1 max-w-[200px]">Add some products to start your order today!</p>
              </div>
            ) : (
              <>
                {/* Free Delivery Banner */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 flex items-center gap-3">
                  <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-bold text-emerald-800">Yay! Your order is eligible for FREE Delivery &amp; COD</p>
                </div>

                {/* Volume Discount Progress Card */}
                <div className="bg-gradient-to-r from-pink-50/90 via-purple-50/80 to-pink-50/90 border border-purple-100 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-[#9f2089]" />
                      <span className="text-xs font-bold text-gray-900">Multi-Unit Volume Deal</span>
                    </div>
                    {volumeDiscountRate > 0 && (
                      <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        {volumeDiscountRate * 100}% Discount Active
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-purple-200/50 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#9f2089] h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-gray-700">{nextTierMessage}</span>
                    {volumeDiscountAmount > 0 && (
                      <span className="font-black text-emerald-700">Save ₹{volumeDiscountAmount}</span>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {cartVisible.map((item) => {
                      return (
                      <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm flex gap-3 animate-in fade-in slide-in-from-right-4">
                        <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1.5 border border-gray-50">
                          <img 
                            src={item.product.image} 
                            alt={item.product.title} 
                            className="max-h-full max-w-full object-contain mix-blend-multiply" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-0.5">
                          <div className="space-y-0.5">
                            <h4 className="text-[12.5px] font-bold text-gray-900 line-clamp-1 leading-tight">{item.product.title}</h4>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[15px] font-black text-gray-900">₹{item.resellPrice * (item.quantity || 1)}</span>
                              <span className="text-[10px] text-gray-400 line-through">₹{Math.round(item.resellPrice * 1.5 * (item.quantity || 1))}</span>
                            </div>
                            
                            {/* +/- Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center border border-[#9f2089] rounded-xl bg-[#fdf2f9] overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.quantity > 1) {
                                      onUpdateQuantity?.(item.id, item.quantity - 1);
                                    } else {
                                      onRemoveItem(item.id);
                                    }
                                  }}
                                  className="w-7 h-7 flex items-center justify-center text-[#9f2089] hover:bg-pink-100 active:scale-90 transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                                <span className="w-6 text-center text-xs font-black text-[#9f2089]">
                                  {item.quantity || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity?.(item.id, (item.quantity || 1) + 1)}
                                  className="w-7 h-7 flex items-center justify-center text-[#9f2089] hover:bg-pink-100 active:scale-90 transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              </div>

                              <button 
                                onClick={() => onRemoveItem(item.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Footer - Price & Checkout */}
          {cartVisible.length > 0 && (
            <div className="bg-white border-t border-gray-100 p-4 space-y-4 shadow-2xl">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500 font-medium">
                  <span>Product Subtotal ({totalQuantity} items)</span>
                  <span>₹{subtotal}</span>
                </div>
                {volumeDiscountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-bold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Multi-Unit Volume Savings ({volumeDiscountRate * 100}%)
                    </span>
                    <span>- ₹{volumeDiscountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-emerald-600 font-bold">
                  <span>Delivery Fee</span>
                  <span>FREE</span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 pt-1 border-t border-gray-50">
                  <span>Order Total</span>
                  <div className="text-right">
                    <span>₹{finalTotalPrice}</span>
                    {volumeDiscountAmount > 0 && (
                      <span className="text-[10px] text-emerald-600 block font-bold">You save ₹{volumeDiscountAmount}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const checkoutItems = cartVisible.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    product: item.product,
                    quantity: item.quantity || 1,
                    selectedSize: item.selectedSize || 'Standard',
                    selectedColor: item.selectedColor || 'Default',
                    resellPrice: item.resellPrice || item.product?.suggestedResellPrice || item.product?.wholesalePrice || 98,
                    price: item.resellPrice || item.product?.suggestedResellPrice || item.product?.wholesalePrice || 98
                  }));

                  // 🎯 Track InitiateCheckout event
                  if (typeof (window as any).fbq === 'function') {
                    (window as any).fbq('track', 'InitiateCheckout', {
                      content_ids: checkoutItems.map(i => i.productId),
                      content_type: 'product',
                      value: finalTotalPrice,
                      currency: 'INR',
                      num_items: totalQuantity
                    });
                  }

                  onCheckout({
                    items: checkoutItems,
                    totalQuantity,
                    subtotal,
                    volumeDiscountAmount,
                    totalPrice: finalTotalPrice
                  });
                }}
                className="w-full bg-[#9f2089] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#831871] shadow-lg shadow-purple-200 transition-all active:scale-95 text-sm cursor-pointer"
              >
                Proceed to Checkout • ₹{finalTotalPrice} <ChevronRight className="w-5 h-5" />
              </button>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  100% Trust Assurance
                </div>
                <div className="flex justify-between">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><RotateCcw className="w-4 h-4 text-gray-400" /></div>
                    <span className="text-[8px] font-bold text-gray-500">7-Day Returns</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-gray-400" /></div>
                    <span className="text-[8px] font-bold text-gray-500">Secure Payments</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><Truck className="w-4 h-4 text-gray-400" /></div>
                    <span className="text-[8px] font-bold text-gray-500">Fast Delivery</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
