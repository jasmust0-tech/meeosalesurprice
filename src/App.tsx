import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Product, Category, CartItem, Order } from './types';
import { Navbar } from './components/Navbar';
import { Features } from './components/Features';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { ShareWhatsAppModal } from './components/ShareWhatsAppModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { SupplierDashboard } from './components/SupplierDashboard';
import { ResellerOrders } from './components/ResellerOrders';
import { CheckoutAddress } from './components/CheckoutAddress';
import { CheckoutSummary } from './components/CheckoutSummary';
import { CheckoutPayment } from './components/CheckoutPayment';
import { InfoPage } from './components/InfoPage';
import { clearCheckoutDraft } from './data/checkoutDraft';
import { hiddenTestProduct } from './data/hiddenProduct';
import { OfferTimer } from './components/OfferTimer';
import { CategoriesMenu } from './components/CategoriesMenu';
import { BottomSheet } from './components/BottomSheet';
import { SplashScreen } from './components/SplashScreen';
import {
  AdminLogin,
  AdminLayout,
  AdminDashboard,
  AdminOrders,
  AdminUsers,
  AdminCashfree,
  AdminTracking,
  AdminChangePassword,
  RequireAdmin,
} from './components/admin';

import { WelcomePage, resolveCategorySlug } from './components/WelcomePage';
import { Sparkles, ArrowUpDown, Filter, Check, LayoutGrid, List } from 'lucide-react';

import { initialCategories, initialProducts } from './data/productsData';

const fallbackCategories: Category[] = initialCategories;

function injectGtags(codes: string[]) {
  const active = new Set<string>();
  codes.forEach((c) => {
    if (!c) return;
    active.add(c);
  });
  // Ensure gtag core script is present
  if (!Array.prototype.some.call(document.querySelectorAll('script[src]'), (s: HTMLScriptElement) =>
    (s.src || '').includes('googletagmanager.com/gtag/js'))) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + Array.from(active)[0];
    document.head.appendChild(s);
  }
  // Reconfigure each measurement id
  const win = window as any;
  win.dataLayer = win.dataLayer || [];
  if (typeof win.gtag !== 'function') {
    win.gtag = function () { win.dataLayer.push(arguments); };
  }
  active.forEach((c) => {
    win.gtag('config', c);
  });
}

function injectPixels(pixelIds: string[]) {
  const win = window as any;
  const ids = pixelIds.filter(Boolean);
  if (ids.length === 0) return;
  // Load Facebook pixel core only once
  if (typeof win.fbq !== 'function') {
    (function (f: any, b: any, e: any, v: any) {
      let n: any, t: any, s: any;
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(win, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  }
  const inited = win.__injectedPixels_ || (win.__injectedPixels_ = []);
  ids.forEach((id) => {
    if (!inited.includes(id)) {
      win.fbq('init', id);
      inited.push(id);
    }
  });
  if (typeof win.fbq === 'function') win.fbq('track', 'PageView');
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem('meesho_visitor_id');
    if (!id) {
      id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('meesho_visitor_id', id);
    }
    return id;
  } catch {
    return 'v_' + Math.random().toString(36).slice(2, 10);
  }
}

async function safeFetch<T>(url: string, options?: RequestInit, retries: number = 2): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
      } else {
        console.warn(`safeFetch failed for ${url}:`, err);
      }
    }
  }
  return null;
}

