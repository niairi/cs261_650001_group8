// backend/tests/blacklistService.test.js — รันด้วย npm test (node --test)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createBlacklistService, blacklistMessage } = require('../src/services/blacklistService');

const NOW = new Date('2026-11-10T03:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const BOOKING = { booking_id: 99, student_id: '6607038' };

// db ปลอม: ตอบตามลำดับที่กำหนด และจำว่าถูกเรียกด้วยอะไร
function setup(responses, { emailFails = false } = {}) {
  const calls = [];
  const sent = [];
  const db = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return responses.shift();
    },
  };
  const sendNotice = async (to, info) => {
    if (emailFails) throw new Error('SMTP down');
    sent.push({ to, info });
    return { sent: true };
  };
  const service = createBlacklistService({ db, sendNotice, now: () => NOW });
  return { calls, sent, service };
}

describe('handleNoShow', () => {
  test('US10 TC4: No-show 2 ครั้ง → ยังไม่ถูกแบน', async () => {
    const { calls, sent, service } = setup([{ rows: [] }, { rows: [{ count: 2 }] }]);

    assert.equal(await service.handleNoShow(BOOKING), null);
    assert.equal(calls.length, 2);
    assert.equal(sent.length, 0);
  });

  test('US10 TC1: No-show ครั้งที่ 3 → ถูกแบน 30 วัน และได้อีเมลแจ้ง', async () => {
    const endAt = new Date(NOW.getTime() + 30 * DAY_MS);
    const { calls, sent, service } = setup([
      { rows: [] },
      { rows: [{ count: 3 }] },
      { rows: [{ blacklist_id: 10, student_id: '6607038', start_at: NOW, end_at: endAt }] },
      { rows: [{ email: 's@example.com' }] }, // อีเมลจากตาราง users
    ]);

    const result = await service.handleNoShow(BOOKING);

    assert.deepEqual(result.end_at, endAt);
    const params = calls[2].params;
    assert.equal(params[0], '6607038');
    assert.equal(params[3].getTime() - params[2].getTime(), 30 * DAY_MS);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 's@example.com');
    assert.equal(sent[0].info.days, 30);
    assert.match(sent[0].info.until_text, /2569/);
  });

  test('ถูกแบนอยู่แล้ว → ไม่สร้างแบนซ้ำ', async () => {
    const { calls, service } = setup([
      { rows: [{ blacklist_id: 5, end_at: new Date(NOW.getTime() + DAY_MS) }] },
    ]);

    assert.equal(await service.handleNoShow(BOOKING), null);
    assert.equal(calls.length, 1);
  });

  test('ส่งอีเมลไม่สำเร็จ → ยังแบนตามปกติ', async (t) => {
    t.mock.method(console, 'error', () => {});
    const { service } = setup(
      [
        { rows: [] },
        { rows: [{ count: 3 }] },
        { rows: [{ blacklist_id: 11, end_at: NOW }] },
        { rows: [{ email: 's@example.com' }] },
      ],
      { emailFails: true }
    );

    const result = await service.handleNoShow(BOOKING);
    assert.equal(result.blacklist_id, 11);
  });
});

describe('assertNotBlacklisted', () => {
  test('US10 TC2: ถูกระงับอยู่ → 403 "คุณถูกระงับสิทธิ์การจองถึงวันที่ ..."', async () => {
    const { service } = setup([
      { rows: [{ blacklist_id: 1, end_at: new Date('2026-12-10T03:00:00Z') }] },
    ]);

    await assert.rejects(service.assertNotBlacklisted('6607038'), {
      message: 'คุณถูกระงับสิทธิ์การจองถึงวันที่ 10 ธันวาคม 2569',
    });
  });

  test('US10 TC3: ครบ 30 วันแล้ว → จองได้', async () => {
    const { calls, service } = setup([{ rows: [] }]);

    await service.assertNotBlacklisted('6607038');
    assert.deepEqual(calls[0].params, ['6607038', NOW]);
  });
});

test('blacklistMessage', () => {
  assert.equal(
    blacklistMessage({ end_at: new Date('2026-12-10T03:00:00Z') }),
    'คุณถูกระงับสิทธิ์การจองถึงวันที่ 10 ธันวาคม 2569'
  );
});