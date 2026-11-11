const { ActivityLog } = require('../models');

// Ghi nhật ký thao tác (bản cũ, dùng cho sản phẩm)
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
    console.error("Could not write ActivityLog:", err.message);
  }
};
