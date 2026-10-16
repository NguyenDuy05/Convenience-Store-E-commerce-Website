const { ActivityLog } = require('../models');

// Ghi nhật ký thao tác (UC-30.6). Không để lỗi ghi log làm hỏng request chính.
// Dùng: await log(req, 'PRODUCT_UPDATE', { type: 'Product', id: product._id }, { before, after })
exports.log = async (req, action, target = {}, detail) => {
  try {
    await ActivityLog.create({
      actorId: req.user.id,
      actorRole: req.user.role,
      action,
      targetType: target.type,
      targetId: target.id,
      detail,
      ip: req.ip,
    });
  } catch (err) {
    console.error('Không ghi được ActivityLog:', err.message);
  }
};
