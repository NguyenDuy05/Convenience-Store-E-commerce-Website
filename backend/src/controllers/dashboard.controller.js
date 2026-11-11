const asyncHandler = require('../utils/asyncHandler');
const { loadDashboard } = require('../services/dashboard.service');

// Dashboard admin: doanh thu, đơn, sản phẩm bán chạy, tồn kho theo khoảng ngày
exports.adminDashboard = asyncHandler(async (req, res) => {
    res.json(await loadDashboard({ range: req.query.range || '7d', from: req.query.from, to: req.query.to }));
});

// Bỏ các số tiền tổng hợp nhiều ngày khỏi dữ liệu dashboard trả cho staff
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

// Dashboard staff: hàng đợi đơn, số đơn, tồn kho; chỉ xem doanh thu của hôm nay
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
        date: today.range.from,
    };
    res.json(out);
});
