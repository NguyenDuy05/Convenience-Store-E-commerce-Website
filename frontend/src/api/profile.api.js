import api from './axios';

// UC-06.1/17.1/28.1 View Profile
export const getProfile = (params) => api.get(`/profile`, { params });

// UC-06.2/17.2/28.2 Update Profile
export const updateProfile = (data) => api.put(`/profile`, data);

// UC-06.3/17.3/28.3 Change Password
export const changePassword = (data) => api.put(`/profile/password`, data);
