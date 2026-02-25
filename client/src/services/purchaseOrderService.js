import api from './api';

// Create a new Purchase Order
export const createPurchaseOrder = async (data) => {
    try {
        const response = await api.post('/purchase-orders', data);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to create purchase order');
    }
};

// Get all Purchase Orders
export const getPurchaseOrders = async () => {
    try {
        const response = await api.get('/purchase-orders');
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch purchase orders');
    }
};

// Get a single Purchase Order by ID
export const getPurchaseOrderById = async (id) => {
    try {
        const response = await api.get(`/purchase-orders/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch purchase order details');
    }
};

// Update a Purchase Order
export const updatePurchaseOrder = async (id, data) => {
    try {
        const response = await api.put(`/purchase-orders/${id}`, data);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to update purchase order');
    }
};

// Delete a Purchase Order
export const deletePurchaseOrder = async (id) => {
    try {
        const response = await api.delete(`/purchase-orders/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to delete purchase order');
    }
};

// Update a Purchase Order Verification
export const updateMaterialVerification = async (id, payload) => {
    try {
        const response = await api.put(`/purchase-orders/${id}/verify`, payload);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to update material verification');
    }
};

// Reset (clear) Material Verification data only — PO is NOT deleted
export const resetMaterialVerification = async (id) => {
    try {
        const response = await api.delete(`/purchase-orders/${id}/verify`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to reset material verification');
    }
};

export default {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    deletePurchaseOrder,
    updateMaterialVerification
};
