import api from './axios';

// Gọi API: đăng ký tài khoản (UC-01)
export const register = (data) => api.post(`/auth/register`, data);

// Gọi API: đăng nhập (UC-03/14/26)
export const login = (data) => api.post(`/auth/login`, data);

// Gọi API: đăng nhập bằng Google
export const googleLogin = (data) => api.post(`/auth/google`, data);

// Gọi API: đăng xuất (UC-04/15/27)
export const logout = (data) => api.post(`/auth/logout`, data);

// Gọi API: gửi email đặt lại mật khẩu (UC-05/16)
export const forgotPassword = (data) => api.post(`/auth/forgot-password`, data);

// Gọi API: đặt mật khẩu mới bằng token
export const resetPassword = (data) => api.post(`/auth/reset-password`, data);

// Gọi API: thông tin người đang đăng nhập
export const getMe = (params) => api.get(`/auth/me`, { params });
