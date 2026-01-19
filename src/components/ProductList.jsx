import React, { useState } from 'react';
import ProductCard from './ProductCard';
import { CATEGORIES } from '../services/mockData';

const ProductList = ({ products, onAddToCart }) => {
    const [selectedCategory, setSelectedCategory] = useState('全て');

    const filteredProducts = selectedCategory === '全て'
        ? products
        : products.filter(p => p.category === selectedCategory);

    return (
        <div className="flex flex-col h-full">
            {/* Category Filter */}
            <div className="flex overflow-x-auto pb-6 pt-2 gap-3 px-1 no-scrollbar flex-shrink-0">
                {CATEGORIES.map(category => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === category
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-20">
                {filteredProducts.map(product => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={onAddToCart}
                    />
                ))}
            </div>
        </div>
    );
};

export default ProductList;