function ProductPageWrapper({ 
  products, 
  onClose, 
  onShareWhatsApp, 
  onAddToCart, 
  onAddBundleToCart,
  onBuyNow
}: { 
  products: Product[]; 
  onClose: () => void; 
  onShareWhatsApp: (p: Product) => void; 
  onAddToCart: (p: Product, size: string, color: string, price: number, qty?: number) => void; 
  onAddBundleToCart: (items: any[]) => void; 
  onBuyNow: (p: Product, size: string, color: string, price: number, qty: number) => void;
}) {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(() => {
    return products.find(p => p.id === id) || initialProducts.find(p => p.id === id) || null;
  });
  const [loading, setLoading] = useState(!product);

  useEffect(() => {
    const found = products.find(p => p.id === id) || initialProducts.find(p => p.id === id);
    if (found) {
      setProduct(found);
      setLoading(false);
    } else if (id) {
      setLoading(true);
      safeFetch<Product>(`/api/products/${id}`)
        .then(p => {
          if (p) setProduct(p);
        })
        .finally(() => setLoading(false));
    }
  }, [id, products]);

  if (loading && !product) {
    return (
      <div className="min-h-screen bg-white z-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#9f2089] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500 font-medium">Loading product details...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <ProductModal
      product={product}
      allProducts={products}
      onClose={onClose}
      onShareWhatsApp={onShareWhatsApp}
      onAddToCart={onAddToCart}
      onAddBundleToCart={onAddBundleToCart}
      onBuyNow={onBuyNow}
    />
  );
}

function HiddenProductPage({
  products,
  onClose,
  onShareWhatsApp,
  onAddToCart,
  onAddBundleToCart,
  onBuyNow
}: {
  products: Product[];
  onClose: () => void;
  onShareWhatsApp: (p: Product) => void;
  onAddToCart: (p: Product, size: string, color: string, price: number, qty?: number) => void;
  onAddBundleToCart: (items: any[]) => void;
  onBuyNow: (p: Product, size: string, color: string, price: number, qty: number) => void;
}) {
  return (
    <ProductModal
      product={hiddenTestProduct}
      allProducts={products}
      onClose={onClose}
      onShareWhatsApp={onShareWhatsApp}
      onAddToCart={onAddToCart}
      onAddBundleToCart={onAddBundleToCart}
      onBuyNow={onBuyNow}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Hardcoded Master Products & Categories (Instant 0ms Load, No Database Required)
  const [allMasterProducts, setAllMasterProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('meesho_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialProducts;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('meesho_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialCategories;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('meesho_selected_category');
      if (saved) return saved;
    } catch {}
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('default');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Client-side instant filter function
  const filterMasterProducts = (source: Product[]) => {
    let result = [...source];
    if (selectedCategory && selectedCategory !== 'all') {
      const catStr = selectedCategory.toLowerCase();
      result = result.filter(p => {
        const pCat = (p.category || '').toLowerCase();
        return pCat === catStr || pCat.includes(catStr) || catStr.includes(pCat);
      });
    }

    let finalSearch = searchQuery;
    if (selectedGender !== 'all') {
      finalSearch = finalSearch ? `${finalSearch} ${selectedGender}` : selectedGender;
    }
    if (finalSearch) {
      const s = finalSearch.toLowerCase();
      result = result.filter(p => 
        (p.title || p.name || '').toLowerCase().includes(s) || 
        (p.description || '').toLowerCase().includes(s)
      );
    }

    if (sortBy === 'price-low') {
      result.sort((a, b) => Number(a.wholesalePrice || a.price || 0) - Number(b.wholesalePrice || b.price || 0));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => Number(b.wholesalePrice || b.price || 0) - Number(a.wholesalePrice || a.price || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));
    }

    return result;
  };

  const [products, setProducts] = useState<Product[]>(() => filterMasterProducts(allMasterProducts));

  // Cart & Orders stored in localStorage for 100% offline & standalone reliability
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('meesho_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('meesho_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [activeSheet, setActiveSheet] = useState<'sort' | 'category' | 'gender' | 'filters' | null>(null);
  const [tempSortBy, setTempSortBy] = useState<string>('default');
  const [tempCategory, setTempCategory] = useState<string>('all');
  const [tempGender, setTempGender] = useState<string>('all');

  const [whatsappShareProduct, setWhatsappShareProduct] = useState<Product | null>(null);
  const [hasEnteredSite, setHasEnteredSite] = useState<boolean>(() => {
    try {
      return localStorage.getItem('meesho_has_entered') === 'true';
    } catch {}
    return false;
  });
  const [showSplash, setShowSplash] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('meesho_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  // Sync orders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('meesho_orders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  // Persist "entered site" flag and selected category so refresh skips welcome page
  useEffect(() => {
    try {
      localStorage.setItem('meesho_has_entered', String(hasEnteredSite));
    } catch {}
  }, [hasEnteredSite]);

  // Heal stale cart items (e.g. restored from localStorage / server merge) that
  // lost their full product object, so image + name + price always resolve.
  useEffect(() => {
    if (!Array.isArray(allMasterProducts) || allMasterProducts.length === 0) return;
    setCartItems(prev => {
      let changed = false;
      const next = prev.map(item => {
        if (item.product && item.product.id) return item;
        const found = allMasterProducts.find(p => p.id === item.productId);
        if (!found && item.productId === hiddenTestProduct.id) {
          changed = true;
          return {
            ...item,
            product: hiddenTestProduct,
            resellPrice: item.resellPrice || hiddenTestProduct.suggestedResellPrice
          };
        }
        if (!found) return item;
        changed = true;
        return {
          ...item,
          product: found,
          resellPrice: item.resellPrice || found.suggestedResellPrice || found.wholesalePrice || 98
        };
      });
      return changed ? next : prev;
    });
  }, [allMasterProducts]);

  useEffect(() => {
    try {
      localStorage.setItem('meesho_selected_category', selectedCategory);
    } catch {}
  }, [selectedCategory]);

  // Instant local filtering when filters change
  useEffect(() => {
    setProducts(filterMasterProducts(allMasterProducts));
  }, [selectedCategory, searchQuery, sortBy, selectedGender, allMasterProducts]);

  // Optional background fetch to sync if API is present
  useEffect(() => {
    safeFetch<Category[]>('/api/categories').then(data => {
      if (Array.isArray(data) && data.length > 0) setCategories(data);
    });
    fetchCart();
    safeFetch<Order[]>('/api/orders').then(data => {
      if (Array.isArray(data) && data.length > 0) setOrders(data);
    });
    // Load dynamic tracking settings (pixels + GA) editable from admin panel
    safeFetch<{ pixels?: string[]; gaCodes?: string[] }>('/api/config').then((cfg) => {
      if (!cfg) return;
      if (Array.isArray(cfg.pixels) && cfg.pixels.length > 0) {
        injectPixels(cfg.pixels);
      }
      if (Array.isArray(cfg.gaCodes) && cfg.gaCodes.length > 0) {
        injectGtags(cfg.gaCodes);
      }
    });
    // Live analytics heartbeat (keeps visitor shown as "online" in the admin panel)
    const visitorId = getVisitorId();
    const heartbeat = () => {
      fetch('/api/analytics/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      }).catch(() => {});
    };
    heartbeat();
    const hb = setInterval(heartbeat, 25000);
    const onHide = () => { document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') heartbeat();
    }); };
    onHide();
    return () => clearInterval(hb);
  }, []);

  // Track Page Views for Meta Pixel and Google Analytics on Route Change
  useEffect(() => {
    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'PageView');
    }
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href
      });
    }
    // Count page view for admin live analytics
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: getVisitorId() }),
    }).catch(() => {});
  }, [location.pathname, location.search]);

  async function fetchCategories() {
    safeFetch<Category[]>('/api/categories').then(data => {
      if (Array.isArray(data) && data.length > 0) setCategories(data);
    });
  }

  async function fetchProducts() {
    setProducts(filterMasterProducts(allMasterProducts));
    safeFetch<Product[]>('/api/products').then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setAllMasterProducts(data);
      }
    });
  }

  async function fetchCart() {
    safeFetch<CartItem[]>('/api/cart').then(data => {
      if (!Array.isArray(data)) return;
      setCartItems(prev => {
        const next = [...prev];
        data.forEach((serverItem: any) => {
          const idx = next.findIndex(i =>
            i.productId === serverItem.productId &&
            (!serverItem.selectedSize || !i.selectedSize || i.selectedSize === serverItem.selectedSize)
          );
          const resolveProduct = (item: any) =>
            item?.product ||
            allMasterProducts.find(p => p.id === (item?.productId || serverItem.productId)) ||
            (item?.productId === hiddenTestProduct.id ? hiddenTestProduct : null) ||
            (serverItem.productId === hiddenTestProduct.id ? hiddenTestProduct : null);
          if (idx !== -1) {
            const local = next[idx];
            const product = resolveProduct(local) || resolveProduct(serverItem) || local?.product;
            next[idx] = {
              ...local,
              ...serverItem,
              product: product || local?.product,
              id: serverItem.id || local?.id || `cart-${Date.now()}-${Math.random()}`,
              selectedSize: serverItem.selectedSize || local?.selectedSize || product?.sizes?.[0] || 'Standard',
              selectedColor: serverItem.selectedColor || local?.selectedColor || product?.colors?.[0] || 'Default',
              resellPrice: serverItem.resellPrice || local?.resellPrice || product?.suggestedResellPrice || product?.wholesalePrice || 98,
            };
          } else {
            const product = resolveProduct(serverItem);
            next.push({
              id: serverItem.id || `cart-${Date.now()}-${Math.random()}`,
              productId: serverItem.productId,
              product,
              quantity: Number(serverItem.quantity) || 1,
              selectedSize: serverItem.selectedSize || product?.sizes?.[0] || 'Standard',
              selectedColor: serverItem.selectedColor || product?.colors?.[0] || 'Default',
              resellPrice: serverItem.resellPrice || product?.suggestedResellPrice || product?.wholesalePrice || 98,
            });
          }
        });
        return next;
      });
    });
  }

  async function fetchOrders() {
    safeFetch<Order[]>('/api/orders').then(data => {
      if (Array.isArray(data) && data.length > 0) setOrders(data);
    });
  }

  const getCartQuantity = (productId: string) => {
    const item = cartItems.find(i => i.productId === productId);
    return item ? (Number(item.quantity) || 1) : 0;
  };

  const handleAddToCart = async (product: Product, size: string = 'Standard', color: string = 'Default', resellPrice: number = 0, shouldNavigateToCart: boolean = false, quantity: number = 1) => {
    const qty = quantity || 1;
    const rp = resellPrice || product.suggestedResellPrice || product.wholesalePrice || 198;
    // Optimistic local update so Add to Cart works even without the server
    setCartItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: (Number(i.quantity) || 1) + qty, resellPrice: rp } : i);
      } else {
        return [...prev, {
          id: `cart-${product.id}-${Date.now()}`,
          productId: product.id,
          product,
          selectedSize: size,
          selectedColor: color,
          quantity: qty,
          resellPrice: rp
        }];
      }
    });
    try {
      await safeFetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: qty,
          selectedSize: size,
          selectedColor: color,
          resellPrice: rp
        })
      });
      await fetchCart();
    } catch (err) {
      console.warn(err);
    }
    if (shouldNavigateToCart) {
      navigate('/cart');
    }
  };

  const handleBulkAddToCart = async (items: { product: Product; quantity?: number; size?: string; color?: string; resellPrice?: number }[]) => {
    setCartItems(prev => {
      const next = [...prev];
      items.forEach(item => {
        const qty = Number(item.quantity) || 1;
        const rp = Number(item.resellPrice) || item.product.suggestedResellPrice || item.product.wholesalePrice || 198;
        const size = item.size || item.product.sizes?.[0] || 'Standard';
        const color = item.color || item.product.colors?.[0] || 'Default';
        const existingIdx = next.findIndex(i => i.productId === item.product.id && i.selectedSize === size);
        if (existingIdx !== -1) {
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: (Number(next[existingIdx].quantity) || 1) + qty,
            resellPrice: rp
          };
        } else {
          next.push({
            id: `cart-${item.product.id}-${Date.now()}-${Math.random()}`,
            productId: item.product.id,
            product: item.product,
            selectedSize: size,
            selectedColor: color,
            quantity: qty,
            resellPrice: rp
          });
        }
      });
      return next;
    });
    try {
      await safeFetch('/api/cart/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity || 1,
            selectedSize: item.size || item.product.sizes?.[0] || 'Standard',
            selectedColor: item.color || item.product.colors?.[0] || 'Default',
            resellPrice: item.resellPrice || item.product.suggestedResellPrice || item.product.wholesalePrice
          }))
        })
      });
      await fetchCart();
      navigate('/cart');
    } catch (err) {
      console.warn(err);
      navigate('/cart');
    }
  };

  const handleUpdateProductQuantity = async (product: Product, newQuantity: number) => {
    try {
      // Optimistic update
      setCartItems(prev => {
        if (newQuantity <= 0) {
          return prev.filter(i => i.productId !== product.id);
        }
        const existing = prev.find(i => i.productId === product.id);
        if (existing) {
          return prev.map(i => i.productId === product.id ? { ...i, quantity: newQuantity } : i);
        } else {
          return [...prev, {
            id: `cart-${Date.now()}`,
            productId: product.id,
            product,
            selectedSize: product.sizes?.[0] || 'Standard',
            selectedColor: product.colors?.[0] || 'Default',
            quantity: newQuantity,
            resellPrice: product.suggestedResellPrice || product.wholesalePrice || 198
          }];
        }
      });

      await safeFetch('/api/cart/set-quantity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: newQuantity,
          selectedSize: product.sizes?.[0] || 'Standard',
          selectedColor: product.colors?.[0] || 'Default',
          resellPrice: product.suggestedResellPrice || product.wholesalePrice || 198
        })
      });
      fetchCart();
    } catch (err) {
      console.warn(err);
      fetchCart();
    }
  };

  const handleUpdateCartItemQuantity = async (cartItemId: string, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        handleRemoveCartItem(cartItemId);
        return;
      }
      setCartItems(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity: newQuantity } : item));
      await safeFetch(`/api/cart/${cartItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      });
      fetchCart();
    } catch (err) {
      console.warn(err);
      fetchCart();
    }
  };

  const handleRemoveCartItem = async (id: string) => {
    // Update local state immediately so price drops right away
    setCartItems(prev => prev.filter(i => i.id !== id));
    try {
      await safeFetch(`/api/cart/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn(err);
    }
  };

  const handleBuyNowFromProduct = async (product: Product, size: string, color: string, price: number, qty: number = 1) => {
    // 1. Optimistic cart update to add this item to cart
    const newItem = {
      id: `cart-${Date.now()}`,
      productId: product.id,
      quantity: qty,
      selectedSize: size,
      selectedColor: color,
      resellPrice: price,
      product: product,
      price: price
    };
    
    let combinedCartItems = [...cartItems];
    const existingIdx = combinedCartItems.findIndex((i: any) => 
      i.productId === product.id && (!size || i.selectedSize === size)
    );
    if (existingIdx !== -1) {
      combinedCartItems[existingIdx] = {
        ...combinedCartItems[existingIdx],
        quantity: (combinedCartItems[existingIdx].quantity || 1) + qty,
        resellPrice: price,
        price: price
      };
    } else {
      combinedCartItems.push(newItem);
    }
    
    setCartItems(combinedCartItems);
    
    // 2. Perform the actual API add to cart asynchronously
    safeFetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        selectedSize: size,
        selectedColor: color,
        resellPrice: price,
        quantity: qty
      })
    }).then(() => fetchCart()).catch(console.warn);

    // 3. Calculate totals for checkout with the full cart
    const totalQty = combinedCartItems.reduce((s, i) => s + (i.quantity || 1), 0);
    const sub = combinedCartItems.reduce((s, i) => s + ((i.resellPrice || i.product?.suggestedResellPrice || i.product?.wholesalePrice || 98) * (i.quantity || 1)), 0);
    const discountRate = totalQty >= 3 ? 0.10 : totalQty === 2 ? 0.05 : 0;
    const discountAmt = Math.round(sub * discountRate);
    const finalTot = sub - discountAmt;

    const itemsForCheckout = combinedCartItems.map(i => ({
      id: i.id,
      productId: i.productId,
      product: i.product,
      quantity: i.quantity || 1,
      selectedSize: i.selectedSize || 'Standard',
      selectedColor: i.selectedColor || 'Default',
      resellPrice: i.resellPrice || i.product?.suggestedResellPrice || i.product?.wholesalePrice || 98,
      price: i.resellPrice || i.product?.suggestedResellPrice || i.product?.wholesalePrice || 98
    }));

    // 4. Navigate to the payment page (PHP-style): the customer reviews the order
    //    there and taps "Pay Now" to open Cashfree — roughly 1s faster than the
    //    old flow that waited for /api/config.
    clearCheckoutDraft();
    navigate('/checkout/payment', {
      state: {
        items: itemsForCheckout,
        product: itemsForCheckout[0]?.product,
        subtotal: sub,
        volumeDiscountAmount: discountAmt,
        totalPrice: finalTot,
        totalQuantity: totalQty,
        itemsOriginalTotal: combinedCartItems.reduce((s, i) => s + (Number(i.product?.originalPrice || Math.round((i.resellPrice || 98) * 1.5)) * (i.quantity || 1)), 0),
        autoCashfree: true
      }
    });
  };

  const handleOrderSuccess = (order: Order) => {
    fetchOrders();
    fetchCart();
    navigate('/orders');
  };

  const activeTab = location.pathname === '/supplier' ? 'supplier' : location.pathname === '/orders' ? 'orders' : 'catalog';

  const isProductPage = location.pathname.startsWith('/product/');
  const productId = isProductPage ? location.pathname.split('/')[2] : null;
  const selectedProduct = productId ? products.find(p => p.id === productId) : null;
  const isCartOpen = location.pathname === '/cart';
  const isCheckoutOpen = location.pathname === '/checkout';
  const path = location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(location.search);
  const catQueryParam = searchParams.get('cat') || searchParams.get('category');
  
  const knownAdSlugs = ['all', 'welcome', 'kurti', 'kurtis', 'women-kurti', 'ethnic', 'grocery', 'groceries', 'kitchen', 'cookware', 'electronics', 'audio', 'makeup', 'beauty'];
  const directAdSlug = knownAdSlugs.find(s => path === `/${s}`);

  const isExplicitWelcome = path === '/welcome' || path.startsWith('/welcome/') || Boolean(directAdSlug);
  const isWelcomePage = isExplicitWelcome || Boolean(catQueryParam && (path === '/' || path === '/welcome')) || (!hasEnteredSite && path === '/');

  const activeWelcomeSlug = path.startsWith('/welcome/')
    ? path.split('/')[2]
    : directAdSlug
    ? directAdSlug
    : catQueryParam
    ? catQueryParam
    : 'all';

  if (isWelcomePage && !isProductPage && !isCartOpen && !location.pathname.startsWith('/checkout') && location.pathname !== '/supplier' && location.pathname !== '/orders') {
    return (
      <div className="min-h-screen bg-[#120810] text-white flex flex-col font-sans selection:bg-[#9f2089] selection:text-white">
        <WelcomePage
          initialCategoryId={activeWelcomeSlug}
          categories={categories}
          onEnterSite={(catId) => {
            if (catId && catId !== 'all') {
              setSelectedCategory(catId);
            }
            setHasEnteredSite(true);
            setShowSplash(true);
            navigate('/');
          }}
        />
      </div>
    );
  }

  const CatalogContent = (
    <div className="bg-gray-100 pb-4">
      {/* Categories Circular Quick Nav Row */}
      <div className="bg-white px-3.5 py-3 overflow-x-auto scrollbar-none mb-2 border-b border-gray-100 shadow-2xs">
        <div className="flex items-start gap-3.5 min-w-max">
          {categories.filter(cat => cat.id !== 'all').map((cat) => {
            if (!cat) return null;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center gap-1.5 group cursor-pointer w-[66px] transition-transform active:scale-95"
              >
                <div className={`w-[60px] h-[60px] rounded-full p-1.5 overflow-hidden border-2 transition-all flex items-center justify-center ${
                  isSelected 
                    ? 'border-[#9f2089] bg-[#fdf2f9] shadow-sm scale-105 ring-2 ring-[#9f2089]/25' 
                    : 'border-gray-200/90 bg-[#fafafa] hover:border-gray-300 hover:bg-white'
                }`}>
                  <img 
                    src={cat.image || 'https://instamart-media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_200/NI_CATALOG/IMAGES/CIW/2024/4/13/ec7076a0-435a-48a0-bb6f-87a41efdc12a_1a9ad173-95ad-4d4a-9860-dfb6495be246'} 
                    alt={cat.name} 
                    className="w-full h-full object-contain drop-shadow-2xs group-hover:scale-108 transition-transform duration-200" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <span className={`text-[11px] text-center leading-tight truncate w-full transition-colors ${
                  isSelected ? 'text-[#9f2089] font-bold' : 'text-gray-700 font-medium'
                }`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      
      <Features />

      {/* Offer Ends In Timer */}
      <div className="bg-white py-3 mb-2 border-b border-gray-100">
        <OfferTimer />
      </div>

      {/* Products For You Header with View Mode Switcher */}
      <div className="bg-white pt-4 px-4 pb-2 border-b border-gray-100 flex items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Products For You</h2>
        </div>

        {/* Grid vs Line View Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200/80">
          <button 
            type="button"
            onClick={() => setViewMode('grid')}
            title="Grid View (Aligned cards in rows)"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'grid' 
                ? 'bg-white text-[#9f2089] shadow-xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="text-[11px]">Grid</span>
          </button>
          <button 
            type="button"
            onClick={() => setViewMode('list')}
            title="Line View (Product in a horizontal line)"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'list' 
                ? 'bg-white text-[#9f2089] shadow-xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="text-[11px]">Line View</span>
          </button>
        </div>
      </div>
      
      {/* 4 Sorting & Filtering Buttons Bar */}
      <div className="grid grid-cols-4 bg-white border-b border-gray-200 sticky top-[108px] z-30 mb-3 max-w-7xl mx-auto w-full shadow-2xs">
        <button 
          onClick={() => { setTempSortBy(sortBy); setActiveSheet('sort'); }} 
          className={`flex items-center justify-center gap-1.5 py-3 border-r border-gray-200 text-[11px] font-bold cursor-pointer ${sortBy !== 'default' ? 'text-[#9f2089]' : 'text-gray-700'}`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>{sortBy === 'default' ? 'In Line Order' : 'Sort'}</span>
        </button>
        <button 
          onClick={() => { setTempCategory(selectedCategory); setActiveSheet('category'); }} 
          className={`flex items-center justify-center gap-1.5 py-3 border-r border-gray-200 text-[11px] font-bold cursor-pointer ${selectedCategory !== 'all' ? 'text-[#9f2089]' : 'text-gray-700'}`}
        >
          <span className="truncate max-w-[60px]">{selectedCategory !== 'all' ? categories.find(c => c.id === selectedCategory)?.name || 'Category' : 'Category'}</span>
          <span className="text-[9px] opacity-75">▼</span>
        </button>
        <button 
          onClick={() => { setTempGender(selectedGender); setActiveSheet('gender'); }} 
          className={`flex items-center justify-center gap-1.5 py-3 border-r border-gray-200 text-[11px] font-bold cursor-pointer ${selectedGender !== 'all' ? 'text-[#9f2089]' : 'text-gray-700'}`}
        >
          <span>{selectedGender !== 'all' ? selectedGender : 'Gender'}</span>
          <span className="text-[9px] opacity-75">▼</span>
        </button>
        <button 
          onClick={() => setActiveSheet('filters')} 
          className="flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold text-gray-700 cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
        </button>
      </div>

      <div className="px-2 sm:px-4 max-w-7xl mx-auto w-full">
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 shadow-xs mt-4">
            <div className="w-16 h-16 rounded-full bg-pink-50 text-[#9f2089] flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">No products available</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
              All products have been removed. You can add new products anytime from the Supplier Hub.
            </p>
            <button
              onClick={() => navigate('/supplier')}
              className="inline-flex items-center gap-2 bg-[#9f2089] hover:bg-[#831871] text-white font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors text-sm cursor-pointer"
            >
              <span>Add New Products</span>
            </button>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5"
              : "flex flex-col gap-2.5 max-w-4xl mx-auto"
          }>
            {products.map((product) => {
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  viewMode={viewMode}
                  onSelect={(p) => navigate(`/product/${p.id}`)}
                  onShareWhatsApp={(p, e) => {
                    e.stopPropagation();
                    setWhatsappShareProduct(p);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-[#9f2089] selection:text-white">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {!isProductPage && !location.pathname.startsWith('/admin') && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={(tab) => navigate(tab === 'catalog' ? '/' : `/${tab}`)}
          cartCount={cartItems.length}
          onOpenCart={() => navigate('/cart')}
          onOpenMenu={() => setIsMenuOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      )}

      <CategoriesMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          if (catId === 'all') {
            setSearchQuery('');
          }
          setIsMenuOpen(false);
          if (location.pathname !== '/') {
            navigate('/');
          }
        }}
      />

      <main className="flex-1 w-full mx-auto pb-4 overflow-x-hidden">
        <Routes>
          <Route path="/" element={CatalogContent} />
          <Route path="/welcome" element={
            <WelcomePage
              initialCategoryId={activeWelcomeSlug}
              categories={categories}
              onEnterSite={(catId) => {
                if (catId && catId !== 'all') {
                  setSelectedCategory(catId);
                }
                setHasEnteredSite(true);
                setShowSplash(true);
                navigate('/');
              }}
            />
          } />
          <Route path="/welcome/:categorySlug" element={
            <WelcomePage
              initialCategoryId={activeWelcomeSlug}
              categories={categories}
              onEnterSite={(catId) => {
                if (catId && catId !== 'all') {
                  setSelectedCategory(catId);
                }
                setHasEnteredSite(true);
                setShowSplash(true);
                navigate('/');
              }}
            />
          } />
          {/* Direct category ad landing routes */}
          <Route path="/kurti" element={<WelcomePage initialCategoryId="kurti" categories={categories} onEnterSite={(catId) => { if (catId && catId !== 'all') setSelectedCategory(catId); setHasEnteredSite(true); setShowSplash(true); navigate('/'); }} />} />
          <Route path="/kurtis" element={<WelcomePage initialCategoryId="kurti" categories={categories} onEnterSite={(catId) => { if (catId && catId !== 'all') setSelectedCategory(catId); setHasEnteredSite(true); setShowSplash(true); navigate('/'); }} />} />
          <Route path="/grocery" element={<WelcomePage initialCategoryId="grocery" categories={categories} onEnterSite={(catId) => { if (catId && catId !== 'all') setSelectedCategory(catId); setHasEnteredSite(true); setShowSplash(true); navigate('/'); }} />} />
          <Route path="/kitchen" element={<WelcomePage initialCategoryId="kitchen" categories={categories} onEnterSite={(catId) => { if (catId && catId !== 'all') setSelectedCategory(catId); setHasEnteredSite(true); setShowSplash(true); navigate('/'); }} />} />
          <Route path="/electronics" element={<WelcomePage initialCategoryId="electronics" categories={categories} onEnterSite={(catId) => { if (catId && catId !== 'all') setSelectedCategory(catId); setHasEnteredSite(true); setShowSplash(true); navigate('/'); }} />} />
          <Route path="/makeup" element={<WelcomePage initialCategoryId="makeup" categories={categories} onEnterSite={(catId) => { if (catId && catId !== 'all') setSelectedCategory(catId); setHasEnteredSite(true); setShowSplash(true); navigate('/'); }} />} />
          <Route path="/beauty" element={<WelcomePage initialCategoryId="makeup" categories={categories} onEnterSite={(catId) => { if (catId && catId !== 'all') setSelectedCategory(catId); setHasEnteredSite(true); setShowSplash(true); navigate('/'); }} />} />
          <Route path="/all" element={<WelcomePage initialCategoryId="all" categories={categories} onEnterSite={(catId) => { if (catId && catId !== 'all') setSelectedCategory(catId); setHasEnteredSite(true); setShowSplash(true); navigate('/'); }} />} />
          <Route path="/product/:id" element={
            <ProductPageWrapper
              products={products}
              onClose={() => navigate(-1)}
              onShareWhatsApp={(p) => setWhatsappShareProduct(p)}
              onAddToCart={(p, size, color, price, qty) => handleAddToCart(p, size, color, price, false, qty)}
              onAddBundleToCart={handleBulkAddToCart}
              onBuyNow={handleBuyNowFromProduct}
            />
          } />
          <Route path="/lovep1" element={
            <HiddenProductPage
              products={[...products, hiddenTestProduct]}
              onClose={() => navigate('/')}
              onShareWhatsApp={(p) => setWhatsappShareProduct(p)}
              onAddToCart={(p, size, color, price, qty) => handleAddToCart(p, size, color, price, false, qty)}
              onAddBundleToCart={handleBulkAddToCart}
              onBuyNow={handleBuyNowFromProduct}
            />
          } />
          <Route path="/cart" element={CatalogContent} />
          <Route path="/checkout" element={CatalogContent} />
          <Route path="/checkout/address" element={<CheckoutAddress />} />
          <Route path="/checkout/summary" element={
            <CheckoutSummary
              onRemoveCartItem={handleRemoveCartItem}
              onUpdateCartItemQuantity={handleUpdateCartItemQuantity}
            />
          } />
          <Route path="/checkout/payment" element={<CheckoutPayment />} />

          {/* Store info pages (required by the payment gateway's domain review) */}
          <Route path="/about" element={<InfoPage page="about" />} />
          <Route path="/contact" element={<InfoPage page="contact" />} />
          <Route path="/terms" element={<InfoPage page="terms" />} />
          <Route path="/refund-policy" element={<InfoPage page="refund" />} />
          <Route path="/shipping-policy" element={<InfoPage page="shipping" />} />
          <Route path="/privacy" element={<InfoPage page="privacy" />} />

          <Route path="/supplier" element={
            <div className="p-4 md:p-8">
              <SupplierDashboard
                categories={categories}
                onCategoryChanged={fetchCategories}
                onProductAdded={() => {
                  fetchProducts();
                  navigate('/');
                }}
              />
            </div>
          } />

          <Route path="/orders" element={
            <div className="p-4 md:p-8">
              <ResellerOrders orders={orders} />
            </div>
          } />

          {/* Admin Panel */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <RequireAdmin>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </RequireAdmin>
          } />
          <Route path="/admin/orders" element={
            <RequireAdmin>
              <AdminLayout>
                <AdminOrders />
              </AdminLayout>
            </RequireAdmin>
          } />
          <Route path="/admin/users" element={
            <RequireAdmin>
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            </RequireAdmin>
          } />
          <Route path="/admin/cashfree" element={
            <RequireAdmin>
              <AdminLayout>
                <AdminCashfree />
              </AdminLayout>
            </RequireAdmin>
          } />
          <Route path="/admin/tracking" element={
            <RequireAdmin>
              <AdminLayout>
                <AdminTracking />
              </AdminLayout>
            </RequireAdmin>
          } />
          <Route path="/admin/password" element={
            <RequireAdmin>
              <AdminLayout>
                <AdminChangePassword />
              </AdminLayout>
            </RequireAdmin>
          } />
        </Routes>
      </main>

      {/* Modals & Drawers triggered by URL */}
      {isCartOpen && (
        <CartDrawer
          isOpen={true}
          onClose={() => navigate(-1)}
          cartItems={cartItems}
          onRemoveItem={handleRemoveCartItem}
          onUpdateQuantity={handleUpdateCartItemQuantity}
          onCheckout={(data) => {
            if (data && data.items && data.items.length > 0) {
              clearCheckoutDraft();
              navigate('/checkout/payment', { 
                state: { 
                  items: data.items,
                  product: data.items[0]?.product ? {
                    ...data.items[0].product,
                    price: data.items[0].resellPrice || data.items[0].price,
                    quantity: data.items[0].quantity,
                    selectedSize: data.items[0].selectedSize,
                    selectedColor: data.items[0].selectedColor
                  } : undefined,
                  subtotal: data.subtotal,
                  volumeDiscountAmount: data.volumeDiscountAmount,
                  totalPrice: data.totalPrice,
                  totalQuantity: data.totalQuantity,
                  autoCashfree: true
                } 
              });
            } else if (cartItems.length > 0) {
              clearCheckoutDraft();
              const totalQty = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);
              const sub = cartItems.reduce((s, i) => s + ((i.resellPrice || 98) * (i.quantity || 1)), 0);
              const discountRate = totalQty >= 3 ? 0.10 : totalQty === 2 ? 0.05 : 0;
              const discountAmt = Math.round(sub * discountRate);
              const finalTot = sub - discountAmt;
              const items = cartItems.map(i => ({
                id: i.id,
                productId: i.productId,
                product: i.product,
                quantity: i.quantity || 1,
                selectedSize: i.selectedSize || 'Standard',
                selectedColor: i.selectedColor || 'Default',
                resellPrice: i.resellPrice || 98,
                price: i.resellPrice || 98
              }));
              navigate('/checkout/payment', { 
                state: { 
                  items,
                  product: items[0]?.product ? {
                    ...items[0].product,
                    price: items[0].resellPrice,
                    quantity: items[0].quantity,
                    selectedSize: items[0].selectedSize,
                    selectedColor: items[0].selectedColor
                  } : undefined,
                  subtotal: sub,
                  volumeDiscountAmount: discountAmt,
                  totalPrice: finalTot,
                  totalQuantity: totalQty,
                  autoCashfree: true
                } 
              });
            } else {
              navigate('/checkout/address');
            }
          }}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          cartItems={cartItems}
          onClose={() => navigate(-1)}
          onOrderSuccess={handleOrderSuccess}
        />
      )}

      {/* WhatsApp Share Modal (Still a modal as it's a specific utility) */}
      {whatsappShareProduct && (
        <ShareWhatsAppModal
          product={whatsappShareProduct}
          onClose={() => setWhatsappShareProduct(null)}
        />
      )}

      {/* Footer */}
      {!isProductPage && (
        <footer className="bg-white border-t border-gray-200 mt-16 py-8 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            <p className="font-semibold text-gray-700">Online Shopping Store</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
              <button onClick={() => navigate('/about')} className="hover:text-[#9f2089] font-semibold">About Us</button>
              <button onClick={() => navigate('/contact')} className="hover:text-[#9f2089] font-semibold">Contact</button>
              <button onClick={() => navigate('/terms')} className="hover:text-[#9f2089] font-semibold">Terms</button>
              <button onClick={() => navigate('/refund-policy')} className="hover:text-[#9f2089] font-semibold">Return &amp; Refund</button>
              <button onClick={() => navigate('/shipping-policy')} className="hover:text-[#9f2089] font-semibold">Shipping</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-[#9f2089] font-semibold">Privacy</button>
            </div>
            <p>© {new Date().getFullYear()} All rights reserved.</p>
          </div>
        </footer>
      )}
      {/* Bottom Sheets for Filtering */}
      <BottomSheet 
        isOpen={activeSheet === 'sort'} 
        onClose={() => setActiveSheet(null)} 
        title="Sort By"
      >
        <div className="flex flex-col">
          {[
            { id: 'default', label: 'In Line Order (Catalogue Sequence)' },
            { id: 'price-low', label: 'Price (Low to High)' },
            { id: 'price-high', label: 'Price (High to Low)' },
            { id: 'rating', label: 'Ratings (High to Low)' },
            { id: 'new_arrivals', label: 'New Arrivals' }
          ].map(opt => (
            <button 
              key={opt.id} 
              onClick={() => { setSortBy(opt.id); setActiveSheet(null); }}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <span className={`text-[14px] ${sortBy === opt.id ? 'font-bold text-[#9f2089]' : 'font-medium text-gray-700'}`}>
                {opt.label}
              </span>
              {sortBy === opt.id && <Check className="w-5 h-5 text-[#9f2089]" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet 
        isOpen={activeSheet === 'category'} 
        onClose={() => setActiveSheet(null)} 
        title="Category"
        onClear={() => setTempCategory('all')}
        onApply={() => { setSelectedCategory(tempCategory); setActiveSheet(null); }}
      >
        <div className="flex flex-col">
          {categories.map(cat => (
            <label key={cat.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 cursor-pointer">
              <input 
                type="radio" 
                name="category_filter"
                checked={tempCategory === cat.id}
                onChange={() => setTempCategory(cat.id)}
                className="w-5 h-5 accent-[#9f2089]"
              />
              <span className="text-[14px] font-medium text-gray-700">{cat.name}</span>
            </label>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet 
        isOpen={activeSheet === 'gender'} 
        onClose={() => setActiveSheet(null)} 
        title="Gender"
        onClear={() => setTempGender('all')}
        onApply={() => { setSelectedGender(tempGender); setActiveSheet(null); }}
      >
        <div className="flex flex-col">
          {['all', 'Men', 'Women', 'Boys', 'Girls'].map(gender => (
            <label key={gender} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 cursor-pointer">
              <input 
                type="radio" 
                name="gender_filter"
                checked={tempGender === gender}
                onChange={() => setTempGender(gender)}
                className="w-5 h-5 accent-[#9f2089]"
              />
              <span className="text-[14px] font-medium text-gray-700">{gender === 'all' ? 'All Genders' : gender}</span>
            </label>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet 
        isOpen={activeSheet === 'filters'} 
        onClose={() => setActiveSheet(null)} 
        title="Filters"
        onClear={() => { setTempSortBy('popular'); setTempCategory('all'); setTempGender('all'); }}
        onApply={() => { 
          setSortBy(tempSortBy);
          setSelectedCategory(tempCategory);
          setSelectedGender(tempGender);
          setActiveSheet(null);
        }}
      >
        <div className="flex flex-col space-y-6">
          <div>
            <h4 className="font-bold text-gray-900 mb-3 text-[15px]">Category</h4>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 6).map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setTempCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${tempCategory === cat.id ? 'bg-[#fdf2f9] border-[#9f2089] text-[#9f2089]' : 'bg-white border-gray-300 text-gray-600'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-3 text-[15px]">Gender</h4>
            <div className="flex flex-wrap gap-2">
              {['all', 'Men', 'Women', 'Boys', 'Girls'].map(gender => (
                <button 
                  key={gender}
                  onClick={() => setTempGender(gender)}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${tempGender === gender ? 'bg-[#fdf2f9] border-[#9f2089] text-[#9f2089]' : 'bg-white border-gray-300 text-gray-600'}`}
                >
                  {gender === 'all' ? 'All' : gender}
                </button>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

    </div>
  );
}
