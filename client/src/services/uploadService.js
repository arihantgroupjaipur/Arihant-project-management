import api from './api';

export const uploadService = {
    // Upload a file — returns { key, public_id }
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Get a temporary pre-signed URL for a stored S3 key (valid 1 hour)
    getSignedUrl: async (key) => {
        if (!key) return null;
        // If it's already a full URL (legacy data), return as-is
        if (key.startsWith('http')) return key;
        const response = await api.get(`/upload/signed-url?key=${encodeURIComponent(key)}`);
        return response.data.url;
    },

    // Delete an image from S3 by key
    deleteImage: async (key) => {
        if (!key) return null;
        if (key.startsWith('http')) return null; // Can't easily delete legacy URLs

        const response = await api.delete(`/upload?key=${encodeURIComponent(key)}`);
        return response.data;
    }
};
