export default function OrderOverview({ orders }) {
    const completed = orders.filter((o) => o.status === 'completed').length;
    const ready = orders.filter((o) => o.status === 'ready_for_pickup').length;
    const preparing = orders.filter((o) => o.status === 'preparing').length;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    const total = orders.length || 1;

    const items = [
        { label: 'Completed', count: completed, pct: Math.round((completed / total) * 100), color: '#A7E8C3' },
        { label: 'Ready for Pickup', count: ready, pct: Math.round((ready / total) * 100), color: '#2563EB' },
        { label: 'Preparing', count: preparing, pct: Math.round((preparing / total) * 100), color: '#FDE68A' },
        { label: 'Cancelled', count: cancelled, pct: Math.round((cancelled / total) * 100), color: '#EF4444' },
    ];

    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <h2 className="admin-card-title">Order Status</h2>
                <span className="admin-card-subtitle">Fulfillment breakdown</span>
            </div>

            <div className="admin-donut">
                <svg className="admin-donut-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="14" />
                    {items.reduce((offset, item, i) => {
                        const circumference = 2 * Math.PI * 38;
                        const strokeDasharray = (item.pct / 100) * circumference;
                        const element = (
                            <circle
                                key={i}
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
                <div className="admin-donut-center">
                    <div className="admin-donut-value">{total}</div>
                    <div className="admin-donut-label">Orders</div>
                </div>
            </div>

            <div className="admin-legend">
                {items.map((item) => (
                    <div key={item.label} className="admin-legend-item">
                        <span className="admin-legend-color" style={{ backgroundColor: item.color }} />
                        <span className="admin-legend-label">{item.label}</span>
                        <span className="admin-legend-value">
                            {item.count} ({item.pct}%)
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}