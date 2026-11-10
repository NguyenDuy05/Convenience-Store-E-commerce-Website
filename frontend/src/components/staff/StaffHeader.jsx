export default function StaffHeader({ dateRange, setDateRange, onRefresh }) {
    return (
        <div className="staff-page-header">
            <div className="staff-header-left">
                <h1 className="staff-title">Today's overview</h1>
                <p className="staff-subtitle">Sales and store operations at a glance</p>
            </div>

            <div className="staff-header-right">
                <div className="staff-date-range">
                    {['today', '7d', '30d'].map((range) => (
                        <button
                            key={range}
                            className={`staff-range-btn ${dateRange === range ? 'active' : ''}`}
                            onClick={() => setDateRange(range)}
                        >
                            {range === 'today' ? "Today" : range === '7d' ? "7 days" : "30 days"}
                        </button>
                    ))}
                </div>

                <button className="staff-btn-refresh" onClick={onRefresh}>
                    <span className="staff-icon">refresh</span>
                    Refresh
                </button>
            </div>
        </div>
    );
}