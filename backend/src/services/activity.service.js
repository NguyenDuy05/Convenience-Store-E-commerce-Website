const { ActivityLog } = require('../models');

// Ghi nhật ký thao tác của nhân viên / admin (không làm hỏng request nếu ghi lỗi)
exports.logActivity = async (req, { action, targetType, targetId, detail }) => {
  try {
    await ActivityLog.create({ actorId: req.user.id, actorRole: req.user.role, action, targetType, targetId, detail, ip: req.ip });
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
};
