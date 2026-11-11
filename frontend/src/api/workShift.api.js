import api from './axios';

// UC-25 Manage Work Shift (catalog chưa mô tả chi tiết)
export const listMyShifts = (params) => api.get(`/work-shifts/my`, { params });

// UC-25 Manage Work Shift (vào ca)
export const clockIn = (data) => api.post(`/work-shifts/clock-in`, data);

// UC-25 Manage Work Shift (ra ca)
export const clockOut = (data) => api.post(`/work-shifts/clock-out`, data);

// Admin: Manage Work Shifts
export const listShifts = (params) => api.get('/work-shifts', { params });
export const deleteShift = (id) => api.delete(`/work-shifts/${id}`);
export const closeShift = (id, data) => api.patch(`/work-shifts/${id}/close`, data);

// Ca trống: admin mở ca, nhân viên tự nhận
export const listSlots = (params) => api.get('/work-shifts/slots', { params });
export const createSlots = (data) => api.post('/work-shifts/slots', data);
export const updateSlot = (id, data) => api.put(`/work-shifts/slots/${id}`, data);
export const deleteSlot = (id) => api.delete(`/work-shifts/slots/${id}`);
export const listOpenSlots = (params) => api.get('/work-shifts/open', { params });
export const claimSlot = (id) => api.post(`/work-shifts/slots/${id}/claim`);
export const releaseShift = (id) => api.post(`/work-shifts/${id}/release`);
