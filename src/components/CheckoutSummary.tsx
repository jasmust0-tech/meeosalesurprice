import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, Package, Sparkles, Plus, Minus, Trash2 } from 'lucide-react';
import { getCheckoutDraft, setCheckoutDraft } from '../data/checkoutDraft';

interface CheckoutSummaryProps {
  onRemoveCartItem?: (id: string) => void;
  onUpdateCartItemQuantity?: (id: string, quantity: number) => void;
}

export function CheckoutSummary({ onRemoveCartItem, onUpdateCartItemQuantity }: CheckoutSummaryProps) {
  const navigate = useNavigate();
  const [isPriceDetailsOpen, setIsPriceDetailsOpen] = useState(false);
  const location = useLocation();

  const rawItems = location.state?.items;
  const rawProduct = location.state?.product;

  const address = location.state?.address || {
    name: 'John Doe',
    contact: '9876543210',
    houseNo: '123 Main Street, Apt 4B',
    roadName: 'MG Road',
    city: 'New Delhi',
    stateName: 'Delhi',
    pincode: '110001'
  };

  // Normalize order items
  const baseOrderItems = useMemo(() => {
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      return rawItems.map((it: any) => {
        const prod = it.product || it;
        const qty = Number(it.quantity) || 1;
        const unitPrice = Number(it.price) || Number(it.resellPrice) || Number(prod.suggestedResellPrice) || Number(prod.wholesalePrice) || 400;
        const origUnitPrice = Number(prod.originalPrice) || Math.round(unitPrice * 1.5);
        return {
          id: it.id || prod.id || `item-${Math.random()}`,
          productId: it.productId || prod.id,
          title: prod.title || 'Product',
          image: prod.image || (Array.isArray(prod.images) ? prod.images[0] : null) || 'https://placehold.co/400x400/f3f4f6/6b7280?text=Product',
          selectedSize: it.selectedSize || prod.sizes?.[0] || 'Standard',
          selectedColor: it.selectedColor || prod.colors?.[0] || 'Default',
          quantity: qty,
          unitPrice,
          origUnitPrice,
          linePrice: unitPrice * qty,
          lineOrigPrice: origUnitPrice * qty,
          product: prod
        };
      });
    } else if (rawProduct) {
      const qty = Number(rawProduct.quantity) || 1;
      const unitPrice = Number(rawProduct.price) || Number(rawProduct.suggestedResellPrice) || Number(rawProduct.wholesalePrice) || 400;
      const origUnitPrice = Number(rawProduct.originalPrice) || Math.round(unitPrice * 1.5);
      return [{
        id: rawProduct.id || 'single-item',
        productId: rawProduct.id,
        title: rawProduct.title || 'Trendy Graceful Women Pink Long Anarkali...',
        image: rawProduct.image || (Array.isArray(rawProduct.images) ? rawProduct.images[0] : null) || 'https://placehold.co/400x400/f3f4f6/6b7280?text=Product',
        selectedSize: rawProduct.selectedSize || 'Free Size',
        selectedColor: rawProduct.selectedColor || 'Default',
        quantity: qty,
        unitPrice,
        origUnitPrice,
        linePrice: unitPrice * qty,
        lineOrigPrice: origUnitPrice * qty,
        product: rawProduct
      }];
    } else {
      return [{
        id: 'default',
        productId: 'default',
        title: 'Trendy Graceful Women Pink Long Anarkali...',
        image: 'https://placehold.co/400x400/f3f4f6/6b7280?text=Product',
        selectedSize: 'Free Size',
        selectedColor: 'Default',
        quantity: 1,
        unitPrice: 400,
        origUnitPrice: 520,
        linePrice: 400,
        lineOrigPrice: 520,
        product: {}
      }];
    }
  }, [rawItems, rawProduct]);

  // Editable copy of the order items (quantity can be changed / item deleted).
  // Initialised from the persisted draft so removals/edits survive revisits.
  const [orderItems, setOrderItems] = useState<any[]>(() => {
    const draft = getCheckoutDraft();
    if (draft !== null) return draft;
    return baseOrderItems;
  });

  useEffect(() => {
    setCheckoutDraft(orderItems);
  }, [orderItems]);

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const item = orderItems[index];
    if (item && onUpdateCartItemQuantity) onUpdateCartItemQuantity(item.id, newQty);
    setOrderItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        quantity: newQty,
        linePrice: item.unitPrice * newQty,
        lineOrigPrice: item.origUnitPrice * newQty
      };
    }));
  };

  const removeItem = (index: number) => {
    const item = orderItems[index];
    if (item && onRemoveCartItem) onRemoveCartItem(item.id);
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const itemsSubtotal = orderItems.reduce((sum, item) => sum + item.linePrice, 0);

  const itemsOriginalTotal = orderItems.reduce((sum, item) => sum + item.lineOrigPrice, 0);

  const volumeDiscountAmount = useMemo(() => {
    if (totalQuantity >= 5) return Math.round(itemsSubtotal * 0.20);
    if (totalQuantity === 4) return Math.round(itemsSubtotal * 0.15);
    if (totalQuantity === 3) return Math.round(itemsSubtotal * 0.10);
    if (totalQuantity === 2) return Math.round(itemsSubtotal * 0.05);
    return 0;
  }, [totalQuantity, itemsSubtotal]);

  const displayPrice = useMemo(() => {
    return Math.max(0, itemsSubtotal - volumeDiscountAmount);
  }, [itemsSubtotal, volumeDiscountAmount]);

  const discountAmount = Math.max(0, itemsOriginalTotal - displayPrice);

  const getEstimatedDeliveryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    
    let ordinal = "th";
    if (day % 10 === 1 && day !== 11) ordinal = "st";
    else if (day % 10 === 2 && day !== 12) ordinal = "nd";
    else if (day % 10 === 3 && day !== 13) ordinal = "rd";
    
    const paddedDay = day < 10 ? `0${day}` : `${day}`;
    return `${dayName}, ${paddedDay}${ordinal} ${monthName}`;
  };

  const handleContinue = () => {
    navigate('/checkout/payment', { 
      state: { 
        ...location.state,
        items: orderItems,
        product: orderItems[0]?.product,
        address,
        totalPrice: displayPrice,
        subtotal: itemsSubtotal,
        volumeDiscountAmount,
        totalQuantity,
        itemsOriginalTotal,
        autoCashfree: true
      } 
    });
  };

  return (
    <div className="fixed inset-0 bg-[#f0f2f5] z-50 flex flex-col h-full w-full overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white shrink-0">
        <div className="flex items-center justify-between h-[56px] px-4">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 cursor-pointer">
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <span className="text-[13px] font-semibold text-gray-800 tracking-wide uppercase">Review Your Order</span>
          </div>
          <div className="bg-[#eaf0ff] text-[#5b73e8] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Step 1/2
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-[2px] bg-gray-200 w-full relative">
          <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-[#5b73e8]"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Discount Banner with Firecracker/Confetti Effect */}
        <div className="bg-[#e6f5ec] pb-[10px] relative overflow-hidden z-10">
          {/* Firecracker Animation Layer */}
          <div className="absolute inset-0 pointer-events-none opacity-80">
            <div className="firework-burst fw-1"></div>
            <div className="firework-burst fw-2"></div>
            <div className="firework-burst fw-3"></div>
            <div className="firework-burst fw-4"></div>
            <div className="firework-burst fw-5"></div>
          </div>
          
          <div className="text-center pt-2.5 pb-1 relative z-10">
            <span className="text-[#208447] font-bold text-[15px]">SPECIAL OFFER APPLIED</span>
            <span className="text-gray-700 font-medium text-[13.5px] ml-1">
              (Save â‚¹{discountAmount} on this order)
            </span>
          </div>
          <svg className="absolute w-full h-[10px] bottom-0 left-0 right-0 z-10" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <defs>
              <pattern id="wave" x="0" y="0" width="16" height="10" patternUnits="userSpaceOnUse">
                <path d="M0,10 A8,8 0 0,1 16,10 Z" fill="#ffffff" />
              </pattern>
            </defs>
            <rect width="100%" height="10" fill="url(#wave)" />
          </svg>
        </div>

        {/* Order Items List */}
        <div className="bg-white p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#8b2377]" />
              <span className="text-[13px] font-bold text-gray-900">
                Order Items ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
              </span>
            </div>
            {volumeDiscountAmount > 0 && (
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Extra â‚¹{volumeDiscountAmount} OFF
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {orderItems.map((item, index) => (
              <div key={item.id || index} className="py-3 first:pt-1 last:pb-1 flex items-start gap-3.5">
                <div className="w-[78px] h-[78px] shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center p-1">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="max-h-full max-w-full object-contain mix-blend-multiply" 
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <h3 className="text-[13.5px] text-gray-800 font-semibold line-clamp-1">{item.title}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">Size: {item.selectedSize}</span>
                    {item.selectedColor && item.selectedColor.toLowerCase() !== 'default' && (
                      <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">Color: {item.selectedColor}</span>
                    )}
                    <span className="text-[11px] font-medium text-gray-500">â‚¹{item.unitPrice}/pc</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[15px] font-bold text-gray-900">â‚¹{item.unitPrice * item.quantity}</span>
                    <span className="text-[12px] text-gray-400 line-through">â‚¹{item.origUnitPrice * item.quantity}</span>
                    {item.origUnitPrice > item.unitPrice && (
                      <span className="text-[11.5px] text-[#208447] font-bold">
                        {Math.round(((item.origUnitPrice - item.unitPrice) / item.origUnitPrice) * 100)}% Off
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity Stepper */}
                    <div className="flex items-center border border-[#9f2089] rounded-lg bg-[#fdf2f9] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-[#9f2089] hover:bg-pink-100 active:scale-90 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3 stroke-[2.5]" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-[#9f2089]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-[#9f2089] hover:bg-pink-100 active:scale-90 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {orderItems.length === 0 && (
              <div className="py-8 text-center text-gray-500 font-medium text-[13px]">
                No items in this order. <button onClick={() => navigate(-1)} className="text-[#8b2377] font-bold underline cursor-pointer">Go back</button>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100 text-[12px] text-gray-500 font-medium flex items-center justify-between">
            <span>Sold by: MR International Fashion</span>
            <span className="text-emerald-700 font-bold text-[11px]">âœ“ Verified Seller</span>
          </div>
        </div>

        {/* Address Info */}
        <div className="bg-white mt-2 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
            <span className="text-[15px] font-bold text-gray-900">Estimated Delivery by {getEstimatedDeliveryDate()}</span>
          </div>
          <div className="flex justify-between items-start mt-3">
            <div className="pr-4">
              <div className="text-[14px] text-gray-600 font-medium">
                {address.name} <span className="text-gray-400 mx-1">â€¢</span> {address.contact}
              </div>
              <div className="text-[13px] text-gray-500 leading-snug mt-1">
                {address.houseNo}, {address.roadName}, {address.city}, {address.stateName}, {address.pincode}
              </div>
            </div>
            <button 
              onClick={() => navigate('/checkout/address', { 
                state: { 
                  ...location.state,
                  items: orderItems,
                  product: orderItems[0]?.product,
                  address,
                  totalPrice: displayPrice,
                  subtotal: itemsSubtotal,
                  volumeDiscountAmount,
                  totalQuantity
                } 
              })}
              className="border border-gray-300 rounded px-3 py-1.5 text-[13px] font-bold text-gray-700 shrink-0 bg-white hover:bg-gray-50 cursor-pointer"
            >
              Change
            </button>
          </div>
        </div>

        {/* Price Details Toggle */}
        <div className="bg-white mt-2">
          <div 
            className="px-4 py-3.5 flex justify-between items-center cursor-pointer select-none"
            onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
          >
            <span className="text-[14px] font-bold text-gray-800">
              Price Details ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
            </span>
            <div className="flex items-center gap-2">
              {!isPriceDetailsOpen && <span className="text-[15px] font-bold text-gray-900">â‚¹{displayPrice}</span>}
              {isPriceDetailsOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </div>
          </div>

          {isPriceDetailsOpen && (
            <div className="px-4 pb-4 pt-1 border-t border-gray-50">
              <div className="flex justify-between items-center py-2">
                <span className="text-[13px] text-gray-600">Product Total ({totalQuantity} items)</span>
                <span className="text-[13px] text-gray-700">+ â‚¹{itemsOriginalTotal}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-[13px] text-[#208447]">Total Savings &amp; Discounts</span>
                  <span className="text-[13px] text-[#208447] font-bold">- â‚¹{discountAmount}</span>
                </div>
              )}
              {volumeDiscountAmount > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-[13px] text-purple-700">Multi-Unit Volume Discount</span>
                  <span className="text-[13px] text-purple-700 font-bold">- â‚¹{volumeDiscountAmount}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-[13px] text-gray-600">Delivery Fee</span>
                <span className="text-[13px] text-[#208447] font-bold">FREE</span>
              </div>
              <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center">
                <span className="text-[14px] font-bold text-gray-800">Order Total</span>
                <span className="text-[16px] font-black text-gray-900">â‚¹{displayPrice}</span>
              </div>
            </div>
          )}
        </div>

        {/* Trust Badges */}
        <div className="px-4 py-2 bg-[#fcf5fa] mt-2 mb-2">
          <div className="mobile-value-props">
            <div className="border-rotator"></div>
            <div className="mobile-value-props-inner">
              <div className="value-item">
                <img
                  className="value-icon"
                  src="https://images.meesho.com/images/value_props/return_new.png"
                  alt="7 Days Easy Return"
                />
                <div className="value-text">
                  7 Days<br />
                  Easy Return
                </div>
              </div>

              <div className="value-item">
                <img
                  className="value-icon"
                  src="https://www.meesho.com/assets/Icons/cod.svg"
                  alt="Extra Savings"
                />
                <div className="value-text">
                  Extra<br />
                  Savings
                </div>
              </div>

              <div className="value-item">
                <img
                  className="value-icon"
                  src="https://www.meesho.com/assets/Icons/lowest-price.svg"
                  alt="Lowest Price"
                />
                <div className="value-text">
                  Lowest<br />
                  Price
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-24"></div> {/* Spacer for fixed bottom bar */}
      </div>

      {/* Bottom Bar */}
      <div className="bg-white border-t border-gray-200 p-3 pb-safe flex items-center justify-between shrink-0 z-20 shadow-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[19px] font-black text-gray-900">â‚¹{displayPrice}</span>
            {discountAmount > 0 && (
              <span className="bg-[#e4f6eb] text-[#208447] text-[10px] font-bold px-1.5 py-0.5 rounded">
                â‚¹{discountAmount} OFF
              </span>
            )}
          </div>
          <span 
            onClick={() => setIsPriceDetailsOpen(true)}
            className="text-[#8b2377] text-[11px] font-bold uppercase mt-0.5 cursor-pointer hover:underline"
          >
            View Price Details ({totalQuantity} items)
          </span>
        </div>
        <button 
          onClick={handleContinue}
          className="bg-[#8b2377] text-white px-8 py-3.5 rounded-[6px] font-bold text-[15px] transition-transform active:scale-98 min-w-[140px] shadow-sm cursor-pointer"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
