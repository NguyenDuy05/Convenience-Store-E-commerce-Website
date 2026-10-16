import api from './axios';

// UC-02.1/02.3, 18.1/18.2, 32.1/32.2 View / Search Products
export const listProducts = (params) => api.get(`/products`, { params });

// UC-02.2, 18.3, 32.3 View Product Details
export const getProduct = (id, params) => api.get(`/products/${id}`, { params });

// UC-18.4, 32.4 Add Product
export const createProduct = (data) => api.post(`/products`, data);

// UC-18.5, 32.5 Update Product
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);

// UC-32.6 Update Product Price
export const updateProductPrice = (id, data) => api.patch(`/products/${id}/price`, data);

// UC-32.8 Activate Product
export const activateProduct = (id, data) => api.patch(`/products/${id}/activate`, data);

// UC-32.9 Deactivate Product
export const deactivateProduct = (id, data) => api.patch(`/products/${id}/deactivate`, data);

// UC-18.6, 32.7 Delete Product
export const deleteProduct = (id) => api.delete(`/products/${id}`);
