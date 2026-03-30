import api from './api';

export const authService = {
    // Login user
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    // Register user
    async register(email, password, role = 'engineer', fullName, phone, employeeId) {
        const response = await api.post('/auth/register', {
            password,
            role,
            fullName,
            email,
            phone,
            employeeId
        });
        return response.data;
    },

    // Verify Email
    async verifyEmail(email, otp) {
        const response = await api.post('/auth/verify-email', { email, otp });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    // Forgot Password
    async forgotPassword(email) {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },

    // Reset Password
    async resetPassword(email, otp, newPassword) {
        const response = await api.post('/auth/reset-password', { email, otp, newPassword });
        return response.data;
    },

    // Logout user
    async logout() {
        await api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // Get current user
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!localStorage.getItem('token');
    },
};
