import api from './axios';

// Gọi API: xem / tìm sản phẩm
export const listProducts = (params) => api.get(`/products`, { params });

// Gọi API: chi tiết sản phẩm
export const getProduct = (id, params) => api.get(`/products/${id}`, { params });

// Gọi API: thêm sản phẩm
export const createProduct = (data) => api.post(`/products`, data);

// Gọi API: sửa sản phẩm
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);

// Gọi API: đổi giá (UC-32.6)
export const updateProductPrice = (id, data) => api.patch(`/products/${id}/price`, data);

// Gọi API: bật bán sản phẩm
export const activateProduct = (id, data) => api.patch(`/products/${id}/activate`, data);

// Gọi API: tắt bán sản phẩm
export const deactivateProduct = (id, data) => api.patch(`/products/${id}/deactivate`, data);

// Gọi API: xóa sản phẩm
export const deleteProduct = (id) => api.delete(`/products/${id}`);
