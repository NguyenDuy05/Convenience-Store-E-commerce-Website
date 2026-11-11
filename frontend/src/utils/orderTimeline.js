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

// Dựng các mốc timeline của đơn (đã qua / hiện tại / sắp tới / lỗi)
export function buildTimeline({ status, statusHistory = [], paymentMethod }) {
  const times = {};
  [...statusHistory]
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt))
    .forEach((h) => { times[h.status] = h.changedAt; });

  const make = (key, state) => ({ key, state, title: STEP_TEXT[key].title, desc: STEP_TEXT[key].desc, time: times[key] || null });

  if (status === 'failed') {
    return [make('pending_payment', 'done'), make('failed', 'error')];
  }

  if (status === 'cancelled') {
    const reached = FLOW.filter((key) => times[key]).map((key) => make(key, 'done'));
    return [...reached, make('cancelled', 'error')];
  }

  const cur = FLOW.indexOf(status);
  if (cur === -1) return [];

  const steps = [];
  FLOW.forEach((key, i) => {
    if (key === 'pending_payment' && cur > 0 && !times[key] && paymentMethod === 'cash') return;
    let state = 'upcoming';
    if (status === 'completed' || i < cur) state = 'done';
    else if (i === cur) state = 'current';
    steps.push(make(key, state));
  });
  return steps;
}
