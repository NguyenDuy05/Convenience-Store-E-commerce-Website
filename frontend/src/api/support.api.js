import api from './axios';

// UC-13.1 Submit Support Request
export const submitSupportRequest = (data) => api.post(`/support`, data);

// UC-13.2 View Support Request
export const listMySupportRequests = (params) => api.get(`/support/my`, { params });

// UC-20.3 Handle Customer Complaint (danh sách)
export const listSupportRequests = (params) => api.get(`/support`, { params });

// UC-20.3 Handle Customer Complaint
export const handleComplaint = (id, data) => api.patch(`/support/${id}/handle`, data);
