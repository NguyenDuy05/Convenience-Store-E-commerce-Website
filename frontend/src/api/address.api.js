import api from './axios';

// UC-07.1 View Addresses
export const listAddresses = (params) => api.get(`/addresses`, { params });

// UC-07.2 Add Address
export const addAddress = (data) => api.post(`/addresses`, data);

// UC-07.3 Update Address
export const updateAddress = (id, data) => api.put(`/addresses/${id}`, data);

// UC-07.4 Delete Address
export const deleteAddress = (id) => api.delete(`/addresses/${id}`);
