import api from './axios';

// Gọi API: danh sách cửa hàng
export const listStores = (params) => api.get(`/stores`, { params });

// Gọi API: thêm cửa hàng
export const addStore = (data) => api.post(`/stores`, data);

// Gọi API: sửa cửa hàng
export const updateStore = (id, data) => api.put(`/stores/${id}`, data);

// Gọi API: đóng cửa hàng
export const closeStore = (id, data) => api.patch(`/stores/${id}/close`, data);

// Gọi API: mở cửa hàng
export const openStore = (id, data) => api.patch(`/stores/${id}/open`, data);

// Gọi API: cập nhật giờ mở cửa
export const updateStoreHours = (id, data) => api.put(`/stores/${id}/hours`, data);
