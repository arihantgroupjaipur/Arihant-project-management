import api from './api';

export const workCompletionService = {
    // Get all work completions
    getAllWorkCompletions: async () => {
        const response = await api.get('/workcompletions');
        return response.data;
    },

    // Get single work completion by ID
    getWorkCompletionById: async (id) => {
        const response = await api.get(`/workcompletions/${id}`);
        return response.data;
    },

    // Create new work completion
    createWorkCompletion: async (workCompletionData) => {
        const response = await api.post('/workcompletions', workCompletionData);
        return response.data;
    },

    // Update work completion
    updateWorkCompletion: async (id, workCompletionData) => {
        const response = await api.put(`/workcompletions/${id}`, workCompletionData);
        return response.data;
    },

    // Delete work completion
    deleteWorkCompletion: async (id) => {
        const response = await api.delete(`/workcompletions/${id}`);
        return response.data;
    },
};

export default workCompletionService;
