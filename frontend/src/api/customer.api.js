import api from './axios';

// UC-19.1 View Customers (staff, admin). params: q (>= 2 ký tự), status, hasComplaint: '1', sort, page, limit
export const listCustomers = (params) => api.get(`/customers`, { params });

// UC-19.2 View Customer Details (staff chỉ nhận thông tin đã che bớt)
export const getCustomer = (id, params) => api.get(`/customers/${id}`, { params });

// UC-29.4 Update Customer
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);

// UC-29.5 Unlock Customer Account
export const unlockCustomer = (id, data) => api.patch(`/customers/${id}/unlock`, data);

// UC-29.6 Delete Customer Account
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
