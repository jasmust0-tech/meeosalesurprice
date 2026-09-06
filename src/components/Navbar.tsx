import React from 'react';
import { ShoppingBag, Search, Mic, Camera, Menu } from 'lucide-react';
import { Category } from '../types';

interface NavbarProps {
  activeTab: 'catalog' | 'supplier' | 'orders';
  setActiveTab: (tab: 'catalog' | 'supplier' | 'orders') => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenMenu: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categories: Category[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  cartCount,
  onOpenCart,
  onOpenMenu,
  searchQuery,
  setSearchQuery,
  categories,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-xs">
      {/* Top Header: Hamburger, Logo, Cart */}
      <div className="max-w-7xl mx-auto px-3.5 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Hamburger Menu Icon */}
          <button
            onClick={onOpenMenu}
            className="p-1.5 -ml-1.5 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-[#9f2089] transition-colors cursor-pointer"
            title="All Categories"
            aria-label="Open categories menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
          </button>

          {/* Meesho Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => setActiveTab('catalog')}>
            <img
              src="https://www.meesho.com/assets/svgicons/meeshoLogo.svg"
              alt="Meesho"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </div>
        </div>

        {/* Right Actions: Cart */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCart}
            className="text-gray-700 hover:text-[#9f2089] relative p-1.5 transition-colors"
            title="Cart"
          >
            <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-[#9f2089] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3.5 pb-2.5 pt-0.5 border-b border-gray-100">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Keyword or Product ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg py-1.5 pl-9 pr-16 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#9f2089] focus:ring-1 focus:ring-[#9f2089]"
          />
          <div className="absolute right-2.5 flex items-center gap-2.5">
            <Mic className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
            <Camera className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
          </div>
        </div>
      </div>

      {/* Categories & Filters (Conditional for Catalog) */}
      {/* Block removed per user request to remove quick categories and filters near the header */}
    </header>
  );
}
