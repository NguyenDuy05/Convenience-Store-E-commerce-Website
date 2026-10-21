import api from './axios';

// UC-40.1 View Product Reviews
export const listProductReviews = (productId, params) => api.get(`/reviews/product/${productId}`, { params });

// UC-40.2 View Store Reviews
export const listStoreReviews = (params) => api.get(`/reviews/store`, { params });
export const listMyReviews = () => api.get('/reviews/mine');
export const listEligibleReviews = () => api.get('/reviews/mine/eligible');

// UC-11.1 Add Review
export const addReview = (data) => api.post(`/reviews`, data);

// UC-11.2 Update Review
export const updateReview = (id, data) => api.put(`/reviews/${id}`, data);

// UC-11.3 Delete Review
export const deleteReview = (id) => api.delete(`/reviews/${id}`);

// UC-40.1, 40.2 Admin review list, including hidden and deleted reviews
export const listReviewsAdmin = (params) => api.get(`/reviews/admin/all`, { params });

// UC-40.3 Hide Review
export const hideReview = (id, data) => api.patch(`/reviews/${id}/hide`, data);

// UC-40.4 Handle Violating Review
export const handleViolatingReview = (id, data) => api.patch(`/reviews/${id}/violation`, data);
