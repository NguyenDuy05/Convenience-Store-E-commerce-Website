import { Link } from 'react-router-dom';
import '../../styles/auth.css';

export function Icon({ name, size = '' }) {
    return <span className={`auth-icon ${size}`} aria-hidden="true">{name}</span>;
}

const perks = [
    { icon: 'qr_code_scanner', color: 'blue', title: 'Nhận hàng bằng QR', desc: 'Quét mã, lấy hàng nhanh' },
    { icon: 'ac_unit', color: 'green', title: 'Bảo quản lạnh 4°C', desc: 'Đồ uống luôn mát' },
    { icon: 'loyalty', color: 'gold', title: 'Tích điểm thành viên', desc: 'Mỗi lần mua đều có điểm' },
];

// Khung dùng chung cho Đăng nhập + Đăng ký:
// ảnh nền toàn trang, bên trái là giới thiệu, bên phải là form trên nền trắng mờ
export default function AuthShell({ active, children }) {
    return (
        <div className="auth-page">
            <div className="auth-overlay" />

            <div className="auth-layout">
                {/* Bên trái: giới thiệu (ẩn trên màn hình nhỏ) */}
                <section className="auth-hero">
                    <div className="auth-badge">
                        <span className="auth-badge-dot" />
                        Nhận hàng tại cửa hàng chỉ 15 phút
                    </div>
                    <h2 className="auth-hero-title">Mua nhanh,<br />nhận gọn mỗi ngày.</h2>
                    <p className="auth-hero-desc">
                        Đặt đồ uống, snack và nhu yếu phẩm online, ghé cửa hàng gần nhà và nhận hàng ngay — không chờ đợi.
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

                {/* Bên phải: form trên nền trắng mờ */}
                <div className="auth-panel">
                    <div className="auth-card">
                        <div className="auth-tabs">
                            <Link to="/login" className={`auth-tab ${active === 'login' ? 'active' : ''}`}>Đăng nhập</Link>
                            <Link to="/register" className={`auth-tab ${active === 'register' ? 'active' : ''}`}>Tạo tài khoản</Link>
                        </div>
                        {children}
                    </div>
                    <p className="auth-note"><Icon name="store" size="sm" /> Chỉ nhận hàng tại cửa hàng • Không giao tận nơi</p>
                </div>
            </div>
        </div>
    );
}