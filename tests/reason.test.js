import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import Reason, { REASON_TYPES } from '../src/modules/reason/models/reason.model.js';
import * as api from '../src/modules/reason/controllers/reason.controller.js';

const id = '507f1f77bcf86cd799439011';
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('all five reason types validate and default to active', async () => {
  assert.equal(REASON_TYPES.length, 5);
  for (const reasonType of REASON_TYPES) {
    const reason = new Reason({ reasonName: ' Example ', reasonType });
    await reason.validate();
    assert.equal(reason.isActive, true);
    assert.equal(reason.reasonName, 'Example');
  }
  await assert.rejects(new Reason({ reasonName: 'x', reasonType: 'unknown' }).validate());
});

test('dropdown always forces active filtering, escapes search, and returns compact options', async () => {
  const find = mock.method(Reason, 'find', (filter) => {
    assert.deepEqual(filter, { reasonType: 'close', isActive: true, reasonName: { $regex: 'a\\.\\*', $options: 'i' } });
    return { select() { return this; }, sort() { return this; }, async lean() { return [{ _id: id, reasonName: 'a.*', reasonType: 'close' }]; } };
  });
  try {
    const res = response();
    await api.getReasonDropdown({ query: { reasonType: 'close', status: 'inactive', search: 'a.*' } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body.data, [{ id, reasonName: 'a.*', reasonType: 'close' }]);
  } finally { find.mock.restore(); }
});

test('create trims names and returns conflict for duplicate database keys', async () => {
  const create = mock.method(Reason, 'create', async (data) => {
    assert.deepEqual(data, { reasonName: 'Completed', reasonType: 'close', isActive: true });
    return { _id: id, ...data };
  });
  try {
    const res = response();
    await api.createReason({ body: { reasonName: ' Completed ', reasonType: 'close' } }, res);
    assert.equal(res.code, 201);
    create.mock.mockImplementation(async () => { throw { code: 11000 }; });
    await api.createReason({ body: { reasonName: 'Completed', reasonType: 'close' } }, res);
    assert.equal(res.code, 409);
  } finally { create.mock.restore(); }
});

test('bad payloads and IDs return 400 without querying the database', async () => {
  for (const body of [undefined, { reasonName: 2, reasonType: 'close' }, { reasonName: ' ', reasonType: 'close' }, { reasonName: 'x', reasonType: 'bad' }, { reasonName: 'x', reasonType: 'close', isActive: 'false' }]) {
    const res = response();
    await api.createReason({ body }, res);
    assert.equal(res.code, 400);
  }
  for (const method of ['getReasonById', 'updateReason', 'deleteReason', 'setReasonStatus']) {
    const res = response();
    await api[method]({ params: { id: 'bad' } }, res);
    assert.equal(res.code, 400);
  }
  const res = response();
  await api.setReasonStatus({ params: { id }, body: { isActive: 'false' } }, res);
  assert.equal(res.code, 400);
});

test('status sets the requested boolean, including repeated deactivation and reactivation', async () => {
  let active = true;
  const update = mock.method(Reason, 'findByIdAndUpdate', async (key, change, options) => {
    assert.equal(key, id);
    assert.equal(options.runValidators, true);
    active = change.$set.isActive;
    return { _id: id, isActive: active };
  });
  try {
    for (const isActive of [false, false, true]) {
      const res = response();
      await api.setReasonStatus({ params: { id }, body: { isActive } }, res);
      assert.equal(res.code, 200);
      assert.equal(res.body.data.isActive, isActive);
    }
  } finally { update.mock.restore(); }
});

test('update only writes allowed fields and returns 404 when missing', async () => {
  const update = mock.method(Reason, 'findByIdAndUpdate', async (key, change) => {
    assert.deepEqual(change, { $set: { reasonName: 'Changed' } });
    return null;
  });
  try {
    const res = response();
    await api.updateReason({ params: { id }, body: { reasonName: ' Changed ', injected: true } }, res);
    assert.equal(res.code, 404);
  } finally { update.mock.restore(); }
});

test('read and delete handle found and missing records', async () => {
  for (const [method, controller] of [['findById', 'getReasonById'], ['findByIdAndDelete', 'deleteReason']]) {
    const stub = mock.method(Reason, method, async () => ({ _id: id }));
    try {
      const res = response();
      await api[controller]({ params: { id } }, res);
      assert.equal(res.code, 200);
      stub.mock.mockImplementation(async () => null);
      await api[controller]({ params: { id } }, res);
      assert.equal(res.code, 404);
    } finally { stub.mock.restore(); }
  }
});

test('management list can retrieve inactive reasons; invalid filters fail', async () => {
  const find = mock.method(Reason, 'find', (filter) => {
    assert.deepEqual(filter, { isActive: false });
    return { async sort() { return [{ _id: id, isActive: false }]; } };
  });
  try {
    const res = response();
    await api.getAllReasons({ query: { status: 'inactive' } }, res);
    assert.equal(res.body.count, 1);
    for (const query of [{ reasonType: 'bad' }, { search: {} }, { status: 'bad' }]) {
      await api.getAllReasons({ query }, res);
      assert.equal(res.code, 400);
    }
  } finally { find.mock.restore(); }
});
