import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { fetchOrders, receiveOrder } from '../services/adminApi';

const ReceivePage = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

    // Fetch orders on mount
    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await fetchOrders();
            // Filter only pending items or group them? 
            // The sheet has item-level rows. We should group by OrderID for the UI.
            const pendingOrders = data.filter(row => row.Status === 'Pending');
            setOrders(pendingOrders);
            setFilteredOrders(pendingOrders);
        } catch (error) {
            console.error(error);
            setStatusMessage({ type: 'error', text: '注文データの取得に失敗しました' });
        } finally {
            setLoading(false);
        }
    };

    // Initialize Scanner when scanning mode is on
    useEffect(() => {
        let scanner = null;
        if (scanning) {
            scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(error => console.error('Failed to clear scanner', error));
            }
        };
    }, [scanning]);

    // Group items by OrderID for display
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

    // Filter logic
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

    const onScanSuccess = (decodedText, decodedResult) => {
        console.log(`Code matched = ${decodedText}`, decodedResult);
        // Assuming QR contains JSON with 'id' or just the ID string?
        // Our QR data: { id: "ORD-...", ... }
        try {
            const data = JSON.parse(decodedText);
            if (data.id) {
                setSearchTerm(data.id);
                setScanning(false);
                setStatusMessage({ type: 'success', text: `QRコードを読み取りました: ${data.id}` });
            }
        } catch (e) {
            // Include raw text if not JSON
            setSearchTerm(decodedText);
            setScanning(false);
        }
    };

    const onScanFailure = (error) => {
        // console.warn(`Code scan error = ${error}`);
    };

    const handleReceive = async (orderId) => {
        if (!window.confirm(`注文 ${orderId} を「納入済」にしますか？`)) return;

        try {
            const result = await receiveOrder(orderId);
            if (result.success) {
                setStatusMessage({ type: 'success', text: `注文 ${orderId} を受け付けました` });
                loadOrders(); // Reload to remove from pending list
            } else {
                setStatusMessage({ type: 'error', text: result.message || 'エラーが発生しました' });
            }
        } catch (e) {
            setStatusMessage({ type: 'error', text: '通信エラーが発生しました' });
        }
    };

    const groupedOrders = groupOrders(filteredOrders);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-green-600 text-white p-4 shadow-sm sticky top-0 z-10">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    納入受付
                </h1>
            </header>

            <main className="container mx-auto p-4 max-w-lg">

                {/* Status Message */}
                {statusMessage.text && (
                    <div className={`mb-4 p-3 rounded-lg text-sm font-bold ${statusMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                        {statusMessage.text}
                    </div>
                )}

                {/* Search & Scan Actions */}
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
                            className={`p-2 rounded-lg text-white transition-colors ${scanning ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {scanning ? '閉じる' : 'QR Scan'}
                        </button>
                    </div>

                    {scanning && (
                        <div className="mb-4 bg-black rounded-lg overflow-hidden">
                            <div id="reader" className="w-full"></div>
                        </div>
                    )}
                </div>

                {/* Order List */}
                {loading ? (
                    <div className="text-center py-10 text-gray-400">読み込み中...</div>
                ) : groupedOrders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        {searchTerm ? '該当する注文が見つかりません' : '未納入の注文はありません'}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groupedOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                    <div>
                                        <div className="text-xs text-gray-500 font-mono">{order.id}</div>
                                        <div className="font-bold text-gray-800">{order.supplier}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">{order.date}</div>
                                        <div className="text-xs text-blue-600 font-bold">{order.orderer}</div>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <div className="space-y-2 mb-3">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm border-b border-dashed border-gray-100 last:border-0 pb-1 last:pb-0">
                                                <span className="text-gray-700">{item.ProductName}</span>
                                                <span className="font-mono text-gray-600">x{item.Quantity}{item.Unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => handleReceive(order.id)}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        納入完了として記録
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ReceivePage;
