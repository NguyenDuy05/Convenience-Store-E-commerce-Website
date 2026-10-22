// Dựng danh sách mốc cho timeline theo dõi đơn từ trạng thái hiện tại + statusHistory.
// Chỉ hiện thời gian khi hệ thống có ghi nhận; không tự bịa thời gian cho mốc thiếu dữ liệu.
const FLOW = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup', 'completed'];

const STEP_TEXT = {
  pending_payment: { title: 'Đơn được tạo, chờ thanh toán', desc: 'Đơn đã ghi nhận và đang chờ thanh toán.' },
  confirmed: { title: 'Cửa hàng đã xác nhận', desc: 'Đơn đã được xác nhận và xếp hàng chờ chuẩn bị.' },
  preparing: { title: 'Đang chuẩn bị đơn', desc: 'Nhân viên đang lấy hàng và đóng gói.' },
  ready_for_pickup: { title: 'Sẵn sàng nhận hàng', desc: 'Mời bạn đến cửa hàng và đọc mã đơn cho nhân viên.' },
  completed: { title: 'Đã nhận hàng', desc: 'Đơn đã được giao cho bạn tại cửa hàng.' },
  failed: { title: 'Thanh toán không thành công', desc: 'Đơn chưa được xác nhận.' },
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
