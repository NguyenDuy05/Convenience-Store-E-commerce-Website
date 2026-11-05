import { useState } from 'react';
import useDashboard from '../../hooks/useDashboard';
import DashboardHeader, { exportCsv } from '../../components/dashboard/DashboardHeader';
import { KpiCard, OrderQueue, Panel, RecentOrders, SalesChart, StockAlerts, TopProducts } from '../../components/dashboard/DashboardWidgets';
import { vnd } from '../../components/admin/products/productUtils';

// Dashboard nhân viên: dữ liệu thật từ GET /api/dashboard/staff, mặc định là hôm nay.
const n = (v) => Number(v || 0).toLocaleString('en-US');

export default function StaffDashboardPage() {
  const [params, setParams] = useState({ range: 'today' });
  const { data, error, loading, refresh } = useDashboard('staff', params);
  const k = data?.kpis;

  return (
    <div className="ap-page">
      <DashboardHeader title="Today's Overview" pill="Staff" description="Orders to handle, today's sales and stock that needs attention."
        ranges={['today', '7d', '30d']} params={params} onChange={setParams} data={data} loading={loading} onRefresh={refresh}
        onExport={() => exportCsv(data, `staff-dashboard-${params.range}.csv`)} />

      {error && <p className="ap-alert error" role="alert">{error} <button className="ap-link-btn" onClick={refresh}>Try again</button></p>}
      {!data && loading && <p className="db-empty">Loading dashboard…</p>}

      {k && <>
        <Panel title="Order queue" sub="Orders waiting for the store right now"><OrderQueue queue={data.queue} /></Panel>

        <div className="db-kpis">
          <KpiCard icon="payments" label="Sales" value={vnd(k.sales.value)} showDelta pct={k.sales.changePct} />
          <KpiCard icon="receipt_long" label="Orders" value={n(k.orders.value)} showDelta pct={k.orders.changePct} />
          <KpiCard icon="group" tone="green" label="Customers served" value={n(k.customersServed)} note="Registered customers who ordered" />
          <KpiCard icon="shopping_basket" tone="gray" label="Avg. order value" value={vnd(k.avgOrderValue)} note="Per valid order" />
          <KpiCard icon="warning" tone={k.lowStock ? 'yellow' : 'gray'} label="Low stock" value={n(k.lowStock)} note="Products at or below the alert level" />
          <KpiCard icon="remove_shopping_cart" tone={k.outOfStock ? 'red' : 'gray'} label="Out of stock" value={n(k.outOfStock)} note="Cannot be sold right now" />
        </div>

        <div className="db-grid g21">
          <Panel title="Sales" sub={data.range.hourly ? 'Revenue by hour' : 'Revenue by day'}><SalesChart series={data.series} /></Panel>
          <Panel title="Top products" sub="By units sold"><TopProducts items={data.topProducts} /></Panel>
        </div>

        <div className="db-grid g11">
          <Panel title="Recent orders" sub="Latest 8 orders"><RecentOrders orders={data.recentOrders} /></Panel>
          <Panel title="Inventory alerts" sub="Restock or check these first"><StockAlerts items={data.stockAlerts} expiringSoon={k.expiringSoon} expiredUnits={k.expiredUnits} /></Panel>
        </div>
      </>}
    </div>
  );
}