import { useEffect, useState } from 'react';
import { getReceipt } from '../../api/payment.api';
import { formatCurrency, formatDateTime } from '../../utils/format';
import '../../styles/receipt.css';

const METHOD = { cash: "Cash", card: "Card", vnpay: 'VNPay', wallet: 'Wallet' };

// Hóa đơn thanh toán (Print Receipt). Bấm "In hóa đơn" mở hộp thoại in của trình duyệt, chỉ in phần hóa đơn.
export default function Receipt({ orderId, onClose }) {
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    getReceipt(orderId).then((res) => { if (live) setR(res.data); })
      .catch((e) => { if (live) setError(e.response?.data?.message || "Could not load the receipt."); });
    return () => { live = false; };
  }, [orderId]);

  return (
    <div className="rcp-overlay" role="dialog" aria-modal="true" aria-label="Receipt">
      <div className="rcp-panel">
        {!r && !error && <p>Loading receipt...</p>}
        {error && <p role="alert" className="rcp-error">{error}</p>}
        {r && (
          <div className="rcp" id="rcp-print">
            <h2>{r.store?.name || "Convenience store"}</h2>
            {r.store?.address && <p className="rcp-c">{r.store.address}</p>}
            {r.store?.phone && <p className="rcp-c">Tel: {r.store.phone}</p>}
            {r.store?.website && <p className="rcp-c">{r.store.website.replace(/^https?:\/\//, '')}</p>}
            <hr />
            <p><b>RECEIPT {r.orderCode}</b></p>
            <p>Date: {formatDateTime(r.paidAt || r.createdAt)}</p>
            {r.cashier && <p>Cashier: {r.cashier}</p>}
            <hr />
            {r.items.map((i, k) => (
              <div className="rcp-item" key={k}>
                <span>{i.name}</span>
                <span>{i.quantity} × {formatCurrency(i.unitPrice)}</span>
                <span>{formatCurrency(i.lineTotal)}</span>
              </div>
            ))}
            <hr />
            <div className="rcp-row"><span>Subtotal</span><span>{formatCurrency(r.subtotal)}</span></div>
            {r.promotionDiscount > 0 && <div className="rcp-row"><span>Promotions</span><span>- {formatCurrency(r.promotionDiscount)}</span></div>}
            {r.discountCode && <div className="rcp-row"><span>Code {r.discountCode.code}</span><span>- {formatCurrency(r.discountCode.amount)}</span></div>}
            <div className="rcp-row rcp-total"><span>TOTAL</span><span>{formatCurrency(r.totalAmount)}</span></div>
            <div className="rcp-row"><span>Payment</span><span>{METHOD[r.payment.method] || '—'}</span></div>
            {r.payment.cashReceived != null && <>
              <div className="rcp-row"><span>Cash received</span><span>{formatCurrency(r.payment.cashReceived)}</span></div>
              <div className="rcp-row"><span>Change</span><span>{formatCurrency(r.payment.change)}</span></div>
            </>}
            {r.payment.reference && <div className="rcp-row"><span>Transaction reference</span><span>{r.payment.reference}</span></div>}
            {r.refunded && <p className="rcp-c"><b>REFUNDED ORDER</b></p>}
            <hr />
            <p className="rcp-c">Thank you for shopping with us!</p>
          </div>
        )}
        <div className="rcp-actions">
          {r && <button type="button" className="ui-button" onClick={() => window.print()}>Print receipt</button>}
          <button type="button" className="ui-button secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
