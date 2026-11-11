import api from './axios';

// Gọi API: danh sách địa chỉ của khách (UC-07.1)
export const listAddresses = (params) => api.get(`/addresses`, { params });

// Gọi API: thêm địa chỉ (UC-07.2)
export const addAddress = (data) => api.post(`/addresses`, data);

// Gọi API: sửa địa chỉ (UC-07.3)
export const updateAddress = (id, data) => api.put(`/addresses/${id}`, data);

// Gọi API: xóa địa chỉ (UC-07.4)
export const deleteAddress = (id) => api.delete(`/addresses/${id}`);
