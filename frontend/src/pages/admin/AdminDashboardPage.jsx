import { useMemo, useState } from 'react';
import useDashboardData from '../../hooks/useDashboardData';
import KPICards from '../../components/admin/KPICards';
import SalesOverview from '../../components/admin/SalesOverview';
import OrderOverview from '../../components/admin/OrderOverview';
import OrdersByStore from '../../components/admin/OrdersByStore';
import SalesByCategory from '../../components/admin/SalesByCategory';
import InventoryAlerts from '../../components/admin/InventoryAlerts';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/admin.css';

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState('7d');
  const [refresh, setRefresh] = useState(0);
  const { data, loading, error } = useDashboardData(refresh);

  const stats = useMemo(() => {
    if (!data) return null;
    const orders = data.orders || [];
    const products = data.products || [];
    const categories = data.categories || [];
    const stores = data.stores || [];

    // Tính toán KPI
    const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders ? totalSales / totalOrders : 0;
    const completedOrders = orders.filter((o) => o.status === 'completed').length;
    const readyOrders = orders.filter((o) => o.status === 'ready_for_pickup').length;
    const preparingOrders = orders.filter((o) => o.status === 'preparing').length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;
    const lowStockProducts = products.filter((p) => (p.stockQuantity || 0) <= (p.lowStockThreshold || 10)).length;
    const newCustomers = 326; // Từ dữ liệu mẫu, sau thay bằng API
    const totalCustomers = 8426; // Từ dữ liệu mẫu, sau thay bằng API

    // Theo danh mục (mẫu)
    const salesByCategory = [
      { name: 'Drinks', value: 0.38, amount: totalSales * 0.38 },
      { name: 'Snacks', value: 0.28, amount: totalSales * 0.28 },
      { name: 'Fresh Food', value: 0.17, amount: totalSales * 0.17 },
      { name: 'Instant Food', value: 0.10, amount: totalSales * 0.10 },
      { name: 'Personal Care', value: 0.05, amount: totalSales * 0.05 },
      { name: 'Household', value: 0.02, amount: totalSales * 0.02 },
    ];

    // Top sản phẩm (mẫu, sau lấy từ API)
    const topProducts = products.slice(0, 5).map((p) => ({
      ...p,
      unitsSold: Math.floor(Math.random() * 300) + 50,
      revenue: (p.price || 0) * (Math.floor(Math.random() * 300) + 50),
    }));

    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      completedOrders,
      readyOrders,
      preparingOrders,
      cancelledOrders,
      lowStockProducts,
      activeStores: stores.length,
      newCustomers,
      totalCustomers,
      activePromos: data.promotions.length,
      salesByCategory,
      topProducts,
    };
  }, [data]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="admin-error">
          <h2>Could not load dashboard</h2>
          <p>{error}</p>
          <button onClick={() => setRefresh((r) => r + 1)}>Try again</button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminHeader dateRange={dateRange} setDateRange={setDateRange} onRefresh={() => setRefresh((r) => r + 1)} />
      <div className="admin-content">
        {/* KPI Cards */}
        {stats && <KPICards stats={stats} />}

        {/* Main Analytics */}
        <div className="admin-grid-2">
          {stats && <SalesOverview orders={data?.orders || []} />}
          {stats && <OrderOverview orders={data?.orders || []} />}
        </div>

        {/* Secondary Analytics */}
        <div className="admin-grid-2">
          {stats && <OrdersByStore orders={data?.orders || []} stores={data?.stores || []} />}
          {stats && <SalesByCategory categories={stats.salesByCategory} />}
        </div>

        {/* Inventory Alerts */}
        {stats && <InventoryAlerts products={data?.products || []} />}
      </div>
    </AdminLayout>
  );
}