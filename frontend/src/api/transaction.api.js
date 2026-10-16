import api from './axios';

// UC-24.1, 24.2, 36.1 View / Search Transactions
export const listTransactions = (params) => api.get(`/transactions`, { params });

// UC-24.3, 36.2 View Transaction Details
export const getTransaction = (id, params) => api.get(`/transactions/${id}`, { params });
