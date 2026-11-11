export const ORDER_STATUS = {
  pending_payment: { label: 'Pending payment', icon: 'payments', tone: 'warn' },
  confirmed: { label: 'Confirmed', icon: 'task_alt', tone: 'info' },
  preparing: { label: 'Preparing', icon: 'schedule', tone: 'info' },
  ready_for_pickup: { label: 'Ready for pickup', icon: 'storefront', tone: 'success' },
  completed: { label: 'Completed', icon: 'check_circle', tone: 'neutral' },
  failed: { label: 'Payment failed', icon: 'error', tone: 'error' },
  cancelled: { label: 'Cancelled', icon: 'cancel', tone: 'error' },
};

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

export const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];

export const PAYMENT_METHOD = { cash: "Cash", card: "Card", vnpay: 'VNPay', wallet: 'Wallet' };
export const PAYMENT_STATUS = {
  unpaid: { label: "Unpaid", tone: 'warn' },
  paid: { label: "Paid", tone: 'success' },
  failed: { label: "Payment failed", tone: 'error' },
  refunded: { label: "Refunded", tone: 'neutral' },
};

// Mô tả ngắn về thanh toán của đơn
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

export const ORDER_STATUS_MESSAGE = {
  pending_payment: { tone: 'warn', icon: 'payments', title: "Awaiting payment", text: "The store starts preparing your order after successful payment." },
  confirmed: { tone: 'info', icon: 'task_alt', title: "The store has confirmed your order", text: "Your order will be prepared shortly." },
  preparing: { tone: 'info', icon: 'inventory_2', title: "Your order is being prepared", text: "The status changes to “Ready for pickup” when your order is ready." },
  ready_for_pickup: { tone: 'success', icon: 'storefront', title: "Your order is ready for pickup", text: "Give your order code to a staff member at pickup." },
  completed: { tone: 'neutral', icon: 'check_circle', title: "Order collected", text: "Thank you for shopping with us." },
  failed: { tone: 'error', icon: 'error', title: "Payment unsuccessful", text: "This order was not confirmed. You can place a new order from your cart." },
  cancelled: { tone: 'error', icon: 'cancel', title: "Order cancelled", text: "This order was cancelled. Any refund for this order is shown below." },
};

export const SHOW_PICKUP_CODE = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];

export const HISTORY_TABS = [
  { key: '', label: "All" },
  { key: 'completed', label: "Collected" },
  { key: 'failed', label: "Payment failed" },
  { key: 'cancelled', label: "Cancelled" },
];

// Thông điệp trạng thái đơn có xét tình trạng thanh toán
export function statusMessage(order) {
  if (order.status === 'pending_payment' && order.paymentStatus === 'failed') {
    return { tone: 'warn', icon: 'payments', title: "Payment not completed", text: "Your items remain reserved until the deadline. You can retry your VNPay payment." };
  }
  if (order.status === 'cancelled') return { ...ORDER_STATUS_MESSAGE.cancelled, text: order.refund ? 'This order was cancelled. The refund details are shown below.' : 'This order was cancelled. No payment was taken.' };
  return ORDER_STATUS_MESSAGE[order.status];
}

export const CHECKOUT_METHODS = [
  { key: 'vnpay', label: 'VNPay', desc: "ATM card / bank QR / international card", icon: 'account_balance' },
];

export const ORDER_SOURCE = { online: 'Online', store: "In store" };
export const TRANSITION_LABEL = {
  preparing: "Start preparing",
  ready_for_pickup: "Mark ready for pickup",
  completed: "Confirm collection",
};
