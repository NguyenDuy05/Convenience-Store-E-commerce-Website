export const formatCurrency = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '');
