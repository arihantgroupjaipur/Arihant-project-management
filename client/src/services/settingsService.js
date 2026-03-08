import api from './api';

export const settingsService = {
    // Get a setting by key
    getSetting: async (key) => {
        try {
            const response = await api.get(`/settings/${key}`);
            return response.data;
        } catch (error) {
            // Return null if not found (404) rather than throwing, as settings might be empty initially
            if (error.response?.status === 404) {
                return null;
            }
            throw new Error(error.response?.data?.message || 'Failed to fetch setting');
        }
    },

    // Update a setting
    updateSetting: async (key, value, description) => {
        try {
            const response = await api.put(`/settings/${key}`, { value, description });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to update setting');
        }
    }
};

export default settingsService;
