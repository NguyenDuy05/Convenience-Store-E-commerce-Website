const asyncHandler = require('../utils/asyncHandler');
const { loadDashboard } = require('../services/dashboard.service');

// GET /api/dashboard/admin?range=today|7d|30d|90d|custom&from=YYYY-MM-DD&to=YYYY-MM-DD  (admin)
exports.adminDashboard = asyncHandler(async (req, res) => {
    res.json(await loadDashboard({ range: req.query.range || '7d', from: req.query.from, to: req.query.to }));
});

// GET /api/dashboard/staff?range=...  (staff, admin). Mặc định là hôm nay.
// Nhân viên chỉ được xem doanh thu CỦA HÔM NAY (tính từ 00:00 giờ VN, qua ngày tự về 0).
// Mọi số tiền tổng hợp nhiều ngày bị bỏ; biểu đồ theo giờ của hôm nay được giữ số tiền.
const hideRevenue = (d, keepSeriesSales) => {
    const { sales, avgOrderValue, ...kpis } = d.kpis;
    return {
        ...d,
        kpis: { ...kpis, orders: kpis.orders },
        series: keepSeriesSales ? d.series : d.series.map(({ sales: _s, ...r }) => r),
        channels: (d.channels || []).map(({ sales: _s, ...c }) => c),
        salesByCategory: [],
        topProducts: (d.topProducts || []).map(({ revenue: _r, ...p }) => p),
        recentOrders: d.recentOrders,
    };
};

exports.staffDashboard = asyncHandler(async (req, res) => {
    const range = req.query.range || 'today';
    const data = await loadDashboard({ range, from: req.query.from, to: req.query.to });
    if (req.user.role !== 'staff') return res.json(data);
    const today = range === 'today' ? data : await loadDashboard({ range: 'today' });
    const out = hideRevenue(data, range === 'today');
    out.todaySales = {
        value: today.kpis.sales.value,
        orders: today.kpis.orders.value,
        avgOrderValue: today.kpis.avgOrderValue,
        date: today.range.from,                 // mốc 00:00 hôm nay (giờ VN)
    };
    res.json(out);
});