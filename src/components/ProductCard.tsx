import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { Star, Flame, Zap } from 'lucide-react';

interface ProductCardProps {
  key?: string | number;
  product: Product;
  viewMode?: 'grid' | 'list';
  onSelect: (product: Product) => void;
  onShareWhatsApp?: (product: Product, e: React.MouseEvent) => void;
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600";

function getSocialProof(productId: string, reviewsCount: number) {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = (hash << 5) - hash + productId.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const isOrders = absHash % 2 === 0;
  const count = isOrders 
    ? 45 + (absHash % 140) 
    : 12 + (absHash % 18);
  return {
    isOrders,
    count,
    text: isOrders ? `${count} orders today` : `${count} viewing now`
  };
}

export function ProductCard({ 
  product, 
  viewMode = 'grid',
  onSelect, 
  onShareWhatsApp
}: ProductCardProps) {
  if (!product) return null;
  const [imgSrc, setImgSrc] = useState(product.image || FALLBACK_IMAGE);

  // Dynamic social proof
  const socialProof = useMemo(() => getSocialProof(product.id, product.reviewsCount || 100), [product.id, product.reviewsCount]);

  const price = product.suggestedResellPrice || product.wholesalePrice || 198;
  const originalPrice = product.originalPrice || Math.round(price * 1.6);
  const discountPercent = product.originalPrice && product.originalPrice > price 
    ? Math.round(((product.originalPrice - price) / product.originalPrice) * 100)
    : 35;

  if (viewMode === 'list') {
    return (
      <div 
        id={`product-card-${product.id}`}
        onClick={() => onSelect(product)}
        className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-xs hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer flex flex-row items-center gap-3.5 p-3 group relative w-full"
      >
        {/* Left Thumbnail */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-white rounded-xl border border-gray-100 overflow-hidden flex items-center justify-center p-2">
          <div className="absolute top-0 left-0 z-20">
            <span className="bg-[#9f2089] text-white text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-br-lg tracking-wider">
              Best
            </span>
          </div>
          
          <img
            src={imgSrc}
            alt={product.title}
            loading="lazy"
            onError={() => setImgSrc(FALLBACK_IMAGE)}
            className="max-h-full max-w-full w-auto h-auto object-contain mix-blend-multiply relative z-10 transition-transform duration-300 ease-out group-hover:scale-105"
            referrerPolicy="no-referrer"
          />

          <div className="absolute bottom-1.5 left-1.5 z-20">
            <div className="w-3.5 h-3.5 border-[1.5px] border-emerald-600 rounded-[2px] p-0.5 flex items-center justify-center bg-white/90">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            </div>
          </div>
        </div>

        {/* Middle Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
              Buy 2+ Save 5%
            </span>
          </div>

          <h3 className="text-xs sm:text-sm font-bold text-[#1e293b] line-clamp-2 leading-snug mb-1">
            {product.title}
          </h3>

          <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold mb-1 flex-wrap">
            <div className="flex items-center gap-0.5 text-emerald-700 font-black">
              <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
              <span>{product.rating || '4.2'}</span>
            </div>
            <span className="text-gray-400 font-medium text-[11px]">
              ({product.reviewsCount ? `${product.reviewsCount}` : '1.2k'})
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50/90 border border-amber-200/90 rounded-md px-1.5 py-0.5 w-fit">
            {socialProof.isOrders ? (
              <Flame className="w-3 h-3 text-orange-500 fill-orange-500 shrink-0" />
            ) : (
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
            )}
            <span>{socialProof.text}</span>
          </div>
        </div>

        {/* Right Price */}
        <div className="shrink-0 flex flex-col items-end justify-between self-stretch pl-1 sm:pl-3 border-l border-gray-100/80">
          <div className="text-right my-auto">
            <div className="text-lg sm:text-xl font-black text-[#1e293b]">
              ₹{price}
            </div>
            {originalPrice > price && (
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs text-gray-400 line-through">₹{originalPrice}</span>
                <span className="text-[10px] text-emerald-600 font-black">{discountPercent}% OFF</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id={`product-card-${product.id}`}
      onClick={() => onSelect(product)}
      className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-xs hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer flex flex-col h-full group relative"
    >
      {/* Product Image Area with Badges & Action Buttons */}
      <div className="relative aspect-square w-full bg-white flex items-center justify-center p-3 sm:p-4 overflow-hidden border-b border-gray-100/80 shrink-0">
        
        {/* Top-Left: Bestseller Pill Badge */}
        <div className="absolute top-0 left-0 z-20">
          <span className="bg-[#9f2089] text-white text-[10px] sm:text-[11px] font-black uppercase px-2.5 py-0.5 rounded-br-xl tracking-wider shadow-2xs inline-block">
            Bestseller
          </span>
        </div>

        {/* Subtle Grounding Depth Shadow */}
        <div className="absolute bottom-2.5 w-3/4 h-2 bg-black/[0.04] rounded-[100%] blur-[3px] pointer-events-none -z-0"></div>

        {/* Product Image - Clean Object Contain */}
        <img
          src={imgSrc}
          alt={product.title}
          loading="lazy"
          onError={() => setImgSrc(FALLBACK_IMAGE)}
          className="max-h-full max-w-full w-auto h-auto object-contain mix-blend-multiply relative z-10 transition-transform duration-300 ease-out group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Bottom-Left: Veg / Pure Symbol */}
        <div className="absolute bottom-2.5 left-2.5 z-20">
          <div className="w-4 h-4 border-[1.5px] border-emerald-600 rounded-[3px] p-0.5 flex items-center justify-center bg-white/90 shadow-2xs">
            <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
          </div>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="relative p-3 flex-1 flex flex-col justify-between">
        {/* Meesho Trust Logo - 65% on image, 35% on details */}
        <div className="absolute top-0 right-2.5 -translate-y-[65%] z-30 pointer-events-none">
          <img
            src="https://www.meesho.com/assets/svgicons/mtrusted.svg"
            alt="Meesho Trust"
            className="h-6 sm:h-7 w-auto drop-shadow-2xs"
            referrerPolicy="no-referrer"
          />
        </div>

        <div>
          {/* Volume Discount Badge */}
          <div className="mb-1 flex items-center justify-between gap-1 flex-wrap">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
              Buy 2+ Save 5%
            </span>
          </div>

          {/* Price Row */}
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-xl sm:text-2xl font-black text-[#1e293b] leading-tight">
              ₹{price}
            </span>
            {originalPrice > price && (
              <span className="text-xs sm:text-sm text-gray-400 line-through font-semibold">
                ₹{originalPrice}
              </span>
            )}
          </div>

          {/* Unit Price & Discount */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] sm:text-xs text-gray-500 font-semibold">
              ₹{price} / pc
            </span>
            {discountPercent > 0 && (
              <span className="text-[11px] sm:text-xs text-emerald-600 font-black uppercase tracking-tight">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Product Title with fixed min height for aligned rows */}
          <h3 className="text-xs sm:text-[13px] font-bold text-[#1e293b] line-clamp-2 leading-snug mb-1.5 min-h-[34px]">
            {product.title}
          </h3>

          {/* Live Social Proof Activity Counter */}
          <div className="mb-1.5 flex items-center gap-1 text-[10.5px] font-bold text-amber-900 bg-amber-50/90 border border-amber-200/90 rounded-md px-1.5 py-0.5 w-fit">
            {socialProof.isOrders ? (
              <Flame className="w-3 h-3 text-orange-500 fill-orange-500 shrink-0" />
            ) : (
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
            )}
            <span className="tracking-tight">{socialProof.text}</span>
          </div>
        </div>

        {/* Rating Footer */}
        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold pt-1.5 border-t border-gray-100 mt-1">
          <div className="flex items-center gap-0.5 text-emerald-700 font-black">
            <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
            <span>{product.rating || '4.2'}</span>
          </div>
          <span className="text-gray-400 font-medium text-[11px]">
            {product.reviewsCount ? `${product.reviewsCount}` : '6.7k'}
          </span>
        </div>
      </div>
    </div>
  );
}
