import '../../styles/qk-tokens.css';
import '../../styles/price-summary.css';
import { formatCurrency } from '../../utils/format';

// Bảng tổng tiền: tạm tính, từng khuyến mãi, mã giảm giá, tổng thanh toán. Dữ liệu lấy từ server (previewCheckout / đơn).
export default function PriceSummary({ subtotal, appliedPromotions = [], promotionDiscount = 0, discountCode, totalAmount, children }) {
  return (
    <div className="psum">
      <div className="psum-row"><span>Tạm tính</span><span>{formatCurrency(subtotal)}</span></div>
      {appliedPromotions.map((p, i) => (
        <div className="psum-row save" key={`${p.name}-${i}`}><span>Khuyến mãi: {p.name}</span><span>− {formatCurrency(p.amount)}</span></div>
      ))}
      {appliedPromotions.length === 0 && promotionDiscount > 0 && (
        <div className="psum-row save"><span>Khuyến mãi</span><span>− {formatCurrency(promotionDiscount)}</span></div>
      )}
      {discountCode && (
        <div className="psum-row save"><span>Mã {discountCode.code}</span><span>− {formatCurrency(discountCode.amount)}</span></div>
      )}
      <div className="psum-sep" />
      <div className="psum-row total"><span>Tổng thanh toán</span><span>{formatCurrency(totalAmount)}</span></div>
      {children}
    </div>
  );
}
