// Ghi nhật ký thao tác (ActivityLog, chỉ thêm, không sửa/xóa - BR-40). Lỗi ghi log không được làm hỏng thao tác chính.
const { ActivityLog } = require('../models');

exports.logActivity = async (req, { action, targetType, targetId, detail }) => {
  try {
    await ActivityLog.create({ actorId: req.user.id, actorRole: req.user.role, action, targetType, targetId, detail, ip: req.ip });
  } catch (err) {
    console.error('Ghi nhật ký thao tác thất bại:', err);
  }
};
