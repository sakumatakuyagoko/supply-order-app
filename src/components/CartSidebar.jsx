import React, { useState, useEffect } from 'react';
import CartItem from './CartItem';
import { fetchEmployees } from '../services/api';

const CartSidebar = ({
    cartItems,
    totalAmount,
    onUpdateQuantity,
    onRemove,
    onClearCart,
    onInitiateOrder,
    onClose, // Add onClose prop
    onToggleUrgency
}) => {
    const isEmpty = cartItems.length === 0;
    const [employeeId, setEmployeeId] = useState('');
    const [employeeName, setEmployeeName] = useState('');
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        // Load employees on mount
        const loadEmployees = async () => {
            try {
                const data = await fetchEmployees();
                setEmployees(data);
            } catch (error) {
                console.error('Failed to load employees', error);
            }
        };
        loadEmployees();
    }, []);

    useEffect(() => {
        if (employeeId.length >= 3) {
            // Lookup in fetched list
            // IDs are strings, ensure comparison is safe
            const found = employees.find(e => String(e.id) === String(employeeId));
            setEmployeeName(found ? found.name : '');
        } else {
            setEmployeeName('');
        }
    }, [employeeId, employees]);

    const isValidEmployee = employeeName !== '';

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl w-full max-w-md h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span>🛒</span> 買い物カゴ
                </h2>
                <div className="flex items-center gap-2">
                    {!isEmpty && (
                        <button
                            onClick={() => {
                                if (confirm('カートを空にしますか？')) onClearCart();
                            }}
                            className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors"
                            title="カートを空にする"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="md:hidden text-gray-500 hover:text-gray-700 p-1"
                        title="閉じる"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4">
                {isEmpty ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p>カートは空です</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {cartItems.map((item) => (
                            <CartItem
                                key={item.product.id}
                                item={item}
                                onUpdateQuantity={onUpdateQuantity}
                                onRemove={onRemove}
                                onToggleUrgency={onToggleUrgency}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
                {/* Employee ID Input */}
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                        社員コード <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="text"
                            id="employeeId"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="例: 999"
                        />
                    </div>
                    {employeeName ? (
                        <div className="mt-2 text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block">
                            {employeeName} さん
                        </div>
                    ) : (
                        employeeId.length >= 3 && (
                            <p className="mt-2 text-sm text-red-500 font-medium">
                                社員コードに該当がありません
                            </p>
                        )
                    )}
                </div>

                <div className="flex justify-between items-end">
                    <span className="text-gray-600 font-medium">合計金額</span>
                    <span className="text-2xl font-bold text-blue-600">
                        ¥{totalAmount.toLocaleString()}
                    </span>
                </div>

                <button
                    onClick={() => {
                        const found = employees.find(e => String(e.id) === String(employeeId));
                        if (!found) return;
                        // Pass the full employee object including factory and codeName
                        onInitiateOrder(found);
                    }}
                    disabled={isEmpty || !isValidEmployee}
                    className={`w-full py-3 text-lg shadow-md flex items-center justify-center gap-2 transition-all rounded-lg font-bold text-white
                        ${(isEmpty || !isValidEmployee)
                            ? 'bg-blue-300 cursor-not-allowed shadow-none'
                            : 'bg-blue-600 hover:bg-blue-700 hover:translate-y-[-1px] active:translate-y-[1px]'
                        }`}
                >
                    <span>注文へ進む</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default CartSidebar;
