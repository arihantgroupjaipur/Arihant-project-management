import api from './api';

export const userService = {
    // Get all users
    async getAllUsers() {
        const response = await api.get('/users');
        return response.data;
    },

    // Create new user
    async createUser(userData) {
        const response = await api.post('/users', userData);
        return response.data;
    },

    // Send OTP for new user registration
    async sendRegistrationOtp(email) {
        const response = await api.post('/users/send-otp', { email });
        return response.data;
    },

    // Update user
    async updateUser(id, userData) {
        const response = await api.put(`/users/${id}`, userData);
        return response.data;
    },

    // Delete user
    async deleteUser(id) {
        const response = await api.delete(`/users/${id}`);
        return response.data;
    }
};
