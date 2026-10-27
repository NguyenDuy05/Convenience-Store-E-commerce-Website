// Dashboard admin / staff: số liệu tổng hợp từ dữ liệu thật (Order, Product, StockBatch, User, Store, Promotion).
// Doanh thu / số đơn chỉ tính đơn "hợp lệ" = đã xác nhận trở đi (không tính pending_payment, failed).
// Múi giờ cố định Việt Nam (UTC+7) để "hôm nay" khớp ngày của cửa hàng.
const { Order, Product, StockBatch, User, Store, Promotion } = require('../models');
const ApiError = require('../utils/ApiError');

const DAY = 86400000;
const VN_OFFSET = 7 * 3600000;
const SALE_STATUSES = ['confirmed', 'preparing', 'ready_for_pickup', 'completed'];
const ALL_STATUSES = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup', 'completed', 'failed'];
const PRESETS = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
const MAX_CUSTOM_DAYS = 366;

const startOfDayVN = (d) => new Date(Math.floor((d.getTime() + VN_OFFSET) / DAY) * DAY - VN_OFFSET);
const vnParts = (d) => new Date(d.getTime() + VN_OFFSET);                       // đọc bằng getUTC* = giờ VN
const dayKey = (d) => vnParts(d).toISOString().slice(0, 10);                    // YYYY-MM-DD (VN)
const hourOf = (d) => vnParts(d).getUTCHours();
const parseDayVN = (s) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return null;
    const d = new Date(`${s}T00:00:00+07:00`);
    return Number.isNaN(d.getTime()) ? null : d;
};

// range: today | 7d | 30d | 90d | custom (kèm from, to dạng YYYY-MM-DD). Trả về khoảng [from, to) và khoảng liền trước cùng độ dài.
function resolveRange({ range = '7d', from, to } = {}, now = new Date()) {
    let start; let end; let key = range;
    if (range === 'custom') {
        const f = parseDayVN(from); const t = parseDayVN(to);
        if (!f || !t) throw new ApiError(400, 'Khoảng ngày không hợp lệ (định dạng YYYY-MM-DD)');
        if (f > t) throw new ApiError(400, 'Ngày bắt đầu phải trước ngày kết thúc');
        start = f; end = new Date(t.getTime() + DAY);
        if ((end - start) / DAY > MAX_CUSTOM_DAYS) throw new ApiError(400, `Khoảng ngày tối đa ${MAX_CUSTOM_DAYS} ngày`);
    } else {
        if (!PRESETS[range]) { key = '7d'; }
        const days = PRESETS[key];
        end = new Date(startOfDayVN(now).getTime() + DAY);
        start = new Date(end.getTime() - days * DAY);
    }
    const span = end - start;
    return { key, from: start, to: end, prevFrom: new Date(start - span), prevTo: start, hourly: span <= DAY, days: Math.round(span / DAY) };
}

const pctChange = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);   // null = chưa có kỳ trước để so sánh
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

