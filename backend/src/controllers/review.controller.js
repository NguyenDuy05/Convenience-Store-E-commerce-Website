const mongoose = require('mongoose');
const { Review, Order, Product, Store } = require('../models');
const ApiError = require('../utils/ApiError');

const validId = (id) => mongoose.isValidObjectId(id);

async function refreshProductRating(productId) {
  if (!productId) return;
  const [stats] = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(String(productId)), targetType: 'product', status: 'visible' } },
    { $group: { _id: '$productId', ratingAvg: { $avg: '$rating' }, ratingCount: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: productId }, { $set: { ratingAvg: stats?.ratingAvg || 0, ratingCount: stats?.ratingCount || 0 } });
}

exports.listProductReviews = async (req, res) => {
  if (!validId(req.params.productId)) throw new ApiError(400, 'Invalid product ID');
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = { productId: req.params.productId, targetType: 'product', status: 'visible' };
  const [items, total] = await Promise.all([
    Review.find(filter).populate('customerId', 'fullName avatarUrl').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
};

exports.listStoreReviews = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = { targetType: 'store', status: 'visible' };
  const [items, total] = await Promise.all([
    Review.find(filter).populate('customerId', 'fullName avatarUrl').populate('storeId', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
};

// List completed pickup orders and product lines the customer can still review.
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

exports.listMyReviews = async (req, res) => {
  const reviews = await Review.find({ customerId: req.user.id, status: { $ne: 'deleted' } })
    .populate('productId', 'name images').populate('storeId', 'name').populate('orderId', 'orderCode')
    .sort({ updatedAt: -1 }).lean();
  res.json(reviews);
};

exports.addReview = async (req, res) => {
  const { targetType = 'product', productId, storeId, orderId, rating, comment = '' } = req.body;
  if (!['product', 'store'].includes(targetType)) throw new ApiError(400, 'Invalid review target');
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) throw new ApiError(400, 'Rating must be between 1 and 5 stars');
  if (typeof comment !== 'string' || comment.trim().length > 1000) throw new ApiError(400, 'Review comments must be 1,000 characters or fewer');

  const reviewData = { targetType, customerId: req.user.id, rating: Number(rating), comment: comment.trim() };
  if (targetType === 'product') {
    if (!validId(productId) || !validId(orderId)) throw new ApiError(400, 'Select a valid product and order');
    const order = await Order.findOne({ _id: orderId, customerId: req.user.id, source: 'online', status: 'completed' }).select('items');
    if (!order || !order.items.some((item) => String(item.productId) === String(productId))) throw new ApiError(403, 'You can only review products from orders picked up in store');
    reviewData.productId = productId;
    reviewData.orderId = orderId;
  } else {
    const store = storeId && validId(storeId) ? await Store.findById(storeId).select('_id') : await Store.findOne({ status: 'open' }).select('_id');
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

exports.deleteReview = async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(400, 'Invalid review ID');
  const review = await Review.findOne({ _id: req.params.id, customerId: req.user.id, status: 'visible' });
  if (!review) throw new ApiError(404, 'Deletable review not found');
  review.status = 'deleted';
  await review.save();
  if (review.productId) await refreshProductRating(review.productId);
  res.json({ message: 'Review deleted' });
};

exports.listReviewsAdmin = async (req, res) => {
  const { status, targetType, q } = req.query;
  const filter = {};
  if (status && ['visible', 'hidden', 'deleted'].includes(status)) filter.status = status;
  if (targetType && ['product', 'store'].includes(targetType)) filter.targetType = targetType;
  const reviews = await Review.find(filter).populate('customerId', 'fullName email').populate('productId', 'name sku images').populate('storeId', 'name').populate('orderId', 'orderCode source').sort({ createdAt: -1 }).lean();
  const items = q ? reviews.filter((item) => [item.customerId?.fullName, item.customerId?.email, item.productId?.name, item.comment, item.orderId?.orderCode].some((value) => String(value || '').toLowerCase().includes(String(q).toLowerCase()))) : reviews;
  res.json(items);
};

exports.hideReview = async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(400, 'Invalid review ID');
  const review = await Review.findById(req.params.id);
  if (!review || review.status === 'deleted') throw new ApiError(404, 'Review not found');
  if (review.status !== 'hidden' && !String(req.body.reason || '').trim()) throw new ApiError(400, 'Select a reason before hiding a review');
  if (String(req.body.reason || '').length > 650) throw new ApiError(400, 'Moderation reason must be 650 characters or fewer');
  review.status = review.status === 'hidden' ? 'visible' : 'hidden';
  review.moderation.hiddenBy = review.status === 'hidden' ? req.user.id : undefined;
  review.moderation.hiddenAt = review.status === 'hidden' ? new Date() : undefined;
  review.moderation.reason = review.status === 'hidden' ? String(req.body.reason || '').trim() : undefined;
  await review.save();
  if (review.productId) await refreshProductRating(review.productId);
  res.json(review);
};

exports.handleViolatingReview = async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(400, 'Invalid review ID');
  const { action, reason = '' } = req.body;
  if (!['dismiss', 'hide'].includes(action)) throw new ApiError(400, 'Action must be either dismiss or hide');
  if (action === 'hide' && !String(reason).trim()) throw new ApiError(400, 'Select a reason before confirming a violation');
  if (String(reason).length > 650) throw new ApiError(400, 'Moderation reason must be 650 characters or fewer');
  const review = await Review.findById(req.params.id);
  if (!review || review.status === 'deleted') throw new ApiError(404, 'Review not found');
  review.moderation.isViolating = action === 'hide';
  review.moderation.action = action;
  if (reason) review.moderation.reason = String(reason).trim();
  if (action === 'hide') {
    review.status = 'hidden';
    review.moderation.hiddenBy = req.user.id;
    review.moderation.hiddenAt = new Date();
  }
  await review.save();
  if (review.productId) await refreshProductRating(review.productId);
  res.json(review);
};
