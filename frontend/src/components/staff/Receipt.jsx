import { useEffect, useState } from 'react';
import { getReceipt } from '../../api/payment.api';
import { formatCurrency, formatDateTime } from '../../utils/format';
import '../../styles/receipt.css';

const METHOD = { cash: 'Tiền mặt', card: 'Thẻ', vnpay: 'VNPay', momo: 'MoMo' };

// Hóa đơn thanh toán (Print Receipt). Bấm "In hóa đơn" mở hộp thoại in của trình duyệt, chỉ in phần hóa đơn.
export default function Receipt({ orderId, onClose }) {
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    getReceipt(orderId).then((res) => { if (live) setR(res.data); })
      .catch((e) => { if (live) setError(e.response?.data?.message || 'Không tải được hóa đơn.'); });
    return () => { live = false; };
  }, [orderId]);

  return (
    <div className="rcp-overlay" role="dialog" aria-modal="true" aria-label="Hóa đơn">
      <div className="rcp-panel">
        {!r && !error && <p>Đang tải hóa đơn...</p>}
        {error && <p role="alert" className="rcp-error">{error}</p>}
        {r && (
          <div className="rcp" id="rcp-print">
            <h2>{r.store?.name || 'Cửa hàng tiện lợi'}</h2>
            {r.store?.address && <p className="rcp-c">{r.store.address}</p>}
            {r.store?.phone && <p className="rcp-c">ĐT: {r.store.phone}</p>}
            <hr />
            <p><b>HÓA ĐƠN {r.orderCode}</b></p>
            <p>Ngày: {formatDateTime(r.paidAt || r.createdAt)}</p>
            {r.cashier && <p>Thu ngân: {r.cashier}</p>}
            <hr />
            {r.items.map((i, k) => (
              <div className="rcp-item" key={k}>
                <span>{i.name}</span>
                <span>{i.quantity} × {formatCurrency(i.unitPrice)}</span>
                <span>{formatCurrency(i.lineTotal)}</span>
              </div>
            ))}
            <hr />
            <div className="rcp-row"><span>Tạm tính</span><span>{formatCurrency(r.subtotal)}</span></div>
            {r.promotionDiscount > 0 && <div className="rcp-row"><span>Khuyến mãi</span><span>- {formatCurrency(r.promotionDiscount)}</span></div>}
            {r.discountCode && <div className="rcp-row"><span>Mã {r.discountCode.code}</span><span>- {formatCurrency(r.discountCode.amount)}</span></div>}
            <div className="rcp-row rcp-total"><span>TỔNG CỘNG</span><span>{formatCurrency(r.totalAmount)}</span></div>
            <div className="rcp-row"><span>Thanh toán</span><span>{METHOD[r.payment.method] || '—'}</span></div>
            {r.payment.cashReceived != null && <>
              <div className="rcp-row"><span>Tiền khách đưa</span><span>{formatCurrency(r.payment.cashReceived)}</span></div>
              <div className="rcp-row"><span>Tiền thối</span><span>{formatCurrency(r.payment.change)}</span></div>
            </>}
            {r.payment.reference && <div className="rcp-row"><span>Mã GD</span><span>{r.payment.reference}</span></div>}
            {r.refunded && <p className="rcp-c"><b>ĐƠN ĐÃ HOÀN TIỀN</b></p>}
            <hr />
            <p className="rcp-c">Cảm ơn quý khách!</p>
          </div>
        )}
        <div className="rcp-actions">
          {r && <button type="button" className="sop-btn" onClick={() => window.print()}>In hóa đơn</button>}
          <button type="button" className="sop-btn ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
