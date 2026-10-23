export const formatCurrency = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '');

// 16/10/2026 18:15
export const formatDateTime = (d) =>
  (d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '');

// 18:15
export const formatTime = (d) =>
  (d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');

export const formatVND = (n) =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(n) || 0)} VND`;

const unitNames = {
  'cái': 'item', 'gói': 'pack', 'chai': 'bottle', 'hộp': 'box',
  'ly': 'cup', 'lon': 'can', 'cây': 'piece', 'túi': 'bag',
};

export const formatProductUnit = (unit) => unitNames[unit] || unit || 'item';
