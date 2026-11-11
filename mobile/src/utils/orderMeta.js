export const ORDER_STATUS = {
  pending_payment: { label: 'Chờ thanh toán', icon: 'card-outline', tone: 'warn' },
  confirmed: { label: 'Đã xác nhận', icon: 'checkmark-done-outline', tone: 'info' },
  preparing: { label: 'Đang chuẩn bị', icon: 'time-outline', tone: 'info' },
  ready_for_pickup: { label: 'Sẵn sàng nhận', icon: 'storefront-outline', tone: 'success' },
  completed: { label: 'Đã nhận hàng', icon: 'checkmark-circle-outline', tone: 'neutral' },
  failed: { label: 'Thanh toán lỗi', icon: 'alert-circle-outline', tone: 'error' },
  cancelled: { label: 'Đã hủy', icon: 'close-circle-outline', tone: 'error' },
};
export const ORDER_TABS = [
  { key: '', label: 'Tất cả' }, { key: 'pending_payment', label: 'Chờ thanh toán' }, { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'preparing', label: 'Đang chuẩn bị' }, { key: 'ready_for_pickup', label: 'Sẵn sàng nhận' },
  { key: 'completed', label: 'Đã nhận hàng' }, { key: 'failed', label: 'Thanh toán lỗi' }, { key: 'cancelled', label: 'Đã hủy' },
];
export const PAYMENT_METHOD = { cash: 'Tiền mặt', card: 'Thẻ', vnpay: 'VNPay', wallet: 'Ví QUICK' };
export const CHECKOUT_METHODS = [
  { key: 'vnpay', label: 'VNPay', desc: 'Thẻ ATM / QR ngân hàng / thẻ quốc tế', icon: 'card-outline' },
];
export const PAYMENT_STATUS = {
  unpaid: { label: 'Chưa thanh toán', tone: 'warn' }, paid: { label: 'Đã thanh toán', tone: 'success' },
  failed: { label: 'Thanh toán lỗi', tone: 'error' }, refunded: { label: 'Đã hoàn vào ví', tone: 'neutral' },
};
export function paymentSummary(order) {
  const method = PAYMENT_METHOD[order.paymentMethod];
  if (order.paymentStatus === 'paid') {
    if (order.paymentMethod === 'cash') return 'Đã thanh toán tiền mặt';
    if (order.paymentMethod === 'card') return 'Đã thanh toán bằng thẻ';
    return method ? `Đã thanh toán qua ${method}` : 'Đã thanh toán';
  }
  if (order.paymentStatus === 'refunded') return 'Đã hoàn tiền vào ví';
  if (order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') return 'Đã thanh toán bằng ví QUICK';
  if (order.paymentStatus === 'failed') return method ? `Thanh toán ${method} lỗi` : 'Thanh toán lỗi';
  if (order.paymentMethod === 'cash') return 'Trả tiền mặt khi nhận hàng';
  return method ? `Chưa thanh toán (${method})` : 'Chưa thanh toán';
}
export const ORDER_STATUS_MESSAGE = {
  pending_payment: { tone: 'warn', icon: 'card-outline', title: 'Đơn đang chờ thanh toán', text: 'Cửa hàng chỉ chuẩn bị đơn sau khi thanh toán thành công.' },
  confirmed: { tone: 'info', icon: 'checkmark-done-outline', title: 'Cửa hàng đã xác nhận đơn', text: 'Đơn sẽ được chuẩn bị trong ít phút.' },
  preparing: { tone: 'info', icon: 'cube-outline', title: 'Nhân viên đang chuẩn bị đơn hàng', text: 'Trạng thái sẽ đổi sang “Sẵn sàng nhận” khi đơn xong.' },
  ready_for_pickup: { tone: 'success', icon: 'storefront-outline', title: 'Đơn đã sẵn sàng, mời bạn đến cửa hàng nhận', text: 'Đọc mã đơn cho nhân viên khi nhận hàng.' },
  completed: { tone: 'neutral', icon: 'checkmark-circle-outline', title: 'Bạn đã nhận hàng', text: 'Cảm ơn bạn đã mua sắm tại cửa hàng.' },
  failed: { tone: 'error', icon: 'alert-circle-outline', title: 'Thanh toán không thành công', text: 'Đơn chưa được xác nhận. Bạn có thể đặt lại từ giỏ hàng.' },
  cancelled: { tone: 'error', icon: 'close-circle-outline', title: 'Đơn hàng đã bị hủy', text: 'Đơn này đã bị hủy. Nếu bạn đã thanh toán, tiền được hoàn vào ví QUICK.' },
};
export const SHOW_PICKUP_CODE = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];
