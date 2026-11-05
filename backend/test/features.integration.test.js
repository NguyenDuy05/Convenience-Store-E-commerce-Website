const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Opt in explicitly. Every run uses a new database, never the configured application database.
test('requested features through HTTP and real MongoDB', { skip: process.env.RUN_FEATURE_INTEGRATION !== '1' }, async (t) => {
  require('dotenv').config();
  assert.ok(process.env.MONGODB_URI, 'MONGODB_URI is required');
  const databaseName = `feature_test_${randomUUID().replaceAll('-', '')}`;
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = randomUUID();
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === databaseName && /^feature_test_[a-f0-9]{32}$/.test(databaseName)) {
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 5000 });
  const models = require('../src/models');
  const { User, MembershipTier, PointHistory, Category, Product, Order, Review, Store, ActivityLog } = models;
  await Promise.all(Object.values(models).filter((model) => typeof model.init === 'function').map((model) => model.init()));
  const [admin, customer, other, staff] = await User.create(['admin', 'customer', 'customer', 'staff'].map((role, index) => ({
    role, fullName: `${role} ${index}`, email: `feature${index}@example.test`, passwordHash: 'unused-in-token-auth-test',
    membership: { points: 100, lifetimePoints: 500 },
  })));
  const store = await Store.create({ name: 'Test Store', address: 'Test Address' });
  const category = await Category.create({ name: 'Test Category', slug: 'test-category' });
  const product = await Product.create({ name: 'Test Product', sku: 'TEST-001', slug: 'test-product', categoryId: category._id, price: 10000, mealType: 'snack' });
  const order = await Order.create({ orderCode: 'TEST-001', source: 'online', customerId: customer._id, status: 'completed',
    items: [{ productId: product._id, name: product.name, unitPrice: 10000, quantity: 1, lineTotal: 10000 }], subtotal: 10000, totalAmount: 10000 });
  server = require('../src/app').listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const call = async (method, path, actor, body, expected = 200) => {
    const headers = { 'Content-Type': 'application/json' };
    if (actor) headers.Authorization = `Bearer ${jwt.sign({ id: String(actor._id), role: actor.role }, process.env.JWT_SECRET)}`;
    const result = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await result.json();
    assert.equal(result.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
    return data;
  };

  await t.test('add, edit, moderate, restore and delete product/store reviews', async () => {
    assert.equal((await call('GET', '/reviews/mine/eligible', customer)).length, 1);
    const review = await call('POST', '/reviews', customer, { targetType: 'product', productId: product.id, orderId: order.id, rating: 5, comment: 'Good' }, 201);
    await call('POST', '/reviews', customer, { targetType: 'product', productId: product.id, orderId: order.id, rating: 3 }, 409);
    await call('PUT', `/reviews/${review._id}`, other, { rating: 1 }, 404);
    await call('PUT', `/reviews/${review._id}`, customer, { rating: 4, comment: 'Updated' });
    assert.equal((await Product.findById(product._id)).ratingAvg, 4);
    await call('PATCH', `/reviews/${review._id}/hide`, admin, { reason: 'Review under investigation' });
    assert.equal((await call('GET', `/reviews/product/${product.id}`)).total, 0);
    assert.equal((await Product.findById(product._id)).ratingCount, 0);
    await call('PUT', `/reviews/${review._id}`, customer, { rating: 1 }, 404);
    await call('PATCH', `/reviews/${review._id}/violation`, admin, { action: 'hide', reason: 'Spam' });
    await call('PATCH', `/reviews/${review._id}/violation`, admin, { action: 'dismiss' });
    await call('PATCH', `/reviews/${review._id}/hide`, admin, {});
    assert.equal((await call('GET', `/reviews/product/${product.id}`)).total, 1);
    const moderationLog = await ActivityLog.find({ targetType: 'Review', targetId: review._id }).sort({ createdAt: 1 });
    assert.deepEqual(moderationLog.map((entry) => entry.action), ['REVIEW_HIDE', 'REVIEW_VIOLATION_CONFIRM', 'REVIEW_VIOLATION_DISMISS', 'REVIEW_SHOW']);
    assert.ok(moderationLog.every((entry) => String(entry.actorId) === admin.id));
    await call('DELETE', `/reviews/${review._id}`, customer);
    // A soft-deleted review must not block a new review for the same order line.
    await call('POST', '/reviews', customer, { targetType: 'product', productId: product.id, orderId: order.id, rating: 3 }, 201);
    const storeReview = await call('POST', '/reviews', customer, { targetType: 'store', storeId: store.id, rating: 5, comment: 'Friendly' }, 201);
    assert.equal((await call('GET', `/reviews/store?storeId=${store.id}`)).total, 1);
    await call('PUT', `/reviews/${storeReview._id}`, customer, { rating: 4 });
    await call('DELETE', `/reviews/${storeReview._id}`, customer);
    assert.equal((await call('GET', '/reviews/admin/all?targetType=store', admin)).length, 1);
    assert.equal((await Review.findById(storeReview._id)).status, 'deleted');
  });

  await t.test('manage members, tiers, balances, point history and redemption history', async () => {
    const tier = await call('POST', '/membership/tiers', admin, { name: 'Test Silver', minPoints: 500, discountPercent: 5 }, 201);
    await call('PUT', `/membership/tiers/${tier._id}`, admin, { name: 'Test Silver', minPoints: 400, discountPercent: 6 });
    await User.updateOne({ _id: customer._id }, { $set: { 'membership.tierId': tier._id } });
    await call('DELETE', `/membership/tiers/${tier._id}`, admin, undefined, 409);
    const membership = await call('GET', '/membership/me', customer);
    assert.equal(membership.points, 100);
    assert.equal(membership.tier.name, 'Test Silver');
    const members = await call('GET', `/membership/members?q=${encodeURIComponent(customer.email)}`, admin);
    assert.equal(members.total, 1);
    assert.equal((await call('GET', `/membership/members/${customer.id}`, admin)).email, customer.email);
    assert.equal((await call('POST', `/membership/members/${customer.id}/points`, admin, { points: 20, reason: 'Test adjustment' })).points, 120);
    await call('POST', `/membership/members/${customer.id}/points`, admin, { points: -121, reason: 'Invalid adjustment' }, 400);
    assert.equal((await User.findById(customer._id)).membership.lifetimePoints, 500);
    assert.equal((await call('GET', '/membership/me/history?type=adjust', customer)).total, 1);
    assert.equal((await call('GET', `/membership/history?userId=${customer.id}`, admin)).total, 1);
    await PointHistory.create({ userId: customer._id, type: 'redeem', points: -10, balanceAfter: 110, orderId: order._id });
    assert.equal((await call('GET', `/membership/redemptions?userId=${customer.id}`, admin)).total, 1);
    assert.equal((await call('GET', `/membership/redemptions?userId=${other.id}`, admin)).total, 0);
    await call('GET', '/membership/members', customer, undefined, 403);
    const spare = await MembershipTier.create({ name: 'Unused', minPoints: 1000 });
    await call('DELETE', `/membership/tiers/${spare.id}`, admin);
  });

  await t.test('create, update, activate and delete promotions with correct public availability', async () => {
    const promotion = await call('POST', '/promotions', admin, { name: 'Test promotion', type: 'percent', value: 10, scope: 'product', productIds: [product.id],
      startDate: new Date(Date.now() - 60000).toISOString(), endDate: new Date(Date.now() + 86400000).toISOString() }, 201);
    assert.equal((await call('GET', '/promotions')).total, 0);
    await call('PUT', `/promotions/${promotion._id}`, admin, { value: 15 });
    await call('PATCH', `/promotions/${promotion._id}/activate`, admin, {});
    assert.equal((await call('GET', '/promotions')).items[0].value, 15);
    assert.equal((await call('GET', '/promotions/manage', admin)).total, 1);
    await call('DELETE', `/promotions/${promotion._id}`, admin);
    assert.equal((await call('GET', '/promotions')).total, 0);
    assert.equal((await call('GET', '/promotions/manage?status=deleted', admin)).total, 1);
  });

  await t.test('view only owned support requests and read staff responses', async () => {
    const support = await call('POST', '/support', customer, { subject: 'Need help', message: 'Test support request', orderId: order.id }, 201);
    assert.equal((await call('GET', '/support/my', customer)).total, 1);
    await call('GET', `/support/${support._id}`, other, undefined, 404);
    await call('PATCH', `/support/${support._id}/handle`, staff, { status: 'in_progress', message: 'We are checking' });
    await call('PATCH', `/support/${support._id}/handle`, staff, { status: 'resolved', message: 'Resolved for you' });
    const detail = await call('GET', `/support/${support._id}`, customer);
    assert.equal(detail.status, 'resolved');
    assert.equal(detail.responses.length, 2);
    assert.equal(detail.responses[1].message, 'Resolved for you');
  });
});
