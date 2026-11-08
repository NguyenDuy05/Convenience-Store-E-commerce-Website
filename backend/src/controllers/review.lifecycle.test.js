const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Review, Product, Store, Order, ActivityLog } = require('../models');
const c = require('./review.controller');

const id = '507f1f77bcf86cd799439011';
const customerId = '507f1f77bcf86cd799439012';
const request = (body = {}, query = {}) => ({ body, query, params: { id, productId: id }, user: { id: customerId, role: 'admin' } });
const response = () => ({ status(code) { this.code = code; return this; }, json(data) { this.data = data; } });
const chain = (data) => {
  const query = { lean: async () => data };
  for (const key of ['select', 'populate', 'sort', 'skip', 'limit']) query[key] = () => query;
  return query;
};

test('review creation, deletion and moderation lifecycle', async (t) => {
  const originals = [];
  const stub = (model, key, implementation) => {
    if (!originals.some(([m, k]) => m === model && k === key)) originals.push([model, key, model[key]]);
    model[key] = implementation;
  };
  t.after(() => { for (const [model, key, original] of originals) model[key] = original; });

  await t.test('invalid ratings and store IDs fail before writing or falling back to another store', async () => {
    stub(Review, 'create', () => assert.fail('Invalid review written'));
    stub(Store, 'findOne', () => assert.fail('Invalid store silently replaced'));
    for (const rating of [true, false, null, [], [5], {}, 0, 6, 2.5]) {
      await assert.rejects(c.addReview(request({ targetType: 'store', rating }), response()), { status: 400 });
    }
    await assert.rejects(c.addReview(request({ targetType: 'store', rating: 5, storeId: 'bad' }), response()), { status: 400 });
  });

  await t.test('store review uses the selected store and authenticated customer only', async () => {
    stub(Store, 'findById', (value) => { assert.equal(value, id); return { select: async () => ({ _id: id }) }; });
    stub(Review, 'create', async (data) => {
      assert.deepEqual(data, { targetType: 'store', storeId: id, customerId, rating: 4, comment: 'Friendly service' });
      return data;
    });
    const res = response();
    await c.addReview(request({ targetType: 'store', storeId: id, rating: 4, comment: ' Friendly service ', customerId: id, status: 'hidden' }), res);
    assert.equal(res.code, 201);
  });

  await t.test('product review requires a completed online order owned by the customer', async () => {
    stub(Order, 'findOne', (filter) => {
      assert.deepEqual(filter, { _id: id, customerId, source: 'online', status: 'completed' });
      return { select: async () => null };
    });
    await assert.rejects(c.addReview(request({ targetType: 'product', productId: id, orderId: id, rating: 5 }), response()), { status: 403 });
  });

  await t.test('delete is scoped to the owner and removes the rating from the product summary', async () => {
    const review = { productId: id, status: 'visible', save: async () => {} };
    stub(Review, 'findOne', async (filter) => {
      assert.deepEqual(filter, { _id: id, customerId, status: 'visible' });
      return review;
    });
    stub(Review, 'aggregate', async (pipeline) => { assert.equal(pipeline[0].$match.status, 'visible'); return []; });
    let recalculated = false;
    stub(Product, 'updateOne', async (filter, update) => {
      assert.deepEqual(update.$set, { ratingAvg: 0, ratingCount: 0 });
      recalculated = true;
    });
    await c.deleteReview(request(), response());
    assert.equal(review.status, 'deleted');
    assert.ok(recalculated);
  });

  await t.test('confirm, restore, and dismiss a violation keep visibility and violation flag independent', async () => {
    const actions = [];
    stub(ActivityLog, 'create', async (entry) => { actions.push(entry); });
    const review = { status: 'visible', moderation: {}, save: async () => {} };
    stub(Review, 'findById', async () => review);
    await assert.rejects(c.hideReview(request(), response()), { status: 400 });
    await assert.rejects(c.handleViolatingReview(request({ action: 'hide', reason: {} }), response()), { status: 400 });
    await c.handleViolatingReview(request({ action: 'hide', reason: ' Spam ' }), response());
    assert.equal(review.status, 'hidden');
    assert.equal(review.moderation.isViolating, true);
    assert.equal(review.moderation.hiddenBy, customerId);
    await c.hideReview(request(), response());
    assert.equal(review.status, 'visible');
    assert.equal(review.moderation.reason, 'Spam');
    await c.handleViolatingReview(request({ action: 'dismiss' }), response());
    assert.equal(review.moderation.isViolating, false);
    assert.equal(review.status, 'visible');
    assert.deepEqual(actions.map((entry) => entry.action), ['REVIEW_VIOLATION_CONFIRM', 'REVIEW_SHOW', 'REVIEW_VIOLATION_DISMISS']);
    assert.ok(actions.every((entry) => entry.actorId === customerId && entry.actorRole === 'admin'));
    review.status = 'deleted';
    await assert.rejects(c.hideReview(request(), response()), { status: 404 });
    await assert.rejects(c.handleViolatingReview(request({ action: 'dismiss' }), response()), { status: 404 });
  });

  await t.test('public store reviews exclude moderated reviews and support selecting a store', async () => {
    stub(Review, 'find', (filter) => {
      assert.deepEqual(filter, { targetType: 'store', status: 'visible', storeId: id });
      return chain([]);
    });
    stub(Review, 'countDocuments', async () => 0);
    const res = response();
    await c.listStoreReviews(request({}, { storeId: id }), res);
    assert.equal(res.data.total, 0);
    for (const query of [{ page: 1.5 }, { page: 'bad' }, { limit: 51 }, { storeId: 'bad' }]) {
      await assert.rejects(c.listStoreReviews(request({}, query), response()), { status: 400 });
    }
  });
});
