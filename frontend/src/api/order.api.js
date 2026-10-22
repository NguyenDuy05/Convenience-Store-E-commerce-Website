import api from './axios';

// UC-09.1 Create Order
export const createOrder = (data) => api.post(`/orders`, data);

// UC-09.1 View Orders (query: status, page, limit) -> { items, total, page, limit, counts, store }
export const listMyOrders = (params) => api.get(`/orders/my`, { params });

// UC-09.2 View Order Details (404 nếu đơn không tồn tại hoặc không thuộc khách)
export const getMyOrder = (id, params) => api.get(`/orders/my/${id}`, { params });

// UC-22 Create Store Order
export const createStoreOrder = (data) => api.post(`/orders/store`, data);

// UC-35.1, 35.2 View / Search Orders
export const listOrders = (params) => api.get(`/orders`, { params });

// UC-35.3 View Order Details
export const getOrder = (id, params) => api.get(`/orders/${id}`, { params });

// Chuyển trạng thái đơn: preparing, ready_for_pickup, completed
export const updateOrderStatus = (id, data) => api.patch(`/orders/${id}/status`, data);

// UC-35.4 Handle Order Issue
export const handleOrderIssue = (id, data) => api.post(`/orders/${id}/issues`, data);
