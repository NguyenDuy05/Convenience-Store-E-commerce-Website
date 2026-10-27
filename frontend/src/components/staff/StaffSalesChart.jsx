export default function StaffSalesChart({ orders }) {
    const chartData = [
        { hour: '08', sales: 2.1 },
        { hour: '10', sales: 3.4 },
        { hour: '12', sales: 5.2 },
        { hour: '14', sales: 4.1 },
        { hour: '16', sales: 6.8 },
        { hour: '18', sales: 8.5 },
        { hour: '20', sales: 5.9 },
    ];
    const maxSales = Math.max(...chartData.map(d => d.sales));

    return (
        <div className="staff-card">
            <div className="staff-card-header">
                <div>
                    <h2 className="staff-card-title">Doanh Thu Theo Giờ</h2>
                    <p className="staff-card-subtitle">Tiến độ hôm nay</p>
                </div>
            </div>

            <div className="staff-mini-chart">
                {chartData.map((d) => (
                    <div key={d.hour} className="staff-bar-group">
                        <div className="staff-bar-container">
                            <div className="staff-bar" style={{ height: `${(d.sales / maxSales) * 100}%` }} />
                        </div>
                        <span className="staff-bar-label">{d.hour}h</span>
                    </div>
                ))}
            </div>

            <div className="staff-card-footer">
                <div className="staff-metric">
                    <span>Doanh Thu</span>
                    <span className="staff-metric-value">₫36M</span>
                </div>
                <div className="staff-metric">
                    <span>Trung Bình</span>
                    <span className="staff-metric-value">₫5.1M</span>
                </div>
            </div>
        </div>
    );
}