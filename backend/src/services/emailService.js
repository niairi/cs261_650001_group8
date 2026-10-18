// US7: ส่งอีเมลยืนยันการจอง
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

// booking: { booking_id, room_name, booking_date, start_time, end_time, student_id }
function buildBookingConfirmationEmail(booking) {
  const date = formatThaiDate(booking.booking_date);
  const time = `${booking.start_time} - ${booking.end_time} น.`;
  const subject = `ยืนยันการจองห้อง ${booking.room_name} ${date} ${time}`;

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

// ส่งอีเมลยืนยัน — คืนค่า { sent: true/false, reason }
// transport ส่งเข้ามาเองได้ (ใช้ตอน test)
async function sendBookingConfirmation(to, booking, transport = getTransporter()) {
  if (!to) {
    console.warn(`[อีเมล] ไม่มีอีเมลของผู้จอง (booking #${booking.booking_id}) จึงไม่ได้ส่ง`);
    return { sent: false, reason: 'no-recipient' };
  }
  const mail = buildBookingConfirmationEmail(booking);
  if (!transport) {
    console.log(`[อีเมล] ยังไม่ได้ตั้ง SMTP จึงแสดงแทนการส่ง\nถึง: ${to}\nเรื่อง: ${mail.subject}\n${mail.text}\n`);
    return { sent: false, reason: 'smtp-not-configured' };
  }
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  return { sent: true };
}

module.exports = { sendBookingConfirmation, buildBookingConfirmationEmail, formatThaiDate };
