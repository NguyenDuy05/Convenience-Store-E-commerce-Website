import api from './axios';

// UC-07.1 View Cart
export const getCart = (params) => api.get(`/cart`, { params });

// UC-07.2 Add Product
export const addCartItem = (data) => api.post(`/cart/items`, data);

// UC-07.3 Update Cart Item
export const updateCartItem = (productId, data) => api.put(`/cart/items/${productId}`, data);

// UC-07.4 Remove Cart Item
export const removeCartItem = (productId) => api.delete(`/cart/items/${productId}`);

// Tính năng đặc biệt: 4 giỏ hàng gợi ý theo ngân sách (ngoài catalog UC)
export const getCartSuggestions = (params) => api.get(`/cart/suggestions`, { params });
