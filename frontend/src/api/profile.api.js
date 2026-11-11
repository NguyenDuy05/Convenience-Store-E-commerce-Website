import api from './axios';

// Gọi API: xem hồ sơ
export const getProfile = (params) => api.get(`/profile`, { params });

// Gọi API: sửa hồ sơ
export const updateProfile = (data) => api.put(`/profile`, data);

// Gọi API: đổi mật khẩu
export const changePassword = (data) => api.put(`/profile/password`, data);
