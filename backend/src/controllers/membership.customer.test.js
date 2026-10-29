const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { User, MembershipTier, PointHistory } = require('../models');

// Exercise the real customer routes and auth middleware without changing database records.
test('customer membership points and history API', async (t) => {
  const userId = '507f1f77bcf86cd799439011';
  const originals = { user: User.findOne, tiers: MembershipTier.find, history: PointHistory.find, count: PointHistory.countDocuments, secret: process.env.JWT_SECRET };
  process.env.JWT_SECRET = 'membership-test-only';
  const chain = (value, calls = {}) => Object.fromEntries([
    ...['select', 'populate', 'sort', 'skip', 'limit'].map((key) => [key, (arg) => { calls[key] = arg; return chain(value, calls); }]),
    ['lean', async () => value],
  ]);
  let member = { _id: userId, fullName: 'Test Customer', membership: { points: 125, lifetimePoints: 750, tierId: { name: 'Silver', minPoints: 500 } } };
  User.findOne = (filter) => {
    assert.deepEqual(filter, { _id: userId, role: 'customer', status: 'active' });
    return chain(member);
  };
  MembershipTier.find = () => chain([{ name: 'Silver', minPoints: 500 }, { name: 'Gold', minPoints: 1000 }]);
  let historyFilter;
  let historyCalls;
  PointHistory.find = (filter) => { historyFilter = filter; historyCalls = {}; return chain([{ type: 'earn', points: 25, balanceAfter: 125, orderId: { orderCode: 'ORD-001' } }], historyCalls); };
  PointHistory.countDocuments = async (filter) => { assert.deepEqual(filter, historyFilter); return 21; };
  const app = express();
  app.use('/membership', require('../routes/membership.routes'));
  app.use((error, req, res, next) => res.status(error.status || 500).json({ message: error.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    User.findOne = originals.user; MembershipTier.find = originals.tiers;
    PointHistory.find = originals.history; PointHistory.countDocuments = originals.count;
    if (originals.secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originals.secret;
  });
  const call = (path, role = 'customer') => fetch(`http://127.0.0.1:${server.address().port}/membership${path}`, {
    headers: role ? { Authorization: `Bearer ${jwt.sign({ id: userId, role }, process.env.JWT_SECRET)}` } : {},
  });
  await t.test('requires sign-in and customer role on both endpoints', async () => {
    for (const path of ['/me', '/me/history']) {
      assert.equal((await call(path, null)).status, 401);
      assert.equal((await call(path, 'staff')).status, 403);
      assert.equal((await call(path, 'admin')).status, 403);
    }
  });
  await t.test('returns current balance separately from lifetime tier points', async () => {
    const response = await call('/me');
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.points, 125); assert.equal(data.lifetimePoints, 750);
    assert.equal(data.memberCode, `QUICK-${userId.toUpperCase()}`);
    assert.equal(data.nextTier.name, 'Gold'); assert.equal(data.pointsToNextTier, 250);
  });
  await t.test('new member defaults to zero and highest tier has no next tier', async () => {
    const originalMember = member;
    member = { fullName: 'New Customer' };
    let data = await (await call('/me')).json();
    assert.equal(data.points, 0); assert.equal(data.lifetimePoints, 0); assert.equal(data.tier, null);
    member = { membership: { points: 0, lifetimePoints: 1200, tierId: { name: 'Gold', minPoints: 1000 } } };
    data = await (await call('/me')).json();
    assert.equal(data.nextTier, null); assert.equal(data.pointsToNextTier, 0);
    member = originalMember;
  });
  await t.test('history is scoped to signed-in user, paginated and sorted newest first', async () => {
    const response = await call('/me/history?page=2&limit=10&type=earn&userId=another-user');
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(historyFilter, { userId, type: 'earn' });
    assert.equal(historyCalls.skip, 10); assert.equal(historyCalls.limit, 10);
    assert.deepEqual(historyCalls.sort, { createdAt: -1, _id: -1 });
    assert.equal(data.pages, 3); assert.equal(data.total, 21);
    assert.equal(data.items[0].balanceAfter, 125);
    assert.equal(data.items[0].orderId.orderCode, 'ORD-001');
    for (const type of ['redeem', 'adjust']) {
      assert.equal((await call(`/me/history?type=${type}`)).status, 200);
      assert.equal(historyFilter.type, type);
    }
  });
  await t.test('rejects invalid pagination and unknown transaction types', async () => {
    for (const query of ['page=0', 'page=1.5', 'limit=51', 'limit=0', 'page=no', 'type=unknown']) {
      assert.equal((await call(`/me/history?${query}`)).status, 400, query);
    }
  });
  await t.test('empty history returns a usable empty page with default pagination', async () => {
    const originalFind = PointHistory.find;
    const originalCount = PointHistory.countDocuments;
    try {
      PointHistory.find = (filter) => { assert.deepEqual(filter, { userId }); return chain([]); };
      PointHistory.countDocuments = async () => 0;
      const response = await call('/me/history');
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { items: [], total: 0, page: 1, limit: 10, pages: 0 });
    } finally {
      PointHistory.find = originalFind;
      PointHistory.countDocuments = originalCount;
    }
  });
  await t.test('only staff and admin can resolve a member code, without exposing contact data', async () => {
    const path = `/lookup?code=QUICK-${userId.toUpperCase()}`;
    assert.equal((await call(path, null)).status, 401);
    assert.equal((await call(path)).status, 403);
    for (const role of ['staff', 'admin']) {
      const response = await call(path, role);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { customerId: userId });
    }
    assert.equal((await call('/lookup?code=not-a-member-code', 'staff')).status, 400);
    assert.equal((await call('/lookup', 'staff')).status, 400);
    assert.equal((await call(`/lookup?code=quick-${userId}`, 'staff')).status, 200);
  });
  await t.test('missing or inactive member gets 404', async () => {
    member = null;
    assert.equal((await call('/me')).status, 404);
    assert.equal((await call('/me/history')).status, 404);
    assert.equal((await call(`/lookup?code=QUICK-${userId}`, 'staff')).status, 404);
  });
});
