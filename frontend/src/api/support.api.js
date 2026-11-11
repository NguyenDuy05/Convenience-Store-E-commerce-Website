import api from './axios';

// Gọi API: khách gửi yêu cầu hỗ trợ
export const submitSupportRequest = (data) => api.post(`/support`, data);

// Gọi API: yêu cầu hỗ trợ của tôi
export const listMySupportRequests = (params) => api.get(`/support/my`, { params });

// Gọi API: staff xem yêu cầu / khiếu nại (UC-19.3)
export const listSupportRequests = (params) => api.get(`/support`, { params });

// Gọi API: chi tiết yêu cầu / khiếu nại
export const getSupportRequest = (id) => api.get(`/support/${id}`);

// Gọi API: phản hồi / chuyển trạng thái khiếu nại
export const handleComplaint = (id, data, idempotencyKey) =>
  api.patch(`/support/${id}/handle`, data, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined);
