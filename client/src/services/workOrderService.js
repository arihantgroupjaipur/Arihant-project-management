import api from './api';

export const workOrderService = {
    // Get all work orders
    getAllWorkOrders: async () => {
        const response = await api.get('/workorders');
        return response.data;
    },

    // Get single work order by ID
    getWorkOrderById: async (id) => {
        const response = await api.get(`/workorders/${id}`);
        return response.data;
    },

    // Create new work order
    createWorkOrder: async (workOrderData) => {
        const response = await api.post('/workorders', workOrderData);
        return response.data;
    },

    // Update work order
    updateWorkOrder: async (id, workOrderData) => {
        const response = await api.put(`/workorders/${id}`, workOrderData);
        return response.data;
    },

    // Delete work order
    deleteWorkOrder: async (id) => {
        const response = await api.delete(`/workorders/${id}`);
        return response.data;
    },

    // Upload a PDF and attach it to the work order
    uploadWorkOrderPdf: async (id, file) => {
        const formData = new FormData();
        formData.append('image', file);
        const uploadResponse = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const s3Key = uploadResponse.data.key;
        // Use the dedicated PATCH endpoint to avoid full-PUT validation issues
        const response = await api.patch(`/workorders/${id}/pdf`, { uploadedPdf: s3Key });
        return response.data;
    },

    // Remove an uploaded PDF from a work order
    removeWorkOrderPdf: async (id) => {
        const response = await api.patch(`/workorders/${id}/pdf`, { uploadedPdf: null });
        return response.data;
    },
};

export default workOrderService;
