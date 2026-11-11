import '../../styles/qk-tokens.css';
import '../../styles/quantity-stepper.css';
import Icon from '../common/Icon';

// Bộ tăng / giảm số lượng
export default function QuantityStepper({ value, min = 1, max = 99, onChange, disabled = false, label = "Quantity" }) {
  return (
    <div className={`qs ${disabled ? 'disabled' : ''}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Decrease quantity">
        <Icon name="remove" size="md" />
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity">
        <Icon name="add" size="md" />
      </button>
    </div>
  );
}
