import api from './axios';

// Gọi API: danh sách khách hàng (UC-19.1)
export const listCustomers = (params) => api.get(`/customers`, { params });

// Gọi API: chi tiết khách hàng (UC-19.2)
export const getCustomer = (id, params) => api.get(`/customers/${id}`, { params });

// Gọi API: admin sửa khách (UC-29.4)
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);

// Gọi API: mở khóa khách (UC-29.5)
export const unlockCustomer = (id, data) => api.patch(`/customers/${id}/unlock`, data);

// Gọi API: xóa khách (UC-29.6)
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// Gọi API: đăng ký thành viên tại quầy
export const registerMember = (data) => api.post('/customers/members', data);

// Gọi API: tìm thành viên theo SĐT / email / mã
export const findMember = (q) => api.get('/customers/members/lookup', { params: { q } });
