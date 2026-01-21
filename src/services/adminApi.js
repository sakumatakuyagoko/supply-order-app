const API_URL = 'https://script.google.com/macros/s/AKfycbxIbmW7hzB4bdaNo_bmiWtXmXmPPdS9N-abuEZJ28DLi5vwDdmv1W0nhC5iwQRrFXQKyQ/exec';

// Helper to handle response
const handleResponse = async (response) => {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const result = await response.json();
    return result;
};

// --- ORDERS & RECEIVING ---

export const fetchOrders = async () => {
    try {
        const response = await fetch(`${API_URL}?type=orders`);
        const data = await handleResponse(response);
        return data;
    } catch (error) {
        console.error('Fetch orders error:', error);
        throw error;
    }
};

export const receiveOrder = async (orderId) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'receive', orderId: orderId })
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Receive order error:', error);
        return { success: false, message: error.toString() };
    }
};

// --- PRODUCT MANAGEMENT ---

export const registerProduct = async (product) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'registerProduct', ...product })
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Register product error:', error);
        return { success: false, message: error.toString() };
    }
};

export const updateProduct = async (product) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'updateProduct',
                ...product,
                createHistory: true,
                updater: 'AppUser' // Could be dynamic if we had login
            })
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Update product error:', error);
        return { success: false, message: error.toString() };
    }
};
