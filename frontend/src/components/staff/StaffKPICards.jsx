const Card = ({ label, value, icon, color }) => (
    <div className="staff-kpi-card">
        <div className="staff-kpi-header">
            <span className="staff-kpi-label">{label}</span>
        </div>
        <div className="staff-kpi-value">{value}</div>
        {icon && <span className="staff-kpi-icon" style={{ color }}>{icon}</span>}
    </div>
);

export default function StaffKPICards({ stats }) {
    return (
        <div className="staff-kpi-grid">
            <Card
                label="Doanh Thu Hôm Nay"
                value={`₫${(stats.todaySales / 1000000).toFixed(1)}M`}
                icon="trending_up"
                color="#10B981"
            />
            <Card
                label="Đơn Hàng"
                value={stats.todayOrders}
                icon="shopping_cart"
                color="#3B82F6"
            />
            <Card
                label="Sẵn Sàng Lấy Hàng"
                value={stats.readyPickup}
                icon="check_circle"
                color="#8B5CF6"
            />
            <Card
                label="Hàng Còn Ít"
                value={stats.lowStock}
                icon="warning"
                color="#F59E0B"
            />
            <Card
                label="Khách Hôm Nay"
                value={stats.customersToday}
                icon="people"
                color="#EC4899"
            />
        </div>
    );
}