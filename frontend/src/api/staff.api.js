import api from './axios';

// Gọi API: danh sách nhân viên (UC-30.1)
export const listStaff = (params) => api.get(`/staff`, { params });

// Gọi API: thêm nhân viên (UC-30.2)
export const addStaff = (data) => api.post(`/staff`, data);

// Gọi API: sửa nhân viên (UC-30.3)
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data);

// Gọi API: khóa nhân viên (UC-30.4)
export const lockStaff = (id, data) => api.patch(`/staff/${id}/lock`, data);

// Gọi API: mở khóa nhân viên (UC-30.5)
export const unlockStaff = (id, data) => api.patch(`/staff/${id}/unlock`, data);

// Gọi API: nhật ký thao tác nhân viên (UC-30.6)
export const getStaffActivity = (id, params) => api.get(`/staff/${id}/activity`, { params });

// Gọi API: chi tiết nhân viên + số liệu xử lý đơn
export const getStaff = (id, params) => api.get(`/staff/${id}`, { params });

// Gọi API: các đơn nhân viên đã xử lý
export const getStaffOrders = (id, params) => api.get(`/staff/${id}/orders`, { params });
