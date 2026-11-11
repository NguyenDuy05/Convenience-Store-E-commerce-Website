const mongoose = require('mongoose');
const { Review, Order, Product, Store } = require('../models');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../services/activity.service');

// Kiểm tra ObjectId hợp lệ
const validId = (id) => mongoose.isValidObjectId(id);

// Đọc page/limit từ query
function pagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger((page - 1) * limit)) {
    throw new ApiError(400, 'Invalid pagination');
  }
  return { page, limit };
}

// Kiểm tra lý do kiểm duyệt nằm trong danh sách cho phép
function moderationReason(value = '') {
  if (typeof value !== 'string' || value.length > 650) throw new ApiError(400, 'Moderation reason must be a string of 650 characters or fewer');
  return value.trim();
}

// Tính lại điểm trung bình và số đánh giá của sản phẩm
async function refreshProductRating(productId) {
  if (!productId) return;
  const [stats] = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(String(productId)), targetType: 'product', status: 'visible' } },
    { $group: { _id: '$productId', ratingAvg: { $avg: '$rating' }, ratingCount: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: productId }, { $set: { ratingAvg: stats?.ratingAvg || 0, ratingCount: stats?.ratingCount || 0 } });
}

// UC-40.1 Xem đánh giá công khai của một sản phẩm
exports.listProductReviews = async (req, res) => {
  if (!validId(req.params.productId)) throw new ApiError(400, 'Invalid product ID');
  const { page, limit } = pagination(req.query);
  const filter = { productId: req.params.productId, targetType: 'product', status: 'visible' };
  const [items, total] = await Promise.all([
    Review.find(filter).populate('customerId', 'fullName avatarUrl').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
};

// UC-40.2 Xem đánh giá công khai của cửa hàng
exports.listStoreReviews = async (req, res) => {
  const { page, limit } = pagination(req.query);
  const filter = { targetType: 'store', status: 'visible' };
  if (req.query.storeId !== undefined) {
    if (!validId(req.query.storeId)) throw new ApiError(400, 'Invalid store ID');
    filter.storeId = req.query.storeId;
  }
  const [items, total] = await Promise.all([
    Review.find(filter).populate('customerId', 'fullName avatarUrl').populate('storeId', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
};

// Các món trong đơn đã nhận mà khách còn đánh giá được
exports.listEligibleReviews = async (req, res) => {
  const orders = await Order.find({ customerId: req.user.id, source: 'online', status: 'completed' })
    .select('orderCode items pickedUpAt createdAt').sort({ pickedUpAt: -1, createdAt: -1 }).lean();
  const orderIds = orders.map((order) => order._id);
  const existing = orderIds.length ? await Review.find({ customerId: req.user.id, orderId: { $in: orderIds }, targetType: 'product', status: { $in: ['visible', 'hidden'] } }).select('orderId productId').lean() : [];
  const reviewed = new Set(existing.map((review) => `${review.orderId}:${review.productId}`));
  const eligible = [];
  for (const order of orders) {
    for (const item of order.items) {
      if (!reviewed.has(`${order._id}:${item.productId}`)) eligible.push({ orderId: order._id, orderCode: order.orderCode, pickedUpAt: order.pickedUpAt, productId: item.productId, productName: item.name });
    }
  }
  res.json(eligible);
};

// Khách xem các đánh giá của mình
exports.listMyReviews = async (req, res) => {
  const reviews = await Review.find({ customerId: req.user.id, status: { $ne: 'deleted' } })
    .populate('productId', 'name images').populate('storeId', 'name').populate('orderId', 'orderCode')
    .sort({ updatedAt: -1 }).lean();
  res.json(reviews);
};

// UC-11.1 Thêm đánh giá (chỉ món thuộc đơn đã nhận, mỗi món một lần)
exports.addReview = async (req, res) => {
  const { targetType = 'product', productId, storeId, orderId, rating, comment = '' } = req.body || {};
  if (!['product', 'store'].includes(targetType)) throw new ApiError(400, 'Invalid review target');
  if (!['number', 'string'].includes(typeof rating) || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) throw new ApiError(400, 'Rating must be between 1 and 5 stars');
  if (typeof comment !== 'string' || comment.trim().length > 1000) throw new ApiError(400, 'Review comments must be 1,000 characters or fewer');

  const reviewData = { targetType, customerId: req.user.id, rating: Number(rating), comment: comment.trim() };
  if (targetType === 'product') {
    if (!validId(productId) || !validId(orderId)) throw new ApiError(400, 'Select a valid product and order');
    const order = await Order.findOne({ _id: orderId, customerId: req.user.id, source: 'online', status: 'completed' }).select('items');
    if (!order || !order.items.some((item) => String(item.productId) === String(productId))) throw new ApiError(403, 'You can only review products from orders picked up in store');
    reviewData.productId = productId;
    reviewData.orderId = orderId;
  } else {
    if (storeId !== undefined && !validId(storeId)) throw new ApiError(400, 'Invalid store ID');
    const store = storeId !== undefined ? await Store.findById(storeId).select('_id') : await Store.findOne({ status: 'open' }).select('_id');
    if (!store) throw new ApiError(404, 'Store not found');
    reviewData.storeId = store._id;
  }
  let review;
  try { review = await Review.create(reviewData); }
  catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'You have already reviewed this product for this order');
    throw error;
  }
  if (review.productId) await refreshProductRating(review.productId);
  res.status(201).json(review);
};

// UC-11.2 Sửa đánh giá của mình
exports.updateReview = async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(400, 'Invalid review ID');
  const { rating, comment } = req.body || {};
  if (rating === undefined && comment === undefined) throw new ApiError(400, 'Provide a rating or comment to update');
  if (rating !== undefined && (!['number', 'string'].includes(typeof rating) || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5)) throw new ApiError(400, 'Rating must be between 1 and 5 stars');
  if (comment !== undefined && (typeof comment !== 'string' || comment.trim().length > 1000)) throw new ApiError(400, 'Review comments must be 1,000 characters or fewer');
  const review = await Review.findOne({ _id: req.params.id, customerId: req.user.id, status: 'visible' });
  if (!review) throw new ApiError(404, 'Editable review not found');
  if (rating !== undefined) review.rating = Number(rating);
  if (comment !== undefined) review.comment = comment.trim();
  await review.save();
  if (review.productId) await refreshProductRating(review.productId);
  res.json(review);
};

// UC-11.3 Xóa đánh giá của mình
exports.deleteReview = async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(400, 'Invalid review ID');
  const review = await Review.findOne({ _id: req.params.id, customerId: req.user.id, status: 'visible' });
  if (!review) throw new ApiError(404, 'Deletable review not found');
  review.status = 'deleted';
  await review.save();
  if (review.productId) await refreshProductRating(review.productId);
  res.json({ message: 'Review deleted' });
};

// Admin xem tất cả đánh giá (gồm đã ẩn / đã xóa)
exports.listReviewsAdmin = async (req, res) => {
  const { status, targetType, q } = req.query;
  const filter = {};
  if (status && ['visible', 'hidden', 'deleted'].includes(status)) filter.status = status;
  if (targetType && ['product', 'store'].includes(targetType)) filter.targetType = targetType;
  const reviews = await Review.find(filter).populate('customerId', 'fullName email').populate('productId', 'name sku images').populate('storeId', 'name').populate('orderId', 'orderCode source').sort({ createdAt: -1 }).lean();
  const items = q ? reviews.filter((item) => [item.customerId?.fullName, item.customerId?.email, item.productId?.name, item.comment, item.orderId?.orderCode].some((value) => String(value || '').toLowerCase().includes(String(q).toLowerCase()))) : reviews;
  res.json(items);
};

// UC-40.3 Ẩn / hiện đánh giá (có lý do, ghi nhật ký)
exports.hideReview = async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(400, 'Invalid review ID');
  const reason = moderationReason(req.body?.reason);
  const review = await Review.findById(req.params.id);
  if (!review || review.status === 'deleted') throw new ApiError(404, 'Review not found');
  if (review.status !== 'hidden' && !reason) throw new ApiError(400, 'Select a reason before hiding a review');
  review.moderation ??= {};
  review.status = review.status === 'hidden' ? 'visible' : 'hidden';
  review.moderation.hiddenBy = review.status === 'hidden' ? req.user.id : undefined;
  review.moderation.hiddenAt = review.status === 'hidden' ? new Date() : undefined;
  if (review.status === 'hidden') review.moderation.reason = reason;
  else if (!review.moderation.isViolating) review.moderation.reason = undefined;
  await review.save();
  if (review.productId) await refreshProductRating(review.productId);
  await logActivity(req, {
    action: review.status === 'hidden' ? 'REVIEW_HIDE' : 'REVIEW_SHOW', targetType: 'Review', targetId: review._id,
    detail: { status: review.status, reason: review.moderation.reason || '', targetType: review.targetType },
  });
  res.json(review);
};

