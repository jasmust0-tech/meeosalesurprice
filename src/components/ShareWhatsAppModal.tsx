import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { X, Sparkles, Copy, Check, Send } from 'lucide-react';

interface ShareWhatsAppModalProps {
  product: Product;
  onClose: () => void;
}

export function ShareWhatsAppModal({ product, onClose }: ShareWhatsAppModalProps) {
  const [resellPrice, setResellPrice] = useState(product.suggestedResellPrice);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const profit = resellPrice - product.wholesalePrice;

  useEffect(() => {
    generateAICaption(resellPrice);
  }, []);

  async function generateAICaption(price: number) {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title,
          wholesalePrice: product.wholesalePrice,
          resellPrice: price,
          description: product.description
        })
      });
      const data = await res.json();
      setCaption(data.caption);
    } catch (err) {
      setCaption(`✨ *${product.title}* ✨\n\n${product.description}\n\n💰 *Price:* ₹${price}/-\n🚚 *Free Delivery & Cash on Delivery Available!*\n\n👇 DM to book your order now!`);
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(caption);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-xl">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">WhatsApp Share & Earn</h3>
              <p className="text-xs text-emerald-100">Send to your WhatsApp groups & status</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-emerald-700 rounded-full text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <img src={product.image} alt="" className="w-16 h-16 object-cover rounded-lg" referrerPolicy="no-referrer" />
            <div>
              <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{product.title}</h4>
              <p className="text-xs text-gray-500">Wholesale: ₹{product.wholesalePrice}</p>
              <div className="text-xs font-bold text-emerald-600 mt-1">Your Profit: +₹{Math.max(0, profit)}</div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Set Your Resell Price (₹):</label>
            <input
              type="number"
              value={resellPrice}
              onChange={(e) => {
                const val = Number(e.target.value);
                setResellPrice(val);
                generateAICaption(val);
              }}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700">Generated WhatsApp Message:</label>
              {loading && <span className="text-xs text-emerald-600 animate-pulse">Generating AI Caption...</span>}
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-xs text-gray-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleCopy}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>Share to WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
