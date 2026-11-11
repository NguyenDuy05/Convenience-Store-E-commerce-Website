import { Link } from 'react-router-dom';
import '../../styles/auth.css';

// Icon Material Symbols của trang đăng nhập
export function Icon({ name, size = '' }) {
    return <span className={`auth-icon ${size}`} aria-hidden="true">{name}</span>;
}

const perks = [
    { icon: 'shopping_bag', color: 'blue', title: 'Store pickup', desc: 'Collect your order with its order code' },
    { icon: 'notifications', color: 'green', title: 'Order updates', desc: 'Know when your order is ready' },
    { icon: 'loyalty', color: 'gold', title: 'Member rewards', desc: 'Earn points on every purchase' },
];

// Khung chung cho trang đăng nhập / đăng ký / quên mật khẩu
export default function AuthShell({ active = null, children }) {
    return (
        <div className="auth-page">
            <div className="auth-overlay" />

            <div className="auth-layout">
                <section className="auth-hero">
                    <div className="auth-badge">
                        <span className="auth-badge-dot" />
                        Order online. Collect when ready.
                    </div>
                    <h2 className="auth-hero-title">Shop fast,<br />pick up easy.</h2>
                    <p className="auth-hero-desc">
                        Order snacks, drinks and daily essentials online. We will notify you when your order is ready to collect.
                    </p>
                    <div className="auth-perks">
                        {perks.map((p) => (
                            <div className="auth-perk" key={p.title}>
                                <div className={`auth-perk-icon ${p.color}`}><Icon name={p.icon} /></div>
                                <div className="auth-perk-text">
                                    <span className="auth-perk-title">{p.title}</span>
                                    <span className="auth-perk-desc">{p.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="auth-panel">
                    <div className="auth-card">
                        {active && (
                            <div className="auth-tabs">
                                <Link to="/login" className={`auth-tab ${active === 'login' ? 'active' : ''}`}>Log in</Link>
                                <Link to="/register" className={`auth-tab ${active === 'register' ? 'active' : ''}`}>Sign up</Link>
                            </div>
                        )}
                        {children}
                    </div>
                    <p className="auth-note"><Icon name="store" size="sm" /> Store pickup only • No delivery</p>
                </div>
            </div>
        </div>
    );
}
