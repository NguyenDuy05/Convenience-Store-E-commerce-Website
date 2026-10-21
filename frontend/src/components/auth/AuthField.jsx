import { useState } from 'react';
import { Icon } from './AuthShell';

// Một ô nhập: nhãn + icon trái + (nút hiện/ẩn mật khẩu) + lỗi
export default function AuthField({ label, hint, icon, error, type = 'text', ...inputProps }) {
    const [show, setShow] = useState(false);
    const isPassword = type === 'password';

    return (
        <div className="auth-field">
            <label className="auth-label-row">
                <span>{label}</span>
                {hint && <span className="auth-hint">{hint}</span>}
            </label>
            <div className="auth-input-wrap">
                <span className="auth-input-icon"><Icon name={icon} /></span>
                <input
                    {...inputProps}
                    type={isPassword && show ? 'text' : type}
                    className={`auth-input ${isPassword ? 'has-eye' : ''} ${error ? 'invalid' : ''}`}
                />
                {isPassword && (
                    <button type="button" className="auth-eye" onClick={() => setShow(!show)} aria-label="Show or hide password">
                        <Icon name={show ? 'visibility_off' : 'visibility'} />
                    </button>
                )}
            </div>
            {error && <p className="auth-field-error"><Icon name="error" size="sm" /> {error}</p>}
        </div>
    );
}