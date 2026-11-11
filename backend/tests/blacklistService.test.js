// backend/tests/blacklistService.test.js — รันด้วย npm test (node --test)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  createBlacklistService,
  blacklistMessage,
  bangkokDate,
  addDays,
} = require('../src/services/blacklistService');

// 11 พ.ย. 2026 00:30 เวลาไทย (ยังเป็น 10 พ.ย. ตาม UTC) — เช็กว่านับวันตามเวลาไทย
const NOW = new Date('2026-11-10T17:30:00Z');
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
  const service = createBlacklistService({ db, sendNotice, now: () => NOW, semester: { start: null, end: null } });
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
    const { calls, sent, service } = setup([
      { rows: [] },
      { rows: [{ count: 3 }] },
      { rows: [{ student_id: '6607038', start_date: '2026-11-11', end_date: '2026-12-11', trigger_booking_id: 99 }] },
      { rows: [{ email: 's@example.com' }] }, // อีเมลจากตาราง users
    ]);

    const result = await service.handleNoShow(BOOKING);

    assert.equal(result.end_date, '2026-12-11');
    // วันที่ตามเวลาไทย (11 พ.ย.) + 30 วัน = ระงับถึง 11 ธ.ค.
    assert.deepEqual(calls[2].params, ['6607038', '2026-11-11', '2026-12-11', 99, 'No-show ครบ 3 ครั้ง']);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 's@example.com');
    assert.equal(sent[0].info.days, 30);
    assert.equal(sent[0].info.until_text, '11 ธันวาคม 2569');
  });

  test('US10 TC1 ตามเอกสาร: No-show 22 ต.ค. → ระงับถึง 21 พ.ย.', async () => {
    const calls = [];
    const responses = [{ rows: [] }, { rows: [{ count: 3 }] }, { rows: [{ end_date: '2026-11-21' }] }, { rows: [] }];
    const db = { query: async (sql, params) => { calls.push({ sql, params }); return responses.shift(); } };
    const service = createBlacklistService({
      db,
      sendNotice: async () => ({ sent: false }),
      now: () => new Date('2026-10-22T05:00:00Z'), // 22 ต.ค. 12:00 เวลาไทย
      semester: { start: null, end: null },
    });

    await service.handleNoShow(BOOKING);
    assert.equal(calls[2].params[1], '2026-10-22');
    assert.equal(calls[2].params[2], '2026-11-21');
  });

  test('ถูกแบนอยู่แล้ว → ไม่สร้างแบนซ้ำ', async () => {
    const { calls, service } = setup([{ rows: [{ student_id: '6607038', end_date: '2026-11-20' }] }]);

    assert.equal(await service.handleNoShow(BOOKING), null);
    assert.equal(calls.length, 1);
  });

  test('ส่งอีเมลไม่สำเร็จ → ยังแบนตามปกติ', async (t) => {
    t.mock.method(console, 'error', () => {});
    const { service } = setup(
      [
        { rows: [] },
        { rows: [{ count: 3 }] },
        { rows: [{ student_id: '6607038', end_date: '2026-12-10', trigger_booking_id: 99 }] },
        { rows: [{ email: 's@example.com' }] },
      ],
      { emailFails: true }
    );

    const result = await service.handleNoShow(BOOKING);
    assert.equal(result.trigger_booking_id, 99);
  });
});

describe('getActiveBlacklist', () => {
  test('ยังไม่มีตาราง blacklist (ยังไม่รัน migration) → ถือว่าไม่ถูกแบน', async () => {
    const db = {
      query: async () => {
        throw Object.assign(new Error('relation "blacklist" does not exist'), { code: '42P01' });
      },
    };
    const service = createBlacklistService({ db, sendNotice: async () => {}, now: () => NOW });
    assert.equal(await service.getActiveBlacklist('6607038'), null);
  });
});

describe('countNoShowsSinceLastBan', () => {
  test('นับในช่วงภาคการศึกษาเหมือน Task67', async () => {
    const calls = [];
    const db = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: [{ count: 1 }] }; } };
    const service = createBlacklistService({
      db,
      sendNotice: async () => {},
      now: () => NOW,
      semester: { start: '2026-08-01', end: '2026-12-15' },
    });
    assert.equal(await service.countNoShowsSinceLastBan('6607038'), 1);
    assert.deepEqual(calls[0].params, ['6607038', '2026-08-01', '2026-12-15']);
    assert.match(calls[0].sql, /confirmed_at IS NULL/);
  });
});

describe('assertNotBlacklisted', () => {
  test('US10 TC2: ถูกระงับอยู่ → 403 "คุณถูกระงับสิทธิ์การจองถึงวันที่ ..."', async () => {
    const { service } = setup([{ rows: [{ student_id: '6607038', end_date: '2026-12-10' }] }]);

    await assert.rejects(service.assertNotBlacklisted('6607038'), {
      status: 403,
      message: 'คุณถูกระงับสิทธิ์การจองถึงวันที่ 10 ธันวาคม 2569',
    });
  });

  test('US10 TC3: ครบ 30 วันแล้ว → จองได้ (เทียบ end_date กับวันนี้ตามเวลาไทย)', async () => {
    const { calls, service } = setup([{ rows: [] }]);

    await service.assertNotBlacklisted('6607038');
    assert.deepEqual(calls[0].params, ['6607038', '2026-11-11']);
  });
});

describe('helpers', () => {
  test('bangkokDate ใช้วันตามเวลาไทย', () => {
    assert.equal(bangkokDate(new Date('2026-11-10T16:59:59Z')), '2026-11-10'); // 23:59:59 ไทย
    assert.equal(bangkokDate(new Date('2026-11-10T17:00:00Z')), '2026-11-11'); // 00:00 ไทย
  });

  test('addDays ข้ามเดือน/ปี', () => {
    assert.equal(addDays('2026-11-11', 29), '2026-12-10');
    assert.equal(addDays('2026-12-20', 29), '2027-01-18');
  });

  test('blacklistMessage', () => {
    assert.equal(
      blacklistMessage({ end_date: '2026-12-10' }),
      'คุณถูกระงับสิทธิ์การจองถึงวันที่ 10 ธันวาคม 2569'
    );
  });
});