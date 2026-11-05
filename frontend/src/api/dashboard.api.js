import api from './axios';

// GET /api/dashboard/admin?range=today|7d|30d|90d|custom&from=YYYY-MM-DD&to=YYYY-MM-DD (admin)
export const getAdminDashboard = (params) => api.get('/dashboard/admin', { params });

// GET /api/dashboard/staff?range=... (staff, admin)
export const getStaffDashboard = (params) => api.get('/dashboard/staff', { params });