import '../../styles/qk-tokens.css';
import '../../styles/price-summary.css';
import { formatCurrency } from '../../utils/format';

// Bảng tổng tiền: tạm tính, khuyến mãi, mã giảm giá, tổng thanh toán
export default function PriceSummary({ subtotal, appliedPromotions = [], promotionDiscount = 0, discountCode, totalAmount, children }) {
  return (
    <div className="psum">
      <div className="psum-row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
      {appliedPromotions.map((p, i) => (
        <div className="psum-row save" key={`${p.name}-${i}`}><span>Promotion: {p.name}</span><span>− {formatCurrency(p.amount)}</span></div>
      ))}
      {appliedPromotions.length === 0 && promotionDiscount > 0 && (
        <div className="psum-row save"><span>Promotions</span><span>− {formatCurrency(promotionDiscount)}</span></div>
      )}
      {discountCode && (
        <div className="psum-row save"><span>Code {discountCode.code}</span><span>− {formatCurrency(discountCode.amount)}</span></div>
      )}
      <div className="psum-sep" />
      <div className="psum-row total"><span>Total</span><span>{formatCurrency(totalAmount)}</span></div>
      {children}
    </div>
  );
}
