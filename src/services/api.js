import { MOCK_PRODUCTS, MOCK_EMPLOYEES } from './mockData';

const API_URL = 'https://script.google.com/macros/s/AKfycbxIbmW7hzB4bdaNo_bmiWtXmXmPPdS9N-abuEZJ28DLi5vwDdmv1W0nhC5iwQRrFXQKyQ/exec';
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

        // Helper for fuzzy key matching (case-insensitive, ignores whitespace)
        // Note: Defining this inside each function to avoid scope issues, 
        // though extracting it to a utility would be cleaner in a larger refactor.
        const getValue = (item, keys) => {
            const itemKeys = Object.keys(item);
            for (const key of keys) {
                if (item[key] !== undefined) return item[key];
                const normalize = s => s.trim().toLowerCase();
                const foundKey = itemKeys.find(k => normalize(k) === normalize(key));
                if (foundKey) return item[foundKey];
            }
            return undefined;
        };

        // Map Japanese columns to standard ID/Name
        return data.map(emp => ({
            id: String(getValue(emp, ['社員code', 'id', 'Code']) || ''),
            name: getValue(emp, ['氏名', 'name', 'Name']) || '',
            factory: getValue(emp, ['工場', 'factory', 'Factory']) || '',
            codeName: getValue(emp, ['Code+Name', 'codeName']) || ''
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
        const response = await fetch(`${API_URL}?type=products`); // Explicit type
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
                const foundKey = itemKeys.find(k => normalize(k) === normalize(key));
                if (foundKey) return item[foundKey];
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
            const supplier = getValue(product, ['supplier', 'Supplier', '発注先', '業者', '仕入先']) || '未設定';
            const imageRaw = getValue(product, ['image', '画像', '画像URL']);

            return {
                id: String(getValue(product, ['id', 'ID', 'No']) || ''),
                name,
                category,
                price,
                unit,
                stockStatus,
                supplier,
                image: formatGoogleDriveImage(imageRaw)
            };
        });
    } catch (error) {
        console.error('Fetch error:', error);
        // Fallback to mock data if fetch fails (optional, maybe better to throw)
        throw error;
    }
};

export const submitOrder = async (orderItems, orderer) => {
    if (USE_MOCK) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Order submitted:', { items: orderItems, orderer });
                resolve({ success: true, message: 'Mock order submitted successfully' });
            }, 1000);
        });
    }

    try {
        let payload = {};

        // Check if we are sending the new format (list of orders with PDFs)
        if (Array.isArray(orderItems) && orderItems.length > 0 && orderItems[0].pdfBase64) {
            payload = {
                orders: orderItems, // Each item here is { supplier, items: [], pdfBase64, fileName }
                orderer: orderer,
                ordererId: typeof orderer === 'string' ? orderer : orderer.codeName || orderer.name,
                type: 'multi_supplier_order'
            };
        } else {
            // Legacy format
            const totalAmount = orderItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
            payload = {
                items: orderItems,
                totalAmount: totalAmount,
                orderer: orderer,
                ordererId: typeof orderer === 'string' ? orderer : orderer.codeName || orderer.name
            };
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('Submit error:', error);
        return { success: false, message: 'Order submission failed' };
    }
};
