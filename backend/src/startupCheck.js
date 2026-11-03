// สรุปการตั้งค่าตอนเปิด server (US15 · จาก Review Sprint 1)
// ตอนเดโม Sprint 1 เครื่อง Lab ไม่มี TU_API_KEY ระบบจึงเข้าโหมดจำลองโดยไม่มีใครรู้
// ไฟล์นี้ทำให้ Terminal ของ backend บอกชัดๆ ตั้งแต่เปิดว่าตอนนี้ Login ตรวจกับอะไร
// คืนค่าเป็นรายการ { level: 'ok' | 'warn', text } ไม่ log เอง (เขียน test ได้) และไม่แสดงค่าลับ

function countMockUsers(raw) {
  return String(raw || '').split(',').filter((e) => {
    const [id, pw] = e.split(':').map((s) => (s || '').trim());
    return id && pw;
  }).length;
}

function configWarnings(env = process.env) {
  const lines = [];

  if (env.TU_API_KEY) {
    lines.push({ level: 'ok', text: 'Login: ตรวจกับ TU REST API จริง (มี TU_API_KEY)' });
  } else {
    const n = countMockUsers(env.MOCK_USERS);
    lines.push({
      level: 'warn',
      text: `Login: โหมดจำลอง — ไม่มี TU_API_KEY รับเฉพาะบัญชีทดสอบใน MOCK_USERS (${n} บัญชี) · บัญชี TU จริงจะเข้าไม่ได้ · ห้ามใช้เดโม`,
    });
  }

  if (env.ALLOWED_DEPARTMENTS && env.ALLOWED_DEPARTMENTS.trim()) {
    lines.push({ level: 'ok', text: `ตรวจสาขา (US14): เปิด — ยอมรับ "${env.ALLOWED_DEPARTMENTS.trim()}"` });
  } else {
    lines.push({ level: 'warn', text: 'ตรวจสาขา (US14): ปิด — ยังไม่ได้ตั้ง ALLOWED_DEPARTMENTS ทุกสาขา Login ได้' });
  }

  if (env.SMTP_HOST) {
    lines.push({ level: 'ok', text: `อีเมล: ส่งจริงผ่าน ${env.SMTP_HOST}` });
  } else {
    lines.push({ level: 'warn', text: 'อีเมล: ยังไม่ตั้ง SMTP_HOST จะแสดงเนื้อหาอีเมลใน Terminal แทนการส่งจริง' });
  }

  return lines;
}

function printConfigSummary(env = process.env, log = console.log) {
  const lines = configWarnings(env);
  const bar = '='.repeat(60);
  log(bar);
  for (const { level, text } of lines) log(`${level === 'ok' ? '✅' : '⚠️ '} ${text}`);
  log(bar);
  return lines;
}

module.exports = { configWarnings, printConfigSummary, countMockUsers };
