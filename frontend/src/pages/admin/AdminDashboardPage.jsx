import { useState } from 'react';
import { Link } from 'react-router-dom';
import useDashboard from '../../hooks/useDashboard';
import DashboardHeader, { exportCsv } from '../../components/dashboard/DashboardHeader';
import { CategoryBreakdown, ChannelSplit, KpiCard, Panel, RecentOrders, SalesChart, StatusBreakdown, StockAlerts, TopProducts, compact } from '../../components/dashboard/DashboardWidgets';
import { vnd } from '../../components/admin/products/productUtils';

// Dashboard admin: toàn bộ số liệu lấy từ GET /api/dashboard/admin (dữ liệu thật trong MongoDB).
// Mục nào chưa có dữ liệu thì hiện 0 / trạng thái trống, sẽ tự có số khi module tương ứng được làm.
const n = (v) => Number(v || 0).toLocaleString('en-US');

export default function AdminDashboardPage() {
  const [params, setParams] = useState({ range: '7d' });
  const { data, error, loading, refresh } = useDashboard('admin', params);
  const k = data?.kpis;

  return (
    <div className="ap-page">
      <DashboardHeader title="Dashboard" pill="Admin Overview" description="Sales, orders, customers and stock across the store."
        ranges={['today', '7d', '30d', '90d', 'custom']} params={params} onChange={setParams} data={data} loading={loading} onRefresh={refresh}
        onExport={() => exportCsv(data, `dashboard-${params.range}.csv`)} />

      {error && <p className="ap-alert error" role="alert">{error} <button className="ap-link-btn" onClick={refresh}>Try again</button></p>}
      {!data && loading && <p className="db-empty">Loading dashboard…</p>}
      {!data && !loading && error && <section className="ap-card" aria-label="Dashboard data unavailable">
        <h2>Dashboard data is unavailable</h2>
        <p>Reconnect to the server to load sales, orders and inventory metrics. You can still open these management pages:</p>
        <div className="ap-actions">
          <Link className="ap-btn soft" to="/admin/orders">Orders</Link>
          <Link className="ap-btn soft" to="/admin/products">Products</Link>
          <Link className="ap-btn soft" to="/admin/inventory">Inventory</Link>
          <Link className="ap-btn soft" to="/admin/promotions">Promotions</Link>
        </div>
      </section>}

      {k && <>
        <div className="db-kpis">
          <KpiCard icon="payments" label="Total sales" value={vnd(k.sales.value)} showDelta pct={k.sales.changePct} />
          <KpiCard icon="receipt_long" label="Orders" value={n(k.orders.value)} showDelta pct={k.orders.changePct} />
          <KpiCard icon="shopping_basket" tone="gray" label="Avg. order value" value={vnd(k.avgOrderValue)} note={`${n(k.customersServed)} customer(s) ordered`} />
          <KpiCard icon="group" tone="green" label="Customers" value={n(k.totalCustomers)} note={`${n(k.newCustomers)} new in this period`} />
          <KpiCard icon="storefront" tone="gray" label="Store status" value={k.totalStores ? `${k.openStores} / ${k.totalStores} open` : '—'} note={k.totalStores ? 'Opening stores' : 'No store configured'} />
          <KpiCard icon="warning" tone={k.lowStock + k.outOfStock ? 'yellow' : 'gray'} label="Low / out of stock" value={`${n(k.lowStock)} / ${n(k.outOfStock)}`} note={`of ${n(k.activeProducts)} active products`} />
          <KpiCard icon="campaign" tone="gray" label="Active promotions" value={n(k.activePromotions)} note="Running right now" />
          <KpiCard icon="event_busy" tone={k.expiringSoon || k.expiredUnits ? 'red' : 'gray'} label="Expiry watch" value={n(k.expiringSoon)} note={`batches within 7 days · ${n(k.expiredUnits)} expired unit(s)`} />
        </div>

        <div className="db-grid g21">
          <Panel title="Sales overview" sub={data.range.hourly ? 'Revenue by hour' : 'Revenue by day'}><SalesChart series={data.series} /></Panel>
          <Panel title="Order status" sub="Orders placed in this period"><StatusBreakdown counts={data.statusCounts} /></Panel>
        </div>

        <div className="db-grid g111">
          <Panel title="Sales by category" sub="Share of revenue"><CategoryBreakdown items={data.salesByCategory} /></Panel>
          <Panel title="Top products" sub="By units sold"><TopProducts items={data.topProducts} /></Panel>
          <Panel title="Sales channel" sub={`Total ${compact(k.sales.value)} VND`}><ChannelSplit channels={data.channels} /></Panel>
        </div>

        <div className="db-grid g11">
          <Panel title="Inventory alerts" sub="Products that need restocking"><StockAlerts items={data.stockAlerts} expiringSoon={k.expiringSoon} expiredUnits={k.expiredUnits} /></Panel>
          <Panel title="Recent orders" sub="Latest 8 orders"><RecentOrders orders={data.recentOrders} /></Panel>
        </div>
      </>}
    </div>
  );
}
