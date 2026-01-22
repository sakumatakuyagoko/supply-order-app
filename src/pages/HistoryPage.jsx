import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOrders } from '../services/adminApi';

const HistoryPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'received', 'pending'
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedOrderIds, setExpandedOrderIds] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchOrders();
            // Sort by Date Descending
            const sorted = data.sort((a, b) => new Date(b.Date) - new Date(a.Date));
            setOrders(sorted);
            applyFilters(sorted, activeTab, searchTerm);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        applyFilters(orders, activeTab, searchTerm);
    }, [activeTab, searchTerm, orders]);

    const applyFilters = (sourceData, tab, term) => {
        let result = sourceData;

        // Tab Filter
        if (tab === 'received') {
            result = result.filter(o => o.Status === 'Received');
        } else if (tab === 'pending') {
            result = result.filter(o => o.Status === 'Pending');
        }

        // Search Filter
        if (term) {
            const lowerTerm = term.toLowerCase().replace('ord-', '').trim();
            result = result.filter(item => {
                const id = String(item.OrderId).toLowerCase().replace('ord-', '');
                const supplier = String(item.Supplier).toLowerCase();
                const orderer = String(item.Orderer).toLowerCase();
                const productName = String(item.ProductName).toLowerCase();
                return id.includes(lowerTerm) ||
                    supplier.includes(lowerTerm) ||
                    orderer.includes(lowerTerm) ||
                    productName.includes(lowerTerm);
            });
        }

        setFilteredOrders(result);
    };

    const toggleExpand = (orderId) => {
        if (expandedOrderIds.includes(orderId)) {
            setExpandedOrderIds(expandedOrderIds.filter(id => id !== orderId));
        } else {
            setExpandedOrderIds([...expandedOrderIds, orderId]);
        }
    };

    // Grouping for Display
    const groupOrders = (flatOrders) => {
        const groups = {};
        flatOrders.forEach(item => {
            if (!groups[item.OrderId]) {
                groups[item.OrderId] = {
                    id: item.OrderId,
                    date: new Date(item.Date).toLocaleDateString(),
                    supplier: item.Supplier,
                    orderer: item.Orderer,
                    status: 'Mixed', // Initial
                    items: []
                };
            }
            groups[item.OrderId].items.push(item);
        });

        // Determine group status (Received if ALL items received, else Pending or Partial)
        Object.values(groups).forEach(group => {
            const allReceived = group.items.every(i => i.Status === 'Received');
            const noneReceived = group.items.every(i => i.Status === 'Pending');
            if (allReceived) group.status = 'Received';
            else if (noneReceived) group.status = 'Pending';
            else group.status = 'Partial';
        });

        return Object.values(groups);
    };

    const groupedList = groupOrders(filteredOrders);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* HEADER */}
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

                {/* TABS */}
                <div className="flex bg-white rounded-lg p-1 shadow-sm mb-4">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                    >
                        すべて
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'pending' ? 'bg-red-100 text-red-700' : 'text-gray-500'}`}
                    >
                        未納入
                    </button>
                    <button
                        onClick={() => setActiveTab('received')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'received' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}
                    >
                        納入済
                    </button>
                </div>

                {/* SEARCH */}
                <div className="relative mb-6">
                    <input
                        type="text"
                        placeholder="注文ID / 業者 / 発注者 / 商品名"
                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>

                {/* LIST */}
                {loading ? (
                    <div className="text-center py-10 text-gray-400">読み込み中...</div>
                ) : groupedList.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">履歴がありません</div>
                ) : (
                    <div className="space-y-4">
                        {groupedList.map(order => (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div
                                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => toggleExpand(order.id)}
                                >
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="text-[10px] text-gray-400 font-mono">{order.id}</div>
                                            <div className="text-[10px] text-gray-400">{order.date}</div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="font-bold text-gray-800">{order.supplier}</div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${order.status === 'Received' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'Pending' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {order.status === 'Received' ? '納入済' : order.status === 'Pending' ? '未納入' : '一部納入'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-blue-600 mt-1">発注者: {order.orderer}</div>
                                    </div>
                                    <div className={`ml-3 text-gray-400 transition-transform ${expandedOrderIds.includes(order.id) ? 'rotate-180' : ''}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>

                                {expandedOrderIds.includes(order.id) && (
                                    <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                                <div className="flex-grow">
                                                    <div className="text-gray-800 font-medium">{item.ProductName}</div>
                                                    <div className="text-xs text-gray-500">数量: {item.Quantity} {item.Unit}</div>
                                                </div>
                                                <div className={`text-xs font-bold whitespace-nowrap ml-2 ${item.Status === 'Received' ? 'text-green-600' : 'text-red-500'}`}>
                                                    {item.Status === 'Received' ? '納入済' : '未納入'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default HistoryPage;
