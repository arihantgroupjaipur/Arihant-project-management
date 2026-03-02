import api from './api';

export const entryService = {
    // Get all entries
    async getAll() {
        const response = await api.get('/entries');
        return response.data;
    },

    // Create new entry
    async create(entryData) {
        const response = await api.post('/entries', entryData);
        return response.data;
    },

    // Update entry
    async update(id, entryData) {
        const response = await api.put(`/entries/${id}`, entryData);
        return response.data;
    },

    // Delete entry
    async delete(id) {
        const response = await api.delete(`/entries/${id}`);
        return response.data;
    },

    // Get historical usage of a work order
    async getWorkOrderUsage(workOrderNo) {
        const response = await api.get(`/entries/work-order-usage/${encodeURIComponent(workOrderNo)}`);
        return response.data;
    }
};
