import React from 'react';

const ProductCard = ({ product, onAddToCart }) => {
    const isOutOfStock = product.stockStatus === 'Out of Stock';
    const isLowStock = product.stockStatus === 'Low Stock';

    const [imgError, setImgError] = React.useState(false);

    // Simple robust layout: Auto height, no hidden overflows for text
    // Removed overflow-hidden from parent to avoid clipping bottom shadow/content
    return (
        <div className="card flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm relative group h-auto min-h-[240px]">
            {/* Image Area - Fixed height for consistency */}
            {/* Rounded top only, overflow hidden here to clip image, not parent */}
            <div className="relative h-24 bg-gray-50 flex-shrink-0 border-b border-gray-100 rounded-t-xl overflow-hidden">
                {!imgError && product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain p-2 mix-blend-multiply transition-transform group-hover:scale-105 duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                            console.error('Image load error for:', product.name, product.image);
                            setImgError(true);
                        }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300">
                        <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] mt-1">No Image</span>
                    </div>
                )}

                {/* Status Badges */}
                <div className="absolute top-1 right-1 flex flex-col gap-1 items-end z-10">
                    {isLowStock && (
                        <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-200 shadow-sm opacity-90">
                            残りわずか
                        </span>
                    )}
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-100">
                        {product.category || '未分類'}
                    </span>
                </div>

                {isOutOfStock && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-[1px] z-20">
                        <span className="bg-red-100 text-red-800 font-bold px-3 py-1 rounded-full border border-red-200 shadow-sm text-sm">
                            在庫切れ
                        </span>
                    </div>
                )}
            </div>

            {/* Content Area - Grows with text. Added pb-4 for safety. */}
            <div className="p-3 pb-5 flex flex-col gap-2 flex-grow">
                {/* Product Name - Always visible, no clamping */}
                <h3 className="font-bold text-gray-800 text-sm leading-snug break-words border-dashed border-gray-100">
                    {product.name || '名称未設定'}
                </h3>

                {/* Price and Button */}
                <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex flex-col leading-normal">
                        <span className="text-lg font-bold text-gray-900">
                            ¥{product.price.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-500">/{product.unit}</span>
                    </div>

                    <button
                        onClick={() => onAddToCart(product)}
                        disabled={isOutOfStock}
                        className="btn-primary py-1.5 px-3 text-xs shadow-sm active:scale-95 transition-all whitespace-nowrap"
                    >
                        追加
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
