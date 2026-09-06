import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Category } from '../types';

export interface CategoryWelcomeConfig {
  id: string;
  slugs: string[];
  name: string;
  image: string;
  accentColor: string;
  buttonText: string;
}

export const CATEGORY_WELCOME_DATA: Record<string, CategoryWelcomeConfig> = {
  'all': {
    id: 'all',
    slugs: ['all', 'welcome', 'home', 'shop', 'store'],
    name: 'India\'s Favorite Wholesale Market',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80',
    accentColor: '#9f2089',
    buttonText: 'ENTER SHOP',
  },
  'women-kurti': {
    id: 'women-kurti',
    slugs: ['kurti', 'kurtis', 'women-kurti', 'suit', 'suits', 'ethnic'],
    name: 'Kurtis & Ethnic Wear',
    image: '/kurti_category.jpg',
    accentColor: '#9f2089',
    buttonText: 'ENTER SITE',
  },
  'grocery': {
    id: 'grocery',
    slugs: ['grocery', 'groceries', 'staples', 'food'],
    name: 'Daily Grocery & Staples',
    image: '/grocery_category.jpg',
    accentColor: '#059669',
    buttonText: 'ENTER SITE',
  },
  'kitchen': {
    id: 'kitchen',
    slugs: ['kitchen', 'cookware', 'dining', 'home'],
    name: 'Kitchenware & Cookware',
    image: '/kitchen_category.jpg',
    accentColor: '#d97706',
    buttonText: 'ENTER SITE',
  },
  'electronics': {
    id: 'electronics',
    slugs: ['electronics', 'audio', 'earbuds', 'gadgets', 'tech'],
    name: 'Electronics & Audio',
    image: '/electronics_category.jpg',
    accentColor: '#2563eb',
    buttonText: 'ENTER SITE',
  },
  'makeup': {
    id: 'makeup',
    slugs: ['makeup', 'beauty', 'cosmetics', 'skincare'],
    name: 'Beauty & Cosmetics',
    image: '/makeup_category.jpg',
    accentColor: '#9333ea',
    buttonText: 'ENTER SITE',
  }
};

export function resolveCategorySlug(rawSlug?: string | null): string {
  if (!rawSlug) return 'all';
  const clean = rawSlug.toLowerCase().trim();
  if (clean === 'welcome' || clean === 'all') return 'all';
  for (const [catId, conf] of Object.entries(CATEGORY_WELCOME_DATA)) {
    if (catId === clean || conf.slugs.includes(clean)) {
      return catId;
    }
  }
  return 'all';
}

interface WelcomePageProps {
  initialCategoryId?: string;
  onEnterSite: (categoryId: string) => void;
  categories?: Category[];
}

export function WelcomePage({ initialCategoryId, onEnterSite }: WelcomePageProps) {
  const resolvedCatId = resolveCategorySlug(initialCategoryId);
  const currentCat = CATEGORY_WELCOME_DATA[resolvedCatId] || CATEGORY_WELCOME_DATA['women-kurti'];

  return (
    <div className="h-[100dvh] max-h-screen w-full bg-[#120810] text-white flex flex-col justify-between items-center p-3 sm:p-5 overflow-hidden selection:bg-[#9f2089] selection:text-white select-none">
      
      {/* Middle: Only the Clean Main Image (Single Viewport) */}
      <div className="w-full max-w-md mx-auto my-auto flex-1 flex flex-col items-center justify-center p-1 min-h-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          onClick={() => onEnterSite(currentCat.id)}
          className="w-full h-full max-h-[74vh] sm:max-h-[78vh] aspect-[3/4] relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gray-950 group cursor-pointer"
        >
          {/* Main Image or Grid */}
          {currentCat.id === 'all' ? (
            <div className="w-full h-full p-3 grid grid-cols-2 grid-rows-2 gap-3">
              {[
                { name: 'Kurtis', image: '/kurti_category.jpg', color: '#9f2089' },
                { name: 'Electronics', image: '/electronics_category.jpg', color: '#2563eb' },
                { name: 'Kitchen', image: '/kitchen_category.jpg', color: '#d97706' },
                { name: 'Grocery', image: '/grocery_category.jpg', color: '#059669' }
              ].map((cat) => (
                <div key={cat.name} className="relative rounded-xl overflow-hidden border border-white/5 shadow-inner">
                  <img src={cat.image} className="w-full h-full object-cover" alt={cat.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-center pb-2">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <img
              src={currentCat.image}
              alt={currentCat.name}
              className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
            />
          )}
        </motion.div>
      </div>

      {/* Bottom Action: Only the Enter Button */}
      <div className="w-full max-w-md mx-auto pb-3 sm:pb-5 flex justify-center">
        <motion.button
          id="welcome-enter-site-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onEnterSite(currentCat.id)}
          style={{ backgroundColor: currentCat.accentColor }}
          className="w-full text-white font-black text-base sm:text-lg py-3.5 sm:py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl flex items-center justify-center gap-2.5 transition-all cursor-pointer tracking-wider"
        >
          <span>{currentCat.buttonText}</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
