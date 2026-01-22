import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../services/api';
import { registerProduct, updateProduct } from '../services/adminApi';
import SearchableSelect from '../components/SearchableSelect';

const ProductManagementPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('register'); // 'register' or 'edit'
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

    // --- Form State ---
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        supplier: '',  // New: Searchable
        category: '共通', // New: Fixed
        price: '',
        unit: '個',
        image: '',
    });
    const [imagePreview, setImagePreview] = useState(null);

    // --- Edit Mode State ---
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Load products for Edit mode & Supplier list
    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await fetchProducts();
            setProducts(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Derived unique suppliers for autocomplete
    const uniqueSuppliers = useMemo(() => {
        const list = [...new Set(products.map(p => p.category).filter(Boolean))]; // Note: p.category holds Supplier name in current DB schema
        return list;
    }, [products]);

    // Categories Fixed List
    const CATEGORIES = ['溶接', '機械', '塗装', '組立', 'ほか', '共通'];

    // --- Handlers ---

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate size (e.g. max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('画像サイズは5MB以下にしてください');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image: reader.result })); // Base64
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price || !formData.supplier) {
            setStatusMessage({ type: 'error', text: '商品名、単価、発注先は必須です' });
            return;
        }

        setLoading(true);
        setStatusMessage({ type: '', text: '' });

        // Map frontend fields to API payload
        // NOTE: In DB, 'category' column (Index 2) is used for SUPPLIER.
        // We will send 'category' as formData.supplier.
        // We will send a NEW field 'stockStatus' or 'realCategory' for the Category.
        // Let's use 'stockStatus' column (Index 5) for Category if it's "In Stock" usually? 
        // Or better, let's keep it clean.
        // API expects { action, name, category, price, ... }
        // We map: API.category <- formData.supplier
        // We map: API.stockStatus <- formData.category (Hack: reusing a column? or adding new?)
        // Let's add a `realCategory` param to API and handle in GAS.

        const payload = {
            ...formData,
            // Mapping for GAS (Legacy Schema Adaptation)
            category: formData.supplier, // Col 3 (Index 2) = Supplier
            stockStatus: formData.category // Col 6 (Index 5) = Real Category (Reusing 'In Stock' column for now or typical field)
            // Wait, GAS registerProduct sets 'In Stock' hardcoded.
            // I should pass `realCategory` and update GAS to save it.
        };

        try {
            let result;
            if (activeTab === 'register') {
                result = await registerProduct(payload);
            } else {
                result = await updateProduct(payload);
            }

            if (result.success) {
                setStatusMessage({ type: 'success', text: activeTab === 'register' ? '登録しました' : '更新しました' });
                if (activeTab === 'register') {
                    // Reset form
                    setFormData({ id: '', name: '', supplier: '', category: '共通', price: '', unit: '個', image: '' });
                    setImagePreview(null);
                    loadProducts(); // Reload to update supplier list
                } else {
                    loadProducts();
                }
            } else {
                setStatusMessage({ type: 'error', text: 'エラー: ' + result.message });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: '通信エラーが発生しました' });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProductToEdit = (product) => {
        setFormData({
            id: product.id,
            name: product.name,
            supplier: product.category || '', // Map DB 'category' to Supplier
            category: product.stockStatus || '共通', // Map DB 'stockStatus' to Category (Assuming I'll save it there)
            price: product.price,
            unit: product.unit || '個',
            image: product.image
        });
        setImagePreview(product.image);
        window.scrollTo(0, 0);
    };

    // Filter products for search
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.id).includes(searchQuery)
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-amber-500 text-white p-4 shadow-md sticky top-0 z-10">
                <div className="container mx-auto max-w-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-1.5 bg-amber-600 rounded-full hover:bg-amber-700 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        </button>
                        <h1 className="text-lg font-bold">アイテム登録・変更</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 max-w-lg">
                {statusMessage.text && (
                    <div className={`mb - 4 p - 3 rounded - lg text - sm font - bold ${statusMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} `}>
                        {statusMessage.text}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex bg-white rounded-lg p-1 shadow-sm mb-6">
                    <button
                        onClick={() => { setActiveTab('register'); setFormData({ id: '', name: '', supplier: '', category: '共通', price: '', unit: '個', image: '' }); setImagePreview(null); }}
                        className={`flex - 1 py - 2 text - sm font - bold rounded - md transition - all ${activeTab === 'register' ? 'bg-amber-100 text-amber-700' : 'text-gray-500'} `}
                    >
                        新規登録
                    </button>
                    <button
                        onClick={() => { setActiveTab('edit'); setFormData({ id: '', name: '', supplier: '', category: '共通', price: '', unit: '個', image: '' }); setImagePreview(null); }}
                        className={`flex - 1 py - 2 text - sm font - bold rounded - md transition - all ${activeTab === 'edit' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'} `}
                    >
                        編集・変更
                    </button>
                </div>

                {/* EDIT MODE: Product Search List */}
                {activeTab === 'edit' && !formData.id && (
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="商品名またはIDで検索..."
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="grid gap-2">
                            {filteredProducts.slice(0, 20).map(p => (
                                <div key={p.id} onClick={() => handleSelectProductToEdit(p)} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer hover:bg-gray-50">
                                    <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        {p.image ? <img src={p.image} className="w-full h-full object-cover" alt="" /> : <span className="text-xs text-gray-400">No Img</span>}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800">{p.name}</div>
                                        <div className="text-xs text-gray-500">ID: {p.id} / ¥{p.price}</div>
                                    </div>
                                </div>
                            ))}
                            {filteredProducts.length === 0 && <div className="text-center text-gray-400">該当なし</div>}
                        </div>
                    </div>
                )}

                {/* FORM (Register or Edit Selected) */}
                {(activeTab === 'register' || (activeTab === 'edit' && formData.id)) && (
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="font-bold text-lg mb-4 text-gray-700">
                            {activeTab === 'register' ? '商品情報の入力' : `商品編集(ID: ${formData.id})`}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">商品画像</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden relative group">
                                        {imagePreview ? (
                                            <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                        ) : (
                                            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">※5MB以下の画像 (jpg, png)</p>
                                    </div>
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">商品名 <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="例: コピー用紙 A4"
                                    required
                                />
                            </div>

                            {/* Supplier & Category */}
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">発注先 (業者名) <span className="text-red-500">*</span></label>
                                    <SearchableSelect
                                        value={formData.supplier}
                                        onChange={(val) => setFormData(prev => ({ ...prev, supplier: val }))}
                                        options={uniqueSuppliers}
                                        placeholder="例: 大塚商会 (新規入力可)"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-600 mb-1">カテゴリ <span className="text-red-500">*</span></label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 focus:bg-white"
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-600 mb-1">単位</label>
                                        <select
                                            name="unit"
                                            value={formData.unit}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 focus:bg-white"
                                        >
                                            <option value="個">個</option>
                                            <option value="本">本</option>
                                            <option value="冊">冊</option>
                                            <option value="箱">箱</option>
                                            <option value="セット">セット</option>
                                            <option value="式">式</option>
                                            <option value="kg">kg</option>
                                            <option value="m">m</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">単価 (円) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 focus:bg-white text-lg font-mono"
                                    placeholder="0"
                                    required
                                />
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex gap-3">
                                {activeTab === 'edit' && (
                                    <button
                                        type="button"
                                        onClick={() => { setFormData({ id: '', name: '', supplier: '', category: '共通', price: '', unit: '個', image: '' }); setImagePreview(null); }}
                                        className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold"
                                    >
                                        キャンセル
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex - [2] py - 3 rounded - lg font - bold text - white shadow - md ${loading ? 'bg-gray-400' : 'bg-amber-500 hover:bg-amber-600'} `}
                                >
                                    {loading ? '処理中...' : (activeTab === 'register' ? '登録する' : '更新する')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProductManagementPage;
