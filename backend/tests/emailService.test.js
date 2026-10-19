const test = require('node:test');
const assert = require('node:assert');
const { sendBookingConfirmation, buildBookingConfirmationEmail, formatThaiDate } = require('../src/services/emailService');

const booking = {
  booking_id: 15, room_name: 'Room A', booking_date: '2026-10-20',
  start_time: '13:00', end_time: '15:00', student_id: '6609651234',
};

// transport ปลอม: จำว่าถูกสั่งส่งอะไรไปบ้าง
const noLog = async () => {};

function fakeTransport() {
  const sent = [];
  return { sent, sendMail: async (mail) => { sent.push(mail); } };
}

test('แปลงวันที่เป็นภาษาไทย พ.ศ.', () => {
  assert.equal(formatThaiDate('2026-10-20'), 'วันอังคารที่ 20 ตุลาคม 2569');
});

test('อีเมลมีรายละเอียดการจองครบ', () => {
  const { subject, text, html } = buildBookingConfirmationEmail(booking);
  assert.match(subject, /Room A/);
  assert.match(subject, /13:00 - 15:00/);
  for (const s of ['#15', 'Room A', '20 ตุลาคม 2569', '13:00 - 15:00', '6609651234']) {
    assert.ok(text.includes(s), `text ต้องมี ${s}`);
    assert.ok(html.includes(s), `html ต้องมี ${s}`);
  }
});

test('ชื่อห้องที่มีอักขระพิเศษถูก escape ใน html', () => {
  const { html } = buildBookingConfirmationEmail({ ...booking, room_name: '<b>X</b>' });
  assert.ok(html.includes('&lt;b&gt;X&lt;/b&gt;'));
  assert.ok(!html.includes('<b>X</b>'));
});

test('ส่งอีเมลไปที่ผู้จอง', async () => {
  const t = fakeTransport();
  const result = await sendBookingConfirmation('student@dome.tu.ac.th', booking, t, noLog);
  assert.deepEqual(result, { sent: true });
  assert.equal(t.sent.length, 1);
  assert.equal(t.sent[0].to, 'student@dome.tu.ac.th');
  assert.match(t.sent[0].subject, /ยืนยันการจองห้อง/);
});

test('ไม่มีอีเมลผู้จอง = ไม่ส่ง และไม่ error', async () => {
  const t = fakeTransport();
  const result = await sendBookingConfirmation(null, booking, t, noLog);
  assert.deepEqual(result, { sent: false, reason: 'no-recipient' });
  assert.equal(t.sent.length, 0);
});

test('ยังไม่ตั้ง SMTP = แสดงใน Terminal แทน และไม่ error', async () => {
  const result = await sendBookingConfirmation('student@dome.tu.ac.th', booking, null, noLog);
  assert.deepEqual(result, { sent: false, reason: 'smtp-not-configured' });
});

test('SMTP ส่งไม่สำเร็จ = โยน error ให้คนเรียกจัดการ', async () => {
  const broken = { sendMail: async () => { throw new Error('SMTP down'); } };
  await assert.rejects(sendBookingConfirmation('a@b.c', booking, broken, noLog), /SMTP down/);
});

// ---------- email_logs (Task32) ----------
function recorder() { const logs = []; const fn = async (e) => { logs.push(e); }; fn.logs = logs; return fn; }

test('ส่งสำเร็จ = บันทึก log SENT', async () => {
  const log = recorder();
  await sendBookingConfirmation('s@dome.tu.ac.th', booking, fakeTransport(), log);
  assert.deepEqual(log.logs, [{ booking_id: 15, to_email: 's@dome.tu.ac.th', email_type: 'BOOKING_CONFIRMED', status: 'SENT' }]);
});

test('ส่งไม่สำเร็จ = บันทึก log FAILED พร้อมข้อความ error', async () => {
  const log = recorder();
  const broken = { sendMail: async () => { throw new Error('SMTP down'); } };
  await assert.rejects(sendBookingConfirmation('s@dome.tu.ac.th', booking, broken, log));
  assert.equal(log.logs[0].status, 'FAILED');
  assert.equal(log.logs[0].error_message, 'SMTP down');
});

test('ไม่มีผู้รับ / ไม่ได้ตั้ง SMTP = บันทึก log SKIPPED', async () => {
  const log = recorder();
  await sendBookingConfirmation(null, booking, fakeTransport(), log);
  await sendBookingConfirmation('s@dome.tu.ac.th', booking, null, log);
  assert.deepEqual(log.logs.map((l) => [l.status, l.error_message]), [['SKIPPED', 'no-recipient'], ['SKIPPED', 'smtp-not-configured']]);
});

test('บันทึก log ไม่ได้ ไม่กระทบการส่งอีเมล', async () => {
  const result = await sendBookingConfirmation('s@dome.tu.ac.th', booking, fakeTransport(), async () => { throw new Error('db down'); });
  assert.deepEqual(result, { sent: true });
});
