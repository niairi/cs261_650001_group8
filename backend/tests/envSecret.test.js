// ทดสอบ scripts/env-secret.js — ไฟล์ .env ของทีมแบบเข้ารหัส (secrets/env.enc)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  encryptBundle, decryptBundle, envKeys, writeFiles, demoWarnings,
} = require('../../scripts/env-secret');

const FILES = {
  '.env': 'TU_API_KEY=secret-key-123\nMOCK_USERS=6809650010:test1234\nJWT_SECRET=abc\n',
  'backend/.env': 'PORT=3000\nDATABASE_URL=postgres://u@localhost:5433/room_booking\n',
};
const PASSWORD = 'correct horse battery';

test('เข้ารหัสแล้วถอดด้วยรหัสผ่านเดิม ได้เนื้อหาเดิมครบทุกไฟล์', () => {
  const bundle = encryptBundle(FILES, PASSWORD);
  assert.deepEqual(decryptBundle(bundle, PASSWORD), FILES);
});

test('ไฟล์เข้ารหัสไม่มีค่าลับเป็นตัวอักษรธรรมดา', () => {
  const text = JSON.stringify(encryptBundle(FILES, PASSWORD));
  assert.ok(!text.includes('secret-key-123'));
  assert.ok(!text.includes('test1234'));
});

test('รหัสผ่านผิด → ถอดไม่ได้ และบอกว่ารหัสผ่านไม่ถูกต้อง', () => {
  const bundle = encryptBundle(FILES, PASSWORD);
  assert.throws(() => decryptBundle(bundle, 'wrong password!!'), /รหัสผ่านไม่ถูกต้อง/);
});

test('ไฟล์ถูกแก้ (data หรือรายชื่อไฟล์) → ถอดไม่ได้', () => {
  const bundle = encryptBundle(FILES, PASSWORD);
  const data = Buffer.from(bundle.data, 'base64');
  data[0] ^= 1;
  assert.throws(() => decryptBundle({ ...bundle, data: data.toString('base64') }, PASSWORD), /รหัสผ่านไม่ถูกต้อง/);
  assert.throws(() => decryptBundle({ ...bundle, files: ['.env'] }, PASSWORD), /รหัสผ่านไม่ถูกต้อง/);
});

test('เข้ารหัสสองครั้งได้ผลไม่ซ้ำกัน (salt/iv สุ่มใหม่)', () => {
  const a = encryptBundle(FILES, PASSWORD);
  const b = encryptBundle(FILES, PASSWORD);
  assert.notEqual(a.data, b.data);
  assert.notEqual(a.salt, b.salt);
});

test('envKeys แสดงแค่ชื่อตัวแปร ข้าม comment และบรรทัดว่าง', () => {
  assert.deepEqual(envKeys('# x\n\nA=1\nexport B = 2\nC=\n'), ['A', 'B', 'C']);
});

test('writeFiles: สร้างไฟล์ใหม่, ไฟล์เดิมที่ต่างกันถูกสำรองก่อนเขียนทับ, ไฟล์เหมือนเดิมไม่แตะ', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envsecret-'));
  try {
    fs.writeFileSync(path.join(root, '.env'), 'OLD=1\n');
    fs.mkdirSync(path.join(root, 'backend'));
    fs.writeFileSync(path.join(root, 'backend/.env'), FILES['backend/.env']);

    const report = writeFiles(FILES, root, new Date(2026, 10, 17, 9, 5, 0));
    assert.equal(fs.readFileSync(path.join(root, '.env'), 'utf8'), FILES['.env']);
    assert.equal(fs.readFileSync(path.join(root, '.env.bak-20261117-090500'), 'utf8'), 'OLD=1\n');
    assert.match(report[0].action, /เขียนทับ/);
    assert.match(report[1].action, /เหมือนเดิม/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('writeFiles: ไม่ยอมเขียนไฟล์นอกโฟลเดอร์โปรเจกต์', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envsecret-'));
  try {
    assert.throws(() => writeFiles({ '../evil': 'x' }, root), /ชื่อไฟล์ไม่ถูกต้อง/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('demoWarnings: เตือนเมื่อไม่มี TU_API_KEY / JWT_SECRET ค่าเริ่มต้น / ALLOWED_DEPARTMENTS ว่าง', () => {
  const w = demoWarnings({ '.env': 'TU_API_KEY=\nJWT_SECRET=change-me\n' });
  assert.equal(w.length, 3);
  assert.deepEqual(demoWarnings({ '.env': 'TU_API_KEY=k\nJWT_SECRET=s\nALLOWED_DEPARTMENTS=วิทยาการคอมพิวเตอร์\n' }), []);
});
