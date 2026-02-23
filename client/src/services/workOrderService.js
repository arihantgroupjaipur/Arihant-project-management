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
};

export default workOrderService;
