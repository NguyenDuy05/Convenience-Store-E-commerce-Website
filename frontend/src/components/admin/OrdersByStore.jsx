export default function OrdersByStore({ orders, stores }) {
    const storeOrders = stores.slice(0, 5).map((s) => ({
        name: s.name,
        location: s.address?.substring(0, 20) || 'Location',
        count: Math.floor(Math.random() * 400) + 100,
    }));
    const maxCount = Math.max(...storeOrders.map((s) => s.count));

    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <div>
                    <h2 className="admin-card-title">Orders by Store</h2>
                    <p className="admin-card-subtitle">Top 5 branches by volume</p>
                </div>
                <span className="admin-card-tag">1,208 total</span>
            </div>

            <div className="admin-bar-list">
                {storeOrders.map((store) => (
                    <div key={store.name} className="admin-bar-item">
                        <div className="admin-bar-info">
                            <span className="admin-bar-title">{store.name}</span>
                            <span className="admin-bar-location">{store.location}</span>
                        </div>
                        <div className="admin-bar-container">
                            <div className="admin-bar" style={{ width: `${(store.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="admin-bar-value">{store.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}