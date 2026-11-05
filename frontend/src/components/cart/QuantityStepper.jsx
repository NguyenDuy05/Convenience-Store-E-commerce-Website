import '../../styles/qk-tokens.css';
import '../../styles/quantity-stepper.css';
import Icon from '../common/Icon';

// Bộ chọn số lượng: [-] 3 [+]. max = số lượng tối đa cho phép (tồn kho / giới hạn mỗi sản phẩm).
export default function QuantityStepper({ value, min = 1, max = 99, onChange, disabled = false, label = 'Số lượng' }) {
  return (
    <div className={`qs ${disabled ? 'disabled' : ''}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Giảm số lượng">
        <Icon name="remove" size="md" />
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Tăng số lượng">
        <Icon name="add" size="md" />
      </button>
    </div>
  );
}
