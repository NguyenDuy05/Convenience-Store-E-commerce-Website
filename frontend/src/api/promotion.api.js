import api from './axios';

// Gọi API: khuyến mãi đang chạy
export const listPromotions = (params) => api.get(`/promotions`, { params });

// Gọi API: tính thử khuyến mãi cho hóa đơn
export const applyPromotion = (data) => api.post(`/promotions/apply`, data);

// Gọi API: admin xem tất cả khuyến mãi
export const listAllPromotions = (params) => api.get(`/promotions/manage`, { params });

// Gọi API: tạo khuyến mãi
export const createPromotion = (data) => api.post(`/promotions`, data);

// Gọi API: sửa khuyến mãi
export const updatePromotion = (id, data) => api.put(`/promotions/${id}`, data);

// Gọi API: kích hoạt khuyến mãi
export const activatePromotion = (id, data) => api.patch(`/promotions/${id}/activate`, data);

// Gọi API: tạm ngưng khuyến mãi
export const suspendPromotion = (id, data) => api.patch(`/promotions/${id}/suspend`, data);

// Gọi API: xóa khuyến mãi
export const deletePromotion = (id) => api.delete(`/promotions/${id}`);
