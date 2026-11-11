import '../../styles/cancel-reason.css';

// Lý do hủy đơn có sẵn để người dùng chọn nhanh; "Other" cho phép tự nhập.
// customer: khách tự hủy (chỉ trước khi staff bắt đầu chuẩn bị) | store: staff/admin hủy.
export const CANCEL_REASONS = {
  customer: [
    'I changed my mind',
    'I ordered the wrong items or quantity',
    'I want to use a different payment method',
    'I cannot come to the store to pick it up',
    'The pickup time is too long',
    'I found a better price elsewhere',
  ],
  store: [
    'Item out of stock or damaged',
    'Customer requested the cancellation',
    'Customer did not pick up in time',
    'Store cannot prepare the order (closed / understaffed)',
    'Payment problem',
    'Suspected fake or duplicate order',
  ],
};
export const OTHER = '__other__';

// value = { choice, other }. Trả về lý do cuối cùng để gửi lên server ('' nếu chưa hợp lệ).
export const reasonText = ({ choice, other }) => (choice === OTHER ? other.trim() : choice || '');

export default function CancelReasonPicker({ kind = 'customer', value, onChange, disabled, name = 'cancel-reason' }) {
  const options = CANCEL_REASONS[kind] || CANCEL_REASONS.customer;
  const pick = (choice) => onChange({ ...value, choice });
  return (
    <fieldset className="crp" disabled={disabled}>
      <legend>Why are you cancelling? <span>*</span></legend>
      <div className="crp-list">
        {options.map((label) => (
          <label key={label} className={`crp-opt ${value.choice === label ? 'on' : ''}`}>
            <input type="radio" name={name} checked={value.choice === label} onChange={() => pick(label)} />
            <span>{label}</span>
          </label>
        ))}
        <label className={`crp-opt ${value.choice === OTHER ? 'on' : ''}`}>
          <input type="radio" name={name} checked={value.choice === OTHER} onChange={() => pick(OTHER)} />
          <span>Other</span>
        </label>
      </div>
      {value.choice === OTHER && (
        <textarea className="crp-other" rows={2} maxLength={500} autoFocus placeholder="Tell us the reason (at least 3 characters)"
          value={value.other} onChange={(e) => onChange({ ...value, other: e.target.value })} aria-label="Other cancellation reason" />
      )}
    </fieldset>
  );
}
