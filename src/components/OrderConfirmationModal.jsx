import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode'; // For data URL generation
import { pdf } from '@react-pdf/renderer'; // Import generator
import OrderPDF from './OrderPDF';

const OrderConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    employee,
    cartItems,
    totalAmount,
    isSubmitting
}) => {
    const [step, setStep] = useState(1);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false); // Local state for generation

    useEffect(() => {
        if (isOpen && step === 2) {
            generateQR();
        }
    }, [isOpen, step, employee, totalAmount, cartItems]);

    const generateQR = async () => {
        try {
            const data = JSON.stringify({
                e: employee.id,
                t: totalAmount,
                c: cartItems.length,
                d: new Date().toISOString().split('T')[0]
            });
            const url = await QRCode.toDataURL(data);
            setQrCodeUrl(url);
        } catch (err) {
            console.error(err);
        }
    };

    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]); // Return base64 content only
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleConfirm = async () => {
        setIsGenerating(true);
        try {
            // Group items by supplier
            const groupedItems = cartItems.reduce((acc, item) => {
                const supplier = item.product.supplier || '未設定';
                if (!acc[supplier]) acc[supplier] = [];
                acc[supplier].push(item);
                return acc;
            }, {});

            const orders = [];
            const timestamp = new Date().toISOString().split('T')[0] + '_' + new Date().toLocaleTimeString('ja-JP', { hour12: false }).replace(/:/g, '');
            const baseOrderId = `ORD-${Date.now().toString().slice(-6)}`;

            let index = 1;

            for (const [supplier, items] of Object.entries(groupedItems)) {
                // Calculate subtotal for this specific order
                const subTotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

                // Generate unique QR code for this order
                const qrData = JSON.stringify({
                    id: baseOrderId + '-' + index, // Unique Order ID
                    e: employee.id,
                    t: subTotal,
                    c: items.length,
                    d: new Date().toISOString().split('T')[0],
                    s: supplier
                });
                const uniqueQrUrl = await QRCode.toDataURL(qrData);

                const fileName = `order_${timestamp}_${baseOrderId}_${index}.pdf`;
                const doc = (
                    <OrderPDF
                        orderId={`${baseOrderId}-${index}`} // Use unique ID with suffix
                        date={new Date().toLocaleDateString('ja-JP')}
                        vendorName={`${supplier} 御中`}
                        items={items}
                        qrCodeDataUrl={uniqueQrUrl}
                        employee={employee}
                    />
                );

                const asPdf = pdf(doc);
                const blob = await asPdf.toBlob();
                const base64 = await blobToBase64(blob);

                orders.push({
                    id: baseOrderId + '-' + index, // Pass the ID to backend
                    supplier,
                    items,
                    pdfBase64: base64,
                    fileName
                });
                index++;
            }

            // Call parent onConfirm with the generated orders
            onConfirm(orders);

        } catch (error) {
            console.error("PDF Generation failed", error);
            alert("PDF生成に失敗しました: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    const handleConfirmStep1 = () => {
        setStep(2);
    };

    const handleBack = () => {
        onClose();
        setStep(1);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
                {step === 1 && (
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                            発注者確認
                        </h3>
                        <div className="mb-6 text-center">
                            <p className="text-gray-600 mb-2">あなたは</p>
                            <div className="bg-blue-50 rounded-lg p-4 mb-2">
                                <p className="text-sm text-gray-500">社員コード: {employee.id}</p>
                                <p className="text-2xl font-bold text-blue-800">{employee.name} さん</p>
                            </div>
                            <p className="text-gray-600">ですか？</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleConfirmStep1}
                                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                            >
                                はい、私です
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900 text-center">
                                注文内容の確認
                            </h3>
                        </div>

                        <div className="flex flex-col items-center py-4 bg-white border-b border-gray-100">
                            <QRCodeCanvas
                                value={JSON.stringify({
                                    e: employee.id,
                                    t: totalAmount,
                                    c: cartItems.length,
                                    d: new Date().toISOString().split('T')[0]
                                })}
                                size={128}
                                level={"M"}
                            />
                            <p className="text-xs text-gray-400 mt-2">注文QRコード</p>
                            {/* Download links removed per user request */}
                        </div>

                        <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
                            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                                {cartItems.map(item => (
                                    <div key={item.product.id} className="p-3 flex justify-between items-center text-sm">
                                        <div className="flex-1">
                                            <span className="font-medium text-gray-800">{item.product.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-gray-500 text-xs text-blue-600 border border-blue-200 px-1 rounded">
                                                    {item.product.supplier || '未設定'}
                                                </span>
                                                <span className="text-gray-500 text-xs">x {item.quantity}{item.product.unit}</span>
                                                {item.isUrgent && (
                                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-1 rounded border border-red-200">
                                                        ★急ぎ
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="font-medium text-gray-900">
                                            ¥{(item.product.price * item.quantity).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex justify-between items-center px-2">
                                <span className="font-bold text-gray-700">合計金額</span>
                                <span className="text-xl font-bold text-blue-600">¥{totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={handleBack}
                                disabled={isSubmitting || isGenerating}
                                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                戻る
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isSubmitting || isGenerating}
                                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md flex items-center justify-center gap-2"
                            >
                                {isSubmitting || isGenerating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {isGenerating ? 'PDF生成中...' : '送信中...'}
                                    </>
                                ) : (
                                    <>
                                        <span>注文を確定</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderConfirmationModal;
