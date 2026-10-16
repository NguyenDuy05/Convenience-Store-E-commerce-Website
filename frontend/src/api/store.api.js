import api from './axios';

// UC-31.1 View Stores
export const listStores = (params) => api.get(`/stores`, { params });

// UC-31.2 Add Store
export const addStore = (data) => api.post(`/stores`, data);

// UC-31.3 Update Store
export const updateStore = (id, data) => api.put(`/stores/${id}`, data);

// UC-31.4 Close Store
export const closeStore = (id, data) => api.patch(`/stores/${id}/close`, data);

// UC-31.5 Open Store
export const openStore = (id, data) => api.patch(`/stores/${id}/open`, data);

// UC-31.6 Update Store Hours
export const updateStoreHours = (id, data) => api.put(`/stores/${id}/hours`, data);
