import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Category } from '../types';

interface CategoriesMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
}

export function CategoriesMenu({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoriesMenuProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const visibleCategories = categories.filter(cat => cat && cat.id);

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      {/* Dark transparent overlay */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Side panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="All Categories"
        className={`absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">All Categories</h2>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category list */}
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleCategories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#fdf2f9] text-[#9f2089] font-bold'
                    : 'text-gray-700 hover:bg-gray-50 font-medium'
                }`}
              >
                <span className={`text-sm ${isSelected ? 'text-[#9f2089]' : 'text-gray-800'}`}>
                  {cat.name}
                </span>
                {isSelected && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#9f2089]" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}