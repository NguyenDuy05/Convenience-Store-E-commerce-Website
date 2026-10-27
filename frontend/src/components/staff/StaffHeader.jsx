export default function StaffHeader({ dateRange, setDateRange, onRefresh }) {
    return (
        <div className="staff-page-header">
            <div className="staff-header-left">
                <h1 className="staff-title">Tổng Quan Hôm Nay</h1>
                <p className="staff-subtitle">Thống kê bán hàng và quản lý chi nhánh</p>
            </div>

            <div className="staff-header-right">
                <div className="staff-date-range">
                    {['today', '7d', '30d'].map((range) => (
                        <button
                            key={range}
                            className={`staff-range-btn ${dateRange === range ? 'active' : ''}`}
                            onClick={() => setDateRange(range)}
                        >
                            {range === 'today' ? 'Hôm Nay' : range === '7d' ? '7 Ngày' : '30 Ngày'}
                        </button>
                    ))}
                </div>

                <button className="staff-btn-refresh" onClick={onRefresh}>
                    <span className="staff-icon">refresh</span>
                    Làm mới
                </button>
            </div>
        </div>
    );
}