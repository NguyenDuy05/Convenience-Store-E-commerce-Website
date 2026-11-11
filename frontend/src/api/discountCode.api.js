import api from './axios';

// Gọi API: kiểm tra mã giảm giá
export const validateDiscountCode = (data) => api.post(`/discount-codes/validate`, data);

// Gọi API: danh sách mã (UC-38.1)
export const listDiscountCodes = (params) => api.get(`/discount-codes`, { params });

// Gọi API: tạo mã (UC-38.2)
export const createDiscountCode = (data) => api.post(`/discount-codes`, data);

// Gọi API: sửa mã (UC-38.3)
export const updateDiscountCode = (id, data) => api.put(`/discount-codes/${id}`, data);

// Gọi API: kích hoạt mã (UC-38.4)
export const activateDiscountCode = (id, data) => api.patch(`/discount-codes/${id}/activate`, data);

// Gọi API: tạm ngưng mã (UC-38.5)
export const suspendDiscountCode = (id, data) => api.patch(`/discount-codes/${id}/suspend`, data);

// Gọi API: xóa mã (UC-38.6)
export const deleteDiscountCode = (id) => api.delete(`/discount-codes/${id}`);
