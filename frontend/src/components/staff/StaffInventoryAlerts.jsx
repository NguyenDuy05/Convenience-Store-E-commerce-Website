export default function StaffInventoryAlerts({ products }) {
    const alerts = products
        .filter((p) => (p.stockQuantity || 0) <= (p.lowStockThreshold || 10))
        .slice(0, 6)
        .map((p) => ({
            id: p._id,
            name: p.name,
            stock: p.stockQuantity || 0,
            status: p.stockQuantity === 0 ? 'out' : 'low',
        }));

    const statusMap = {
        out: { label: 'Hết Hàng', color: '#DC2626' },
        low: { label: 'Sắp Hết', color: '#D97706' },
    };

    return (
        <div className="staff-card">
            <div className="staff-card-header">
                <h2 className="staff-card-title">Cảnh Báo Kho Hàng</h2>
                <span className="staff-card-tag">Cần kiểm tra</span>
            </div>

            {alerts.length === 0 ? (
                <p className="staff-empty">Kho hàng bình thường</p>
            ) : (
                <div className="staff-alerts-list">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="staff-alert-item">
                            <div className="staff-alert-info">
                                <span className="staff-alert-name">{alert.name}</span>
                                <span className="staff-alert-stock">{alert.stock} cái</span>
                            </div>
                            <span
                                className="staff-alert-badge"
                                style={{
                                    color: statusMap[alert.status].color,
                                    borderColor: statusMap[alert.status].color
                                }}
                            >
                                {statusMap[alert.status].label}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}