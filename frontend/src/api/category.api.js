import api from './axios';

// UC-33.1 View Categories (dùng chung cho menu Guest/Customer)
export const listCategories = (params) => api.get(`/categories`, { params });

// UC-33.2 Add Category
export const createCategory = (data) => api.post(`/categories`, data);

// UC-33.3 Update Category
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);

// UC-33.4 Delete Category
export const deleteCategory = (id) => api.delete(`/categories/${id}`);
