import api from './api';

const paymentVoucherService = {
    getAll: (page = 1) => api.get(`/payment-vouchers?page=${page}&limit=20`).then(r => r.data),
    create: (data) => api.post('/payment-vouchers', data).then(r => r.data),
    update: (id, data) => api.put(`/payment-vouchers/${id}`, data).then(r => r.data),
    delete: (id) => api.delete(`/payment-vouchers/${id}`).then(r => r.data),
};

export default paymentVoucherService;
