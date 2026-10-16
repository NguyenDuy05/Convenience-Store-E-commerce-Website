import api from './axios';

// UC-09.2 Make Payment (tạo link VNPay/Momo)
export const createOnlinePayment = (data) => api.post(`/payments/online`, data);

// VNPay chuyển hướng trình duyệt về sau khi thanh toán
export const vnpayReturn = (params) => api.get(`/payments/vnpay/return`, { params });

// VNPay gọi server báo kết quả (IPN)
export const vnpayIpn = (params) => api.get(`/payments/vnpay/ipn`, { params });

// Momo gọi server báo kết quả (IPN)
export const momoIpn = (data) => api.post(`/payments/momo/ipn`, data);

// UC-23.1 Process Cash Payment
export const processCashPayment = (data) => api.post(`/payments/cash`, data);

// UC-23.2 Process Card/E-wallet Payment
export const processCardPayment = (data) => api.post(`/payments/card`, data);

// UC-41.1 View Payment Transactions
export const listPayments = (params) => api.get(`/payments/admin`, { params });

// UC-41.2 View Failed Payments
export const listFailedPayments = (params) => api.get(`/payments/admin/failed`, { params });

// UC-41.3 View Pending Payments
export const listPendingPayments = (params) => api.get(`/payments/admin/pending`, { params });

// UC-41.4 Handle Payment Error
export const handlePaymentError = (id, data) => api.patch(`/payments/admin/${id}/resolve`, data);
