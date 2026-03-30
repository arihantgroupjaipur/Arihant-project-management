import api from './api';

const billService = {
    getAll: (page = 1) => api.get(`/bills?page=${page}&limit=20`).then(r => r.data),
    create: (data) => api.post('/bills', data).then(r => r.data),
    update: (id, data) => api.put(`/bills/${id}`, data).then(r => r.data),
    delete: (id) => api.delete(`/bills/${id}`).then(r => r.data),
};

export default billService;
