const Card = ({ label, value, trend, icon, color }) => (
    <div className="admin-kpi-card">
        <div className="admin-kpi-header">
            <span className="admin-kpi-label">{label}</span>
            {trend && <span className={`admin-kpi-trend ${trend > 0 ? 'up' : 'down'}`}>{trend > 0 ? '+' : ''}{trend}%</span>}
        </div>
        <div className="admin-kpi-value">{value}</div>
        {icon && <span className="admin-kpi-icon">{icon}</span>}
    </div>
);

export default function KPICards({ stats }) {
    return (
        <div className="admin-kpi-grid">
            <Card label="Total Sales" value={`₫${(stats.totalSales / 1000000).toFixed(1)}M`} trend={12.8} icon="trending_up" />
            <Card label="Total Orders" value={stats.totalOrders} trend={9.4} icon="receipt_long" />
            <Card label="Customers" value={stats.totalCustomers} trend={5.2} icon="group" />
            <Card label="Active Stores" value={stats.activeStores} trend={null} icon="storefront" />
            <Card label="Low Stock" value={stats.lowStockProducts} trend={null} icon="warning" color="warning" />
            <Card label="Active Promos" value={stats.activePromos} trend={null} icon="local_offer" />
        </div>
    );
}