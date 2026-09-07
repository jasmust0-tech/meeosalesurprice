import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, ProductDetailItem, Review } from '../types';
import { getReviewsForProduct } from '../data/reviewsData';
import { clearCheckoutDraft } from '../data/checkoutDraft';
import { genCheckoutOrderId, openCashfreeCheckout } from '../lib/cashfreeCheckout';
import { ProductCard } from './ProductCard';
import { OfferTimer } from './OfferTimer';
import { 
  X, Star, Share2, ShoppingBag, Heart, Info, Check, 
  ChevronRight, ChevronDown, ChevronUp, ChevronLeft,
  Sparkles, Sliders, FileText, Building2, ShieldCheck, 
  CheckCircle2, Truck, RotateCcw, Award, Layers,
  ThumbsUp, User2, MapPin, Plus, Minus, Flame, Zap, Tag, Gift
} from 'lucide-react';

interface ProductModalProps {
  product: Product;
  allProducts?: Product[];
  onClose: () => void;
  onShareWhatsApp: (product: Product) => void;
  onAddToCart: (product: Product, size: string, color: string, resellPrice: number, quantity?: number) => void;
  onAddBundleToCart?: (items: { product: Product; quantity?: number; size?: string; color?: string; resellPrice?: number }[]) => void;
  onBuyNow?: (product: Product, size: string, color: string, resellPrice: number, quantity: number) => void;
}

function getProductRatingStats(product: Product) {
  const ratingNum = typeof product.rating === 'number' && !isNaN(product.rating) ? product.rating : 4.1;
  const reviewsNum = typeof product.reviewsCount === 'number' && !isNaN(product.reviewsCount) ? product.reviewsCount : 1200;

  let hash = 0;
  const seedStr = (product.id || '') + (product.title || '');
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  const multiplier = 2.15 + ((posHash % 100) / 100) * 0.95;
  const totalRatings = product.ratingsCount || Math.max(reviewsNum + 15, Math.round(reviewsNum * multiplier));

  return {
    rating: ratingNum.toFixed(1),
    ratingsCountText: `${totalRatings.toLocaleString()} ratings`,
    reviewsCountText: `${reviewsNum.toLocaleString()} reviews`,
    totalReviewsBadge: reviewsNum.toLocaleString(),
    breakdown: [
      { label: 'Very Good', count: '58%', percent: 58, color: '#248248' },
      { label: 'Good', count: '17%', percent: 17, color: '#48bb78' },
      { label: 'Ok-Ok', count: '10%', percent: 10, color: '#eab308' },
      { label: 'Bad', count: '4%', percent: 4, color: '#f97316' },
      { label: 'Very Bad', count: '11%', percent: 11, color: '#dc2626' },
    ]
  };
}

