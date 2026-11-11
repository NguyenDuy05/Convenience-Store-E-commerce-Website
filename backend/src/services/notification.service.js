const { Order, User } = require('../models');
const mail = require('./mail.service');
const inApp = require('./inAppNotification.service');

const statuses = {
  pending_payment: "Awaiting payment", confirmed: "Confirmed", preparing: "Preparing",
  ready_for_pickup: "Ready for store pickup", completed: "Collected",
  failed: "Order payment expired", cancelled: "Cancelled",
};
const payments = { unpaid: "Unpaid", paid: "Paid", failed: "Payment failed", refunded: "Refunded to wallet" };
const events = {
  order_created: ["Order placed successfully", "The store has received your order. If paying online, complete payment before the order expires."],
  payment_success: ["Payment successful", "The store has recorded your order payment."],
  payment_failed: ["Payment not completed", "The transaction was unsuccessful. Open your order to retry before the payment deadline."],
  payment_late: ["Payment returned to wallet", "Payment was received after the order closed. The amount has been credited to your wallet for a future purchase."],
  status_updated: ["Order update", "Your order status has changed."],
  order_expired: ["Order payment expired", "The payment deadline has passed. You can place a new order."],
};
// Escape HTML khi chèn vào email
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Định dạng tiền VND cho email
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

// Gửi email + thông báo trong web khi đơn đổi trạng thái (lỗi gửi không làm hỏng nghiệp vụ)
exports.notifyOrder = async (orderOrId, event, { amount, txnRef } = {}) => {
  try {
    const order = orderOrId && typeof orderOrId === 'object' && orderOrId.orderCode
      ? orderOrId : await Order.findById(orderOrId).lean();
    if (!order) return { skipped: true };
    const info = events[event];
    if (!info) throw new Error('Unknown mail notification event');
    let [title, message] = info;
    if (event === 'status_updated' && order.status === 'ready_for_pickup') {
      title = 'Your order is ready for pickup';
      message = 'Preparation is done. Please visit the store and present your order code to collect your items.';
    }
    if (order.status === 'cancelled' && order.refund?.amount > 0) message = 'Your order was cancelled. ' + money(order.refund.amount) + ' has been refunded to your wallet for a future purchase.';
    if (['order_created', 'payment_success'].includes(event) && order.preparationStartsAt && new Date(order.preparationStartsAt) > new Date()) message += ' Preparation starts when the store opens at ' + require('./pickupSchedule.service').formatOpening(order.preparationStartsAt) + ' (Vietnam time).';
    await inApp.orderEvent(order, event, title, `${message}${event === 'status_updated' ? `\nStatus: ${statuses[order.status] || order.status}` : ''}`, txnRef);
    if (!process.env.SMTP_HOST || !order.customerId) return { skipped: true };
    const customer = await User.findById(order.customerId).select('email fullName status').lean();
    if (!customer?.email || customer.status === 'deleted') return { skipped: true };
    const url = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/orders/${encodeURIComponent(String(order._id))}`;
    const lines = [
      `Hello ${customer.fullName || "there"},`, '', message, '',
      `Order code: ${order.orderCode}`,
      `Status: ${statuses[order.status] || order.status}`,
      `Payment: ${payments[order.paymentStatus] || order.paymentStatus}`,
      `Order total: ${money(order.totalAmount)}`,
      ...(amount === undefined ? [] : [`Transaction amount: ${money(amount)}`]),
      ...((order.items || []).map((item) => `${item.name} × ${item.quantity}: ${money(item.lineTotal)}`)),
      ...(order.status === 'ready_for_pickup' ? ["Your order is ready. Visit the store and provide your order code to collect it."] : []),
      ...(order.status === 'cancelled' && order.cancelReason ? [`Cancellation reason: ${order.cancelReason}`] : []),
      '', `View order: ${url}`, '', 'Convenience Store',
    ];
    const text = lines.join('\n');
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#243047"><h2>${escape(title)}</h2>${lines.slice(0, -3).map((line) => `<p>${escape(line)}</p>`).join('')}<p><a href="${escape(url)}">View order</a></p><p>Convenience Store</p></div>`;
    const result = await mail.sendMail({ to: customer.email, subject: `${title} - ${order.orderCode}`, text, html });
    return { sent: true, messageId: result.messageId };
  } catch (error) {
    console.error('Order notification failed:', event, error.code || error.name);
    return { sent: false };
  }
};