// UC-40.4 Xử lý đánh giá vi phạm: bỏ qua hoặc ẩn (bắt buộc lý do)
exports.handleViolatingReview = async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(400, 'Invalid review ID');
  const { action } = req.body || {};
  const reason = moderationReason(req.body?.reason);
  if (!['dismiss', 'hide'].includes(action)) throw new ApiError(400, 'Action must be either dismiss or hide');
  if (action === 'hide' && !reason) throw new ApiError(400, 'Select a reason before confirming a violation');
  const review = await Review.findById(req.params.id);
  if (!review || review.status === 'deleted') throw new ApiError(404, 'Review not found');
  review.moderation ??= {};
  review.moderation.isViolating = action === 'hide';
  review.moderation.action = action;
  if (reason) review.moderation.reason = reason;
  if (action === 'hide') {
    review.status = 'hidden';
    review.moderation.hiddenBy = req.user.id;
    review.moderation.hiddenAt = new Date();
  }
  await review.save();
  if (review.productId) await refreshProductRating(review.productId);
  await logActivity(req, {
    action: action === 'hide' ? 'REVIEW_VIOLATION_CONFIRM' : 'REVIEW_VIOLATION_DISMISS', targetType: 'Review', targetId: review._id,
    detail: { status: review.status, reason: review.moderation.reason || '', targetType: review.targetType },
  });
  res.json(review);
};
