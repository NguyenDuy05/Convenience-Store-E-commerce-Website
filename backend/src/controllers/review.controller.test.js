const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Review, Product } = require('../models');
const { updateReview } = require('./review.controller');

test('Update Review validation, ownership, editable status and rating summary', async (t) => {
  const id = '507f1f77bcf86cd799439011';
  const customerId = '507f1f77bcf86cd799439012';
  const productId = '507f1f77bcf86cd799439013';
  const request = (body, reviewId = id) => ({ params: { id: reviewId }, user: { id: customerId }, body });
  const originals = { findOne: Review.findOne, aggregate: Review.aggregate, updateOne: Product.updateOne };
  t.after(() => Object.assign(Review, { findOne: originals.findOne, aggregate: originals.aggregate }));
  t.after(() => { Product.updateOne = originals.updateOne; });

  await t.test('invalid payloads fail before any database write', async () => {
    Review.findOne = () => { assert.fail('Invalid input reached the database'); };
    for (const body of [{}, undefined, { status: 'visible' }, ...[true, null, [], {}, 0, 6, 1.5, 'bad'].map((rating) => ({ rating })), { comment: null }, { comment: 'x'.repeat(1001) }]) {
      await assert.rejects(updateReview(request(body), {}), { status: 400 });
    }
    await assert.rejects(updateReview(request({ rating: 4 }, 'bad-id'), {}), { status: 400 });
  });

  await t.test('lookup requires ownership and visible status', async () => {
    Review.findOne = async (filter) => {
      assert.deepEqual(filter, { _id: id, customerId, status: 'visible' });
      return null;
    };
    await assert.rejects(updateReview(request({ rating: 4 }), {}), { status: 404 });
  });

  await t.test('saves allowed fields and recalculates public product rating', async () => {
    let saved = false;
    let summarized = false;
    const review = { rating: 2, comment: 'Old', productId, customerId, status: 'visible', save: async () => { saved = true; } };
    Review.findOne = async () => review;
    Review.aggregate = async (pipeline) => {
      assert.equal(pipeline[0].$match.status, 'visible');
      assert.equal(String(pipeline[0].$match.productId), productId);
      return [{ ratingAvg: 4.5, ratingCount: 2 }];
    };
    Product.updateOne = async (filter, update) => {
      assert.deepEqual(filter, { _id: productId });
      assert.deepEqual(update.$set, { ratingAvg: 4.5, ratingCount: 2 });
      summarized = true;
    };
    await updateReview(request({ rating: '5', comment: '  Better  ', customerId: id, status: 'hidden' }), {
      json: (data) => { assert.equal(data.rating, 5); assert.equal(data.comment, 'Better'); },
    });
    assert.ok(saved && summarized);
    assert.equal(review.customerId, customerId);
    assert.equal(review.status, 'visible');
  });

  await t.test('comment-only update preserves rating and permits clearing comment', async () => {
    const review = { rating: 3, comment: 'Old', save: async () => {} };
    Review.findOne = async () => review;
    await updateReview(request({ comment: '  ' }), { json: () => {} });
    assert.equal(review.rating, 3);
    assert.equal(review.comment, '');
  });
});
