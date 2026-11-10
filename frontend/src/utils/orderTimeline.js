// Dựng danh sách mốc cho timeline theo dõi đơn từ trạng thái hiện tại + statusHistory.
// Chỉ hiện thời gian khi hệ thống có ghi nhận; không tự bịa thời gian cho mốc thiếu dữ liệu.
const FLOW = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup', 'completed'];

const STEP_TEXT = {
  pending_payment: { title: "Order created, awaiting payment", desc: "Your order has been recorded and is awaiting payment." },
  confirmed: { title: "Store confirmed", desc: "Your order has been confirmed and queued for preparation." },
  preparing: { title: "Preparing your order", desc: "Staff are picking and packing your items." },
  ready_for_pickup: { title: "Ready for pickup", desc: "Visit the store and give your order code to a staff member." },
  completed: { title: "Collected", desc: "Your order has been handed to you at the store." },
  failed: { title: "Payment unsuccessful", desc: "Your order was not confirmed." },
  cancelled: { title: "Order cancelled", desc: "The store cancelled this order. If paid, your payment will be refunded." },
};

// state: done | current | upcoming | error
export function buildTimeline({ status, statusHistory = [], paymentMethod }) {
  const times = {};
  [...statusHistory]
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt))
    .forEach((h) => { times[h.status] = h.changedAt; }); // lấy lần gần nhất của mỗi trạng thái

  const make = (key, state) => ({ key, state, title: STEP_TEXT[key].title, desc: STEP_TEXT[key].desc, time: times[key] || null });

  if (status === 'failed') {
    return [make('pending_payment', 'done'), make('failed', 'error')];
  }

  if (status === 'cancelled') {
    // Các mốc đơn đã đi qua trước khi bị hủy + mốc hủy
    const reached = FLOW.filter((key) => times[key]).map((key) => make(key, 'done'));
    return [...reached, make('cancelled', 'error')];
  }

  const cur = FLOW.indexOf(status);
  if (cur === -1) return [];

  const steps = [];
  FLOW.forEach((key, i) => {
    // Đơn trả tiền mặt có thể bắt đầu ở "đã xác nhận": không bịa mốc "chờ thanh toán" nếu không có dữ liệu
    if (key === 'pending_payment' && cur > 0 && !times[key] && paymentMethod === 'cash') return;
    let state = 'upcoming';
    if (status === 'completed' || i < cur) state = 'done';
    else if (i === cur) state = 'current';
    steps.push(make(key, state));
  });
  return steps;
}
