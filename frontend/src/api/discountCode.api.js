import api from './axios';

// Kiểm tra mã giảm giá khi checkout (ngoài catalog UC)
export const validateDiscountCode = (data) => api.post(`/discount-codes/validate`, data);

// UC-38.1 View Discount Codes
export const listDiscountCodes = (params) => api.get(`/discount-codes`, { params });

// UC-38.2 Create Discount Code
export const createDiscountCode = (data) => api.post(`/discount-codes`, data);

// UC-38.3 Update Discount Code
export const updateDiscountCode = (id, data) => api.put(`/discount-codes/${id}`, data);

// UC-38.4 Activate Discount Code
export const activateDiscountCode = (id, data) => api.patch(`/discount-codes/${id}/activate`, data);

// UC-38.5 Suspend Discount Code
export const suspendDiscountCode = (id, data) => api.patch(`/discount-codes/${id}/suspend`, data);

// UC-38.6 Delete Discount Code
export const deleteDiscountCode = (id) => api.delete(`/discount-codes/${id}`);
