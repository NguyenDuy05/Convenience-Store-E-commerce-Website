import api from './axios';

// Phát sự kiện giỏ hàng thay đổi để header cập nhật số lượng
const publishCart = (response) => {
  window.dispatchEvent(new CustomEvent('quick:cart-updated', { detail: { itemCount: response.data.itemCount } }));
  return response;
};

// Gọi API: xem giỏ hàng (UC-07.1)
export const getCart = (params) => api.get(`/cart`, { params });

// Gọi API: thêm sản phẩm vào giỏ (UC-07.2)
export const addCartItem = (data) => api.post(`/cart/items`, data).then(publishCart);

// Gọi API: đổi số lượng (UC-07.3)
export const updateCartItem = (productId, data) => api.put(`/cart/items/${productId}`, data).then(publishCart);

// Gọi API: xóa sản phẩm khỏi giỏ (UC-07.4)
export const removeCartItem = (productId) => api.delete(`/cart/items/${productId}`).then(publishCart);

// Gọi API: gợi ý giỏ hàng theo ngân sách (backend chưa làm)
export const getCartSuggestions = (params) => api.get(`/cart/suggestions`, { params });
