import React, { useState } from 'react';

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

    if (!isOpen) return null;

    const handleConfirmStep1 = () => {
        setStep(2);
    };

    const handleBack = () => {
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

                        <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
                            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                                {cartItems.map(item => (
                                    <div key={item.product.id} className="p-3 flex justify-between items-center text-sm">
                                        <div className="flex-1">
                                            <span className="font-medium text-gray-800">{item.product.name}</span>
                                            <span className="text-gray-500 ml-2">x {item.quantity}{item.product.unit}</span>
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
                                disabled={isSubmitting}
                                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                戻る
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isSubmitting}
                                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        送信中...
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
