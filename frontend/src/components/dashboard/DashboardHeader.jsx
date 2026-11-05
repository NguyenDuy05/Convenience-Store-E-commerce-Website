import { useState } from 'react';

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
export function rangeLabel(range) {
    if (!range) return '';
    const last = new Date(new Date(range.to).getTime() - 1);
    return range.hourly ? fmt(range.from) : `${fmt(range.from)} – ${fmt(last)}`;
}

// Tiêu đề trang + chọn khoảng ngày + làm mới + xuất CSV. params = { range, from?, to? }
export default function DashboardHeader({ title, pill, description, ranges, params, onChange, data, loading, onRefresh, onExport }) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const ALL = { today: 'Today', '7d': '7 Days', '30d': '30 Days', '90d': '90 Days', custom: 'Custom' };
    const applyCustom = () => { if (from && to && from <= to) onChange({ range: 'custom', from, to }); };

    return (
        <div className="ap-head">
            <div>
                <div className="ap-title-row"><h1>{title}</h1>{pill && <span className="ap-pill">{pill}</span>}</div>
                <p style={{ marginBottom: 0 }}>{description}</p>
                <div className="db-sub">
                    {data && <span>Showing <b>{rangeLabel(data.range)}</b></span>}
                    {data && <><span className="db-dot" /><span>Updated {new Date(data.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></>}
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                <div className="db-range">
                    <div className="db-seg" role="tablist" aria-label="Date range">
                        {ranges.map((r) => <button key={r} role="tab" aria-selected={params.range === r} className={params.range === r ? 'on' : ''} onClick={() => (r === 'custom' ? onChange({ range: 'custom', from: from || undefined, to: to || undefined }) : onChange({ range: r }))}>{ALL[r]}</button>)}
                    </div>
                    <button className="ap-btn ghost" onClick={onRefresh} disabled={loading}><span className={`review-material-icon${loading ? ' db-spin' : ''}`}>refresh</span>Refresh</button>
                    <button className="ap-btn primary" onClick={onExport} disabled={!data}><span className="review-material-icon">download</span>Export CSV</button>
                </div>
                {params.range === 'custom' && (
                    <div className="db-custom">
                        <input type="date" aria-label="From" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                        <span>→</span>
                        <input type="date" aria-label="To" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                        <button className="ap-btn soft" onClick={applyCustom} disabled={!from || !to || from > to}>Apply</button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Xuất báo cáo đang hiển thị ra CSV (có BOM để Excel đọc đúng tiếng Việt)
export function exportCsv(data, filename) {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const k = data.kpis;
    const rows = [
        ['Report', rangeLabel(data.range)], [],
        ['Metric', 'Value'],
        ['Sales (VND)', k.sales.value], ['Orders', k.orders.value], ['Average order value (VND)', k.avgOrderValue],
        ['Customers served', k.customersServed], ['Low stock products', k.lowStock], ['Out of stock products', k.outOfStock], [],
        [data.range.hourly ? 'Hour' : 'Date', 'Sales (VND)', 'Orders'], ...data.series.map((r) => [r.label, r.sales, r.orders]), [],
        ['Category', 'Revenue (VND)', 'Share %'], ...data.salesByCategory.map((c) => [c.name, c.revenue, c.share]), [],
        ['Top product', 'Units', 'Revenue (VND)'], ...data.topProducts.map((p) => [p.name, p.units, p.revenue]),
    ];
    const blob = new Blob([`\uFEFF${rows.map((r) => r.map(q).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href);
}