import api from './axios';

// Gọi API: ca làm của tôi
export const listMyShifts = (params) => api.get(`/work-shifts/my`, { params });

// Gọi API: vào ca
export const clockIn = (data) => api.post(`/work-shifts/clock-in`, data);

// Gọi API: ra ca
export const clockOut = (data) => api.post(`/work-shifts/clock-out`, data);

// Gọi API: admin xem chấm công
export const listShifts = (params) => api.get('/work-shifts', { params });
// Gọi API: admin gỡ nhân viên khỏi ca
export const deleteShift = (id) => api.delete(`/work-shifts/${id}`);
// Gọi API: admin chốt ca quên ra
export const closeShift = (id, data) => api.patch(`/work-shifts/${id}/close`, data);

// Gọi API: admin xem ca trống
export const listSlots = (params) => api.get('/work-shifts/slots', { params });
// Gọi API: admin mở ca trống
export const createSlots = (data) => api.post('/work-shifts/slots', data);
// Gọi API: admin sửa ca trống
export const updateSlot = (id, data) => api.put(`/work-shifts/slots/${id}`, data);
// Gọi API: admin xóa ca trống
export const deleteSlot = (id) => api.delete(`/work-shifts/slots/${id}`);
// Gọi API: nhân viên xem ca trống
export const listOpenSlots = (params) => api.get('/work-shifts/open', { params });
// Gọi API: nhân viên nhận ca
export const claimSlot = (id) => api.post(`/work-shifts/slots/${id}/claim`);
// Gọi API: nhân viên hủy nhận ca
export const releaseShift = (id) => api.post(`/work-shifts/${id}/release`);
