import api from './axios';

// Gọi API: ví của khách (số dư + lịch sử)
export const getWallet = (params) => api.get('/wallet', { params });
// Gọi API: khách gửi yêu cầu rút tiền từ ví về ngân hàng
export const requestWithdrawal = (data) => api.post('/wallet/withdrawals', data);
// Gọi API: khách xem các yêu cầu rút tiền của mình
export const listMyWithdrawals = () => api.get('/wallet/withdrawals');
// Gọi API: admin xem yêu cầu rút tiền
export const listWithdrawals = (params) => api.get('/wallet/admin/withdrawals', { params });
// Gọi API: admin xác nhận đã chuyển khoản / từ chối yêu cầu rút tiền
export const processWithdrawal = (id, data) => api.patch(`/wallet/admin/withdrawals/${id}`, data);
