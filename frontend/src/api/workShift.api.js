import api from './axios';

// UC-25 Manage Work Shift (catalog chưa mô tả chi tiết)
export const listMyShifts = (params) => api.get(`/work-shifts/my`, { params });

// UC-25 Manage Work Shift (vào ca)
export const clockIn = (data) => api.post(`/work-shifts/clock-in`, data);

// UC-25 Manage Work Shift (ra ca)
export const clockOut = (data) => api.post(`/work-shifts/clock-out`, data);
