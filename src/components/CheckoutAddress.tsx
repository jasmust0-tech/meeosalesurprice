import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Check } from 'lucide-react';

export function CheckoutAddress() {
  const navigate = useNavigate();
  const location = useLocation();
  const product = location.state?.product;
  const [step, setStep] = useState(1);
  
  const [name, setName] = useState(location.state?.address?.name || '');
  const [contact, setContact] = useState(location.state?.address?.contact || '');
  const [pincode, setPincode] = useState(location.state?.address?.pincode || '');
  const [city, setCity] = useState(location.state?.address?.city || '');
  const [stateName, setStateName] = useState(location.state?.address?.stateName || '');
  const [houseNo, setHouseNo] = useState(location.state?.address?.houseNo || '');
  const [roadName, setRoadName] = useState(location.state?.address?.roadName || '');

  return (
    <div className="fixed inset-0 bg-[#f0f2f5] z-50 flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="bg-white shrink-0">
        <div className="flex items-center h-[56px] px-4">
          <button onClick={() => step === 2 ? setStep(1) : navigate(-1)} className="p-2 -ml-2 mr-2">
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <span className="text-[13px] font-semibold text-gray-800 tracking-wide uppercase">Add Delivery Address</span>
        </div>
        {/* Progress bar */}
        <div className="h-[2px] bg-gray-200 w-full relative">
          <div className={`absolute left-0 top-0 bottom-0 bg-[#5b73e8] transition-all duration-300 ${step === 1 ? 'w-1/4' : 'w-full'}`}></div>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex-1 overflow-y-auto p-4 relative">
        {step === 1 ? (
          <div className="bg-white rounded-[8px] p-4 shadow-sm border border-gray-100 flex flex-col gap-6 mt-2">
            {/* Name Field */}
            <div className="relative pt-4">
              <label className="absolute -top-1 left-0 text-[11px] font-medium text-gray-500">Name *</label>
              <div className="flex items-end border-b border-gray-200 pb-2 mt-1">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-[15px] focus:outline-none focus:border-[#8b2377] bg-transparent"
                />
                {name.trim().length > 0 && <Check className="w-5 h-5 text-gray-400 shrink-0 mb-0.5" />}
              </div>
            </div>

            {/* Contact Field */}
            <div className="relative pt-4 flex gap-3">
              <div className="border-b border-gray-200 pb-2 w-auto shrink-0 flex items-end">
                 <span className="text-[15px] font-medium text-gray-800">+91</span>
              </div>
              <div className="flex-1 relative">
                <label className="absolute -top-4 left-0 text-[11px] font-medium text-gray-500">Contact Number *</label>
                <div className="flex items-end border-b border-gray-200 pb-2">
                  <input 
                    type="tel" 
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full text-[15px] font-medium text-gray-800 focus:outline-none bg-transparent"
                  />
                  {contact.trim().length > 0 && <Check className="w-5 h-5 text-gray-400 shrink-0 mb-0.5" />}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[8px] p-4 shadow-sm border border-gray-100 flex flex-col gap-6 mt-2 pb-6">
            {/* Pincode */}
            <div className="relative pt-4">
              <label className="absolute -top-1 left-0 text-[11px] font-medium text-gray-500">Pincode *</label>
              <div className="flex items-end border-b border-gray-200 pb-2 mt-1">
                <input 
                  type="text" 
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full text-[15px] font-medium text-gray-800 focus:outline-none bg-transparent"
                />
                {pincode.trim().length > 0 && <Check className="w-5 h-5 text-gray-400 shrink-0 mb-0.5" />}
              </div>
            </div>

            {/* City & State */}
            <div className="flex gap-4">
              <div className="relative pt-4 flex-1">
                <label className="absolute -top-1 left-0 text-[11px] font-medium text-gray-500">City *</label>
                <div className="flex items-end border-b border-gray-200 pb-2 mt-1">
                  <input 
                    type="text" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-[15px] font-medium text-gray-800 focus:outline-none bg-transparent"
                  />
                  {city.trim().length > 0 && <Check className="w-5 h-5 text-gray-400 shrink-0 mb-0.5" />}
                </div>
              </div>
              <div className="relative pt-4 flex-1">
                <label className="absolute -top-1 left-0 text-[11px] font-medium text-gray-500">State *</label>
                <div className="flex items-end border-b border-gray-200 pb-2 mt-1 relative">
                  <select
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full text-[15px] font-medium text-gray-800 focus:outline-none bg-transparent appearance-none cursor-pointer pr-6 pb-0.5"
                  >
                    <option value="" disabled>Select State</option>
                    {[
                      'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 
                      'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Goa', 
                      'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 
                      'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 
                      'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
                      'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
                    ].map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none pb-1">
                    <span className="text-[10px] text-gray-500">▼</span>
                  </div>
                </div>
              </div>
            </div>

            {/* House no. / Building Name */}
            <div className="relative pt-4">
              <label className="absolute -top-1 left-0 text-[11px] font-medium text-[#8b2377]">House no./ Building Name *</label>
              <div className="flex items-end border-b-[1.5px] border-[#8b2377] pb-2 mt-1">
                <input 
                  type="text" 
                  value={houseNo}
                  onChange={(e) => setHouseNo(e.target.value)}
                  className="w-full text-[15px] font-medium text-gray-800 focus:outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Road Name / Area / Colony */}
            <div className="relative pt-4">
              <label className="absolute -top-1 left-0 text-[11px] font-medium text-gray-500">Road Name / Area / Colony *</label>
              <div className="flex items-end border-b border-gray-200 pb-2 mt-1">
                <input 
                  type="text" 
                  value={roadName}
                  onChange={(e) => setRoadName(e.target.value)}
                  className="w-full text-[15px] font-medium text-gray-800 focus:outline-none bg-transparent truncate pr-2"
                />
                {roadName.trim().length > 0 && <Check className="w-5 h-5 text-gray-400 shrink-0 mb-0.5" />}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="bg-white border-t border-gray-200 p-4 pb-safe flex shrink-0 z-20">
        <button 
          onClick={() => step === 1 ? setStep(2) : navigate('/checkout/summary', { 
            state: { 
              ...location.state, 
              address: { name, contact, pincode, city, stateName, houseNo, roadName } 
            } 
          })}
          className="w-full bg-[#8b2377] text-white py-[14px] rounded-[4px] font-medium text-[15px] transition-colors cursor-pointer"
        >
          {step === 1 ? 'Next' : 'Save Address and Continue'}
        </button>
      </div>
    </div>
  );
}
