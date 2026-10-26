export default function InventoryAlerts({ products }) {
    const alerts = products
        .filter((p) => (p.stockQuantity || 0) <= (p.lowStockThreshold || 10))
        .slice(0, 8)
        .map((p) => ({
            id: p._id,
            name: p.name,
            store: 'Store #01',
            stock: p.stockQuantity || 0,
            min: p.lowStockThreshold || 10,
            status: p.stockQuantity === 0 ? 'out' : p.stockQuantity <= 5 ? 'critical' : 'low',
        }));

    const statusMap = {
        critical: { label: 'Critical', color: '#DC2626' },
        out: { label: 'Out of Stock', color: '#991B1B' },
        low: { label: 'Low Stock', color: '#D97706' },
    };

    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <h2 className="admin-card-title">Inventory Alerts</h2>
                <span className="admin-card-tag">Immediate action required</span>
            </div>

            {alerts.length === 0 ? (
                <p className="admin-empty">All inventory levels are normal</p>
            ) : (
                <div className="admin-table">
                    <div className="admin-table-header">
                        <div>Product</div>
                        <div>Store</div>
                        <div>Current Stock</div>
                        <div>Status</div>
                        <div>Action</div>
                    </div>
                    <div className="admin-table-body">
                        {alerts.map((alert) => (
                            <div key={alert.id} className="admin-table-row">
                                <div className="admin-table-cell">{alert.name}</div>
                                <div className="admin-table-cell">{alert.store}</div>
                                <div className="admin-table-cell">
                                    <strong>{alert.stock} units</strong>
                                </div>
                                <div className="admin-table-cell">
                                    <span className="admin-badge-status" style={{ borderColor: statusMap[alert.status].color, color: statusMap[alert.status].color }}>
                                        {statusMap[alert.status].label}
                                    </span>
                                </div>
                                <div className="admin-table-cell">
                                    <button className="admin-btn-sm">View</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}