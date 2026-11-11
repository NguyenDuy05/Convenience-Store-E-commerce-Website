export const formatCurrency = (n) => `${String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;
export const formatNumber = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const p2 = (x) => String(x).padStart(2, '0');
export const formatDate = (d) => { if (!d) return ''; const x = new Date(d); return `${p2(x.getDate())}/${p2(x.getMonth() + 1)}/${x.getFullYear()}`; };
export const formatTime = (d) => { if (!d) return ''; const x = new Date(d); return `${p2(x.getHours())}:${p2(x.getMinutes())}`; };
export const formatDateTime = (d) => (d ? `${formatDate(d)} ${formatTime(d)}` : '');
export const newIdempotencyKey = () => `k-${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
export const errMsg = (err, fallback = 'Có lỗi xảy ra. Vui lòng thử lại.') => {
  if (!err?.response) return 'Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API.';
  return err.response.data?.message || fallback;
};
