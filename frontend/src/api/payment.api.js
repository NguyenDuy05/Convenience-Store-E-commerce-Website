import api from './axios';

// Gọi API: tạo link thanh toán VNPay (UC-08.2)
export const createOnlinePayment = (data) => api.post(`/payments/online`, data);

// Gọi API: kết quả VNPay chuyển về
export const vnpayReturn = (params) => api.get(`/payments/vnpay/return`, { params });

// Gọi API: IPN của VNPay
export const vnpayIpn = (params) => api.get(`/payments/vnpay/ipn`, { params });

// Gọi API: thu tiền mặt (UC-23.1)
export const processCashPayment = (data) => api.post(`/payments/cash`, data);

// Gọi API: thu tiền thẻ / ví (UC-23.2)
export const processCardPayment = (data) => api.post(`/payments/card`, data);

// Gọi API: tất cả giao dịch (UC-41.1)
export const listPayments = (params) => api.get(`/payments/admin`, { params });

// Gọi API: giao dịch thất bại (UC-41.2)
export const listFailedPayments = (params) => api.get(`/payments/admin/failed`, { params });

// Gọi API: giao dịch đang chờ (UC-41.3)
export const listPendingPayments = (params) => api.get(`/payments/admin/pending`, { params });

// Gọi API: xử lý giao dịch lỗi (UC-41.4)
export const handlePaymentError = (id, data) => api.patch(`/payments/admin/${id}/resolve`, data);

// Gọi API: đơn tại quầy chờ thu tiền
export const listStoreOrdersToPay = (params) => api.get(`/payments/orders`, { params });

// Gọi API: dữ liệu hóa đơn để in
export const getReceipt = (orderId) => api.get(`/payments/receipt/${orderId}`);
