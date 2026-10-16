import api from './axios';

// UC-02.4, 21.1 View Promotions (đang hoạt động)
export const listPromotions = (params) => api.get(`/promotions`, { params });

// UC-21.2 Apply Promotion
export const applyPromotion = (data) => api.post(`/promotions/apply`, data);

// UC-37.1 View Promotions (tất cả trạng thái)
export const listAllPromotions = (params) => api.get(`/promotions/manage`, { params });

// UC-37.2 Create Promotion
export const createPromotion = (data) => api.post(`/promotions`, data);

// UC-37.3 Update Promotion
export const updatePromotion = (id, data) => api.put(`/promotions/${id}`, data);

// UC-37.4 Activate Promotion
export const activatePromotion = (id, data) => api.patch(`/promotions/${id}/activate`, data);

// UC-37.5 Suspend Promotion
export const suspendPromotion = (id, data) => api.patch(`/promotions/${id}/suspend`, data);

// UC-37.6 Delete Promotion
export const deletePromotion = (id) => api.delete(`/promotions/${id}`);
