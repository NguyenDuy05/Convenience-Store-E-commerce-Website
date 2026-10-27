const asyncHandler = require('../utils/asyncHandler');
const { loadDashboard } = require('../services/dashboard.service');

// GET /api/dashboard/admin?range=today|7d|30d|90d|custom&from=YYYY-MM-DD&to=YYYY-MM-DD  (admin)
exports.adminDashboard = asyncHandler(async (req, res) => {
    res.json(await loadDashboard({ range: req.query.range || '7d', from: req.query.from, to: req.query.to }));
});

// GET /api/dashboard/staff?range=...  (staff, admin). Mặc định là hôm nay.
exports.staffDashboard = asyncHandler(async (req, res) => {
    res.json(await loadDashboard({ range: req.query.range || 'today', from: req.query.from, to: req.query.to }));
});