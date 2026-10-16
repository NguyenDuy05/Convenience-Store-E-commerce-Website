import api from './axios';

// UC-01 Register
export const register = (data) => api.post(`/auth/register`, data);

// UC-03/14/26 Login (Customer, Staff, Admin)
export const login = (data) => api.post(`/auth/login`, data);

// UC-04/15/27 Logout
export const logout = (data) => api.post(`/auth/logout`, data);

// UC-05/16 Forgot Password (Customer, Staff)
export const forgotPassword = (data) => api.post(`/auth/forgot-password`, data);

// UC-05/16 Forgot Password (đặt lại mật khẩu)
export const resetPassword = (data) => api.post(`/auth/reset-password`, data);

// Lấy thông tin người đang đăng nhập
export const getMe = (params) => api.get(`/auth/me`, { params });
