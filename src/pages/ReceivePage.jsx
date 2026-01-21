import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { fetchOrders, receiveOrder } from '../services/adminApi';
import { fetchProducts } from '../services/api';

const ReceivePage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

    // Modal State
    const [modalOrder, setModalOrder] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);

    // Fetch orders on mount
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
            setProducts(productsData);
            const pendingOrders = ordersData.filter(row => row.Status === 'Pending');
            setOrders(pendingOrders);
            setFilteredOrders(pendingOrders);
        } catch (error) {
            console.error(error);
            setStatusMessage({ type: 'error', text: 'データの取得に失敗しました' });
        } finally {
            setLoading(false);
        }
    };

    const getProductImage = (name) => {
        const product = products.find(p => p.name === name);
        return product ? product.image : null;
    };

    // Scanner
    useEffect(() => {
        let scanner = null;
        if (scanning) {
            scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );
            scanner.render(onScanSuccess, onScanFailure);
        }
        return () => {
            if (scanner) scanner.clear().catch(console.error);
        };
    }, [scanning]);

    // Grouping
    const groupOrders = (flatOrders) => {
        const groups = {};
        flatOrders.forEach(item => {
            if (!groups[item.OrderId]) {
                groups[item.OrderId] = {
                    id: item.OrderId,
                    date: new Date(item.Date).toLocaleDateString(),
                    supplier: item.Supplier,
                    orderer: item.Orderer,
                    items: []
                };
            }
            groups[item.OrderId].items.push(item);
        });
        return Object.values(groups);
    };

    // Filtering
    useEffect(() => {
        if (!orders.length) return;
        let result = orders;
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item =>
                String(item.OrderId).toLowerCase().includes(lowerTerm) ||
                String(item.Supplier).toLowerCase().includes(lowerTerm) ||
                String(item.Orderer).toLowerCase().includes(lowerTerm)
            );
        }
        setFilteredOrders(result);
    }, [searchTerm, orders]);

    const onScanSuccess = (decodedText) => {
        try {
            const data = JSON.parse(decodedText);
            if (data.id) {
                setSearchTerm(data.id);
                setScanning(false);
                setStatusMessage({ type: 'success', text: `QRコードを読み取りました: ${data.id}` });
            }
        } catch (e) {
            setSearchTerm(decodedText);
            setScanning(false);
        }
    };

    const onScanFailure = () => { };

    // --- RECEIVE LOGIC ---

    const handleReceiveClick = (order) => {
        if (order.items.length > 1) {
            // Open partial receive modal
            setModalOrder(order);
            setSelectedItems([]); // Reset selection
        } else {
            // Single item, just confirm and go
            if (window.confirm('この注文を「納入済」にしますか？')) {
                executeReceive(order.id, null);
            }
        }
    };

    const executeReceive = async (orderId, itemsToReceive) => {
        // itemsToReceive: null = all, array = partial
        try {
            const result = await receiveOrder(orderId, itemsToReceive);
            if (result.success) {
                setStatusMessage({ type: 'success', text: `受入処理が完了しました: ${orderId}` });

                // Optimistic Update
                if (!itemsToReceive) {
                    // Removed all
                    const newOrders = orders.filter(o => o.OrderId !== orderId);
                    setOrders(newOrders);
                } else {
                    // Update only specific items' status to 'Received' (remove from pending list)
                    const newOrders = orders.filter(o => {
                        if (o.OrderId === orderId && itemsToReceive.includes(o.ProductName)) {
                            return false; // Remove this item
                        }
                        return true;
                    });
                    setOrders(newOrders);
                }
                setModalOrder(null);
            } else {
                setStatusMessage({ type: 'error', text: result.message || 'エラーが発生しました' });
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

    const groupedOrders = groupOrders(filteredOrders);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* HERDER */}
            <header className="bg-green-600 text-white p-4 shadow-md sticky top-0 z-10">
                <div className="container mx-auto max-w-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-1.5 bg-green-700 rounded-full hover:bg-green-800 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        </button>
                        <h1 className="text-lg font-bold">納入受付</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 max-w-lg">
                {statusMessage.text && (
                    <div className={`mb-4 p-3 rounded-lg text-sm font-bold ${statusMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {statusMessage.text}
                    </div>
                )}

                {/* SEARCH AREA */}
                <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            placeholder="注文ID / 業者 / 発注者で検索"
                            className="flex-grow border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button
                            onClick={() => setScanning(!scanning)}
                            className={`p-2 px-3 rounded-lg text-white transition-colors flex-shrink-0 text-sm font-bold ${scanning ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {scanning ? '閉じる' : 'QR Scan'}
                        </button>
                    </div>
                    {scanning && (
                        <div className="mb-4 bg-black rounded-lg overflow-hidden"><div id="reader" className="w-full"></div></div>
                    )}
                </div>

                {/* LIST AREA */}
                {loading ? (
                    <div className="text-center py-10 text-gray-400">読み込み中...</div>
                ) : groupedOrders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        {searchTerm ? '該当する注文が見つかりません' : '未納入の注文はありません'}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groupedOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex">
                                <div className="flex-grow p-3 flex flex-col gap-2">
                                    <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                                        <div>
                                            <div className="text-[10px] text-gray-400 font-mono">{order.id}</div>
                                            <div className="font-bold text-gray-800 text-sm">{order.supplier}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-gray-400">{order.date}</div>
                                            <div className="text-xs text-blue-600 truncate max-w-[100px]">{order.orderer}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3 pt-1">
                                        {order.items.map((item, idx) => {
                                            const imgUrl = getProductImage(item.ProductName);
                                            return (
                                                <div key={idx} className="flex items-start gap-3 text-sm border-b border-dashed border-gray-100 last:border-0 pb-2 last:pb-0">
                                                    <div className="w-10 h-10 flex-shrink-0 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden p-0.5 mt-0.5">
                                                        {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-contain" /> : <span className="text-[8px] text-gray-300">No Img</span>}
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <div className="font-bold text-gray-900 leading-tight mb-1">{item.ProductName}</div>
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="text-[10px] text-gray-400">数量:</span>
                                                            <span className="font-bold text-lg text-gray-800 leading-none">
                                                                {item.Quantity} <span className="text-xs font-normal text-gray-500">{item.Unit}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleReceiveClick(order)}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold w-[70px] flex flex-col items-center justify-center gap-1 transition-colors active:bg-green-800 border-l border-green-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    <span className="text-xs font-bold">受入</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* PARTIAL RECEIVE MODAL */}
            {modalOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="bg-green-600 text-white p-4 font-bold text-lg">
                            受入確認
                        </div>
                        <div className="p-4">
                            <p className="mb-4 text-gray-700 font-bold">
                                全てのアイテムを受け入れますか？<br />
                                <span className="text-sm font-normal text-gray-500">一部のみ受け入れる場合は選択してください。</span>
                            </p>

                            {/* Item Selection List */}
                            <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto mb-4 border border-gray-200 space-y-2">
                                {modalOrder.items.map((item, idx) => (
                                    <label key={idx} className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
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
                                    onClick={() => executeReceive(modalOrder.id, null)}
                                    className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700"
                                >
                                    全点受入 (一括)
                                </button>

                                {selectedItems.length > 0 && (
                                    <button
                                        onClick={() => executeReceive(modalOrder.id, selectedItems)}
                                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700"
                                    >
                                        選択したアイテムのみ受入 ({selectedItems.length}点)
                                    </button>
                                )}

                                <button
                                    onClick={() => setModalOrder(null)}
                                    className="w-full bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceivePage;
