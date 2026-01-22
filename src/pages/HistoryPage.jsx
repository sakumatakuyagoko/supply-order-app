import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOrders, receiveOrder } from '../services/adminApi';
import { fetchProducts } from '../services/api';

// --- Custom Searchable Select Component ---
const SearchableSelect = ({ value, onChange, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Determine displayed options:
    // If the current input matches an option exactly, show ALL options (user wants to switch).
    // Otherwise, show filtered options.
    const displayedOptions = useMemo(() => {
        if (!value) return options;
        if (options.includes(value)) return options;

        const filtered = options.filter(opt =>
            opt.toLowerCase().includes(value.toLowerCase())
        );
        return filtered.length > 0 ? filtered : [];
    }, [value, options]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (opt) => {
        onChange(opt === 'すべて' ? '' : opt);
        setIsOpen(false);
    };

    return (
        <div className="relative text-sm" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-8"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={(e) => {
                        e.target.select();
                        setIsOpen(true);
                    }}
                    onClick={() => setIsOpen(true)}
                />
                {/* Clear 'X' Button (visible if value exists) */}
                {value && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange('');
                            setIsOpen(true);
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}
            </div>

            {/* Dropdown Options */}
            {isOpen && displayedOptions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded mt-1 shadow-lg max-h-60 overflow-auto">
                    {displayedOptions.map((opt, idx) => (
                        <li
                            key={idx}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${opt === value ? 'bg-blue-100 font-bold text-blue-800' : 'text-gray-700'}`}
                            onClick={() => handleSelect(opt)}
                        >
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


const HistoryPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // Default: Pending

    // Filters
    const [filterOrderer, setFilterOrderer] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('');
    const [filterProduct, setFilterProduct] = useState('');

    // Modal & Receive State
    const [modalOrder, setModalOrder] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
    const [expandedOrderIds, setExpandedOrderIds] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ordersData, productsData] = await Promise.all([
                fetchOrders(),
                fetchProducts()
            ]);
            // Defensive checks
            setOrders(Array.isArray(ordersData) ? ordersData : []);
            setProducts(Array.isArray(productsData) ? productsData : []);
        } catch (error) {
            console.error(error);
            setStatusMessage({ type: 'error', text: 'データの取得に失敗しました' });
            setOrders([]);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    // Derived Data for Autocomplete
    // User Request: 'すべて' (All) at the BOTTOM
    const uniqueOrderers = useMemo(() => {
        if (!orders) return [];
        const list = [...new Set(orders.map(o => o?.Orderer).filter(Boolean).filter(x => x !== 'すべて'))];
        return [...list, 'すべて'];
    }, [orders]);

    const uniqueSuppliers = useMemo(() => {
        if (!orders) return [];
        const list = [...new Set(orders.map(o => o?.Supplier).filter(Boolean).filter(x => x !== 'すべて'))];
        return [...list, 'すべて'];
    }, [orders]);

    const uniqueProducts = useMemo(() => {
        if (!products) return [];
        const list = [...new Set(products.map(p => p?.name).filter(Boolean).filter(x => x !== 'すべて'))];
        return [...list, 'すべて'];
    }, [products]);

    // Filtering & Sorting Logic
    useEffect(() => {
        if (!orders) return;
        let result = [...orders];

        // 1. Tab Filter
        if (activeTab === 'pending') {
            result = result.filter(o => o.Status === 'Pending');
        } else if (activeTab === 'received') {
            result = result.filter(o => o.Status === 'Received');
        }

        // 2. Field Filters
        if (filterOrderer && filterOrderer !== 'すべて') {
            result = result.filter(o => String(o.Orderer || '').toLowerCase().includes(filterOrderer.toLowerCase()));
        }
        if (filterSupplier && filterSupplier !== 'すべて') {
            result = result.filter(o => String(o.Supplier || '').toLowerCase().includes(filterSupplier.toLowerCase()));
        }
        if (filterProduct && filterProduct !== 'すべて') {
            result = result.filter(o => String(o.ProductName || '').toLowerCase().includes(filterProduct.toLowerCase()));
        }

        // 3. Sorting
        result.sort((a, b) => {
            const dateA = new Date(a.Date);
            const dateB = new Date(b.Date);

            if (activeTab === 'pending') {
                // Urgent first
                const isUrgentA = String(a.IsUrgent) === 'true' || a.IsUrgent === true || String(a.IsUrgent) === 'TRUE';
                const isUrgentB = String(b.IsUrgent) === 'true' || b.IsUrgent === true || String(b.IsUrgent) === 'TRUE';
                if (isUrgentA !== isUrgentB) return isUrgentB ? 1 : -1;
                return dateA - dateB;
            } else if (activeTab === 'received') {
                // ReceivedDate Desc
                const rDateA = a.ReceivedAt ? new Date(a.ReceivedAt) : dateA;
                const rDateB = b.ReceivedAt ? new Date(b.ReceivedAt) : dateB;
                return rDateB - rDateA;
            } else {
                // All: Date Desc
                return dateB - dateA;
            }
        });

        setFilteredOrders(result);
    }, [orders, activeTab, filterOrderer, filterSupplier, filterProduct]);

    // Grouping
    const groupedList = useMemo(() => {
        const groups = {};
        if (!filteredOrders) return [];

        filteredOrders.forEach(item => {
            if (!item || !item.OrderId) return;

            if (!groups[item.OrderId]) {
                const d = new Date(item.Date);
                groups[item.OrderId] = {
                    id: item.OrderId,
                    date: isNaN(d) ? 'No Date' : d.toLocaleDateString(),
                    receivedAt: item.ReceivedAt ? new Date(item.ReceivedAt) : null,
                    supplier: item.Supplier || 'Unknown',
                    orderer: item.Orderer || 'Unknown',
                    status: 'Mixed',
                    isUrgent: false,
                    items: []
                };
            }
            // Check urgency bubble up
            const isUrgent = String(item.IsUrgent) === 'true' || item.IsUrgent === true || String(item.IsUrgent) === 'TRUE';
            if (isUrgent) {
                groups[item.OrderId].isUrgent = true;
            }

            // Find product price & image
            const product = products.find(p => p.name === item.ProductName);
            const price = product ? parseInt(product.price) || 0 : 0;
            const image = product ? product.image : null;

            groups[item.OrderId].items.push({
                ...item,
                price: price,
                image: image,
                total: price * (parseInt(item.Quantity) || 0)
            });
        });

        const list = Object.values(groups);

        // Determine group status
        list.forEach(group => {
            const allReceived = group.items.every(i => i.Status === 'Received');
            const noneReceived = group.items.every(i => i.Status === 'Pending');
            if (allReceived) group.status = 'Received';
            else if (noneReceived) group.status = 'Pending';
            else group.status = 'Partial';
        });

        // Re-Apply Sort on Groups
        list.sort((a, b) => {
            if (activeTab === 'pending') {
                if (a.isUrgent !== b.isUrgent) return b.isUrgent ? 1 : -1;
                // Basic string compare for dates if using formatted strings, assuming YYYY/MM/DD logic or similar order
                return a.date.localeCompare(b.date);
            } else if (activeTab === 'received') {
                const tA = a.receivedAt ? a.receivedAt.getTime() : 0;
                const tB = b.receivedAt ? b.receivedAt.getTime() : 0;
                return tB - tA; // Descending
            } else {
                return b.id.localeCompare(a.id);
            }
        });

        return list;
    }, [filteredOrders, products, activeTab]);

    // Monthly Total Calculation
    const monthlyTotal = useMemo(() => {
        if (activeTab !== 'received') return 0;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let total = 0;
        groupedList.forEach(group => {
            const dateToCheck = group.receivedAt || new Date(group.date);
            if (dateToCheck instanceof Date && !isNaN(dateToCheck) &&
                dateToCheck.getFullYear() === currentYear &&
                dateToCheck.getMonth() === currentMonth) {
                group.items.forEach(item => total += item.total);
            }
        });
        return total;
    }, [groupedList, activeTab]);


    // Actions
    const handleReceiveClick = (group) => {
        const pendingItems = group.items.filter(i => i.Status === 'Pending');
        if (pendingItems.length === 0) return;

        if (pendingItems.length > 1) {
            setModalOrder(group);
            setSelectedItems([]);
        } else {
            if (window.confirm(`${pendingItems[0].ProductName} を納入済にしますか？`)) {
                executeReceive(group.id, null);
            }
        }
    };

    const executeReceive = async (orderId, itemsToReceive) => {
        try {
            const result = await receiveOrder(orderId, itemsToReceive);
            if (result.success) {
                setStatusMessage({ type: 'success', text: '納入処理が完了しました' });
                setModalOrder(null);
                loadData();
            } else {
                setStatusMessage({ type: 'error', text: 'エラー: ' + result.message });
            }
        } catch (e) {
            setStatusMessage({ type: 'error', text: '通信エラーが発生しました' });
        }
    };

    const toggleItemSelection = (productName) => {
        if (selectedItems.includes(productName)) {
            setSelectedItems(selectedItems.filter(i => i !== productName));
        } else {
            setSelectedItems([...selectedItems, productName]);
        }
    };

    const clearFilters = () => {
        setFilterOrderer('');
        setFilterSupplier('');
        setFilterProduct('');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-amber-500 text-white p-4 shadow-md sticky top-0 z-10">
                <div className="container mx-auto max-w-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-1.5 bg-amber-600 rounded-full hover:bg-amber-700 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        </button>
                        <h1 className="text-lg font-bold">発注・納入履歴</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 max-w-lg">
                {statusMessage.text && (
                    <div className={`mb-4 p-3 rounded-lg text-sm font-bold ${statusMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {statusMessage.text}
                    </div>
                )}

                {/* TABS (Order: Pending, Received, All) */}
                <div className="flex bg-white rounded-lg p-1 shadow-sm mb-4">
                    <button onClick={() => setActiveTab('pending')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'pending' ? 'bg-red-100 text-red-700' : 'text-gray-500'}`}>未納入</button>
                    <button onClick={() => setActiveTab('received')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'received' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>納入済</button>
                    <button onClick={() => setActiveTab('all')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}>すべて</button>
                </div>

                {/* MONTHLY TOTAL */}
                {activeTab === 'received' && (
                    <div className="mb-4 bg-green-500 text-white p-4 rounded-xl shadow-sm text-center">
                        <div className="text-xs opacity-80">今月の購入金額合計</div>
                        <div className="text-2xl font-bold">¥{monthlyTotal.toLocaleString()}</div>
                    </div>
                )}

                {/* FILTERS */}
                <div className="bg-white p-4 rounded-xl shadow-sm mb-6 space-y-3 relative">
                    <div className="flex justify-between items-center mb-1">
                        <div className="text-xs font-bold text-gray-500">絞り込み検索</div>
                        {(filterOrderer || filterSupplier || filterProduct) && (
                            <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-800 underline">
                                条件をクリア
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <SearchableSelect
                                value={filterOrderer}
                                onChange={setFilterOrderer}
                                options={uniqueOrderers}
                                placeholder="発注者"
                            />
                        </div>
                        <div>
                            <SearchableSelect
                                value={filterSupplier}
                                onChange={setFilterSupplier}
                                options={uniqueSuppliers}
                                placeholder="業者"
                            />
                        </div>
                    </div>
                    <div>
                        <SearchableSelect
                            value={filterProduct}
                            onChange={setFilterProduct}
                            options={uniqueProducts}
                            placeholder="商品名"
                        />
                    </div>
                </div>

                {/* LIST */}
                {loading ? <div className="text-center text-gray-400 py-10">読み込み中...</div> :
                    groupedList.length === 0 ? <div className="text-center text-gray-400 py-10">該当データなし</div> :
                        <div className="space-y-4">
                            {groupedList.map(group => (
                                <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                                    {/* URGENT INDICATOR - Simplified style */}
                                    {group.isUrgent && (
                                        <div className="absolute top-0 left-0 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-br-lg font-bold z-10 shadow-sm opacity-90">至急</div>
                                    )}

                                    <div className="p-3">
                                        {/* TOP ROW */}
                                        <div className="flex justify-between items-start mb-2 pt-1">
                                            <div>
                                                <div className="text-[10px] text-gray-400 font-mono mb-1">{group.id}</div>
                                                <div className="text-xl font-bold text-blue-800">{group.orderer}</div>
                                            </div>
                                            <div className="text-right">
                                                {/* Safe Date Display */}
                                                <div className="text-sm font-bold text-gray-600 mb-1">
                                                    {group.receivedAt ? `納入: ${group.receivedAt.toLocaleDateString()}` : `発注: ${group.date}`}
                                                </div>
                                                <div className="text-xs text-gray-500">{group.supplier}</div>
                                            </div>
                                        </div>

                                        {/* ITEMS LIST */}
                                        <div className="space-y-2 mb-3 bg-gray-50 p-2 rounded border border-gray-100">
                                            {group.items.map((item, idx) => (
                                                <div key={idx} className="flex items-start gap-3 text-sm">
                                                    {/* Image */}
                                                    <div className="w-10 h-10 flex-shrink-0 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden p-0.5 mt-0.5">
                                                        {item.image ? <img src={item.image} alt="" className="w-full h-full object-contain" /> : <span className="text-[8px] text-gray-300">No Img</span>}
                                                    </div>

                                                    <div className="flex-grow min-w-0">
                                                        <div className="font-bold text-gray-800 leading-tight mb-1">{item.ProductName || '不明な商品'}</div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-mono text-gray-600 text-xs">x{item.Quantity || 0} {item.Unit || '個'}</span>
                                                            {item.Status === 'Received'
                                                                ? <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">済</span>
                                                                : <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded">未</span>
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* ACTIONS */}
                                        {(group.status === 'Pending' || group.status === 'Partial') ? (
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                                                <div className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">未納入</div>
                                                <button
                                                    onClick={() => handleReceiveClick(group)}
                                                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 transition flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    納入受付
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end pt-2 border-t border-gray-100 mt-2">
                                                <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    納入完了
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                }
            </main>

            {/* PARTIAL RECEIVE MODAL */}
            {modalOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="bg-green-600 text-white p-4 font-bold text-lg">受入確認</div>
                        <div className="p-4">
                            <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto mb-4 border border-gray-200 space-y-2">
                                {modalOrder.items.filter(i => i.Status === 'Pending').map((item, idx) => (
                                    <label key={idx} className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200 cursor-pointer">
                                        <input type="checkbox" className="w-5 h-5 text-green-600 rounded"
                                            checked={selectedItems.includes(item.ProductName)}
                                            onChange={() => toggleItemSelection(item.ProductName)}
                                        />
                                        <span className="text-sm font-bold flex-grow">{item.ProductName}</span>
                                        <span className="text-sm text-gray-500">x{item.Quantity}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => selectedItems.length === 0 && executeReceive(modalOrder.id, null)}
                                    disabled={selectedItems.length > 0}
                                    className={`w-full font-bold py-3 rounded-lg ${selectedItems.length > 0 ? 'bg-gray-300 text-gray-400' : 'bg-green-600 text-white'}`}
                                >
                                    全点受入 (一括)
                                </button>
                                {selectedItems.length > 0 && (
                                    <button onClick={() => executeReceive(modalOrder.id, selectedItems)} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg">
                                        選択アイテムのみ受入
                                    </button>
                                )}
                                <button onClick={() => setModalOrder(null)} className="w-full bg-gray-200 text-gray-700 font-bold py-3 rounded-lg">キャンセル</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
