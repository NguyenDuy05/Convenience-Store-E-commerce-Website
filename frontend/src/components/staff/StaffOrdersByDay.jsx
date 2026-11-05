export default function StaffOrdersByDay({ orders }) {
    const data = [
        { day: 'Thứ Hai', count: 24 },
        { day: 'Thứ Ba', count: 32 },
        { day: 'Thứ Tư', count: 28 },
        { day: 'Thứ Năm', count: 35 },
        { day: 'Thứ Sáu', count: 42 },
        { day: 'Thứ Bảy', count: 48 },
        { day: 'Chủ Nhật', count: 38 },
    ];
    const maxCount = Math.max(...data.map(d => d.count));

    return (
        <div className="staff-card">
            <div className="staff-card-header">
                <div>
                    <h2 className="staff-card-title">Đơn Hàng Theo Ngày</h2>
                    <p className="staff-card-subtitle">Tuần này</p>
                </div>
            </div>

            <div className="staff-bar-list">
                {data.map((d) => (
                    <div key={d.day} className="staff-bar-item">
                        <span className="staff-bar-label">{d.day}</span>
                        <div className="staff-bar-container">
                            <div className="staff-bar" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="staff-bar-value">{d.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}