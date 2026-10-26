import { useEffect, useState } from 'react';
import { vnd } from './productUtils';

function Modal({ title, icon, tone = 'primary', onClose, children, footer }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div className="ap-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <section className="ap-modal" role="dialog" aria-modal="true" aria-label={title}>
                <header className="ap-modal-head">
                    <span className={`ap-modal-icon ${tone}`}><span className="review-material-icon">{icon}</span></span>
                    <h2>{title}</h2>
                    <button className="ap-icon-btn" onClick={onClose} aria-label="Close"><span className="review-material-icon">close</span></button>
                </header>
                <div className="ap-modal-body">{children}</div>
                <footer className="ap-modal-foot">{footer}</footer>
            </section>
        </div>
    );
}

// Xác nhận Deactivate / Activate / Delete
export function ConfirmDialog({ title, icon = 'help', tone = 'primary', confirmLabel, product, children, busy, error, onConfirm, onClose }) {
    return (
        <Modal title={title} icon={icon} tone={tone} onClose={onClose} footer={<>
            <button className="ap-btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button className={`ap-btn ${tone === 'danger' ? 'danger' : 'primary'}`} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
        </>}>
            <p className="ap-modal-product"><b>{product.name}</b><small>SKU {product.sku}</small></p>
            {children}
            {error && <p className="ap-alert error" role="alert">{error}</p>}
        </Modal>
    );
}

// UC-32.6 Update Product Price
export function PriceDialog({ product, busy, error, onSubmit, onClose }) {
    const [value, setValue] = useState(String(product.price));
    const [note, setNote] = useState('');
    const next = Number(value);
    const valid = value !== '' && Number.isInteger(next) && next >= 0;
    const diff = valid ? next - product.price : 0;
    const pct = valid && product.price > 0 ? (diff / product.price) * 100 : 0;
    return (
        <Modal title="Update Product Price" icon="payments" onClose={onClose} footer={<>
            <button className="ap-btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="ap-btn primary" disabled={busy || !valid || diff === 0} onClick={() => onSubmit({ price: next, note })}>{busy ? 'Saving…' : 'Save new price'}</button>
        </>}>
            <p className="ap-modal-product"><b>{product.name}</b><small>SKU {product.sku} · current price {vnd(product.price)}</small></p>
            <label className="ap-field">
                <span>New price (VND)</span>
                <div className="ap-input-affix"><i>₫</i><input autoFocus inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))} /></div>
            </label>
            {valid && diff !== 0 && (
                <p className={`ap-delta ${diff > 0 ? 'up' : 'down'}`}>
                    <span className="review-material-icon">{diff > 0 ? 'trending_up' : 'trending_down'}</span>
                    {diff > 0 ? '+' : '−'}{vnd(Math.abs(diff))}{product.price > 0 && ` (${diff > 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%)`}
                </p>
            )}
            <label className="ap-field">
                <span>Reason (optional)</span>
                <input maxLength={200} placeholder="e.g. supplier price increase" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <p className="ap-hint">Existing orders keep the price they were placed at. Carts and the storefront use the new price immediately.</p>
            {error && <p className="ap-alert error" role="alert">{error}</p>}
        </Modal>
    );
}