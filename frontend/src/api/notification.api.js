import api from './axios';
// Gọi API: thông báo của tôi
export const listNotifications = (params) => api.get('/notifications', { params });
// Gọi API: đánh dấu đã đọc một thông báo
export const readNotification = (id) => api.patch(`/notifications/${id}/read`);
// Gọi API: đánh dấu đã đọc tất cả
export const readAllNotifications = () => api.patch('/notifications/read-all');
// Gọi API: admin xem thông báo đã soạn
export const listManagedNotifications = (params) => api.get('/notifications/admin', { params });
// Gọi API: admin tạo thông báo
export const createNotification = (body) => api.post('/notifications/admin', body);
// Gọi API: admin sửa thông báo
export const updateNotification = (id, body) => api.put(`/notifications/admin/${id}`, body);
// Gọi API: admin đăng thông báo
export const publishNotification = (id) => api.patch(`/notifications/admin/${id}/publish`);
// Gọi API: admin gỡ thông báo
export const archiveNotification = (id) => api.patch(`/notifications/admin/${id}/archive`);
// Gọi API: xem cấu hình thông báo tự động
export const getNotificationSettings = () => api.get('/notifications/settings');
// Gọi API: lưu cấu hình thông báo tự động
export const saveNotificationSettings = (body) => api.put('/notifications/settings', body);
