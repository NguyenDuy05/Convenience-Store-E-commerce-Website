import api from './axios';

// UC-30.1 View Staff
export const listStaff = (params) => api.get(`/staff`, { params });

// UC-30.2 Add Staff
export const addStaff = (data) => api.post(`/staff`, data);

// UC-30.3 Update Staff
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data);

// UC-30.4 Lock Staff Account
export const lockStaff = (id, data) => api.patch(`/staff/${id}/lock`, data);

// UC-30.5 Unlock Staff Account
export const unlockStaff = (id, data) => api.patch(`/staff/${id}/unlock`, data);

// UC-30.6 View Staff Activity History
export const getStaffActivity = (id, params) => api.get(`/staff/${id}/activity`, { params });
