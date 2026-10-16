import api from './axios';

// UC-19.1, 34.1 View Inventory
export const listInventory = (params) => api.get(`/inventory`, { params });

// UC-19.2 Receive Stock
export const receiveStock = (data) => api.post(`/inventory/receive`, data);

// UC-19.3, 34.2 Adjust Inventory
export const adjustInventory = (data) => api.post(`/inventory/adjust`, data);

// UC-19.4, 34.3 Stocktake (danh sách phiên kiểm kê)
export const listStocktakes = (params) => api.get(`/inventory/stocktakes`, { params });

// UC-19.4, 34.3 Stocktake (tạo phiên kiểm kê)
export const createStocktake = (data) => api.post(`/inventory/stocktakes`, data);

// UC-19.4, 34.3 Stocktake (hoàn tất, cập nhật tồn kho)
export const completeStocktake = (id, data) => api.patch(`/inventory/stocktakes/${id}/complete`, data);

// UC-19.5, 34.4 View Low Stock Products
export const listLowStock = (params) => api.get(`/inventory/low-stock`, { params });

// UC-19.6 View Expired Products
export const listExpired = (params) => api.get(`/inventory/expired`, { params });

// UC-34.5 View Out of Stock Products
export const listOutOfStock = (params) => api.get(`/inventory/out-of-stock`, { params });

// UC-19.7 Manage Damaged Products (xem)
export const listDamaged = (params) => api.get(`/inventory/damaged`, { params });

// UC-19.7 Manage Damaged Products (ghi nhận)
export const recordDamaged = (data) => api.post(`/inventory/damaged`, data);

// UC-34.6 View Inventory History
export const getInventoryHistory = (params) => api.get(`/inventory/history`, { params });
