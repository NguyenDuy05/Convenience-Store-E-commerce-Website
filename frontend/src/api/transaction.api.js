import api from './axios';

// Gọi API: xem / tìm giao dịch
export const listTransactions = (params) => api.get(`/transactions`, { params });

// Gọi API: chi tiết giao dịch
export const getTransaction = (id, params) => api.get(`/transactions/${id}`, { params });
