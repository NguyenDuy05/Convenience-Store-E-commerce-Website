import api from './axios';

// UC-08.1 Create Order. Header Idempotency-Key: gửi lại cùng khoá thì server trả lại đúng đơn cũ, không tạo đơn thứ hai.
// data: { paymentMethod: 'cash'|'vnpay'|'momo', discountCode?, customerNote?, expectedTotal } -> { order, replayed }
export const createOrder = (data, idempotencyKey) =>
  api.post(`/orders`, data, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined);

// UC-08.1 Xem trước đơn: giá, khuyến mãi, mã giảm giá, tồn kho tại thời điểm hiện tại
export const previewCheckout = (data) => api.post(`/orders/preview`, data);

// UC-09.1 View Orders (query: status, page, limit) -> { items, total, page, limit, counts, store }
export const listMyOrders = (params) => api.get(`/orders/my`, { params });

// UC-09.2 View Order Details (404 nếu đơn không tồn tại hoặc không thuộc khách)
export const getMyOrder = (id, params) => api.get(`/orders/my/${id}`, { params });

// UC-09.3 Track Order Status -> { status, statusHistory, updatedAt, serverTime, fulfillment, store, ... }
export const trackMyOrder = (id) => api.get(`/orders/my/${id}/tracking`);

// UC-09.4 View Order History (query: status=completed|failed, from, to (ISO), page, limit) -> { items, total, page, limit, summary, store }
export const listMyOrderHistory = (params) => api.get(`/orders/my/history`, { params });

// UC-22 Create Store Order
export const createStoreOrder = (data) => api.post(`/orders/store`, data);

// UC-34.1 View Orders + UC-34.2 Search Orders (Admin)
// params: { q, status, source, paymentStatus, paymentMethod, from, to (ISO), hasIssue: '1', sort, page, limit }
// -> { items, total, page, limit, counts, openIssueTotal }
export const listOrders = (params) => api.get(`/orders`, { params });

// UC-34.3 View Order Details (Admin) -> đơn đầy đủ: khách, sản phẩm, giao dịch, lịch sử trạng thái, sự cố, nextTransition
export const getOrder = (id, params) => api.get(`/orders/${id}`, { params });

// Chuyển trạng thái đơn theo thứ tự confirmed -> preparing -> ready_for_pickup -> completed. data: { status, note?, cashCollected? }
export const updateOrderStatus = (id, data) => api.patch(`/orders/${id}/status`, data);

// UC-34.4 Handle Order Issue: báo sự cố { description } rồi xử lý xong { resolution }
export const handleOrderIssue = (id, data) => api.post(`/orders/${id}/issues`, data);
export const resolveOrderIssue = (id, issueId, data) => api.patch(`/orders/${id}/issues/${issueId}`, data);
