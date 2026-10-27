import { useRef, useState } from 'react';
import '../../styles/qk-tokens.css';
import '../../styles/admin-status-actions.css';
import Icon from '../common/Icon';
import { updateOrderStatus } from '../../api/order.api';
import { ORDER_STATUS, TRANSITION_LABEL } from '../../utils/orderMeta';

const WAIT_TEXT = {
  pending_payment: 'Đơn đang chờ khách thanh toán online. Hệ thống tự xác nhận khi cổng thanh toán báo thành công, hoặc tự đóng khi hết hạn.',
  completed: 'Đơn đã hoàn tất, không còn thao tác chuyển trạng thái.',
  failed: 'Đơn đã thất bại / hết hạn thanh toán và không thể xử lý tiếp. Nếu có tiền đã trừ, hãy ghi nhận và xử lý ở mục Sự cố.',
};

// Chuyển đơn sang bước kế tiếp. order.nextTransition = { to, needsCashConfirm } từ server (null nếu không còn bước nào).
export default function AdminOrderStatusActions({ order, onChanged, onAuthError }) {
  const next = order.nextTransition;
  const [note, setNote] = useState('');
  const [cash, setCash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  if (!next) {
    return <div className="asa info"><Icon name="info" size="lg" /><p>{WAIT_TEXT[order.status] || 'Không có bước chuyển trạng thái nào cho đơn này.'}</p></div>;
  }

  const go = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await updateOrderStatus(order._id, { status: next.to, note: note.trim() || undefined, cashCollected: next.needsCashConfirm ? cash : undefined });
      setNote(''); setCash(false);
      await onChanged();
    } catch (err) {
      if (await onAuthError(err)) return;
      setError(err.response?.data?.message || 'Không chuyển được trạng thái. Vui lòng thử lại.');
      if (['STALE_STATUS', 'INVALID_TRANSITION'].includes(err.response?.data?.code)) await onChanged();   // người khác vừa đổi: tải lại
    } finally { lock.current = false; setBusy(false); }
  };

  return (
    <div className="asa">
      <div className="asa-head">
        <Icon name="swap_horiz" size="lg" />
        <div><strong>Bước tiếp theo: {ORDER_STATUS[next.to].label}</strong><span>Khách theo dõi được trạng thái này ngay trên trang đơn hàng của họ.</span></div>
      </div>
      {next.needsCashConfirm && (
        <label className="asa-check"><input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} />
          Tôi đã thu đủ tiền mặt của khách. Hệ thống sẽ ghi nhận giao dịch tiền mặt cho đơn này.</label>
      )}
      <label className="asa-label" htmlFor="asa-note">Ghi chú (không bắt buộc, lưu vào lịch sử đơn)</label>
      <input id="asa-note" className="asa-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <p className="asa-error" role="alert"><Icon name="error" size="md" />{error}</p>}
      <button type="button" className="asa-btn" onClick={go} disabled={busy || (next.needsCashConfirm && !cash)}>
        {busy ? 'Đang cập nhật…' : TRANSITION_LABEL[next.to]}
      </button>
    </div>
  );
}
