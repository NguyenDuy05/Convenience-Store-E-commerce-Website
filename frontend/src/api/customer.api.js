import api from './axios';

// UC-20.1, 29.1, 29.2 View / Search Customers
export const listCustomers = (params) => api.get(`/customers`, { params });

// UC-20.2, 29.3 View Customer Details
export const getCustomer = (id, params) => api.get(`/customers/${id}`, { params });

// UC-29.4 Update Customer
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);

// UC-29.5 Unlock Customer Account
export const unlockCustomer = (id, data) => api.patch(`/customers/${id}/unlock`, data);

// UC-29.6 Delete Customer Account
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
