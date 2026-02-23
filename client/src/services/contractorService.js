import api from './api';

export const contractorService = {
    // Get all contractors
    async getAll() {
        const response = await api.get('/contractors');
        return response.data;
    },

    // Add new contractor
    async create(name) {
        const response = await api.post('/contractors', { name });
        return response.data;
    },

    // Update contractor
    async update(id, name) {
        const response = await api.put(`/contractors/${id}`, { name });
        return response.data;
    },

    // Delete contractor
    async delete(id) {
        const response = await api.delete(`/contractors/${id}`);
        return response.data;
    },
};
