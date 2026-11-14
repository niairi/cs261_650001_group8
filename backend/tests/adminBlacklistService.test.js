const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  listBlacklist,
  releaseBlacklist,
  parseBlacklistId,
} = require('../src/services/adminBlacklistService');

const NOW = new Date('2026-11-10T17:30:00Z');

describe('admin blacklist service', () => {
  test('lists records with active status and Thai or English student name', async () => {
    const calls = [];
    const db = {
      query: async (sql, params) => {
        calls.push({ sql, params });
        return {
          rows: [
            { blacklist_id: '8', student_id: '6809650010', name: 'นักศึกษา', end_date: '2026-12-10', reason: 'No-show', is_active: true },
            { blacklist_id: '7', student_id: '6809650020', name: 'Student', end_date: '2026-10-10', reason: 'No-show', is_active: false, revoked_at: null },
            { blacklist_id: '6', student_id: '6809650030', name: 'Released Student', end_date: '2026-12-10', reason: 'No-show', is_active: false, revoked_at: '2026-11-09T10:00:00Z' },
          ],
        };
      },
    };

    const entries = await listBlacklist(db, NOW);

    assert.equal(calls[0].params[0], '2026-11-11');
    assert.match(calls[0].sql, /LEFT JOIN users/);
    assert.equal(entries[0].blacklist_id, 8);
    assert.equal(entries[0].status, 'active');
    assert.equal(entries[1].status, 'expired');
    assert.equal(entries[2].status, 'released');
  });

  test('releases active entry without deleting its record', async () => {
    const calls = [];
    const db = {
      query: async (sql, params) => {
        calls.push({ sql, params });
        return { rows: [{ blacklist_id: '8', student_id: '6809650010' }] };
      },
    };

    const result = await releaseBlacklist(db, '8', NOW);

    assert.deepEqual(result, {
      blacklist_id: 8,
      student_id: '6809650010',
      status: 'released',
    });
    assert.deepEqual(calls[0].params, [8, '2026-11-11']);
    assert.match(calls[0].sql, /revoked_at = CURRENT_TIMESTAMP/);
  });

  test('returns not found or conflict when no active row was updated', async () => {
    const missingDb = { query: async () => ({ rows: [] }) };
    await assert.rejects(releaseBlacklist(missingDb, 99, NOW), {
      status: 404,
      message: 'ไม่พบรายการ Blacklist',
    });

    let queries = 0;
    const inactiveDb = {
      query: async () => {
        queries += 1;
        return { rows: queries === 1 ? [] : [{ blacklist_id: 8 }] };
      },
    };
    await assert.rejects(releaseBlacklist(inactiveDb, 8, NOW), {
      status: 409,
      message: 'รายการนี้ถูกปลดระงับหรือหมดอายุแล้ว',
    });
  });

  test('rejects invalid blacklist IDs', () => {
    assert.throws(() => parseBlacklistId('0'), { status: 400 });
    assert.throws(() => parseBlacklistId('1.5'), { status: 400 });
  });
});
