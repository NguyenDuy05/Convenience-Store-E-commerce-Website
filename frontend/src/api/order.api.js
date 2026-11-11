import api from './axios';

// Gọi API: tạo đơn (UC-08.1, có Idempotency-Key)
export const createOrder = (data, idempotencyKey) =>
  api.post(`/orders`, data, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined);

// Gọi API: xem trước đơn
export const previewCheckout = (data) => api.post(`/orders/preview`, data);

// Gọi API: đơn của tôi (UC-09.1)
export const listMyOrders = (params) => api.get(`/orders/my`, { params });

// Gọi API: chi tiết đơn của tôi (UC-09.2)
export const getMyOrder = (id, params) => api.get(`/orders/my/${id}`, { params });

// Gọi API: theo dõi đơn (UC-09.3)
export const trackMyOrder = (id) => api.get(`/orders/my/${id}/tracking`);

// Gọi API: lịch sử đơn (UC-09.4)
export const listMyOrderHistory = (params) => api.get(`/orders/my/history`, { params });

// Gọi API: tạo đơn tại quầy (UC-22)
export const createStoreOrder = (data) => api.post(`/orders/store`, data);
// Gọi API: báo giá hóa đơn tại quầy
export const quoteStoreOrder = (data) => api.post(`/orders/store/quote`, data);
// Gọi API: chốt bán tại quầy (POS)
export const checkoutPosSale = (data) => api.post('/orders/store/checkout', data);
// Gọi API: staff xem hàng đợi / lịch sử đơn
export const listStaffOrders = (params) => api.get('/orders/staff', { params });
// Gọi API: staff xem chi tiết đơn
export const getStaffOrder = (id) => api.get(`/orders/staff/${id}`);
// Gọi API: staff chuyển trạng thái đơn
export const updateStaffOrder = (id, data) => api.patch(`/orders/staff/${id}/status`, data);
// Gọi API: staff hủy đơn
export const cancelStaffOrder = (id, data) => api.post(`/orders/staff/${id}/cancel`, data);

// Gọi API: admin xem / tìm đơn (UC-34.1/34.2)
export const listOrders = (params) => api.get(`/orders`, { params });

// Gọi API: admin xem chi tiết đơn (UC-34.3)
export const getOrder = (id, params) => api.get(`/orders/${id}`, { params });

// Gọi API: admin chuyển trạng thái đơn
export const updateOrderStatus = (id, data) => api.patch(`/orders/${id}/status`, data);

// Gọi API: ghi nhận sự cố đơn (UC-34.4)
export const handleOrderIssue = (id, data) => api.post(`/orders/${id}/issues`, data);
// Gọi API: đóng sự cố đơn
export const resolveOrderIssue = (id, issueId, data) => api.patch(`/orders/${id}/issues/${issueId}`, data);

// Gọi API: admin hủy đơn
export const cancelOrder = (id, data) => api.post(`/orders/${id}/cancel`, data);

// Gọi API: lịch sử hoàn tiền
export const listRefunds = (params) => api.get(`/orders/refunds`, { params });
