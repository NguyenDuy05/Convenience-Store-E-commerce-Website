export default function StaffOrdersByDay({ orders }) {
    const data = [
        { day: "Monday", count: 24 },
        { day: "Tuesday", count: 32 },
        { day: "Wednesday", count: 28 },
        { day: "Thursday", count: 35 },
        { day: "Friday", count: 42 },
        { day: "Saturday", count: 48 },
        { day: "Sunday", count: 38 },
    ];
    const maxCount = Math.max(...data.map(d => d.count));

    return (
        <div className="staff-card">
            <div className="staff-card-header">
                <div>
                    <h2 className="staff-card-title">Orders by day</h2>
                    <p className="staff-card-subtitle">This week</p>
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