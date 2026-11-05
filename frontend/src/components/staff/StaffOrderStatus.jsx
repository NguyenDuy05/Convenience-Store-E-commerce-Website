export default function StaffOrderStatus({ orders }) {
    const preparing = orders.filter(o => o.status === 'preparing').length;
    const ready = orders.filter(o => o.status === 'ready_for_pickup').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const total = orders.length || 1;

    const items = [
        { label: 'Đang Chuẩn Bị', count: preparing, pct: Math.round((preparing / total) * 100), color: '#FDE68A' },
        { label: 'Sẵn Sàng Lấy', count: ready, pct: Math.round((ready / total) * 100), color: '#A7E8C3' },
        { label: 'Hoàn Thành', count: completed, pct: Math.round((completed / total) * 100), color: '#60A5FA' },
    ];

    return (
        <div className="staff-card">
            <div className="staff-card-header">
                <h2 className="staff-card-title">Trạng Thái Đơn Hàng</h2>
            </div>

            <div className="staff-donut">
                <svg className="staff-donut-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="14" />
                    {items.reduce((offset, item) => {
                        const circumference = 2 * Math.PI * 38;
                        const strokeDasharray = (item.pct / 100) * circumference;
                        const element = (
                            <circle
                                key={item.label}
                                cx="50"
                                cy="50"
                                r="38"
                                fill="none"
                                stroke={item.color}
                                strokeWidth="14"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={-offset}
                            />
                        );
                        return offset + strokeDasharray;
                    }, 0)}
                </svg>
                <div className="staff-donut-center">
                    <div className="staff-donut-value">{total}</div>
                    <div className="staff-donut-label">Đơn Hàng</div>
                </div>
            </div>

            <div className="staff-legend">
                {items.map((item) => (
                    <div key={item.label} className="staff-legend-item">
                        <span className="staff-legend-color" style={{ backgroundColor: item.color }} />
                        <span className="staff-legend-label">{item.label}</span>
                        <span className="staff-legend-value">{item.count} ({item.pct}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
}