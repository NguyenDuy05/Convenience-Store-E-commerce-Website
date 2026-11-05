import { vnd } from '../admin/products/productUtils';

// Các khối hiển thị dùng chung cho dashboard admin và staff. Mọi khối đều có trạng thái "chưa có dữ liệu".
const Icon = ({ name, className = '' }) => <span className={`review-material-icon ${className}`}>{name}</span>;

export const compact = (n) => {
    const v = Number(n) || 0;
    if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    return String(v);
};
const num = (n) => Number(n || 0).toLocaleString('en-US');

export const STATUS_META = {
    pending_payment: { label: 'Awaiting payment', color: '#9aa0b4' },
    confirmed: { label: 'Confirmed', color: '#1c71e4' },
    preparing: { label: 'Preparing', color: '#c1aa56' },
    ready_for_pickup: { label: 'Ready for pickup', color: '#5fb02a' },
    completed: { label: 'Completed', color: '#356b0a' },
    failed: { label: 'Failed / expired', color: '#ba1a1a' },
};

export function Panel({ title, sub, action, children, className = '' }) {
    return (
        <section className={`db-panel ${className}`}>
            <div className="db-panel-head"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{action}</div>
            {children}
        </section>
    );
}
export const Empty = ({ icon = 'inbox', text }) => <div className="db-empty"><Icon name={icon} /><span>{text}</span></div>;

function Delta({ pct }) {
    if (pct === null || pct === undefined) return <span className="db-delta none">No previous data</span>;
    if (pct === 0) return <span className="db-delta none">No change vs previous period</span>;
    return <span className={`db-delta ${pct > 0 ? 'up' : 'down'}`}><Icon name={pct > 0 ? 'trending_up' : 'trending_down'} />{pct > 0 ? '+' : ''}{pct}%<small style={{ marginLeft: 4 }}>vs previous period</small></span>;
}

export function KpiCard({ icon, tone = '', label, value, note, pct, showDelta }) {
    return (
        <article className="db-kpi">
            <div className="db-kpi-top"><span>{label}</span><span className={`db-kpi-icon ${tone}`}><Icon name={icon} /></span></div>
            <strong>{value}</strong>
            {showDelta ? <Delta pct={pct} /> : note && <small>{note}</small>}
        </article>
    );
}

// Biểu đồ cột doanh thu theo giờ / ngày (SVG, không cần thư viện)
export function SalesChart({ series }) {
    const total = series.reduce((s, r) => s + r.sales, 0);
    if (!total) return <Empty icon="bar_chart" text="No sales in this period yet. Revenue will appear here once orders are placed." />;
    const W = 640; const H = 250; const L = 44; const B = 28; const T = 10; const plotH = H - B - T; const plotW = W - L - 8;
    const max = Math.max(...series.map((r) => r.sales));
    const mag = 10 ** Math.floor(Math.log10(max)); const n = max / mag;
    const top = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;          // trần "đẹp": 1, 2, 5, 10 × 10^k
    const ticks = [0, 1, 2, 3, 4, 5].map((i) => (top * i) / 5);
    const step = Math.ceil(series.length / 12); const bw = plotW / series.length;
    return (
        <svg className="db-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenue chart">
            {ticks.map((t) => { const y = T + plotH - (t / top) * plotH; return <g key={t}><line className="grid" x1={L} x2={W - 8} y1={y} y2={y} /><text className="axis" x={L - 6} y={y + 4} textAnchor="end">{compact(t)}</text></g>; })}
            {series.map((r, i) => {
                const h = (r.sales / top) * plotH; const x = L + i * bw + bw * 0.15;
                return <g key={r.key}>
                    <rect className={`bar${r.sales ? '' : ' zero'}`} x={x} y={T + plotH - Math.max(h, r.sales ? 2 : 1.5)} width={bw * 0.7} height={Math.max(h, r.sales ? 2 : 1.5)} rx="3"><title>{`${r.label}: ${vnd(r.sales)} · ${r.orders} order${r.orders === 1 ? '' : 's'}`}</title></rect>
                    {i % step === 0 && <text className="axis" x={x + (bw * 0.7) / 2} y={H - 8} textAnchor="middle">{r.label}</text>}
                </g>;
            })}
        </svg>
    );
}

export function StatusBreakdown({ counts }) {
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    if (!total) return <Empty icon="receipt_long" text="No orders in this period yet." />;
    return (
        <div className="db-bars">
            {Object.entries(STATUS_META).map(([k, m]) => (
                <div className="db-bar-row" key={k}>
                    <div><b>{m.label}</b><span>{num(counts[k])} <small style={{ color: '#727785' }}>({Math.round(((counts[k] || 0) / total) * 100)}%)</small></span></div>
                    <div className="db-track"><i style={{ width: `${((counts[k] || 0) / total) * 100}%`, background: m.color }} /></div>
                </div>
            ))}
        </div>
    );
}