// Hàm thuần (không đụng DB) để dễ kiểm thử.
function buildReport({ range, orders, prevOrders, products, categoriesById, expiry, counts, recent, queue, now = new Date() }) {
    const sales = orders.filter((o) => SALE_STATUSES.includes(o.status));
    const prevSales = prevOrders.filter((o) => SALE_STATUSES.includes(o.status));
    const revenue = sum(sales, (o) => o.totalAmount);
    const prevRevenue = sum(prevSales, (o) => o.totalAmount);

    // --- biểu đồ doanh thu: theo giờ (1 ngày) hoặc theo ngày ---
    const series = [];
    const index = new Map();
    if (range.hourly) {
        for (let h = 0; h < 24; h += 1) { const row = { key: String(h), label: `${String(h).padStart(2, '0')}h`, sales: 0, orders: 0 }; index.set(String(h), row); series.push(row); }
    } else {
        for (let t = range.from.getTime(); t < range.to.getTime(); t += DAY) {
            const k = dayKey(new Date(t)); const row = { key: k, label: k.slice(8, 10) + '/' + k.slice(5, 7), sales: 0, orders: 0 }; index.set(k, row); series.push(row);
        }
    }
    sales.forEach((o) => {
        const row = index.get(range.hourly ? String(hourOf(o.createdAt)) : dayKey(o.createdAt));
        if (row) { row.sales += o.totalAmount; row.orders += 1; }
    });

    // --- trạng thái đơn trong kỳ ---
    const statusCounts = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0]));
    orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

    // --- kênh bán ---
    const channels = ['online', 'store'].map((c) => {
        const list = sales.filter((o) => o.source === c);
        return { key: c, orders: list.length, sales: sum(list, (o) => o.totalAmount) };
    });

    // --- theo danh mục & top sản phẩm (từ snapshot dòng hàng của các đơn hợp lệ) ---
    const catAgg = new Map(); const prodAgg = new Map();
    const prodMap = new Map(products.map((p) => [String(p._id), p]));
    sales.forEach((o) => o.items.forEach((it) => {
        const pid = String(it.productId);
        const p = prodMap.get(pid);
        const a = prodAgg.get(pid) || { productId: it.productId, name: it.name, sku: p?.sku || it.sku || '', image: p?.images?.[0] || null, unit: p?.unit || '', units: 0, revenue: 0 };
        a.units += it.quantity; a.revenue += it.lineTotal; prodAgg.set(pid, a);
        const cid = p?.categoryId ? String(p.categoryId) : 'unknown';
        const c = catAgg.get(cid) || { categoryId: cid, name: categoriesById.get(cid) || 'Uncategorized', revenue: 0, units: 0 };
        c.revenue += it.lineTotal; c.units += it.quantity; catAgg.set(cid, c);
    }));
    const catTotal = sum([...catAgg.values()], (c) => c.revenue);
    const salesByCategory = [...catAgg.values()].sort((a, b) => b.revenue - a.revenue).map((c) => ({ ...c, share: catTotal ? Math.round((c.revenue / catTotal) * 1000) / 10 : 0 }));
    const topProducts = [...prodAgg.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 5);

    // --- tồn kho ---
    const active = products.filter((p) => p.status === 'active');
    const outOfStock = active.filter((p) => p.stockQuantity <= 0);
    const lowStock = active.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold);
    const stockAlerts = [...outOfStock, ...lowStock].sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, 8)
        .map((p) => ({ _id: p._id, name: p.name, sku: p.sku, image: p.images?.[0] || null, unit: p.unit, stockQuantity: p.stockQuantity, lowStockThreshold: p.lowStockThreshold, level: p.stockQuantity <= 0 ? 'out' : 'low' }));

    return {
        range: { key: range.key, from: range.from, to: range.to, days: range.days, hourly: range.hourly },
        generatedAt: now,
        kpis: {
            sales: { value: revenue, previous: prevRevenue, changePct: pctChange(revenue, prevRevenue) },
            orders: { value: sales.length, previous: prevSales.length, changePct: pctChange(sales.length, prevSales.length) },
            avgOrderValue: sales.length ? Math.round(revenue / sales.length) : 0,
            customersServed: new Set(sales.filter((o) => o.customerId).map((o) => String(o.customerId))).size,
            totalCustomers: counts.customers, newCustomers: counts.newCustomers,
            openStores: counts.openStores, totalStores: counts.totalStores,
            lowStock: lowStock.length, outOfStock: outOfStock.length, activeProducts: active.length,
            activePromotions: counts.activePromotions,
            expiringSoon: expiry.expiringSoon, expiredUnits: expiry.expiredUnits,
        },
        series, statusCounts, channels, salesByCategory, topProducts, stockAlerts,
        queue, recentOrders: recent,
    };
}

async function loadDashboard(query = {}, now = new Date()) {
    const range = resolveRange(query, now);
    const orderFields = 'orderCode source customerId status totalAmount createdAt items.productId items.name items.sku items.quantity items.lineTotal';
    const [orders, prevOrders, products, categories, customers, newCustomers, stores, promos, batches, recentDocs, queueAgg] = await Promise.all([
        Order.find({ createdAt: { $gte: range.from, $lt: range.to } }).select(orderFields).lean(),
        Order.find({ createdAt: { $gte: range.prevFrom, $lt: range.prevTo }, status: { $in: SALE_STATUSES } }).select('status totalAmount').lean(),
        Product.find({ status: { $ne: 'deleted' } }).select('name sku images unit categoryId status stockQuantity lowStockThreshold').lean(),
        require('../models').Category.find().select('name').lean(),
        User.countDocuments({ role: 'customer', status: { $ne: 'deleted' } }),
        User.countDocuments({ role: 'customer', status: { $ne: 'deleted' }, createdAt: { $gte: range.from, $lt: range.to } }),
        Store.find().select('status').lean(),
        Promotion.countDocuments({ status: 'active', startDate: { $lte: now }, endDate: { $gte: now } }),
        StockBatch.find({ quantity: { $gt: 0 }, expiryDate: { $lte: new Date(now.getTime() + 7 * DAY) } }).select('quantity expiryDate').lean(),
        Order.find().sort({ createdAt: -1 }).limit(8).select('orderCode source customerId status totalAmount paymentMethod createdAt items.quantity').populate('customerId', 'fullName').lean(),
        Order.aggregate([{ $match: { status: { $in: ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'] } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);

    const expiry = {
        expiringSoon: batches.filter((b) => new Date(b.expiryDate) >= now).length,
        expiredUnits: sum(batches.filter((b) => new Date(b.expiryDate) < now), (b) => b.quantity),
    };
    const queue = Object.fromEntries(['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'].map((s) => [s, 0]));
    queueAgg.forEach((g) => { queue[g._id] = g.n; });
    const recent = recentDocs.map((o) => ({
        _id: o._id, orderCode: o.orderCode, source: o.source, status: o.status, totalAmount: o.totalAmount, paymentMethod: o.paymentMethod,
        itemCount: (o.items || []).reduce((s, i) => s + i.quantity, 0), customerName: o.customerId?.fullName || (o.source === 'store' ? 'Walk-in customer' : '—'), createdAt: o.createdAt,
    }));

    return buildReport({
        range, orders, prevOrders, products, categoriesById: new Map(categories.map((c) => [String(c._id), c.name])), expiry,
        counts: { customers, newCustomers, openStores: stores.filter((s) => s.status === 'open').length, totalStores: stores.length, activePromotions: promos },
        recent, queue, now,
    });
}

module.exports = { loadDashboard, buildReport, resolveRange, SALE_STATUSES };