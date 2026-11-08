const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { User, MembershipTier, PointHistory } = require('../models');
const controller = require('./membership.controller');

const id = '507f1f77bcf86cd799439011';
const admin = '507f1f77bcf86cd799439012';
const request = (body = {}, query = {}) => ({ body, query, params: { id }, user: { id: admin, role: 'admin' } });
const response = () => ({ status() { return this; }, json(data) { this.data = data; } });
const chain = (data, calls = {}) => {
  const query = {};
  for (const key of ['select', 'populate', 'sort', 'skip', 'limit']) query[key] = (value) => { calls[key] = value; return query; };
  query.lean = async () => data;
  return query;
};

test('admin membership management boundaries and point accounting', async (t) => {
  const originals = [];
  const stub = (model, method, implementation) => {
    if (!originals.some(([m, key]) => m === model && key === method)) originals.push([model, method, model[method]]);
    model[method] = implementation;
  };
  stub(User, 'findById', () => chain({ status: 'active' }));   // auth middleware kiểm tra tài khoản còn hoạt động
  t.after(() => { for (const [model, method, original] of originals) model[method] = original; });

  await t.test('member search escapes regex input, excludes deleted users and selects contact/membership fields only', async () => {
    const calls = {};
    stub(User, 'find', (filter) => {
      assert.equal(filter.role, 'customer');
      assert.deepEqual(filter.status, { $ne: 'deleted' });
      assert.equal(filter.$or[0].fullName.$regex, 'A\\.\\*');
      return chain([{ _id: id }], calls);
    });
    stub(User, 'countDocuments', async () => 11);
    const res = response();
    await controller.listMembers(request({}, { q: ' A.* ', page: 2 }), res);
    assert.equal(calls.select, 'fullName email phone status membership');
    assert.equal(calls.skip, 10);
    assert.equal(res.data.pages, 2);
    await assert.rejects(controller.listMembers(request({}, { q: {} }), response()), { status: 400 });
  });

  await t.test('member details cannot expose staff or deleted accounts', async () => {
    stub(User, 'findOne', (filter) => {
      assert.deepEqual(filter, { _id: id, role: 'customer', status: { $ne: 'deleted' } });
      return chain(null);
    });
    await assert.rejects(controller.getMember(request(), response()), { status: 404 });
  });

  await t.test('tier validation and assigned-tier deletion guard', async () => {
    stub(MembershipTier, 'create', () => assert.fail('Invalid tier was written'));
    for (const body of [{}, { name: 'Gold', minPoints: -1 }, { name: 'Gold', minPoints: 0, discountPercent: 101 }]) {
      await assert.rejects(controller.createTier(request(body), response()), { status: 400 });
    }
    stub(User, 'exists', async () => true);
    stub(MembershipTier, 'findByIdAndDelete', () => assert.fail('Assigned tier deleted'));
    await assert.rejects(controller.deleteTier(request(), response()), { status: 409 });
  });

  await t.test('redemption history always filters redeemed points and supports a selected member', async () => {
    let filter;
    stub(PointHistory, 'find', (value) => { filter = value; return chain([]); });
    stub(PointHistory, 'countDocuments', async () => 0);
    const res = response();
    await controller.listRedemptions(request({}, { userId: id, type: 'earn' }), res);
    assert.deepEqual(filter, { userId: id, type: 'redeem' });
    assert.equal(res.data.total, 0);
    await assert.rejects(controller.listPointHistory(request({}, { type: 'bad' }), response()), { status: 400 });
  });

  await t.test('adjustments reject negative balances, preserve lifetime points, and record the administrator', async () => {
    stub(User, 'findOne', () => ({ session: async () => ({ membership: { points: 100, lifetimePoints: 500 } }) }));
    let writes = 0;
    stub(User, 'findOneAndUpdate', async (filter, update) => {
      writes++;
      assert.equal(filter['membership.points'], 100);
      assert.deepEqual(update, { $inc: { 'membership.points': -20 } });
      return {};
    });
    stub(PointHistory, 'create', async ([entry]) => {
      assert.deepEqual(entry, { userId: id, type: 'adjust', points: -20, balanceAfter: 80, reason: 'Correction', adjustedBy: admin });
      return [entry];
    });
    await assert.rejects(controller.adjustPoints(request({ points: -101, reason: 'Correction' }), response()), { status: 400 });
    assert.equal(writes, 0);
    const res = response();
    await controller.adjustPoints(request({ points: -20, reason: ' Correction ' }), res);
    assert.equal(res.data.points, 80);
    for (const body of [{ points: 0, reason: 'x' }, { points: 1.5, reason: 'x' }, { points: 1, reason: ' ' }]) {
      await assert.rejects(controller.adjustPoints(request(body), response()), { status: 400 });
    }
  });

  await t.test('concurrent balance changes do not create an audit row', async () => {
    stub(User, 'findOneAndUpdate', async () => null);
    stub(PointHistory, 'create', () => assert.fail('Stale adjustment created history'));
    await assert.rejects(controller.adjustPoints(request({ points: 10, reason: 'Correction' }), response()), { status: 409 });
  });

  await t.test('standalone database restores balance when history cannot be saved', async () => {
    stub(User, 'findOneAndUpdate', async () => ({}));
    stub(PointHistory, 'create', async () => { throw new Error('History unavailable'); });
    let rolledBack = false;
    stub(User, 'updateOne', async (filter, update) => {
      assert.deepEqual(filter, { _id: id });
      assert.deepEqual(update, { $inc: { 'membership.points': -10 } });
      rolledBack = true;
    });
    await assert.rejects(controller.adjustPoints(request({ points: 10, reason: 'Correction' }), response()), /History unavailable/);
    assert.ok(rolledBack);
  });

  await t.test('all administrator endpoints reject customer, staff and unauthenticated access', async () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'admin-membership-test-only';
    const app = express();
    app.use(express.json());
    app.use('/membership', require('../routes/membership.routes'));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    try {
      for (const [method, path] of [['GET', '/members'], ['GET', `/members/${id}`], ['POST', `/members/${id}/points`], ['GET', '/tiers'], ['POST', '/tiers'], ['PUT', `/tiers/${id}`], ['DELETE', `/tiers/${id}`], ['GET', '/history'], ['GET', '/redemptions']]) {
        for (const role of [null, 'customer', 'staff']) {
          const result = await fetch(`http://127.0.0.1:${server.address().port}/membership${path}`, {
            method, headers: role ? { Authorization: `Bearer ${jwt.sign({ id, role }, process.env.JWT_SECRET)}` } : {},
          });
          assert.equal(result.status, role ? 403 : 401, `${method} ${path} ${role}`);
        }
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });
});
