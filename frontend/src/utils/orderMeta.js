// Order status badges shared by order pages and support request details.
export const ORDER_STATUS = {
  pending_payment: { label: 'Pending payment', icon: 'payments', tone: 'warn' },
  confirmed: { label: 'Confirmed', icon: 'task_alt', tone: 'info' },
  preparing: { label: 'Preparing', icon: 'schedule', tone: 'info' },
  ready_for_pickup: { label: 'Ready for pickup', icon: 'storefront', tone: 'success' },
  completed: { label: 'Completed', icon: 'check_circle', tone: 'neutral' },
  failed: { label: 'Payment failed', icon: 'error', tone: 'error' },
  cancelled: { label: 'Cancelled', icon: 'cancel', tone: 'error' },
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
  { key: 'cancelled', label: 'Đã hủy' },
];

// Đơn còn đang xử lý (chưa nhận hàng, chưa lỗi)
export const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];

export const PAYMENT_METHOD = { cash: 'Tiền mặt', card: 'Thẻ', vnpay: 'VNPay', momo: 'MoMo' };
export const PAYMENT_STATUS = {
  unpaid: { label: 'Chưa thanh toán', tone: 'warn' },
  paid: { label: 'Đã thanh toán', tone: 'success' },
  failed: { label: 'Thanh toán lỗi', tone: 'error' },
  refunded: { label: 'Đã hoàn tiền', tone: 'neutral' },
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

// Thông điệp ngắn theo trạng thái (dùng ở trang chi tiết và trang theo dõi)
export const ORDER_STATUS_MESSAGE = {
  pending_payment: { tone: 'warn', icon: 'payments', title: 'Đơn đang chờ thanh toán', text: 'Cửa hàng chỉ chuẩn bị đơn sau khi thanh toán thành công.' },
  confirmed: { tone: 'info', icon: 'task_alt', title: 'Cửa hàng đã xác nhận đơn', text: 'Đơn sẽ được chuẩn bị trong ít phút.' },
  preparing: { tone: 'info', icon: 'inventory_2', title: 'Nhân viên đang chuẩn bị đơn hàng', text: 'Trạng thái sẽ đổi sang “Sẵn sàng nhận hàng” khi đơn xong.' },
  ready_for_pickup: { tone: 'success', icon: 'storefront', title: 'Đơn đã sẵn sàng, mời bạn đến cửa hàng nhận', text: 'Đọc mã đơn cho nhân viên khi nhận hàng.' },
  completed: { tone: 'neutral', icon: 'check_circle', title: 'Bạn đã nhận hàng', text: 'Cảm ơn bạn đã mua sắm tại cửa hàng.' },
  failed: { tone: 'error', icon: 'error', title: 'Thanh toán không thành công', text: 'Đơn chưa được xác nhận. Bạn có thể đặt lại từ giỏ hàng.' },
  cancelled: { tone: 'error', icon: 'cancel', title: 'Đơn hàng đã bị hủy', text: 'Cửa hàng đã hủy đơn này. Nếu bạn đã thanh toán, khoản tiền sẽ được hoàn lại.' },
};

// Trạng thái còn hiện mã đơn để nhận hàng
export const SHOW_PICKUP_CODE = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];

// Kết quả của đơn đã kết thúc (tab trang lịch sử)
export const HISTORY_TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'completed', label: 'Đã nhận hàng' },
  { key: 'failed', label: 'Thanh toán lỗi' },
  { key: 'cancelled', label: 'Đã hủy' },
];

// Thông điệp trạng thái có xét thanh toán: đơn chờ thanh toán mà lần thanh toán gần nhất lỗi -> khuyến khích thử lại
export function statusMessage(order) {
  if (order.status === 'pending_payment' && order.paymentStatus === 'failed') {
    return { tone: 'warn', icon: 'payments', title: 'Thanh toán chưa thành công', text: 'Đơn vẫn được giữ hàng đến khi hết hạn. Bạn có thể thanh toán lại hoặc chọn cổng khác.' };
  }
  return ORDER_STATUS_MESSAGE[order.status];
}

// Phương thức khách được chọn khi đặt hàng online
export const CHECKOUT_METHODS = [
  { key: 'cash', label: 'Tiền mặt khi nhận hàng', desc: 'Thanh toán trực tiếp tại quầy khi đến lấy hàng', icon: 'payments' },
  { key: 'vnpay', label: 'VNPay', desc: 'Thẻ ATM / QR ngân hàng / thẻ quốc tế', icon: 'account_balance' },
  { key: 'momo', label: 'Ví MoMo', desc: 'Thanh toán bằng ví điện tử MoMo', icon: 'account_balance_wallet' },
];

// ---- Admin (UC-34) ----
export const ORDER_SOURCE = { online: 'Online', store: 'Tại quầy' };
export const TRANSITION_LABEL = {
  preparing: 'Bắt đầu chuẩn bị',
  ready_for_pickup: 'Báo sẵn sàng nhận hàng',
  completed: 'Xác nhận đã giao khách',
};
