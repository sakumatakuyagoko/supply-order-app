import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOrders, receiveOrder } from '../services/adminApi';
import { fetchProducts } from '../services/api';

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
            setOrders(ordersData);
            setProducts(productsData);
        } catch (error) {
            console.error(error);
            setStatusMessage({ type: 'error', text: 'データの取得に失敗しました' });
        } finally {
            setLoading(false);
        }
    };

    // Derived Data for Autocomplete
    const uniqueOrderers = useMemo(() => [...new Set(orders.map(o => o.Orderer).filter(Boolean))], [orders]);
    const uniqueSuppliers = useMemo(() => [...new Set(orders.map(o => o.Supplier).filter(Boolean))], [orders]);
    const uniqueProducts = useMemo(() => products.map(p => p.name), [products]);

    // Filtering & Sorting Logic
    useEffect(() => {
        let result = [...orders];

        // 1. Tab Filter
        if (activeTab === 'pending') {
            result = result.filter(o => o.Status === 'Pending');
        } else if (activeTab === 'received') {
            result = result.filter(o => o.Status === 'Received');
        }

        // 2. Field Filters
        if (filterOrderer) {
            result = result.filter(o => String(o.Orderer).toLowerCase().includes(filterOrderer.toLowerCase()));
        }
        if (filterSupplier) {
            result = result.filter(o => String(o.Supplier).toLowerCase().includes(filterSupplier.toLowerCase()));
        }
        if (filterProduct) {
            result = result.filter(o => String(o.ProductName).toLowerCase().includes(filterProduct.toLowerCase()));
        }

        // 3. Sorting
        result.sort((a, b) => {
            if (activeTab === 'pending') {
                // Urgent first, then Oldest Date first
                const isUrgentA = a.IsUrgent === true || a.IsUrgent === 'TRUE';
                const isUrgentB = b.IsUrgent === true || b.IsUrgent === 'TRUE';
                if (isUrgentA !== isUrgentB) return isUrgentB ? 1 : -1;
                return new Date(a.Date) - new Date(b.Date);
            } else if (activeTab === 'received') {
                // ReceivedDate Desc (fallback to Date if missing)
                const dateA = a.ReceivedAt ? new Date(a.ReceivedAt) : new Date(a.Date);
                const dateB = b.ReceivedAt ? new Date(b.ReceivedAt) : new Date(b.Date);
                return dateB - dateA;
            } else {
                // All: Date Desc
                return new Date(b.Date) - new Date(a.Date);
            }
        });

        setFilteredOrders(result);
    }, [orders, activeTab, filterOrderer, filterSupplier, filterProduct]);

    // Grouping
    const groupedList = useMemo(() => {
        const groups = {};
        filteredOrders.forEach(item => {
            if (!groups[item.OrderId]) {
                groups[item.OrderId] = {
                    id: item.OrderId,
                    date: new Date(item.Date).toLocaleDateString(),
                    receivedAt: item.ReceivedAt ? new Date(item.ReceivedAt) : null,
                    supplier: item.Supplier,
                    orderer: item.Orderer,
                    status: 'Mixed',
                    isUrgent: false,
                    items: []
                };
            }
            // Check urgency bubble up
            if (item.IsUrgent === true || item.IsUrgent === 'TRUE') {
                groups[item.OrderId].isUrgent = true;
            }

            // Find product price
            const product = products.find(p => p.name === item.ProductName);
            const price = product ? parseInt(product.price) || 0 : 0;

            groups[item.OrderId].items.push({
                ...item,
                price: price,
                total: price * item.Quantity
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

        // Re-Apply Sort on Groups (since grouping flattens the list)
        // Note: The raw list was already sorted, so groups should roughly follow, but strict sort on Group leader is better.
        list.sort((a, b) => {
            if (activeTab === 'pending') {
                if (a.isUrgent !== b.isUrgent) return b.isUrgent ? 1 : -1;
                return new Date(a.date) - new Date(b.date); // Use string compare if formatted, usually better to store raw date... but let's assume 'date' is string now
            } else if (activeTab === 'received') {
                // Use raw timestamps from items if avail
                const tA = a.receivedAt ? a.receivedAt.getTime() : 0;
                const tB = b.receivedAt ? b.receivedAt.getTime() : 0;
                return tB - tA;
            } else {
                return b.id.localeCompare(a.id); // Fallback sort for 'All' by ID descending (proxy for time)
            }
        });

        return list;
    }, [filteredOrders, products, activeTab]);

    // Monthly Total Calculation (for Received tab)
    const monthlyTotal = useMemo(() => {
        if (activeTab !== 'received') return 0;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let total = 0;
        groupedList.forEach(group => {
            // Check if group's received date is this month
            // If group doesn't have receivedAt, fallback to Date? User asked for 'This month's purchase total'.
            // Prefer ReceivedAt.
            const dateToCheck = group.receivedAt || new Date(group.date);
            if (dateToCheck.getFullYear() === currentYear && dateToCheck.getMonth() === currentMonth) {
                group.items.forEach(item => total += item.total);
            }
        });
        return total;
    }, [groupedList, activeTab]);


    // Actions
    const handleReceiveClick = (group) => {
        // Filter only pending items
        const pendingItems = group.items.filter(i => i.Status === 'Pending');
        if (pendingItems.length === 0) return;

        if (pendingItems.length > 1) {
            setModalOrder(group); // Re-use group object carefully
            setSelectedItems([]);
        } else {
            if (window.confirm(`${pendingItems[0].ProductName} を納入済にしますか？`)) {
                executeReceive(group.id, null); // Receive ALL (since only 1 pending) or specific? Using null implies 'receive all remaining' in my previous logic, which is fine for single item.
            }
        }
    };

    const executeReceive = async (orderId, itemsToReceive) => {
        // Optimistic UI updates are harder here with full reload, so we might just reloadData()
        try {
            const result = await receiveOrder(orderId, itemsToReceive);
            if (result.success) {
                setStatusMessage({ type: 'success', text: '納入処理が完了しました' });
                setModalOrder(null);
                loadData(); // Reload to refresh statuses
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

    const toggleExpand = (id) => {
        if (expandedOrderIds.includes(id)) setExpandedOrderIds(expandedOrderIds.filter(e => e !== id));
        else setExpandedOrderIds([...expandedOrderIds, id]);
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
                <div className="container mx-auto max-w-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-1.5 bg-blue-700 rounded-full hover:bg-blue-800 transition-colors">
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

                {/* TABS */}
                <div className="flex bg-white rounded-lg p-1 shadow-sm mb-4">
                    <button onClick={() => setActiveTab('pending')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'pending' ? 'bg-red-100 text-red-700' : 'text-gray-500'}`}>未納入</button>
                    <button onClick={() => setActiveTab('received')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'received' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>納入済</button>
                    <button onClick={() => setActiveTab('all')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}>すべて</button>
                </div>

                {/* MONTHLY TOTAL (RECEIVED ONLY) */}
                {activeTab === 'received' && (
                    <div className="mb-4 bg-green-500 text-white p-4 rounded-xl shadow-sm text-center">
                        <div className="text-xs opacity-80">今月の購入金額合計</div>
                        <div className="text-2xl font-bold">¥{monthlyTotal.toLocaleString()}</div>
                    </div>
                )}

                {/* FILTERS */}
                <div className="bg-white p-4 rounded-xl shadow-sm mb-6 space-y-3">
                    <div className="text-xs font-bold text-gray-500 mb-1">絞り込み検索</div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <input list="orderers" placeholder="発注者" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={filterOrderer} onChange={e => setFilterOrderer(e.target.value)} />
                            <datalist id="orderers">{uniqueOrderers.map(x => <option key={x} value={x} />)}</datalist>
                        </div>
                        <div>
                            <input list="suppliers" placeholder="業者" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} />
                            <datalist id="suppliers">{uniqueSuppliers.map(x => <option key={x} value={x} />)}</datalist>
                        </div>
                    </div>
                    <div>
                        <input list="products" placeholder="商品名" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={filterProduct} onChange={e => setFilterProduct(e.target.value)} />
                        <datalist id="products">{uniqueProducts.map(x => <option key={x} value={x} />)}</datalist>
                    </div>
                </div>

                {/* LIST */}
                {loading ? <div className="text-center text-gray-400 py-10">読み込み中...</div> :
                    groupedList.length === 0 ? <div className="text-center text-gray-400 py-10">該当データなし</div> :
                        <div className="space-y-4">
                            {groupedList.map(group => (
                                <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                                    {/* URGENT INDICATOR */}
                                    {group.isUrgent && (
                                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold z-10">至急</div>
                                    )}

                                    <div className="p-3">
                                        {/* TOP ROW */}
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-[10px] text-gray-400 font-mono">{group.id}</div>
                                                <div className="text-lg font-bold text-blue-700">{group.orderer}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-gray-400">{group.date}</div>
                                                <div className="text-sm font-bold text-gray-600 truncate max-w-[120px]">{group.supplier}</div>
                                            </div>
                                        </div>

                                        {/* ITEMS PREVIEW (Show all for now, concise) */}
                                        <div className="space-y-2 mb-3 bg-gray-50 p-2 rounded border border-gray-100">
                                            {group.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <div className="font-bold text-gray-800 truncate flex-grow mr-2">{item.ProductName}</div>
                                                    <div className="whitespace-nowrap flex items-center gap-2">
                                                        <span className="font-mono text-gray-600">x{item.Quantity} {item.Unit}</span>
                                                        {item.Status === 'Received'
                                                            ? <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">済</span>
                                                            : <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded">未</span>
                                                        }
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* ACTIONS */}
                                        <div className="flex justify-between items-center">
                                            <div className={`text-xs px-2 py-1 rounded font-bold ${group.status === 'Received' ? 'bg-green-100 text-green-800' :
                                                    group.status === 'Pending' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {group.status === 'Received' ? '納入完了' : group.status === 'Pending' ? '未納入' : '一部納入'}
                                            </div>

                                            {(group.status === 'Pending' || group.status === 'Partial') && (
                                                <button
                                                    onClick={() => handleReceiveClick(group)}
                                                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 transition"
                                                >
                                                    納入受付する
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                }
            </main>

            {/* PARTIAL RECEIVE MODAL (Copied Logic) */}
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
