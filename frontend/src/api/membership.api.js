import api from './axios';

// UC-12.1 View Membership Points
export const getMyMembership = (params) => api.get(`/membership/me`, { params });

// UC-12.2 View Point History
export const getMyPointHistory = (params) => api.get(`/membership/me/history`, { params });
export const lookupMemberCode = (code) => api.get('/membership/lookup', { params: { code } });

// UC-39.1, 39.2 View / Search Members
export const listMembers = (params) => api.get(`/membership/members`, { params });

// UC-39.3 View Member Details
export const getMember = (id, params) => api.get(`/membership/members/${id}`, { params });

// UC-39.5 Adjust Membership Points
export const adjustPoints = (id, data) => api.post(`/membership/members/${id}/points`, data);

// UC-39.4 Manage Membership Tiers (xem)
export const listTiers = (params) => api.get(`/membership/tiers`, { params });

// UC-39.4 Manage Membership Tiers (thêm)
export const createTier = (data) => api.post(`/membership/tiers`, data);

// UC-39.4 Manage Membership Tiers (sửa)
export const updateTier = (id, data) => api.put(`/membership/tiers/${id}`, data);

// UC-39.4 Manage Membership Tiers (xóa)
export const deleteTier = (id) => api.delete(`/membership/tiers/${id}`);

// UC-39.6 View Point History
export const listPointHistory = (params) => api.get(`/membership/history`, { params });

// UC-39.7 View Redemption History
export const listRedemptions = (params) => api.get(`/membership/redemptions`, { params });
