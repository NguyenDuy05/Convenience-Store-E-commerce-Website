import '../../styles/qk-tokens.css';
import '../../styles/payment-method-picker.css';
import Icon from '../common/Icon';

// Chọn phương thức thanh toán. methods: [{ key, label, desc, icon }]; disabledKeys: các cổng tạm khoá (vd. đang có giao dịch chờ).
export default function PaymentMethodPicker({ methods, value, onChange, disabledKeys = [], disabled = false }) {
  return (
    <div className="pmp" role="radiogroup" aria-label="Phương thức thanh toán">
      {methods.map((m) => {
        const off = disabled || disabledKeys.includes(m.key);
        const on = value === m.key;
        return (
          <button key={m.key} type="button" role="radio" aria-checked={on} disabled={off}
            className={`pmp-opt ${on ? 'on' : ''}`} onClick={() => onChange(m.key)}>
            <span className="pmp-ic"><Icon name={m.icon} size="lg" /></span>
            <span className="pmp-text"><b>{m.label}</b><small>{m.desc}</small></span>
            <span className="pmp-radio" aria-hidden="true">{on && <i />}</span>
          </button>
        );
      })}
    </div>
  );
}
