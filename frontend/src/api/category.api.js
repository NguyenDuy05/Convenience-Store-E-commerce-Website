import api from './axios';

// Gọi API: danh sách danh mục (UC-33.1)
export const listCategories = (params) => api.get(`/categories`, { params });

// Gọi API: thêm danh mục (UC-33.2)
export const createCategory = (data) => api.post(`/categories`, data);

// Gọi API: sửa danh mục (UC-33.3)
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);

// Gọi API: xóa danh mục (UC-33.4)
export const deleteCategory = (id) => api.delete(`/categories/${id}`);
