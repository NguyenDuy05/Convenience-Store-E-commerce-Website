export default function SalesByCategory({ categories }) {
    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <div>
                    <h2 className="admin-card-title">Sales by Category</h2>
                    <p className="admin-card-subtitle">Revenue distribution</p>
                </div>
            </div>

            <div className="admin-bar-list">
                {categories.map((cat) => (
                    <div key={cat.name} className="admin-bar-item compact">
                        <div className="admin-bar-info">
                            <span className="admin-bar-title">{cat.name}</span>
                        </div>
                        <div className="admin-bar-container">
                            <div className="admin-bar" style={{ width: `${cat.value * 100}%` }} />
                        </div>
                        <span className="admin-bar-value">₫{(cat.amount / 1000000).toFixed(1)}M ({Math.round(cat.value * 100)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
}