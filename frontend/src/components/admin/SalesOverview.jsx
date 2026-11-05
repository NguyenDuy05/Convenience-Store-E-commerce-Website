export default function SalesOverview({ orders }) {
    // Mock chart data
    const chartData = [
        { day: 'Mon', sales: 8.2 },
        { day: 'Tue', sales: 9.1 },
        { day: 'Wed', sales: 7.8 },
        { day: 'Thu', sales: 10.2 },
        { day: 'Fri', sales: 12.4 },
        { day: 'Sat', sales: 14.6 },
        { day: 'Sun', sales: 9.5 },
    ];
    const maxSales = Math.max(...chartData.map((d) => d.sales));

    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <div>
                    <h2 className="admin-card-title">Sales Overview</h2>
                    <p className="admin-card-subtitle">Revenue daily progression</p>
                </div>
                <div className="admin-tab-group">
                    <button className="admin-tab active">7 Days</button>
                    <button className="admin-tab">30 Days</button>
                    <button className="admin-tab">90 Days</button>
                </div>
            </div>

            <div className="admin-chart">
                {chartData.map((d) => (
                    <div key={d.day} className="admin-chart-bar-group">
                        <div className="admin-chart-bar-container">
                            <div className="admin-chart-bar" style={{ height: `${(d.sales / maxSales) * 100}%` }} />
                        </div>
                        <span className="admin-chart-label">{d.day}</span>
                    </div>
                ))}
            </div>

            <div className="admin-card-footer">
                <div className="admin-metric">
                    <span>Total Sales</span>
                    <span className="admin-metric-value">₫86.4M</span>
                </div>
                <div className="admin-metric">
                    <span>Average Daily</span>
                    <span className="admin-metric-value">₫12.3M</span>
                </div>
                <div className="admin-metric">
                    <span>Growth</span>
                    <span className="admin-metric-value up">+12.8%</span>
                </div>
            </div>
        </div>
    );
}