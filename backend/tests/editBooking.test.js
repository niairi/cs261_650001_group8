// US6: แก้ไขเวลาการจอง — ทดสอบกฎการจองและอีเมลแจ้งการเปลี่ยนแปลง (ไม่ต้องต่อฐานข้อมูล)
const test = require('node:test');
const assert = require('node:assert');
const { validateBooking, assertChangeable, minutesUntilStart } = require('../src/services/bookingRules');
const { buildBookingUpdatedEmail, sendBookingUpdate } = require('../src/services/emailService');

// สมมติว่าตอนนี้คือ 20 ต.ค. 2026 08:00 (เวลาเครื่อง)
const NOW = new Date('2026-10-20T08:00:00');

const base = { room_id: 101, people: 4, booking_date: '2026-10-21', start_time: '10:00', end_time: '12:00' };

// เรียก validateBooking แล้วคืน details ของ error (ถ้าผ่านคืน [])
function errorsOf(body) {
  try {
    validateBooking(body, NOW);
    return [];
  } catch (err) {
    assert.equal(err.status, 400);
    return err.details || [err.message];
  }
}

// ---------- กฎเวลาใหม่ ----------
test('US6 TC1: แก้เป็น 13:00–15:00 ผ่านกฎ', () => {
  const b = validateBooking({ ...base, start_time: '13:00', end_time: '15:00' }, NOW);
  assert.equal(b.start_time, '13:00');
  assert.equal(b.end_time, '15:00');
  assert.equal(b.roomId, 101);
});

test('US6 TC3: แก้เป็น 4 ชม. ขึ้น "จองได้ครั้งละไม่เกิน 3 ชั่วโมง"', () => {
  assert.ok(errorsOf({ ...base, start_time: '10:00', end_time: '14:00' }).includes('จองได้ครั้งละไม่เกิน 3 ชั่วโมง'));
});

test('US3 TC5: 16:00–17:00 ขึ้น "จองได้เฉพาะช่วง 09:00 - 16:00 น."', () => {
  assert.ok(errorsOf({ ...base, start_time: '16:00', end_time: '17:00' }).includes('จองได้เฉพาะช่วง 09:00 - 16:00 น.'));
});

test('US3 TC5: 16:00–18:00 ขึ้น "จองได้เฉพาะช่วง 09:00 - 16:00 น."', () => {
  assert.ok(errorsOf({ ...base, start_time: '16:00', end_time: '18:00' }).includes('จองได้เฉพาะช่วง 09:00 - 16:00 น.'));
});

test('15:00–16:00 ยังจองได้ (ชั่วโมงสุดท้ายก่อนปิด)', () => {
  assert.deepEqual(errorsOf({ ...base, start_time: '15:00', end_time: '16:00' }), []);
});

test('ก่อน 09:00 จองไม่ได้', () => {
  assert.ok(errorsOf({ ...base, start_time: '08:00', end_time: '10:00' }).includes('จองได้เฉพาะช่วง 09:00 - 16:00 น.'));
});

test('จองล่วงหน้าเกิน 7 วันไม่ได้', () => {
  assert.ok(errorsOf({ ...base, booking_date: '2026-10-28' }).includes('จองล่วงหน้าได้ไม่เกิน 7 วัน'));
  assert.deepEqual(errorsOf({ ...base, booking_date: '2026-10-27' }), []);
});

test('จองเวลาที่ผ่านมาแล้วไม่ได้', () => {
  assert.ok(errorsOf({ ...base, booking_date: '2026-10-19' }).includes('ไม่สามารถจองเวลาที่ผ่านมาแล้ว'));
});

// ---------- แก้ไขได้ก่อนเริ่มอย่างน้อย 30 นาที ----------
test('นับนาทีก่อนเริ่มการจองได้ถูกต้อง', () => {
  assert.equal(minutesUntilStart('2026-10-20', '09:00', NOW), 60);
});

test('US6 TC4: เหลือไม่ถึง 30 นาที แก้ไขไม่ได้', () => {
  const booking = { booking_date: '2026-10-20', start_time: '09:00' };
  const at = new Date('2026-10-20T08:31:00'); // เหลือ 29 นาที
  assert.throws(() => assertChangeable(booking, 'แก้ไข', at), (err) => {
    assert.equal(err.status, 400);
    assert.equal(err.message, 'แก้ไขได้ก่อนเวลาเริ่มอย่างน้อย 30 นาที');
    return true;
  });
});

test('US6 TC4: เหลือ 30 นาทีพอดี ยังแก้ไขได้', () => {
  const booking = { booking_date: '2026-10-20', start_time: '09:00' };
  assert.doesNotThrow(() => assertChangeable(booking, 'แก้ไข', new Date('2026-10-20T08:30:00')));
});

test('US4 TC4: ข้อความยกเลิกยังเหมือนเดิม', () => {
  const booking = { booking_date: '2026-10-20', start_time: '09:00' };
  assert.throws(
    () => assertChangeable(booking, 'ยกเลิก', new Date('2026-10-20T08:45:00')),
    /ยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย 30 นาที/
  );
});

// ---------- อีเมลแจ้งการเปลี่ยนแปลง ----------
const updated = {
  booking_id: 15, room_id: 101, room_name: 'Room A', booking_date: '2026-10-22',
  start_time: '13:00', end_time: '15:00', student_id: '6609651234',
};
const previous = { room_id: 101, room_name: 'Room A', booking_date: '2026-10-22', start_time: '10:00', end_time: '12:00' };

function fakeTransport() {
  const sent = [];
  return { sent, sendMail: async (mail) => { sent.push(mail); } };
}
function recorder() { const logs = []; const fn = async (e) => { logs.push(e); }; fn.logs = logs; return fn; }

test('อีเมลแก้ไข: หัวข้อรูปแบบเดียวกับอีเมลอื่น และมีทั้งเวลาใหม่และเวลาเดิม', () => {
  const { subject, text, html } = buildBookingUpdatedEmail(updated, previous);
  assert.equal(subject, '[CS Co-Working] แก้ไขการจอง Room A (101) 22/10/2569 13:00–15:00');
  for (const s of ['#15', '13:00 - 15:00', '10:00 - 12:00', '6609651234']) {
    assert.ok(text.includes(s), `text ต้องมี ${s}`);
    assert.ok(html.includes(s), `html ต้องมี ${s}`);
  }
});

test('อีเมลแก้ไข: ส่งถึงผู้จอง และบันทึก email_logs เป็น BOOKING_UPDATED', async () => {
  const t = fakeTransport();
  const log = recorder();
  const result = await sendBookingUpdate('s@dome.tu.ac.th', updated, previous, t, log);
  assert.deepEqual(result, { sent: true });
  assert.equal(t.sent[0].to, 's@dome.tu.ac.th');
  assert.deepEqual(log.logs, [{ booking_id: 15, to_email: 's@dome.tu.ac.th', email_type: 'BOOKING_UPDATED', status: 'SENT' }]);
});

test('อีเมลแก้ไข: SMTP ส่งไม่สำเร็จ = บันทึก FAILED และโยน error', async () => {
  const log = recorder();
  const broken = { sendMail: async () => { throw new Error('SMTP down'); } };
  await assert.rejects(sendBookingUpdate('s@dome.tu.ac.th', updated, previous, broken, log), /SMTP down/);
  assert.equal(log.logs[0].status, 'FAILED');
  assert.equal(log.logs[0].email_type, 'BOOKING_UPDATED');
});