import { useState, useMemo, useCallback } from 'react';

export function useCart() {
    const [items, setItems] = useState([]);

    const addToCart = useCallback((product) => {
        setItems(currentItems => {
            const existingItem = currentItems.find(item => item.product.id === product.id);
            if (existingItem) {
                return currentItems.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...currentItems, { product, quantity: 1 }];
        });
    }, []);

    const removeFromCart = useCallback((productId) => {
        setItems(currentItems => currentItems.filter(item => item.product.id !== productId));
    }, []);

    const updateQuantity = useCallback((productId, delta) => {
        setItems(currentItems => {
            return currentItems.map(item => {
                if (item.product.id === productId) {
                    const newQuantity = Math.max(0, item.quantity + delta);
                    return { ...item, quantity: newQuantity };
                }
                return item;
            }).filter(item => item.quantity > 0);
        });
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    const { totalAmount, totalItems } = useMemo(() => {
        return items.reduce(
            (acc, item) => ({
                totalAmount: acc.totalAmount + item.product.price * item.quantity,
                totalItems: acc.totalItems + item.quantity
            }),
            { totalAmount: 0, totalItems: 0 }
        );
    }, [items]);

    return {
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        totalItems
    };
}
