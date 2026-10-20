// US7: ส่งอีเมลยืนยันการจอง และอีเมลยืนยันการยกเลิกการจอง
//
// ตั้งค่า SMTP ใน .env (ดู .env.example)
// ถ้ายังไม่ได้ตั้ง SMTP_HOST ระบบจะไม่ส่งจริง แต่แสดงเนื้อหาอีเมลใน Terminal แทน
// ใช้ทดสอบระหว่างพัฒนาได้โดยไม่ต้องมีบัญชีอีเมล

let transporter; // สร้างครั้งเดียวแล้วใช้ซ้ำ

function getTransporter() {
  if (transporter !== undefined) return transporter;
  if (!process.env.SMTP_HOST) {
    transporter = null;
    return null;
  }
  const nodemailer = require('nodemailer');
  const port = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

// "2026-10-20" -> "วันอังคารที่ 20 ตุลาคม 2569"
function formatThaiDate(date) {
  return new Date(`${date}T00:00:00+07:00`).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// หัวข้ออีเมลตาม US5 TC1/TC2 เช่น "[CS Co-Working] ยืนยันการจอง Room A (101) 22/10/2569 10:00–12:00"
function emailSubject(action, booking) {
  const shortDate = new Date(`${booking.booking_date}T00:00:00+07:00`).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const roomLabel = booking.room_id ? `${booking.room_name} (${booking.room_id})` : booking.room_name;
  return `[CS Co-Working] ${action} ${roomLabel} ${shortDate} ${booking.start_time}–${booking.end_time}`;
}

// booking: { booking_id, room_name, booking_date, start_time, end_time, student_id }
function buildBookingConfirmationEmail(booking) {
  const date = formatThaiDate(booking.booking_date);
  const time = `${booking.start_time} - ${booking.end_time} น.`;
  const subject = emailSubject('ยืนยันการจอง', booking);

  const rows = [
    ['หมายเลขการจอง', `#${booking.booking_id}`],
    ['ห้อง', booking.room_name],
    ['วันที่', date],
    ['เวลา', time],
    ['รหัสนักศึกษา', booking.student_id],
  ];

  const text = [
    'การจองห้องของคุณสำเร็จแล้ว',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'กรุณาไปถึงห้องตามเวลาที่จอง และยืนยันการเข้าใช้งานที่หน้าห้อง',
    'หากไม่ยืนยันภายในเวลาที่กำหนด การจองจะถูกยกเลิกอัตโนมัติ',
    '',
    'TU CS Space — ภาควิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยธรรมศาสตร์',
  ].join('\n');

  const html = `
<div style="font-family:sans-serif;max-width:480px">
  <h2 style="color:#8b0016">การจองห้องของคุณสำเร็จแล้ว</h2>
  <table style="border-collapse:collapse;width:100%">
    ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#666">${escapeHtml(k)}</td><td style="padding:6px 0"><b>${escapeHtml(v)}</b></td></tr>`).join('')}
  </table>
  <p>กรุณาไปถึงห้องตามเวลาที่จอง และยืนยันการเข้าใช้งานที่หน้าห้อง<br>
  หากไม่ยืนยันภายในเวลาที่กำหนด การจองจะถูกยกเลิกอัตโนมัติ</p>
  <p style="color:#999;font-size:12px">TU CS Space — ภาควิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยธรรมศาสตร์</p>
</div>`;

  return { subject, text, html };
}

// booking: { booking_id, room_name, booking_date, start_time, end_time, student_id }
function buildBookingCancellationEmail(booking) {
  const date = formatThaiDate(booking.booking_date);
  const time = `${booking.start_time} - ${booking.end_time} น.`;
  const subject = emailSubject('ยกเลิกการจอง', booking);

  const rows = [
    ['หมายเลขการจอง', `#${booking.booking_id}`],
    ['ห้อง', booking.room_name],
    ['วันที่', date],
    ['เวลา', time],
    ['รหัสนักศึกษา', booking.student_id],
    ['สถานะ', 'ยกเลิกแล้ว'],
  ];

  const text = [
    'การจองห้องของคุณถูกยกเลิกเรียบร้อยแล้ว',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'ช่วงเวลานี้ถูกเปิดให้ผู้อื่นจองได้แล้ว',
    'หากคุณไม่ได้เป็นผู้ยกเลิก กรุณาติดต่อผู้ดูแลระบบ',
    '',
    'TU CS Space — ภาควิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยธรรมศาสตร์',
  ].join('\n');

  const html = `
<div style="font-family:sans-serif;max-width:480px">
  <h2 style="color:#555">การจองห้องของคุณถูกยกเลิกเรียบร้อยแล้ว</h2>
  <table style="border-collapse:collapse;width:100%">
    ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#666">${escapeHtml(k)}</td><td style="padding:6px 0"><b>${escapeHtml(v)}</b></td></tr>`).join('')}
  </table>
  <p>ช่วงเวลานี้ถูกเปิดให้ผู้อื่นจองได้แล้ว<br>
  หากคุณไม่ได้เป็นผู้ยกเลิก กรุณาติดต่อผู้ดูแลระบบ</p>
  <p style="color:#999;font-size:12px">TU CS Space — ภาควิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยธรรมศาสตร์</p>
