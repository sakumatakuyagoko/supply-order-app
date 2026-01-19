import { MOCK_PRODUCTS, MOCK_EMPLOYEES } from './mockData';

const API_URL = 'https://script.google.com/macros/s/AKfycbyUnHq5Z3YL3E_PFLgpLHwT1YnXfHXBKW44U95jrLOsZufuw9tW9dYIJMOePG_EUB5oaQ/exec';
const USE_MOCK = false;

const formatGoogleDriveImage = (url) => {
    if (!url || typeof url !== 'string') return '';
    const cleanUrl = url.trim();
    if (!cleanUrl) return '';

    // Check if it's a Google Drive URL
    if (cleanUrl.includes('drive.google.com')) {
        // Handle /d/FILE_ID pattern
        let match = cleanUrl.match(/\/d\/(.+?)(\/|$)/);
        if (match && match[1]) {
            return `https://lh3.googleusercontent.com/d/${match[1]}`;
        }
        // Handle id=FILE_ID pattern
        match = cleanUrl.match(/[?&]id=([^&]+)/);
        if (match && match[1]) {
            return `https://lh3.googleusercontent.com/d/${match[1]}`;
        }
    }
    return cleanUrl;
};


export const fetchEmployees = async () => {
    if (USE_MOCK) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(MOCK_EMPLOYEES);
            }, 500);
        });
    }

    try {
        const response = await fetch(`${API_URL}?type=employees`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        // Map Japanese columns to standard ID/Name
        return data.map(emp => ({
            id: String(emp['社員code'] || emp['id'] || ''),
            name: emp['氏名'] || emp['name'] || ''
        })).filter(e => e.id); // Filter out empty IDs

    } catch (error) {
        console.error('Fetch employees error:', error);
        throw error;
    }
};

export const fetchProducts = async () => {
    if (USE_MOCK) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(MOCK_PRODUCTS);
            }, 500);
        });
    }

    try {
        const response = await fetch(`${API_URL}?type=products`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        // Helper for fuzzy key matching (case-insensitive, ignores whitespace)
        const getValue = (item, keys) => {
            const itemKeys = Object.keys(item);
            for (const key of keys) {
                // Try exact match first
                if (item[key] !== undefined) return item[key];

                // Try fuzzy match
                const normalize = s => s.trim().toLowerCase();
                const matchedKey = itemKeys.find(k => normalize(k) === normalize(key));
                if (matchedKey) return item[matchedKey];
            }
            return undefined;
        };

        return data.map(product => {
            const name = getValue(product, ['name', '商品名', '品名']) || '名称未設定';
            const category = getValue(product, ['category', 'カテゴリ', '分類']) || '未分類';
            const price = Number(getValue(product, ['price', '単価', '価格']) || 0);
            let unit = getValue(product, ['unit', '単位']);
            // If unit is '1' or empty, default to '個'
            if (!unit || String(unit) === '1') unit = '個';

            const stockStatus = getValue(product, ['stockStatus', '在庫状況', '在庫']) || 'In Stock';
            const imageRaw = getValue(product, ['image', '画像', '画像URL']);

            return {
                id: String(getValue(product, ['id', 'ID', 'No']) || ''),
                name,
                category,
                price,
                unit,
                stockStatus,
                image: formatGoogleDriveImage(imageRaw)
            };
        });
    } catch (error) {
        console.error('Fetch error:', error);
        // Fallback to mock data if fetch fails (optional, maybe better to throw)
        throw error;
    }
};

export const submitOrder = async (orderItems, ordererId) => {
    if (USE_MOCK) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Order submitted:', { items: orderItems, ordererId });
                resolve({ success: true, message: 'Mock order submitted successfully' });
            }, 1000);
        });
    }

    try {
        const totalAmount = orderItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

        // Send as no-cors to avoid CORS issues with simple triggers if any, 
        // but GAS Web App returning JSON usually requires waiting for response.
        // Standard fetch with POST to GAS often has CORS redirect issues.
        // We'll use standard POST which follows redirects usually.
        // Note: detailed error handling might be limited with simple fetch due to opaque redirects.

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // GAS handles text/plain better without preflight
            },
            body: JSON.stringify({
                items: orderItems,
                totalAmount: totalAmount,
                ordererId: ordererId
            })
        });

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('Submit error:', error);
        return { success: false, message: 'Order submission failed' };
    }
};
