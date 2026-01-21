import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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

    // Custom Scanner Logic
    useEffect(() => {
        let html5QrCode;
        if (scanning) {
            html5QrCode = new Html5Qrcode("reader");
            const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

            // Prefer back camera
            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    handleScan(decodedText);
                    // Optional: stop scanning automatically after success? 
                    // html5QrCode.stop(); setScanning(false);
                },
                (errorMessage) => {
                    // console.log(errorMessage);
                }
            ).catch(err => {
                console.error("Error starting scanner", err);
                setStatusMessage({ type: 'error', text: 'カメラの起動に失敗しました。権限を確認してください。' });
                setScanning(false);
            });
        }

        return () => {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(console.error);
            }
        };
    }, [scanning]);

    const handleScan = (decodedText) => {
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
            // setStatusMessage({ type: 'success', text: `読み取り完了: ${decodedText}` });
        }
    };
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
            const lowerTerm = searchTerm.toLowerCase().replace('ord-', '').trim();
            result = result.filter(item => {
                const id = String(item.OrderId).toLowerCase().replace('ord-', '');
                const supplier = String(item.Supplier).toLowerCase();
                const orderer = String(item.Orderer).toLowerCase();
                return id.includes(lowerTerm) || supplier.includes(lowerTerm) || orderer.includes(lowerTerm);
            });
        }
        setFilteredOrders(result);
    }, [searchTerm, orders]);

    // ... (rest of code)

    // In JSX:
    // Update Search Area
    <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <div className="flex gap-2 mb-4">
            <div className="relative flex-grow">
                <input
                    type="text"
                    placeholder="注文ID / 業者 / 発注者で検索"
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}
            </div>
            <button
                onClick={() => {
                    if (!scanning) setSearchTerm(''); // Clear on start
                    setScanning(!scanning);
                }}
                className={`p-2 px-3 rounded-lg text-white transition-colors flex-shrink-0 text-sm font-bold ${scanning ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {scanning ? '閉じる' : 'カメラ起動'}
            </button>
        </div>
        {scanning && (
            <div className="mb-4 bg-black rounded-lg overflow-hidden relative">
                <div id="reader" className="w-full h-64 bg-black"></div>
                <div className="absolute top-0 left-0 right-0 p-2 text-center text-white text-xs bg-black/50 z-10 pointer-events-none">
                    QRコードを枠内に映してください
                </div>
                {/* Square Guide Framework */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-white/80 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 -mt-0.5 -ml-0.5"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 -mt-0.5 -mr-0.5"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 -mb-0.5 -ml-0.5"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 -mb-0.5 -mr-0.5"></div>
                    </div>
                </div>
            </div>
        )}
    </div>

    {/* LIST AREA */ }
    {
        loading ? (
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
        )
    }
            </main >

    {/* PARTIAL RECEIVE MODAL */ }
{
    modalOrder && (
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
                            onClick={() => selectedItems.length === 0 && executeReceive(modalOrder.id, null)}
                            disabled={selectedItems.length > 0}
                            className={`w-full font-bold py-3 rounded-lg transition-colors ${selectedItems.length > 0
                                ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
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
    )
}
        </div >
    );
};

export default ReceivePage;
