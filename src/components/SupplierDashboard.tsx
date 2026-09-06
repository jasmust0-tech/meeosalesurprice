import React, { useState } from 'react';
import { PlusCircle, Store, CheckCircle, Trash2, FolderPlus, Tag } from 'lucide-react';

interface SupplierDashboardProps {
  onProductAdded: () => void;
  categories: { id: string; name: string; image?: string; icon?: string }[];
  onCategoryChanged: () => void;
}

export function SupplierDashboard({ onProductAdded, categories, onCategoryChanged }: SupplierDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'product' | 'categories'>('product');

  // Product form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || 'grocery');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [suggestedResellPrice, setSuggestedResellPrice] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [sizes, setSizes] = useState('S, M, L, XL, XXL');
  const [colors, setColors] = useState('Red, Blue, Black');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Category form states
  const [catName, setCatName] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catSuccess, setCatSuccess] = useState('');

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !wholesalePrice || !image || !supplierName) {
      alert('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          wholesalePrice: Number(wholesalePrice),
          suggestedResellPrice: Number(suggestedResellPrice) || Number(wholesalePrice) + 200,
          image,
          images: [image],
          description,
          supplierName,
          sizes: sizes.split(',').map(s => s.trim()),
          colors: colors.split(',').map(c => c.trim()),
          inStock: true
        })
      });

      setSuccess(true);
      setTitle('');
      setWholesalePrice('');
      setSuggestedResellPrice('');
      setImage('');
      setDescription('');
      setSupplierName('');
      setTimeout(() => setSuccess(false), 3000);
      onProductAdded();
    } catch (err) {
      console.error(err);
      alert('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) {
      alert('Please enter category name');
      return;
    }
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName,
          image: catImage || 'https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=400',
          icon: 'Tag'
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Failed to add category');
        return;
      }
      setCatName('');
      setCatImage('');
      setCatSuccess('Category added successfully!');
      setTimeout(() => setCatSuccess(''), 3000);
      onCategoryChanged();
    } catch (err) {
      console.error(err);
      alert('Failed to add category');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Are you sure you want to remove this category?')) return;
    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onCategoryChanged();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete category');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white p-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Store className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Supplier & Category Management Hub</h2>
              <p className="text-xs text-rose-100">Add your wholesale products and customize your store categories</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setActiveSubTab('product')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'product'
                  ? 'bg-white text-rose-700 shadow-md'
                  : 'bg-rose-700/60 text-white hover:bg-rose-700'
              }`}
            >
              Add Product
            </button>
            <button
              onClick={() => setActiveSubTab('categories')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'categories'
                  ? 'bg-white text-rose-700 shadow-md'
                  : 'bg-rose-700/60 text-white hover:bg-rose-700'
              }`}
            >
              Manage Categories
            </button>
          </div>
        </div>

        {activeSubTab === 'product' ? (
          <div>
            {success && (
              <div className="m-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2 text-sm font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>Product successfully added to the wholesale catalog!</span>
              </div>
            )}

            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Designer Georgette Saree"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Supplier / Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Surat Textile Hub"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Wholesale Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={wholesalePrice}
                      onChange={(e) => setWholesalePrice(e.target.value)}
                      placeholder="399"
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Suggested Resell (₹)</label>
                    <input
                      type="number"
                      value={suggestedResellPrice}
                      onChange={(e) => setSuggestedResellPrice(e.target.value)}
                      placeholder="649"
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1">Product Image URL *</label>
                  <input
                    type="url"
                    required
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Sizes (comma separated)</label>
                  <input
                    type="text"
                    value={sizes}
                    onChange={(e) => setSizes(e.target.value)}
                    placeholder="S, M, L, XL"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Colors (comma separated)</label>
                  <input
                    type="text"
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    placeholder="Red, Blue, Green"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1">Product Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe fabric, quality, occasion..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>{loading ? 'Publishing Product...' : 'Publish Product to Wholesale Catalog'}</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {catSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2 text-sm font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>{catSuccess}</span>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-rose-600" />
                <span>Add Your Custom Category</span>
              </h3>
              <form onSubmit={handleAddCategory} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="e.g. Mens Wear, Footwear"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Category Image URL</label>
                    <input
                      type="url"
                      value={catImage}
                      onChange={(e) => setCatImage(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </form>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-gray-900 mb-3">Existing Categories (Remove or Keep)</h3>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-xl shadow-xs">
                    <div className="flex items-center gap-3">
                      {cat.image ? (
                        <div className="w-10 h-10 bg-gray-50 rounded-lg p-1 border border-gray-100 flex items-center justify-center shrink-0">
                          <img src={cat.image} alt={cat.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center font-bold shrink-0">
                          {cat.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-bold text-gray-800">{cat.name}</span>
                        <span className="text-[11px] text-gray-400 block">ID: {cat.id}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
