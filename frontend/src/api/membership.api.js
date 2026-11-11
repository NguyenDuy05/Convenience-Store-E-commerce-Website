import api from './axios';

// Gọi API: điểm và hạng của khách (UC-12.1)
export const getMyMembership = (params) => api.get(`/membership/me`, { params });

// Gọi API: lịch sử điểm của khách (UC-12.2)
export const getMyPointHistory = (params) => api.get(`/membership/me/history`, { params });
// Gọi API: tra mã thành viên
export const lookupMemberCode = (code) => api.get('/membership/lookup', { params: { code } });

// Gọi API: danh sách thành viên (UC-39.1/39.2)
export const listMembers = (params) => api.get(`/membership/members`, { params });

// Gọi API: chi tiết thành viên (UC-39.3)
export const getMember = (id, params) => api.get(`/membership/members/${id}`, { params });

// Gọi API: cộng / trừ điểm (UC-39.5)
export const adjustPoints = (id, data) => api.post(`/membership/members/${id}/points`, data);

// Gọi API: danh sách hạng
export const listTiers = (params) => api.get(`/membership/tiers`, { params });

// Gọi API: thêm hạng
export const createTier = (data) => api.post(`/membership/tiers`, data);

// Gọi API: sửa hạng
export const updateTier = (id, data) => api.put(`/membership/tiers/${id}`, data);

// Gọi API: xóa hạng
export const deleteTier = (id) => api.delete(`/membership/tiers/${id}`);

// Gọi API: lịch sử điểm (UC-39.6)
export const listPointHistory = (params) => api.get(`/membership/history`, { params });

// Gọi API: lịch sử đổi điểm (UC-39.7)
export const listRedemptions = (params) => api.get(`/membership/redemptions`, { params });