export function ChannelSplit({ channels }) {
    const total = channels.reduce((s, c) => s + c.sales, 0);
    if (!total) return <Empty icon="storefront" text="No sales by channel yet." />;
    const meta = { online: { label: 'Online (pick-up orders)', color: '#0058bc' }, store: { label: 'In-store (POS)', color: '#5fb02a' } };
    return (
        <>
            <div className="db-split">{channels.map((c) => <i key={c.key} style={{ width: `${(c.sales / total) * 100}%`, background: meta[c.key].color }} />)}</div>
            <div className="db-legend">{channels.map((c) => (
                <div key={c.key}><span className="key"><i className="sw" style={{ background: meta[c.key].color }} />{meta[c.key].label}</span><span><b>{vnd(c.sales)}</b> <small style={{ color: '#727785' }}>· {c.orders} orders</small></span></div>
            ))}</div>
        </>
    );
}

export function CategoryBreakdown({ items }) {
    if (!items.length) return <Empty icon="category" text="No category sales yet." />;
    return (
        <div className="db-bars">{items.slice(0, 6).map((c) => (
            <div className="db-bar-row" key={c.categoryId}>
                <div><b>{c.name}</b><span>{vnd(c.revenue)} <small style={{ color: '#727785' }}>({c.share}%)</small></span></div>
                <div className="db-track"><i style={{ width: `${c.share}%` }} /></div>
            </div>
        ))}</div>
    );
}

const Thumb = ({ src }) => <span className="db-thumb">{src ? <img src={src} alt="" /> : <Icon name="inventory_2" />}</span>;

export function TopProducts({ items }) {
    if (!items.length) return <Empty icon="emoji_events" text="Best sellers will appear after the first sales." />;
    return (
        <ul className="db-list">{items.map((p, i) => (
            <li key={String(p.productId)}><span className="db-rank">{i + 1}</span><Thumb src={p.image} />
                <div className="grow"><b>{p.name}</b><small>{p.sku || '—'}</small></div>
                <div className="end"><b>{num(p.units)} sold</b><small>{vnd(p.revenue)}</small></div></li>
        ))}</ul>
    );
}

export function StockAlerts({ items, expiringSoon = 0, expiredUnits = 0 }) {
    return (
        <>
            {expiredUnits > 0 && <p className="db-note red"><Icon name="event_busy" />{num(expiredUnits)} unit(s) in expired batches are still in stock.</p>}
            {expiringSoon > 0 && <p className="db-note"><Icon name="schedule" />{num(expiringSoon)} batch(es) expire within 7 days.</p>}
            {!items.length ? <Empty icon="inventory" text="No low-stock or out-of-stock products." /> : (
                <ul className="db-list">{items.map((p) => (
                    <li key={p._id}><Thumb src={p.image} />
                        <div className="grow"><b>{p.name}</b><small>{p.sku} · min {p.lowStockThreshold}</small></div>
                        <div className="end"><b>{num(p.stockQuantity)} {p.unit}</b><span className={`ap-badge ${p.level === 'out' ? 'out' : 'low'}`}>{p.level === 'out' ? 'Out of stock' : 'Low stock'}</span></div></li>
                ))}</ul>
            )}
        </>
    );
}

const when = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
export function RecentOrders({ orders }) {
    if (!orders.length) return <Empty icon="shopping_bag" text="No orders yet." />;
    return (
        <div className="db-table-scroll"><table className="db-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th className="r">Items</th><th className="r">Total</th><th>Placed</th></tr></thead>
            <tbody>{orders.map((o) => (
                <tr key={o._id}><td><b className="ap-mono">{o.orderCode}</b></td><td>{o.customerName}</td>
                    <td><span className={`db-st db-st-${o.status}`}>{STATUS_META[o.status]?.label || o.status}</span></td>
                    <td className="r">{o.itemCount}</td><td className="r"><b>{vnd(o.totalAmount)}</b></td><td>{when(o.createdAt)}</td></tr>
            ))}</tbody>
        </table></div>
    );
}

export function OrderQueue({ queue }) {
    const cells = [
        ['pending_payment', 'Awaiting payment', false], ['confirmed', 'To prepare', true], ['preparing', 'Preparing', false], ['ready_for_pickup', 'Ready for pickup', true],
    ];
    return <div className="db-queue">{cells.map(([k, label, hot]) => <div key={k} className={hot && queue[k] ? 'hot' : ''}><b>{num(queue[k])}</b><span>{label}</span></div>)}</div>;
}