// บันทึกตาราง email_logs (Task32)

// log: { booking_id, to_email, email_type, status: SENT|FAILED|SKIPPED, error_message }
async function insertEmailLog(db, log) {
  await db.query(
    `INSERT INTO email_logs (booking_id, to_email, email_type, status, error_message)
     VALUES ($1, $2, $3, $4, $5)`,
    [log.booking_id ?? null, log.to_email ?? null, log.email_type, log.status, log.error_message ?? null]
  );
}

module.exports = { insertEmailLog };
