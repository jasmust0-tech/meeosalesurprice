import React, { useState } from 'react';
import { X, MapPin, CreditCard, ShieldCheck, ChevronRight, CheckCircle2, ChevronLeft, MapPinned } from 'lucide-react';
import { CartItem, Order } from '../types';

interface CheckoutModalProps {
  cartItems: CartItem[];
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export function CheckoutModal({ cartItems, onClose, onOrderSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({
    name: 'John Doe',
    phone: '9876543210',
    house: '123 Main Street, Apt 4B',
    area: 'Downtown',
    pincode: '110001',
    city: 'New Delhi',
    state: 'Delhi'
  });

  const totalQuantity = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const subtotal = cartItems.reduce((sum, item) => sum + (item.resellPrice * (item.quantity || 1)), 0);
  const volumeDiscountRate = totalQuantity >= 3 ? 0.10 : totalQuantity === 2 ? 0.05 : 0;
  const volumeDiscountAmount = Math.round(subtotal * volumeDiscountRate);
  const totalPrice = subtotal - volumeDiscountAmount;

  const handlePlaceOrder = async () => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          totalPrice,
          customerName: address.name,
          shippingAddress: `${address.house}, ${address.area}, ${address.city}, ${address.state} - ${address.pincode}`,
          status: 'Pending'
        })
      });
      const order = await res.json();
      onOrderSuccess(order);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-gray-50 w-full max-w-md h-[94vh] sm:h-auto sm:max-h-[90vh] sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Header */}
        <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
               <X className="w-5 h-5 text-gray-500" />
             </button>
             <h2 className="text-base font-bold text-gray-900">Checkout</h2>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`w-5 h-1.5 rounded-full transition-all ${
                  step === s ? 'w-8 bg-[#9f2089]' : step > s ? 'bg-[#9f2089]/40' : 'bg-gray-200'
                }`} 
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-none">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#9f2089]" />
                <h3 className="text-base font-bold text-gray-900">Shipping Address</h3>
              </div>

              <div className="space-y-4">
                 <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                    <div className="flex flex-col gap-1">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Details</label>
                       <input 
                         type="text" 
                         placeholder="Full Name" 
                         value={address.name}
                         onChange={(e) => setAddress({...address, name: e.target.value})}
                         className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[#9f2089] outline-none transition-colors"
                       />
                       <input 
                         type="text" 
                         placeholder="Phone Number" 
                         value={address.phone}
                         onChange={(e) => setAddress({...address, phone: e.target.value})}
                         className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[#9f2089] outline-none transition-colors mt-1"
                       />
                    </div>

                    <div className="flex flex-col gap-1 pt-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Address Details</label>
                       <input 
                         type="text" 
                         placeholder="House No. / Building Name" 
                         value={address.house}
                         onChange={(e) => setAddress({...address, house: e.target.value})}
                         className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[#9f2089] outline-none transition-colors"
                       />
                       <input 
                         type="text" 
                         placeholder="Road Name / Area / Colony" 
                         value={address.area}
                         onChange={(e) => setAddress({...address, area: e.target.value})}
                         className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[#9f2089] outline-none transition-colors mt-1"
                       />
                       <div className="grid grid-cols-2 gap-2 mt-1">
                          <input 
                            type="text" 
                            placeholder="Pincode" 
                            value={address.pincode}
                            onChange={(e) => setAddress({...address, pincode: e.target.value})}
                            className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[#9f2089] outline-none transition-colors"
                          />
                          <input 
                            type="text" 
                            placeholder="City" 
                            value={address.city}
                            onChange={(e) => setAddress({...address, city: e.target.value})}
                            className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[#9f2089] outline-none transition-colors"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="bg-[#fdf2f9] border border-[#9f2089]/20 rounded-2xl p-4 flex items-center gap-3">
                    <MapPinned className="w-5 h-5 text-[#9f2089]" />
                    <p className="text-[11px] text-[#9f2089] leading-tight font-medium">We'll save this address for your future orders to make shopping faster.</p>
                 </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex items-center gap-2">
                 <button onClick={() => setStep(1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors -ml-1">
                   <ChevronLeft className="w-5 h-5" />
                 </button>
                 <h3 className="text-base font-bold text-gray-900">Payment Method</h3>
              </div>

              <div className="space-y-3">
                 {[
                   { id: 'cod', name: 'Cash on Delivery', desc: 'Pay when you receive your order', icon: ShieldCheck, color: 'emerald' },
                   { id: 'upi', name: 'UPI', desc: 'Pay using Google Pay, PhonePe, or BHIM', icon: CreditCard, color: 'blue' },
                   { id: 'card', name: 'Debit / Credit Card', desc: 'All major cards supported', icon: CreditCard, color: 'purple' }
                 ].map((method) => (
                   <div 
                    key={method.id} 
                    onClick={() => setStep(3)}
                    className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-purple-300 cursor-pointer transition-all flex items-center justify-between group active:scale-98"
                   >
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-${method.color}-50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                           <method.icon className={`w-5 h-5 text-${method.color}-600`} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{method.name}</h4>
                          <p className="text-[10px] text-gray-500 font-medium">{method.desc}</p>
                        </div>
                     </div>
                     <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-[#9f2089]">
                        <div className="w-2 h-2 rounded-full bg-[#9f2089] opacity-0 group-hover:opacity-100" />
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex items-center gap-2">
                 <button onClick={() => setStep(2)} className="p-1 hover:bg-gray-100 rounded-full transition-colors -ml-1">
                   <ChevronLeft className="w-5 h-5" />
                 </button>
                 <h3 className="text-base font-bold text-gray-900">Review &amp; Confirm</h3>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
                 <div className="flex justify-between items-start">
                    <div>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Shipping To</span>
                       <p className="text-xs font-bold text-gray-800">{address.name}</p>
                       <p className="text-[11px] text-gray-500 leading-snug max-w-[180px]">{address.house}, {address.city}, {address.state}</p>
                    </div>
                    <button onClick={() => setStep(1)} className="text-[10px] font-bold text-[#9f2089] uppercase underline underline-offset-4">Change</button>
                 </div>

                 <div className="flex justify-between items-center py-4 border-y border-gray-50">
                    <div>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Payment Mode</span>
                       <p className="text-xs font-bold text-gray-800">Cash on Delivery</p>
                    </div>
                    <button onClick={() => setStep(2)} className="text-[10px] font-bold text-[#9f2089] uppercase underline underline-offset-4">Change</button>
                 </div>

                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="text-xs text-gray-500 font-medium">Order Subtotal</span>
                       <span className="text-xs font-bold text-gray-900">₹{totalPrice}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-xs text-gray-500 font-medium">Delivery Fee</span>
                       <span className="text-xs font-bold text-emerald-600">FREE</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-100">
                       <span className="text-sm font-black text-gray-900">Amount to Pay</span>
                       <span className="text-2xl font-black text-[#9f2089]">₹{totalPrice}</span>
                    </div>
                 </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                 <ShieldCheck className="w-5 h-5 text-emerald-600" />
                 <p className="text-[11px] text-emerald-800 font-medium">Safe and Secure Payments • Verified Supplier Guarantee</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          {step === 1 ? (
             <button 
               onClick={() => setStep(2)}
               className="w-full bg-[#9f2089] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#831871] shadow-lg shadow-purple-100 transition-all active:scale-95"
             >
               Deliver to this Address <ChevronRight className="w-5 h-5" />
             </button>
          ) : step === 2 ? (
             <button 
               onClick={() => setStep(3)}
               className="w-full bg-[#9f2089] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#831871] shadow-lg shadow-purple-100 transition-all active:scale-95"
             >
               Proceed to Review <ChevronRight className="w-5 h-5" />
             </button>
          ) : (
            <button 
              onClick={handlePlaceOrder}
              className="w-full bg-[#9f2089] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#831871] shadow-lg shadow-purple-200 transition-all active:scale-95 animate-pulse"
            >
              Place Order Now <CheckCircle2 className="w-5 h-5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
