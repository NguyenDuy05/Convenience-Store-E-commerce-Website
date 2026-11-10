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
  { key: '', label: "All" },
  { key: 'pending_payment', label: "Awaiting payment" },
  { key: 'confirmed', label: "Confirmed" },
  { key: 'preparing', label: "Preparing" },
  { key: 'ready_for_pickup', label: "Ready for pickup" },
  { key: 'completed', label: "Collected" },
  { key: 'failed', label: "Payment failed" },
  { key: 'cancelled', label: "Cancelled" },
];

// Đơn còn đang xử lý (chưa nhận hàng, chưa lỗi)
export const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];

export const PAYMENT_METHOD = { cash: "Cash", card: "Card", vnpay: 'VNPay', wallet: 'Wallet' };
export const PAYMENT_STATUS = {
  unpaid: { label: "Unpaid", tone: 'warn' },
  paid: { label: "Paid", tone: 'success' },
  failed: { label: "Payment failed", tone: 'error' },
  refunded: { label: "Refunded", tone: 'neutral' },
};

// Một dòng mô tả thanh toán cho thẻ đơn: "Đã thanh toán • VNPay", "Trả tiền mặt khi nhận hàng"...
export function paymentSummary(order) {
  if (order.paymentStatus === 'refunded') return 'Refunded to wallet';
  const method = PAYMENT_METHOD[order.paymentMethod];
  if (order.paymentStatus === 'paid') {
    if (order.paymentMethod === 'cash') return "Paid in cash";
    if (order.paymentMethod === 'card') return "Paid by card";
    return method ? `Paid via ${method}` : "Paid";
  }
  if (order.paymentStatus === 'failed') return method ? `Payment ${method} failed` : "Payment failed";
  if (order.paymentMethod === 'cash') return "Cash at pickup";
  return method ? `Unpaid (${method})` : "Unpaid";
}

// Thông điệp ngắn theo trạng thái (dùng ở trang chi tiết và trang theo dõi)
export const ORDER_STATUS_MESSAGE = {
  pending_payment: { tone: 'warn', icon: 'payments', title: "Awaiting payment", text: "The store starts preparing your order after successful payment." },
  confirmed: { tone: 'info', icon: 'task_alt', title: "The store has confirmed your order", text: "Your order will be prepared shortly." },
  preparing: { tone: 'info', icon: 'inventory_2', title: "Your order is being prepared", text: "The status changes to “Ready for pickup” when your order is ready." },
  ready_for_pickup: { tone: 'success', icon: 'storefront', title: "Your order is ready for pickup", text: "Give your order code to a staff member at pickup." },
  completed: { tone: 'neutral', icon: 'check_circle', title: "Order collected", text: "Thank you for shopping with us." },
  failed: { tone: 'error', icon: 'error', title: "Payment unsuccessful", text: "This order was not confirmed. You can place a new order from your cart." },
  cancelled: { tone: 'error', icon: 'cancel', title: "Order cancelled", text: "This order was cancelled. Payments received are returned to your wallet for a future purchase." },
};

// Trạng thái còn hiện mã đơn để nhận hàng
export const SHOW_PICKUP_CODE = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];

// Kết quả của đơn đã kết thúc (tab trang lịch sử)
export const HISTORY_TABS = [
  { key: '', label: "All" },
  { key: 'completed', label: "Collected" },
  { key: 'failed', label: "Payment failed" },
  { key: 'cancelled', label: "Cancelled" },
];

// Thông điệp trạng thái có xét thanh toán: đơn chờ thanh toán mà lần thanh toán gần nhất lỗi -> khuyến khích thử lại
export function statusMessage(order) {
  if (order.status === 'pending_payment' && order.paymentStatus === 'failed') {
    return { tone: 'warn', icon: 'payments', title: "Payment not completed", text: "Your items remain reserved until the deadline. You can retry your VNPay payment." };
  }
  return ORDER_STATUS_MESSAGE[order.status];
}

// Phương thức khách được chọn khi đặt hàng online
export const CHECKOUT_METHODS = [
  { key: 'vnpay', label: 'VNPay', desc: "ATM card / bank QR / international card", icon: 'account_balance' },
];

// ---- Admin (UC-34) ----
export const ORDER_SOURCE = { online: 'Online', store: "In store" };
export const TRANSITION_LABEL = {
  preparing: "Start preparing",
  ready_for_pickup: "Mark ready for pickup",
  completed: "Confirm collection",
};