</div>`;

  return { subject, text, html };
}

// บันทึกผลการส่งลงตาราง email_logs (Task32) — ถ้าบันทึกไม่ได้ไม่ให้กระทบการส่งอีเมล
async function defaultLog(entry) {
  const pool = require('../db');
  const { insertEmailLog } = require('../repositories/emailLogRepo');
  await insertEmailLog(pool, entry);
}

async function safeLog(log, entry) {
  try {
    await log(entry);
  } catch (err) {
    console.error('[อีเมล] บันทึก email_logs ไม่สำเร็จ:', err.message);
  }
}

// ส่งอีเมลเกี่ยวกับการจอง 1 ฉบับ — คืนค่า { sent: true/false, reason }
// type = BOOKING_CONFIRMED | BOOKING_CANCELLED (บันทึกลง email_logs.email_type)
async function sendBookingEmail(type, mail, to, booking, transport, log) {
  const base = { booking_id: booking.booking_id, to_email: to || null, email_type: type };

  if (!to) {
    console.warn(`[อีเมล] ไม่มีอีเมลของผู้จอง (booking #${booking.booking_id}) จึงไม่ได้ส่ง`);
    await safeLog(log, { ...base, status: 'SKIPPED', error_message: 'no-recipient' });
    return { sent: false, reason: 'no-recipient' };
  }
  if (!transport) {
    console.log(`[อีเมล] ยังไม่ได้ตั้ง SMTP จึงแสดงแทนการส่ง\nถึง: ${to}\nเรื่อง: ${mail.subject}\n${mail.text}\n`);
    await safeLog(log, { ...base, status: 'SKIPPED', error_message: 'smtp-not-configured' });
    return { sent: false, reason: 'smtp-not-configured' };
  }
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (err) {
    await safeLog(log, { ...base, status: 'FAILED', error_message: err.message });
    throw err;
  }
  await safeLog(log, { ...base, status: 'SENT' });
  return { sent: true };
}

// อีเมลยืนยันการจอง — transport และ log ส่งเข้ามาเองได้ (ใช้ตอน test)
function sendBookingConfirmation(to, booking, transport = getTransporter(), log = defaultLog) {
  return sendBookingEmail('BOOKING_CONFIRMED', buildBookingConfirmationEmail(booking), to, booking, transport, log);
}

// อีเมลยืนยันการยกเลิกการจอง (US4 + US7)
function sendBookingCancellation(to, booking, transport = getTransporter(), log = defaultLog) {
  return sendBookingEmail('BOOKING_CANCELLED', buildBookingCancellationEmail(booking), to, booking, transport, log);
}

module.exports = {
  sendBookingConfirmation,
  sendBookingCancellation,
  buildBookingConfirmationEmail,
  buildBookingCancellationEmail,
  formatThaiDate,
};
