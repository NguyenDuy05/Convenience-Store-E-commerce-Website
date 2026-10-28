import api from './axios';

// UC-12.1 Submit Support Request
export const submitSupportRequest = (data) => api.post(`/support`, data);

// UC-12.2 View Support Request
export const listMySupportRequests = (params) => api.get(`/support/my`, { params });

// UC-19.3 Handle Customer Complaint: danh sách (query: status, type, q, page, limit) -> { items, total, page, limit, counts }
export const listSupportRequests = (params) => api.get(`/support`, { params });

// UC-19.3: chi tiết một yêu cầu/khiếu nại kèm allowedStatuses
export const getSupportRequest = (id) => api.get(`/support/${id}`);

// UC-19.3: phản hồi và/hoặc chuyển trạng thái. data: { message?, status? }; idempotencyKey gửi lại thì không ghi trùng phản hồi
export const handleComplaint = (id, data, idempotencyKey) =>
  api.patch(`/support/${id}/handle`, data, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined);
