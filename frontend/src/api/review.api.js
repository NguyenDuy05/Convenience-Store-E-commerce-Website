import api from './axios';

// Gọi API: đánh giá của sản phẩm (UC-40.1)
export const listProductReviews = (productId, params) => api.get(`/reviews/product/${productId}`, { params });

// Gọi API: đánh giá cửa hàng (UC-40.2)
export const listStoreReviews = (params) => api.get(`/reviews/store`, { params });
// Gọi API: đánh giá của tôi
export const listMyReviews = () => api.get('/reviews/mine');
// Gọi API: món còn đánh giá được
export const listEligibleReviews = () => api.get('/reviews/mine/eligible');

// Gọi API: thêm đánh giá (UC-11.1)
export const addReview = (data) => api.post(`/reviews`, data);

// Gọi API: sửa đánh giá (UC-11.2)
export const updateReview = (id, data) => api.put(`/reviews/${id}`, data);

// Gọi API: xóa đánh giá (UC-11.3)
export const deleteReview = (id) => api.delete(`/reviews/${id}`);

// Gọi API: admin xem tất cả đánh giá
export const listReviewsAdmin = (params) => api.get(`/reviews/admin/all`, { params });

// Gọi API: ẩn / hiện đánh giá (UC-40.3)
export const hideReview = (id, data) => api.patch(`/reviews/${id}/hide`, data);

// Gọi API: xử lý đánh giá vi phạm (UC-40.4)
export const handleViolatingReview = (id, data) => api.patch(`/reviews/${id}/violation`, data);
