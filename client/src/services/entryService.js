import api from './api';

export const entryService = {
    // Get all entries (paginated)
    async getAll({ page = 1, limit = 200, search = '' } = {}) {
        const params = new URLSearchParams();
        params.set('page', page); params.set('limit', limit);
        if (search) params.set('search', search);
        const response = await api.get(`/entries?${params.toString()}`);
        return response.data; // { entries, total, hasMore }
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
