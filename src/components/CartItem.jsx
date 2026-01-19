import React from 'react';

const CartItem = ({ item, onUpdateQuantity, onRemove, onToggleUrgency }) => {
    const { product, quantity } = item;

    return (
        <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0 animate-fadeIn">
            <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                />
            </div>

            <div className="flex-grow min-w-0">
                <h4 className="text-sm font-medium text-gray-800 line-clamp-1">{product.name}</h4>
                <div className="text-sm text-gray-500">
                    ¥{product.price.toLocaleString()}
                </div>
            </div>

            <div className="flex flex-col items-end gap-1">
                <div className="flex items-center bg-gray-100 rounded-lg">
                    <button
                        onClick={() => onUpdateQuantity(product.id, -1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 transition-colors rounded-l-lg text-gray-600 font-bold"
                    >
                        -
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                    <button
                        onClick={() => onUpdateQuantity(product.id, 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 transition-colors rounded-r-lg text-gray-600 font-bold"
                    >
                        +
                    </button>
                </div>
                <div className="text-sm font-bold text-gray-900">
                    ¥{(product.price * quantity).toLocaleString()}
                </div>
                <label className="flex items-center gap-1 cursor-pointer mt-1">
                    <input
                        type="checkbox"
                        checked={item.isUrgent || false}
                        onChange={() => onToggleUrgency && onToggleUrgency(product.id)}
                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-gray-300"
                    />
                    <span className={`text-xs ${item.isUrgent ? 'font-bold text-red-600' : 'text-gray-500'}`}>
                        {item.isUrgent ? '★急ぎ' : '急ぎ'}
                    </span>
                </label>
            </div>
        </div>
    );
};

export default CartItem;
