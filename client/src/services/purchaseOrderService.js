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

// Get all Purchase Orders (paginated)
export const getPurchaseOrders = async ({ page = 1, limit = 200, search = '', status = '' } = {}) => {
    try {
        const params = new URLSearchParams();
        params.set('page', page); params.set('limit', limit);
        if (search) params.set('search', search);
        if (status && status !== 'all') params.set('status', status);
        const response = await api.get(`/purchase-orders?${params.toString()}`);
        return response.data; // { purchaseOrders, total, hasMore }
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

// Update a specific Delivery Receipt
export const updateDeliveryReceipt = async (poId, receiptId, payload) => {
    try {
        const response = await api.put(`/purchase-orders/${poId}/receipts/${receiptId}`, payload);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to update delivery receipt');
    }
};

// Delete a specific Delivery Receipt
export const deleteDeliveryReceipt = async (poId, receiptId) => {
    try {
        const response = await api.delete(`/purchase-orders/${poId}/receipts/${receiptId}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to delete delivery receipt');
    }
};

// Upload a PDF and attach it to the purchase order
export const uploadPurchaseOrderPdf = async (id, file) => {
    try {
        const formData = new FormData();
        formData.append('image', file);
        const uploadResponse = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const s3Key = uploadResponse.data.key;
        const response = await api.patch(`/purchase-orders/${id}/pdf`, { uploadedPdf: s3Key });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to upload PDF');
    }
};

// Remove the uploaded PDF from a purchase order
export const removePurchaseOrderPdf = async (id) => {
    try {
        const response = await api.patch(`/purchase-orders/${id}/pdf`, { uploadedPdf: null });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to remove PDF');
    }
};


export default {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    deletePurchaseOrder,
    updateMaterialVerification,
    resetMaterialVerification,
    updateDeliveryReceipt,
    deleteDeliveryReceipt,
    uploadPurchaseOrderPdf,
    removePurchaseOrderPdf
};
