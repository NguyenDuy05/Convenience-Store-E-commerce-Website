// Nhãn tiếng Việt + biểu tượng cho trạng thái đơn và thanh toán (khớp enum trong backend/src/models/Order.js)
export const ORDER_STATUS = {
  pending_payment: { label: 'Chờ thanh toán', icon: 'payments', tone: 'warn' },
  confirmed: { label: 'Đã xác nhận', icon: 'task_alt', tone: 'info' },
  preparing: { label: 'Đang chuẩn bị', icon: 'schedule', tone: 'info' },
  ready_for_pickup: { label: 'Sẵn sàng nhận hàng', icon: 'storefront', tone: 'success' },
  completed: { label: 'Đã nhận hàng', icon: 'check_circle', tone: 'neutral' },
  failed: { label: 'Thanh toán lỗi', icon: 'error', tone: 'error' },
};

// Thứ tự các tab lọc trên trang danh sách
export const ORDER_TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'pending_payment', label: 'Chờ thanh toán' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'preparing', label: 'Đang chuẩn bị' },
  { key: 'ready_for_pickup', label: 'Sẵn sàng nhận' },
  { key: 'completed', label: 'Đã nhận hàng' },
  { key: 'failed', label: 'Thanh toán lỗi' },
];

// Đơn còn đang xử lý (chưa nhận hàng, chưa lỗi)
export const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];

export const PAYMENT_METHOD = { cash: 'Tiền mặt', card: 'Thẻ', vnpay: 'VNPay', momo: 'MoMo' };
export const PAYMENT_STATUS = {
  unpaid: { label: 'Chưa thanh toán', tone: 'warn' },
  paid: { label: 'Đã thanh toán', tone: 'success' },
  failed: { label: 'Thanh toán lỗi', tone: 'error' },
};

// Một dòng mô tả thanh toán cho thẻ đơn: "Đã thanh toán • VNPay", "Trả tiền mặt khi nhận hàng"...
export function paymentSummary(order) {
  const method = PAYMENT_METHOD[order.paymentMethod];
  if (order.paymentStatus === 'paid') {
    if (order.paymentMethod === 'cash') return 'Đã thanh toán tiền mặt';
    if (order.paymentMethod === 'card') return 'Đã thanh toán bằng thẻ';
    return method ? `Đã thanh toán qua ${method}` : 'Đã thanh toán';
  }
  if (order.paymentStatus === 'failed') return method ? `Thanh toán ${method} lỗi` : 'Thanh toán lỗi';
  if (order.paymentMethod === 'cash') return 'Trả tiền mặt khi nhận hàng';
  return method ? `Chưa thanh toán (${method})` : 'Chưa thanh toán';
}
