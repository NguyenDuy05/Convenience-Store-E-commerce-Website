export default function AdminHeader({ dateRange, setDateRange, onRefresh }) {
    return (
        <div className="admin-page-header">
            <div className="admin-header-left">
                <h1 className="admin-title">Admin Dashboard</h1>
                <p className="admin-subtitle">Overview of your business operations across all stores</p>
            </div>

            <div className="admin-header-right">
                <div className="admin-date-range">
                    {['today', '7d', '30d'].map((range) => (
                        <button
                            key={range}
                            className={`admin-range-btn ${dateRange === range ? 'active' : ''}`}
                            onClick={() => setDateRange(range)}
                        >
                            {range === 'today' ? 'Today' : range === '7d' ? '7 Days' : '30 Days'}
                        </button>
                    ))}
                    <button className="admin-range-btn">
                        <span className="admin-icon">calendar_today</span>
                        Custom
                    </button>
                </div>

                <button className="admin-btn-primary" onClick={onRefresh}>
                    <span className="admin-icon">download</span>
                    Export Report
                </button>
            </div>
        </div>
    );
}