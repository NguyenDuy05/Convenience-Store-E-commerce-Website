export default function StaffTopProducts({ products }) {
    const topProducts = products.slice(0, 5).map((p) => ({
        id: p._id,
        name: p.name || 'Product',
        sold: Math.floor(Math.random() * 200) + 30,
        revenue: (p.price || 0) * (Math.floor(Math.random() * 200) + 30),
    }));

    const maxRevenue = Math.max(...topProducts.map(p => p.revenue));

    return (
        <div className="staff-card">
            <div className="staff-card-header">
                <h2 className="staff-card-title">Top Sản Phẩm</h2>
            </div>

            <div className="staff-top-products">
                {topProducts.map((p, i) => (
                    <div key={p.id} className="staff-product-item">
                        <div className="staff-product-rank">{i + 1}</div>
                        <div className="staff-product-info">
                            <span className="staff-product-name">{p.name}</span>
                            <span className="staff-product-stats">{p.sold} bán - ₫{(p.revenue / 1000000).toFixed(1)}M</span>
                        </div>
                        <div className="staff-product-bar">
                            <div className="staff-bar-fill" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}