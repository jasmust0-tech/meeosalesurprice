import React from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onApply?: () => void;
  onClear?: () => void;
}

export function BottomSheet({ isOpen, onClose, title, children, onApply, onClear }: BottomSheetProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={onClose} />
      <div className="bg-white rounded-t-2xl relative z-10 flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-full duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 bg-gray-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">
          {children}
        </div>
        {(onApply || onClear) && (
          <div className="flex items-center gap-3 p-4 border-t border-gray-100 bg-white">
            {onClear && (
              <button 
                onClick={onClear} 
                className="flex-1 py-3 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
            )}
            {onApply && (
              <button 
                onClick={onApply} 
                className="flex-1 py-3 font-semibold text-white bg-[#9f2089] rounded-lg hover:bg-[#831871]"
              >
                Apply
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
