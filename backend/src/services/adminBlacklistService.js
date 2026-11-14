const { HttpError } = require('../errors');
const { bangkokDate } = require('./blacklistService');

function parseBlacklistId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, 'blacklist_id ต้องเป็นจำนวนเต็มบวก');
  }
  return id;
}

async function listBlacklist(db, now = new Date()) {
  const today = bangkokDate(now);
  const { rows } = await db.query(
    `SELECT bl.blacklist_id, bl.student_id,
            COALESCE(NULLIF(u.name_th, ''), NULLIF(u.name_en, ''), 'ไม่พบชื่อในระบบ') AS name,
            to_char(bl.end_date, 'YYYY-MM-DD') AS end_date, bl.reason, bl.revoked_at,
            (bl.revoked_at IS NULL AND bl.end_date >= $1::date) AS is_active
       FROM blacklist bl
       LEFT JOIN users u ON u.student_id = bl.student_id
      ORDER BY (bl.revoked_at IS NULL AND bl.end_date >= $1::date) DESC,
               bl.end_date DESC, bl.blacklist_id DESC`,
    [today]
  );
  return rows.map((row) => ({
    ...row,
    blacklist_id: Number(row.blacklist_id),
    status: row.is_active ? 'active' : row.revoked_at ? 'released' : 'expired',
  }));
}

async function releaseBlacklist(db, value, now = new Date()) {
  const blacklistId = parseBlacklistId(value);
  const today = bangkokDate(now);
  const { rows } = await db.query(
    `UPDATE blacklist
        SET revoked_at = CURRENT_TIMESTAMP
      WHERE blacklist_id = $1
        AND revoked_at IS NULL
        AND end_date >= $2::date
      RETURNING blacklist_id, student_id`,
    [blacklistId, today]
  );
  if (rows[0]) {
    return {
      blacklist_id: Number(rows[0].blacklist_id),
      student_id: rows[0].student_id,
      status: 'released',
    };
  }

  const existing = await db.query(
    'SELECT blacklist_id FROM blacklist WHERE blacklist_id = $1',
    [blacklistId]
  );
  if (!existing.rows[0]) throw new HttpError(404, 'ไม่พบรายการ Blacklist');
  throw new HttpError(409, 'รายการนี้ถูกปลดระงับหรือหมดอายุแล้ว');
}

module.exports = { listBlacklist, releaseBlacklist, parseBlacklistId };
