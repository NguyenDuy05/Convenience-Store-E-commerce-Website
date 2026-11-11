// Định dạng tiền VND
export const formatCurrency = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

// Định dạng ngày
export const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '');

// Định dạng ngày giờ (16/10/2026 18:15)
export const formatDateTime = (d) =>
  (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '');

// Định dạng giờ (18:15)
export const formatTime = (d) =>
  (d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
