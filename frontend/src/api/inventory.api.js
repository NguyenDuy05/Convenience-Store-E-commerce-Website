import api from './axios';

// Gọi API: xem tồn kho (UC-19.1/34.1)
export const listInventory = (params) => api.get(`/inventory`, { params });

// Gọi API: nhập hàng (UC-19.2)
export const receiveStock = (data) => api.post(`/inventory/receive`, data);

// Gọi API: điều chỉnh tồn kho (UC-19.3/34.2)
export const adjustInventory = (data) => api.post(`/inventory/adjust`, data);

// Gọi API: danh sách phiên kiểm kê
export const listStocktakes = (params) => api.get(`/inventory/stocktakes`, { params });

// Gọi API: tạo phiên kiểm kê
export const createStocktake = (data) => api.post(`/inventory/stocktakes`, data);

// Gọi API: hoàn tất kiểm kê
export const completeStocktake = (id, data) => api.patch(`/inventory/stocktakes/${id}/complete`, data);

// Gọi API: sản phẩm sắp hết hàng
export const listLowStock = (params) => api.get(`/inventory/low-stock`, { params });

// Gọi API: lô đã hết hạn
export const listExpired = (params) => api.get(`/inventory/expired`, { params });

// Gọi API: sản phẩm hết hàng
export const listOutOfStock = (params) => api.get(`/inventory/out-of-stock`, { params });

// Gọi API: lịch sử hàng hỏng
export const listDamaged = (params) => api.get(`/inventory/damaged`, { params });

// Gọi API: ghi nhận hàng hỏng
export const recordDamaged = (data) => api.post(`/inventory/damaged`, data);

// Gọi API: lịch sử biến động kho
export const getInventoryHistory = (params) => api.get(`/inventory/history`, { params });

// Gọi API: các lô còn hàng của một sản phẩm
export const getProductStock = (productId) => api.get(`/inventory/product/${productId}`);