export function ProductModal({ product, allProducts = [], onClose, onShareWhatsApp, onAddToCart, onAddBundleToCart, onBuyNow }: ProductModalProps) {
  const navigate = useNavigate();
  const [currentProduct, setCurrentProduct] = useState(product);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [helpfulReviews, setHelpfulReviews] = useState<Record<string, boolean>>({});
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (product) {
      setCurrentProduct(product);
    }
  }, [product?.id]);

  useEffect(() => {
    if (currentProduct) {
      // 🎯 Track ViewContent when product is viewed
      if (typeof (window as any).fbq === 'function') {
        (window as any).fbq('track', 'ViewContent', {
          content_name: currentProduct.title,
          content_category: currentProduct.category,
          content_ids: [currentProduct.id],
          content_type: 'product',
          value: currentProduct.suggestedResellPrice || currentProduct.wholesalePrice,
          currency: 'INR'
        });
      }
      
      setHelpfulReviews({});
      setActiveImageIndex(0);
      
      const resetScroll = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      };

      // Reset immediately
      resetScroll();
      
      // Force reset after paint to be extra sure
      requestAnimationFrame(() => {
        resetScroll();
        // A small timeout as a final fallback for content-heavy renders
        setTimeout(resetScroll, 10);
      });
    }
  }, [currentProduct?.id]);

  const allImages = useMemo(() => {
    if (!currentProduct) return [];
    return Array.isArray(currentProduct.images) && currentProduct.images.length > 0 
      ? currentProduct.images 
      : (currentProduct.image ? [currentProduct.image] : []);
  }, [currentProduct?.images, currentProduct?.image]);

  const toggleHelpful = (reviewId: string) => {
    setHelpfulReviews(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  const reviews = useMemo(() => {
    if (!currentProduct) return [];
    return getReviewsForProduct(currentProduct);
  }, [currentProduct?.id]);
  
  const similarProducts = useMemo(() => {
    if (!currentProduct) return [];
    return allProducts
      .filter(p => p && p.id !== currentProduct.id && p.category === currentProduct.category)
      .slice(0, 8);
  }, [currentProduct?.id, currentProduct?.category, allProducts]);

  const availableSizes = useMemo(() => {
    if (!currentProduct) return ['Standard'];
    return currentProduct.sizes && currentProduct.sizes.length > 0 
      ? currentProduct.sizes 
      : (currentProduct.weight ? [currentProduct.weight] : ['Standard']);
  }, [currentProduct?.sizes, currentProduct?.weight]);

  const [selectedSize, setSelectedSize] = useState(availableSizes[0]);

  useEffect(() => {
    setSelectedSize(availableSizes[0]);
  }, [availableSizes]);

  const [selectedColor] = useState(currentProduct?.colors && currentProduct.colors[0] ? currentProduct.colors[0] : 'Default');
  const [resellPrice, setResellPrice] = useState(currentProduct?.suggestedResellPrice || currentProduct?.wholesalePrice || 98);
  const [modalQuantity, setModalQuantity] = useState(1);

  const handleGalleryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPos = container.scrollLeft;
    const width = container.offsetWidth;
    const index = Math.round(scrollPos / width);
    if (index !== activeImageIndex) {
      setActiveImageIndex(index);
    }
  };

  const scrollToImage = (index: number) => {
    if (galleryRef.current) {
      const width = galleryRef.current.offsetWidth;
      galleryRef.current.scrollTo({
        left: index * width,
        behavior: 'smooth'
      });
      setActiveImageIndex(index);
    }
  };

  // Live Social Proof Metrics
  const baseMetrics = useMemo(() => {
    if (!currentProduct) return { orders: 142, viewers: 18, stockLeft: 4 };
    let hash = 0;
    for (let i = 0; i < currentProduct.id.length; i++) {
      hash = (hash << 5) - hash + currentProduct.id.charCodeAt(i);
      hash |= 0;
    }
    const abs = Math.abs(hash);
    return {
      orders: 75 + (abs % 145),
      viewers: 14 + (abs % 18),
      stockLeft: 3 + (abs % 4)
    };
  }, [currentProduct?.id]);

  const [liveViewers, setLiveViewers] = useState(baseMetrics.viewers);

  useEffect(() => {
    setLiveViewers(baseMetrics.viewers);
    const interval = setInterval(() => {
      setLiveViewers(prev => {
        const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1);
        return Math.max(8, Math.min(36, prev + delta));
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [baseMetrics.viewers]);

  // Volume Discount Configuration
  const baseUnitPrice = currentProduct?.suggestedResellPrice || currentProduct?.wholesalePrice || 98;
  const getVolumeDiscountPercent = (qty: number) => {
    if (qty >= 5) return 20;
    if (qty === 4) return 15;
    if (qty === 3) return 10;
    if (qty === 2) return 5;
    return 0;
  };

  const volumeDiscountPercent = getVolumeDiscountPercent(modalQuantity);
  const effectiveUnitPrice = volumeDiscountPercent > 0 
    ? Math.round(baseUnitPrice * (1 - volumeDiscountPercent / 100))
    : baseUnitPrice;
  const totalVolumePrice = effectiveUnitPrice * modalQuantity;
  const standardTotalPrice = baseUnitPrice * modalQuantity;
  const volumeSavingsAmount = Math.max(0, standardTotalPrice - totalVolumePrice);

  const volumeTiers = [
    { qty: 1, label: 'Buy 1', badge: '', discountPercent: 0, unitPrice: baseUnitPrice, savings: 0 },
    { qty: 2, label: 'Buy 2', badge: 'Save 5%', discountPercent: 5, unitPrice: Math.round(baseUnitPrice * 0.95), savings: Math.max(0, (baseUnitPrice * 2) - (Math.round(baseUnitPrice * 0.95) * 2)) },
    { qty: 3, label: 'Buy 3', badge: 'Save 10% 🔥', discountPercent: 10, unitPrice: Math.round(baseUnitPrice * 0.90), savings: Math.max(0, (baseUnitPrice * 3) - (Math.round(baseUnitPrice * 0.90) * 3)) },
    { qty: 4, label: 'Buy 4', badge: 'Save 15% 💥', discountPercent: 15, unitPrice: Math.round(baseUnitPrice * 0.85), savings: Math.max(0, (baseUnitPrice * 4) - (Math.round(baseUnitPrice * 0.85) * 4)) },
  ];

  // Frequently Bought Together Bundles
  const complementaryProducts = useMemo(() => {
    if (!currentProduct || !allProducts || allProducts.length <= 1) return [];
    const others = allProducts.filter(p => p && p.id !== currentProduct.id);
    const sameCat = others.filter(p => p.category === currentProduct.category);
    const diffCat = others.filter(p => p.category !== currentProduct.category);
    const pool = sameCat.length >= 2 ? sameCat : [...sameCat, ...diffCat];
    return pool.slice(0, 2);
  }, [currentProduct?.id, currentProduct?.category, allProducts]);

  const [bundleChecked, setBundleChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (complementaryProducts.length > 0) {
      const initial: Record<string, boolean> = {};
      complementaryProducts.forEach(p => { initial[p.id] = true; });
      setBundleChecked(initial);
    }
  }, [complementaryProducts]);

  const bundleItems = useMemo(() => {
    return [
      { product: currentProduct, isMain: true, checked: true },
      ...complementaryProducts.map(p => ({
        product: p,
        isMain: false,
        checked: bundleChecked[p.id] ?? true
      }))
    ];
  }, [currentProduct, complementaryProducts, bundleChecked]);

  const activeBundleItems = bundleItems.filter(item => item.checked);
  const bundleRegularTotal = activeBundleItems.reduce((sum, item) => sum + (item.product.suggestedResellPrice || item.product.wholesalePrice || 98), 0);
  const bundleDiscountRate = activeBundleItems.length >= 2 ? 0.15 : 0;
  const bundleDiscountAmount = Math.round(bundleRegularTotal * bundleDiscountRate);
  const bundleFinalPrice = bundleRegularTotal - bundleDiscountAmount;
  
  useEffect(() => {
    if (currentProduct) {
      setResellPrice(currentProduct.suggestedResellPrice || currentProduct.wholesalePrice || 98);
      setModalQuantity(1);
    }
  }, [currentProduct?.id, currentProduct?.suggestedResellPrice, currentProduct?.wholesalePrice]);

  const [isWishlisted, setIsWishlisted] = useState(false);

  // Collapsible Accordion States
  const [isHighlightsOpen, setIsHighlightsOpen] = useState(false);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isManufacturerOpen, setIsManufacturerOpen] = useState(false);
  const [isWarrantyOpen, setIsWarrantyOpen] = useState(false);

  if (!currentProduct) return null;

  const originalPrice = currentProduct.originalPrice || Math.round(resellPrice * 3.5);
  const discountPercent = Math.max(1, Math.round(((originalPrice - resellPrice) / originalPrice) * 100));
  const ratingStats = getProductRatingStats(currentProduct);

  const hasHighlights = Array.isArray(currentProduct.highlights) && currentProduct.highlights.length > 0;
  const hasSpecs = Array.isArray(currentProduct.specifications) && currentProduct.specifications.length > 0;
  const hasDetails = Array.isArray(currentProduct.details) && currentProduct.details.length > 0;
  const hasManufacturer = Array.isArray(currentProduct.manufacturerInfo) && currentProduct.manufacturerInfo.length > 0;
  const hasWarranty = Boolean(
    (Array.isArray(currentProduct.warranty) && currentProduct.warranty.length > 0) || 
    (typeof currentProduct.warranty === 'string' && currentProduct.warranty.trim().length > 0)
  );

  const toggleAllAccordions = (expand: boolean) => {
    setIsHighlightsOpen(expand);
    setIsSpecsOpen(expand);
    setIsDetailsOpen(expand);
    setIsManufacturerOpen(expand);
    setIsWarrantyOpen(expand);
  };

  return (
    <div className="bg-gray-50 w-full flex flex-col relative overflow-hidden h-[100dvh] animate-in fade-in duration-300">
      <div className="w-full max-w-2xl mx-auto bg-white shadow-sm flex flex-col relative h-[100dvh]">
        
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product Details</span>
              <span className="text-[13px] font-bold text-gray-800 line-clamp-1 max-w-[200px]">{currentProduct.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
             <button className="p-2 text-gray-400 hover:text-[#9f2089] transition-colors"><Info className="w-5 h-5" /></button>
             <button className="p-2 text-gray-400 hover:text-[#9f2089] transition-colors" onClick={() => onShareWhatsApp(currentProduct)}><Share2 className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 pb-6 bg-white overflow-y-auto"
        >
          
          {/* ================================================================= */}
          {/* ANIMATED OFFER TICKET                                            */}
          {/* ================================================================= */}
          <OfferTimer />

          {/* ================================================================= */}
          {/* CARD 1: IMAGE & BASIC INFO                                        */}
          {/* ================================================================= */}
          <div className="bg-gradient-to-b from-[#ECE3FF] to-white mb-2 shadow-sm overflow-hidden pt-1.5">
            {/* MAIN IMAGE CAROUSEL */}
            <div className="bg-white pb-8 pt-4 relative mx-2 rounded-3xl border border-white shadow-[0_15px_25px_-12px_rgba(0,0,0,0.15)]">
              <div 
                ref={galleryRef}
                onScroll={handleGalleryScroll}
                className="aspect-square w-full relative overflow-x-auto snap-x snap-mandatory flex scrollbar-none scroll-smooth touch-pan-x"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {allImages.map((img, idx) => (
                  <div key={idx} className="w-full h-full shrink-0 snap-center flex items-center justify-center px-4 relative">
                    <img
                      src={img}
                      alt={`${currentProduct.title} - view ${idx + 1}`}
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
                
              </div>

              {/* Pagination Dots */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
                {allImages.slice(0, 8).map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => scrollToImage(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${activeImageIndex === idx ? 'w-5 bg-[#9f2089]' : 'w-1.5 bg-gray-200'}`}
                    aria-label={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* PRODUCT TITLE & PRICE SECTION */}
            <div className="px-4 py-5 bg-transparent">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <div className="bg-[#6039ff] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                      <Check className="w-2.5 h-2.5 stroke-[4]" />
                      Mall
                    </div>
                    <h1 className="text-[14px] font-medium text-gray-600 line-clamp-2 leading-snug">
                      {currentProduct.supplierName} {currentProduct.title}
                    </h1>
                  </div>
                </div>

                <div className="flex gap-4 shrink-0">
                  <button className="flex flex-col items-center gap-1 group">
                    <Heart className="w-6 h-6 text-gray-400 group-hover:text-rose-500 transition-colors" />
                    <span className="text-[11px] text-gray-400 font-bold">Wishlist</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 group">
                    <Share2 className="w-6 h-6 text-gray-400 group-hover:text-[#9f2089] transition-colors" />
                    <span className="text-[11px] text-gray-400 font-bold">Share</span>
                  </button>
                </div>
              </div>

              {/* Price Row */}
              <div className="mt-4 flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-black text-[#1e293b]">₹{effectiveUnitPrice}</span>
                <span className="text-sm text-gray-400 line-through font-medium">₹{originalPrice}</span>
                <span className="text-sm text-gray-600 font-bold">
                  {volumeDiscountPercent > 0 ? `${discountPercent + volumeDiscountPercent}% off` : `${discountPercent}% off`}
                </span>
                <Info className="w-4 h-4 text-gray-300 ml-1" />
              </div>

              {/* Badges Row */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <div className="bg-[#e8f8f0] text-[#127b65] text-[12px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-[#d1f0e0]">
                  Discount applied
                  <CheckCircle2 className="w-3.5 h-3.5 fill-[#127b65] text-white" />
                </div>
                {volumeDiscountPercent > 0 && (
                  <div className="bg-emerald-500 text-white text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                    <Sparkles className="w-3 h-3" />
                    +{volumeDiscountPercent}% Extra Volume Off
                  </div>
                )}
              </div>

              <div className="mt-4">
                <button className="text-[#127b65] text-[14px] font-bold flex items-center gap-1 hover:underline">
                  ₹{Math.round(effectiveUnitPrice * 0.8)} with 1 Special Offer
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mt-5 flex items-center gap-2">
                <div className="bg-[#248248] text-white text-[12px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                  {ratingStats.rating}
                  <Star className="w-3 h-3 fill-white" />
                </div>
                <span className="text-[12px] text-gray-400 font-bold">({ratingStats.totalReviewsBadge})</span>
              </div>

              {/* LIVE SOCIAL PROOF & ACTIVITY BAR */}
              <div className="mt-4 p-3 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-pink-50/80 border border-amber-200/90 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                      <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                    </div>
                    <span className="text-[12px] font-bold text-gray-900">
                      🔥 <strong className="text-orange-600 font-black">{baseMetrics.orders} orders</strong> placed in the last 24 hours
                    </span>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2 py-0.5 bg-orange-500 text-white rounded-full tracking-wider animate-pulse">
                    High Demand
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700 pt-1.5 border-t border-amber-200/60">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-gray-800">
                      <strong className="text-emerald-700 font-black">{liveViewers} people</strong> looking at this right now
                    </span>
                  </div>
                  <span className="text-rose-600 font-bold flex items-center gap-0.5 text-[10.5px]">
                    <Zap className="w-3 h-3 fill-rose-500 text-rose-500" />
                    Only {baseMetrics.stockLeft} left!
                  </span>
                </div>
              </div>
            </div>

            {/* SELECT SIZE & VOLUME DISCOUNT SECTION */}
            <div className="bg-white p-4 border-t border-gray-100 mb-2 shadow-2xs space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-gray-900">Select Size</span>
                    <span className="text-[11px] font-bold text-[#9f2089] bg-[#fdf2f9] border border-[#f3d4ed] px-2 py-0.5 rounded-full">
                      {selectedSize}
                    </span>
                  </div>
                  <span className="text-[11.5px] font-bold text-[#9f2089] cursor-pointer hover:underline">Size Chart</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {availableSizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[48px] h-10 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center border ${
                          isSelected
                            ? 'bg-[#fdf2f9] border-[#9f2089] text-[#9f2089] shadow-xs scale-105 ring-1 ring-[#9f2089]'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 active:scale-95'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Selector (+ / -) */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-bold text-gray-900 block">Quantity</span>
                  <span className="text-[11px] text-gray-500 font-medium">Select units to order</span>
                </div>
                <div className="flex items-center border-[1.5px] border-[#9f2089] rounded-xl bg-[#fdf2f9] overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                    className="w-9 h-9 flex items-center justify-center text-[#9f2089] hover:bg-pink-100 active:scale-90 transition-colors"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <span className="w-9 text-center text-sm font-black text-[#9f2089] select-none">
                    {modalQuantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setModalQuantity(prev => prev + 1)}
                    className="w-9 h-9 flex items-center justify-center text-[#9f2089] hover:bg-pink-100 active:scale-90 transition-colors"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* MULTI-UNIT / VOLUME DISCOUNTS */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#9f2089]" />
                    <span className="text-[13px] font-bold text-gray-900">Multi-Unit Volume Deals</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Buy More &amp; Save More
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {volumeTiers.map((tier) => {
                    const isSelected = modalQuantity === tier.qty;
                    const tierTotal = tier.unitPrice * tier.qty;
                    const tierOrigTotal = baseUnitPrice * tier.qty;
                    return (
                      <button
                        key={tier.qty}
                        type="button"
                        onClick={() => setModalQuantity(tier.qty)}
                        className={`relative p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[#fdf2f9] border-[#9f2089] ring-2 ring-[#9f2089]/60 shadow-xs scale-[1.02]'
                            : 'bg-white border-gray-200 hover:border-gray-300 active:scale-98'
                        }`}
                      >
                        {tier.badge && (
                          <span className={`absolute -top-2 right-2 text-[8.5px] font-black uppercase px-1.5 py-0.25 rounded-md shadow-2xs ${
                            tier.qty >= 3 ? 'bg-[#9f2089] text-white' : 'bg-emerald-600 text-white'
                          }`}>
                            {tier.badge}
                          </span>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold text-gray-900">
                            {tier.label}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-[#9f2089] text-white flex items-center justify-center text-[9px] font-black">
                              ✓
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-sm font-black text-gray-900">₹{tier.unitPrice}</span>
                          <span className="text-[10px] text-gray-400">/pc</span>
                        </div>

                        {tier.qty > 1 ? (
                          <div className="mt-0.5 space-y-0.5">
                            <div className="text-[10.5px] font-extrabold text-gray-800 flex items-center gap-1">
                              <span>Total: ₹{tierTotal}</span>
                              <span className="text-[9.5px] line-through text-gray-400 font-normal">₹{tierOrigTotal}</span>
                            </div>
                            <div className="text-[10px] font-bold text-emerald-600">
                              Save ₹{tier.savings} ({tier.discountPercent}% OFF)
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] font-medium text-gray-400 mt-0.5">
                            Standard Price
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {volumeDiscountPercent > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs animate-in fade-in">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-900">
                        {volumeDiscountPercent}% Multi-Unit Discount Active!
                      </span>
                    </div>
                    <span className="font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                      Total: ₹{totalVolumePrice} (Save ₹{volumeSavingsAmount})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>


            {/* ================================================================= */}
            {/* VALUE PROPS BAR WITH ROTATING BORDER                              */}
            {/* ================================================================= */}
            <div className="px-4 py-1 bg-[#f8eef8]">
              <div className="mobile-value-props">
                {/* ROTATING BORDER */}
                <div className="border-rotator"></div>

                {/* WHITE CONTENT */}
                <div className="mobile-value-props-inner">
                  {/* 7 DAYS EASY RETURN */}
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

                  {/* EXTRA SAVINGS */}
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

                  {/* LOWEST PRICE */}
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

            {/* ================================================================= */}
            {/* FREQUENTLY BOUGHT TOGETHER SECTION                                */}
            {/* ================================================================= */}
            {complementaryProducts.length > 0 && (
              <div className="mx-3 my-2 bg-white rounded-2xl border border-purple-100/90 p-4 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#9f2089]" />
                      <h3 className="text-[13.5px] font-bold text-gray-900">Frequently Bought Together</h3>
                    </div>
                    <p className="text-[10.5px] text-gray-500 font-medium mt-0.5">Complementary items with 1-click bundle discount</p>
                  </div>
                  <span className="bg-[#fdf2f9] text-[#9f2089] border border-[#f3d4ed] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Bundle 15% OFF
                  </span>
                </div>

                {/* Bundle items interactive row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {/* Current Product (This item) */}
                  <div className="w-28 shrink-0 bg-purple-50/40 rounded-xl p-2 border border-purple-200/80 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white rounded-lg p-1 border border-gray-100 flex items-center justify-center mb-1 relative shadow-2xs">
                      <img 
                        src={currentProduct.image} 
                        alt={currentProduct.title} 
                        className="max-h-full max-w-full object-contain" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute -top-1.5 -right-1.5 bg-[#9f2089] text-white p-0.5 rounded-full shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-900 line-clamp-1 w-full">{currentProduct.title}</span>
                    <span className="text-[11px] font-black text-[#9f2089] mt-0.5">₹{baseUnitPrice}</span>
                    <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.25 rounded mt-1">This item</span>
                  </div>

                  {complementaryProducts.map((p) => {
                    const isChecked = bundleChecked[p.id] ?? true;
                    const price = p.suggestedResellPrice || p.wholesalePrice || 198;
                    return (
                      <React.Fragment key={p.id}>
                        <div className="text-gray-300 font-black text-sm shrink-0">+</div>
                        <div 
                          onClick={() => setBundleChecked(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                          className={`w-28 shrink-0 rounded-xl p-2 border transition-all cursor-pointer flex flex-col items-center text-center select-none ${
                            isChecked ? 'bg-[#fdf2f9] border-[#9f2089]/60 shadow-xs' : 'bg-gray-50 border-gray-200 opacity-60'
                          }`}
                        >
                          <div className="w-16 h-16 bg-white rounded-lg p-1 border border-gray-100 flex items-center justify-center mb-1 relative shadow-2xs">
                            <img 
                              src={p.image} 
                              alt={p.title} 
                              className="max-h-full max-w-full object-contain" 
                              referrerPolicy="no-referrer" 
                            />
                            <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white ${
                              isChecked ? 'bg-[#9f2089] shadow-2xs' : 'border border-gray-300 bg-white'
                            }`}>
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-900 line-clamp-1 w-full">{p.title}</span>
                          <span className="text-[11px] font-black text-[#9f2089] mt-0.5">₹{price}</span>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.25 rounded mt-1">15% Off</span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Price Breakdown and 1-Click Action */}
                <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/80 p-3 rounded-xl">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-500 font-medium">Bundle Price ({activeBundleItems.length} items):</span>
                      <span className="text-lg font-black text-gray-900">₹{bundleFinalPrice}</span>
                      {bundleDiscountAmount > 0 && (
                        <span className="text-xs text-gray-400 line-through">₹{bundleRegularTotal}</span>
                      )}
                    </div>
                    {bundleDiscountAmount > 0 ? (
                      <div className="text-[10.5px] font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Bundle Savings: Save ₹{bundleDiscountAmount} (15% OFF)</span>
                      </div>
                    ) : (
                      <div className="text-[10.5px] text-gray-500 mt-0.5">Select 2+ items to unlock 15% discount</div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      // 🎯 Track AddToCart (Bundle)
                      if (typeof (window as any).fbq === 'function') {
                        (window as any).fbq('track', 'AddToCart', {
                          content_name: 'Bundle: ' + currentProduct.title,
                          content_category: currentProduct.category,
                          content_ids: activeBundleItems.map(i => i.product.id),
                          content_type: 'product',
                          value: bundleFinalPrice,
                          currency: 'INR',
                          num_items: activeBundleItems.length
                        });
                      }

                      if (onAddBundleToCart) {
                        onAddBundleToCart(activeBundleItems.map(item => ({
                          product: item.product,
                          quantity: 1,
                          size: item.product.sizes?.[0] || 'Standard',
                          color: item.product.colors?.[0] || 'Default',
                          resellPrice: Math.round((item.product.suggestedResellPrice || item.product.wholesalePrice || 198) * (1 - bundleDiscountRate))
                        })));
                      } else {
                        activeBundleItems.forEach(item => {
                          onAddToCart(item.product, item.product.sizes?.[0] || 'Standard', 'Default', Math.round((item.product.suggestedResellPrice || item.product.wholesalePrice || 198) * (1 - bundleDiscountRate)), 1);
                        });
                        navigate('/cart');
                      }
                    }}
                    className="w-full sm:w-auto bg-[#9f2089] hover:bg-[#831871] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-100 active:scale-95 transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add {activeBundleItems.length} Bundle Items • ₹{bundleFinalPrice}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* CARD 3: DETAILS, REVIEWS & MORE                                   */}
            {/* ================================================================= */}
          <div className="bg-white mb-2 shadow-sm">
            {/* Product Specifications Accordions */}
            <div className="bg-white py-1">
               <div className="px-4 py-3 flex items-center justify-between">
                  <h2 className="text-[13.5px] font-bold text-[#1f2937]">Product Information</h2>
                  <button 
                    onClick={() => toggleAllAccordions(!isHighlightsOpen)}
                    className="text-[11px] font-bold text-[#9f2089]"
                  >
                    {isHighlightsOpen ? 'Collapse All' : 'Expand All'}
                  </button>
               </div>

               {/* Highlights */}
               {hasHighlights && (
                <div className="border-b border-gray-50">
                  <button 
                    onClick={() => setIsHighlightsOpen(!isHighlightsOpen)}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <span className="text-[13.5px] font-bold text-[#1f2937] block">Product Highlights</span>
                        <span className="text-[10.5px] text-gray-500 font-medium">
                          {currentProduct.highlights!.length} key feature{currentProduct.highlights!.length > 1 ? 's' : ''} listed
                        </span>
                      </div>
                    </div>
                    {isHighlightsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {isHighlightsOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 space-y-2">
                        {currentProduct.highlights!.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-800 leading-relaxed">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
               )}

               {/* Specifications Table */}
               {hasSpecs && (
                <div className="border-b border-gray-50">
                  <button 
                    onClick={() => setIsSpecsOpen(!isSpecsOpen)}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#fdf2f9] flex items-center justify-center">
                        <Sliders className="w-4 h-4 text-[#9f2089]" />
                      </div>
                      <div>
                        <span className="text-[13.5px] font-bold text-[#1f2937] block">Specifications</span>
                        <span className="text-[10.5px] text-gray-500 font-medium">
                          {currentProduct.specifications!.length} technical specification{currentProduct.specifications!.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    {isSpecsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {isSpecsOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                        {currentProduct.specifications!.map((spec, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-start justify-between p-2.5 gap-3 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            } ${idx !== currentProduct.specifications!.length - 1 ? 'border-b border-gray-100' : ''}`}
                          >
                            <span className="font-semibold text-gray-500 w-2/5 shrink-0">{spec.label}</span>
                            <span className="font-medium text-gray-900 w-3/5 text-right sm:text-left">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
               )}

               {/* Product Details (Grid) */}
                <div className="border-b border-gray-50">
                  <button 
                    onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-[#9f2089]" />
                      </div>
                      <div>
                        <span className="text-[13.5px] font-bold text-[#1f2937] block">Product Details</span>
                        <span className="text-[10.5px] text-gray-500 font-medium">View detailed attributes</span>
                      </div>
                    </div>
                    {isDetailsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {isDetailsOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      
                      {/* Detailed Attributes Grid */}
                      {hasDetails && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {currentProduct.details!.map((det, idx) => (
                            <div key={idx} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex flex-col justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{det.label}</span>
                              <span className="font-semibold text-gray-800 text-[11.5px]">{det.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Standard Metadata Grid */}
                      {(!hasDetails || currentProduct.details!.length < 3) && (
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div><span className="text-gray-400 block text-[10px] font-semibold">CATEGORY</span> {currentProduct.category.toUpperCase()}</div>
                          <div><span className="text-gray-400 block text-[10px] font-semibold">PACK SIZE</span> {currentProduct.weight || '1 Unit'}</div>
                          <div><span className="text-gray-400 block text-[10px] font-semibold">SUPPLIER</span> {currentProduct.supplierName}</div>
                          <div><span className="text-gray-400 block text-[10px] font-semibold">DELIVERY</span> Free Delivery &amp; COD</div>
                        </div>
                      )}

                      {/* Full Description Box */}
                      {currentProduct.description && (
                        <div className="bg-purple-50/30 border border-purple-100 rounded-xl p-3 space-y-1.5">
                          <span className="text-[11px] font-bold text-gray-700 block">Description:</span>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                            {currentProduct.description}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 px-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-1">
                         <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                         100% Quality Guaranteed Product
                      </div>
                    </div>
                  )}
                </div>
            </div>

            {/* RATINGS & REVIEWS SECTION */}
            <div className="px-4 py-4 border-t border-gray-100 bg-white">
              <h2 className="text-[15px] font-bold text-[#1f2937] mb-3.5">Customer Ratings &amp; Reviews</h2>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-[102px] shrink-0 border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="bg-[#248248] py-2.5 px-2 flex items-center justify-center gap-1.5">
                    <span className="text-2xl font-black text-white">{ratingStats.rating}</span>
                    <Star className="w-5 h-5 fill-white text-white" />
                  </div>
                  <div className="bg-white py-1.5 text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{ratingStats.totalReviewsBadge} Reviews</span>
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  {ratingStats.breakdown.map((row, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10.5px] font-bold text-gray-500">
                      <span className="w-12 shrink-0">{row.label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${row.percent}%`, backgroundColor: row.color }}
                        ></div>
                      </div>
                      <span className="w-6 text-right text-[10px] text-gray-400">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-t border-gray-50 pt-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User2 className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="text-[12px] font-bold text-gray-900">{review.author}</div>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5 bg-emerald-700 text-white text-[9px] px-1 py-0.25 rounded">
                              <span>{review.rating}</span>
                              <Star className="w-2 h-2 fill-white" />
                            </div>
                            <span className="text-[10px] text-gray-400">{review.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[12.5px] text-gray-600 leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* People Also Viewed Section */}
            {similarProducts.length > 0 && (
              <div className="px-3 py-6 bg-gray-50/50 border-t border-gray-100">
                <h2 className="text-[15px] font-bold text-[#1f2937] mb-4 px-1 flex items-center justify-between">
                  <span>People also viewed</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {similarProducts.slice(0, 4).map((p) => (
                    <ProductCard 
                      key={p.id}
                      product={p} 
                      onSelect={(selectedP) => navigate(`/product/${selectedP.id}`)}
                      onShareWhatsApp={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Actions */}
        <div className="sticky bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] shrink-0">
          {/* Active Volume Discount Banner on Bottom Bar */}
          {modalQuantity > 1 && (
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-3.5 py-1.5 flex items-center justify-between text-[11.5px] font-bold shadow-inner">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-300"></span>
                </span>
                <span>
                  🔥 <strong>Buy {modalQuantity} Deal:</strong> Saved ₹{volumeSavingsAmount} ({volumeDiscountPercent}% Extra OFF Applied!)
                </span>
              </div>
              <span className="bg-white/20 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Active Offer
              </span>
            </div>
          )}

          <div className="px-3 py-2.5 flex items-center gap-2.5">
            <button
              onClick={() => {
                // 🎯 Track AddToCart event
                if (typeof (window as any).fbq === 'function') {
                  (window as any).fbq('track', 'AddToCart', {
                    content_name: currentProduct.title,
                    content_category: currentProduct.category,
                    content_ids: [currentProduct.id],
                    content_type: 'product',
                    value: effectiveUnitPrice * modalQuantity,
                    currency: 'INR',
                    num_items: modalQuantity
                  });
                }
                
                onAddToCart(currentProduct, selectedSize, selectedColor, effectiveUnitPrice, modalQuantity);
                navigate('/cart');
              }}
              className={`py-3 rounded-[6px] font-bold transition-all shadow-2xs active:scale-[0.98] flex items-center justify-center ${
                modalQuantity > 1 
                  ? 'flex-1 bg-white border-2 border-[#9f2089]/40 text-[#9f2089] hover:bg-pink-50/50' 
                  : 'flex-1 bg-white border border-gray-300 text-gray-800 hover:bg-gray-50'
              }`}
            >
              {modalQuantity > 1 ? (
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[13px] font-bold">Add {modalQuantity} to Cart</span>
                  <span className="text-[10.5px] font-bold text-emerald-700">₹{totalVolumePrice} total</span>
                </div>
              ) : (
                <span className="text-[14px]">Add to Cart</span>
              )}
            </button>

            <button
              id="modal-buy-now-btn"
              onClick={() => {
                // 🎯 Track InitiateCheckout event
                if (typeof (window as any).fbq === 'function') {
                  (window as any).fbq('track', 'InitiateCheckout', {
                    content_name: currentProduct.title,
                    content_category: currentProduct.category,
                    content_ids: [currentProduct.id],
                    content_type: 'product',
                    value: totalVolumePrice,
                    currency: 'INR',
                    num_items: modalQuantity
                  });
                }

                if (onBuyNow) {
                  onBuyNow(currentProduct, selectedSize, selectedColor, effectiveUnitPrice, modalQuantity);
                } else {
                  const singleItem = {
                    id: `item-${currentProduct.id}`,
                    productId: currentProduct.id,
                    product: currentProduct,
                    price: effectiveUnitPrice,
                    resellPrice: effectiveUnitPrice,
                    selectedSize,
                    selectedColor,
                    quantity: modalQuantity
                  };
                  clearCheckoutDraft();
                  const st = { 
                    items: [singleItem],
                    product: { ...currentProduct, price: effectiveUnitPrice, selectedSize, selectedColor, quantity: modalQuantity },
                    subtotal: standardTotalPrice,
                    volumeDiscountAmount: volumeSavingsAmount,
                    totalPrice: totalVolumePrice,
                    totalQuantity: modalQuantity,
                    autoCashfree: true
                  };
                  openCashfreeCheckout({ ...st, orderId: genCheckoutOrderId() }).catch(() => {
                    navigate('/checkout/payment', { state: st });
                  });
                }
              }}
              className={`rounded-[6px] font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center ${
                modalQuantity > 1
                  ? 'flex-[1.4] bg-gradient-to-r from-[#8b2377] via-[#a2238b] to-[#8b2377] text-white py-2 px-3 ring-2 ring-pink-400/60 shadow-pink-900/20'
                  : 'flex-1 bg-[#8b2377] text-white py-3.5 px-3 hover:bg-[#7a1e68]'
              }`}
            >
              {modalQuantity > 1 ? (
                <div className="w-full flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-left">
                    <div className="flex items-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-pink-200">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="-ml-1 text-white">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[13.5px] font-black tracking-tight text-white">
                        Buy {modalQuantity} Units
                      </span>
                      <span className="text-[10px] font-bold text-pink-200">
                        Save ₹{volumeSavingsAmount} ({volumeDiscountPercent}% OFF)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end leading-tight shrink-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10.5px] line-through text-pink-200/90 font-medium">₹{standardTotalPrice}</span>
                      <span className="text-[16px] font-black text-white">₹{totalVolumePrice}</span>
                    </div>
                    <span className="text-[8.5px] font-black bg-emerald-400 text-emerald-950 px-1.5 py-0.2 rounded tracking-wide uppercase">
                      COMBO DEAL
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 w-full">
                  <div className="flex items-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="-ml-1.5 text-white">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                  <span className="text-[14.5px] font-bold">
                    Buy Now • ₹{effectiveUnitPrice}
                  </span>
                </div>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
