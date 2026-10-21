const { notImplemented } = require('../utils/notImplemented');
const { Promotion } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// UC-02.4, 21.1 View Promotions (đang hoạt động)
// Chỉ trả khuyến mãi status = active và đang trong khoảng startDate..endDate
exports.listPromotions = asyncHandler(async (req, res) => {
    const now = new Date();
    const promotions = await Promotion.find({
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now },
    })
        .populate('categoryIds', 'name')
        .populate('productIds', 'name')
        .sort({ endDate: 1 });
    res.json(promotions);
});

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.applyPromotion = notImplemented('UC-21.2 Apply Promotion');
exports.listAllPromotions = notImplemented('UC-37.1 View Promotions (tất cả trạng thái)');
exports.createPromotion = notImplemented('UC-37.2 Create Promotion');
exports.updatePromotion = notImplemented('UC-37.3 Update Promotion');
exports.activatePromotion = notImplemented('UC-37.4 Activate Promotion');
exports.suspendPromotion = notImplemented('UC-37.5 Suspend Promotion');
exports.deletePromotion = notImplemented('UC-37.6 Delete Promotion');