import api from './axios';

// Gọi API: số liệu dashboard admin
export const getAdminDashboard = (params) => api.get('/dashboard/admin', { params });

// Gọi API: số liệu dashboard staff
export const getStaffDashboard = (params) => api.get('/dashboard/staff', { params });
