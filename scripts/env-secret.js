#!/usr/bin/env node
// เก็บไฟล์ .env ของทีมแบบเข้ารหัสไว้ใน repo (secrets/env.enc) เพื่อใช้บนเครื่องเดโม/เครื่องเพื่อน
// ไม่ต้องติดตั้งอะไรเพิ่ม ใช้แค่ Node.js (หรือ Docker ถ้าเครื่องไม่มี Node ดู README หัวข้อ "ไฟล์ .env แบบเข้ารหัส")
//
//   node scripts/env-secret.js encrypt   รวม .env + backend/.env → secrets/env.enc (ตั้งรหัสผ่าน)
//   node scripts/env-secret.js decrypt   secrets/env.enc → .env + backend/.env (ถามรหัสผ่าน)
//   node scripts/env-secret.js list      ดูว่าในไฟล์เข้ารหัสมีตัวแปรอะไรบ้าง (แสดงแค่ชื่อ ไม่แสดงค่า)
//
// เข้ารหัสด้วย AES-256-GCM กุญแจได้จากรหัสผ่านผ่าน scrypt · รหัสผ่านผิดหรือไฟล์ถูกแก้ = ถอดไม่ได้
// รหัสผ่านส่งให้เพื่อนทางแชทส่วนตัวหรือบอกปากเปล่า ห้ามใส่ใน repo / กลุ่มแชท
// ใช้ตัวแปร ENV_SECRET_PASSWORD แทนการพิมพ์ได้ (เช่นตอนรันใน CI) แต่ปกติให้พิมพ์เอง

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ENC_FILE = path.join(ROOT, 'secrets', 'env.enc');
const FILES = ['.env', 'backend/.env']; // .env = docker compose, backend/.env = npm start
const FORMAT = 'tu-cs-space-env/1';
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const MIN_PASSWORD = 12;

function deriveKey(password, salt) {
  return crypto.scryptSync(String(password).normalize('NFC'), salt, 32, SCRYPT);
}

// files: { 'relative/path': 'เนื้อหาไฟล์' }
function encryptBundle(files, password) {
  const names = Object.keys(files);
  if (names.length === 0) throw new Error('ไม่มีไฟล์ให้เข้ารหัส');
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const header = { format: FORMAT, kdf: 'scrypt', N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, files: names };
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(password, salt), iv);
  cipher.setAAD(Buffer.from(JSON.stringify(header))); // แก้ header (เช่นรายชื่อไฟล์) = ถอดไม่ได้
  const data = Buffer.concat([cipher.update(JSON.stringify(files), 'utf8'), cipher.final()]);
  return {
    ...header,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}

function decryptBundle(bundle, password) {
  if (!bundle || bundle.format !== FORMAT) throw new Error('ไม่ใช่ไฟล์ env.enc ของโปรเจกต์นี้');
  const header = { format: bundle.format, kdf: bundle.kdf, N: bundle.N, r: bundle.r, p: bundle.p, files: bundle.files };
  const key = crypto.scryptSync(String(password).normalize('NFC'), Buffer.from(bundle.salt, 'base64'), 32, {
    N: bundle.N, r: bundle.r, p: bundle.p, maxmem: SCRYPT.maxmem,
  });
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(bundle.iv, 'base64'));
  decipher.setAAD(Buffer.from(JSON.stringify(header)));
  decipher.setAuthTag(Buffer.from(bundle.tag, 'base64'));
  try {
    const plain = Buffer.concat([decipher.update(Buffer.from(bundle.data, 'base64')), decipher.final()]);
    return JSON.parse(plain.toString('utf8'));
  } catch {
    throw new Error('รหัสผ่านไม่ถูกต้อง (หรือไฟล์ env.enc เสียหาย)');
  }
}

// ชื่อตัวแปรในไฟล์ .env (ไม่เอาค่า)
function envKeys(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.slice(0, line.indexOf('=')).replace(/^export\s+/, '').trim());
}

function envValue(text, name) {
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith(`${name}=`)) return line.slice(name.length + 1).replace(/\s+#.*$/, '').trim();
  }
  return undefined;
}

function stamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

// เขียนไฟล์ที่ถอดได้ลงเครื่อง ไฟล์เดิมที่ต่างกันจะถูกสำรองเป็น <ชื่อ>.bak-YYYYMMDD-HHMMSS ก่อน
function writeFiles(files, root = ROOT, now = new Date()) {
  const report = [];
  for (const [name, content] of Object.entries(files)) {
    const target = path.resolve(root, name);
    if (!target.startsWith(root + path.sep)) throw new Error(`ชื่อไฟล์ไม่ถูกต้อง: ${name}`);
    let action = 'สร้างใหม่';
    if (fs.existsSync(target)) {
      if (fs.readFileSync(target, 'utf8') === content) {
        report.push({ name, action: 'เหมือนเดิม ไม่ได้แก้' });
        continue;
      }
      const backup = `${target}.bak-${stamp(now)}`;
      fs.copyFileSync(target, backup);
      action = `เขียนทับ (ไฟล์เดิมสำรองไว้ที่ ${path.relative(root, backup)})`;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, { mode: 0o600 });
    report.push({ name, action });
  }
  return report;
}

// ---------- รับรหัสผ่านแบบไม่แสดงตัวอักษร ----------
function askHidden(question) {
  if (process.env.ENV_SECRET_PASSWORD) return Promise.resolve(process.env.ENV_SECRET_PASSWORD);
  const { stdin, stdout } = process;
  if (!stdin.isTTY) {
    // ไม่มีหน้าจอให้พิมพ์ (เช่น pipe) อ่านบรรทัดแรกจาก stdin
    return new Promise((resolve) => {
      let buf = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk) => { buf += chunk; });
      stdin.on('end', () => resolve(buf.split(/\r?\n/)[0]));
    });
  }
  return new Promise((resolve, reject) => {
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let input = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(input);
          return;
        }
        if (ch === '\u0003') { // Ctrl+C
          stdin.setRawMode(false);
          stdout.write('\n');
          reject(new Error('ยกเลิก'));
          return;
        }
        if (ch === '\u007f' || ch === '\b') input = input.slice(0, -1);
        else if (ch >= ' ') input += ch;
      }
    };
    stdin.on('data', onData);
  });
}

function readBundle() {
  if (!fs.existsSync(ENC_FILE)) {
    throw new Error(`ไม่พบ ${path.relative(ROOT, ENC_FILE)} — ต้อง git pull ก่อน หรือให้คนที่มี .env รัน encrypt`);
  }
  return JSON.parse(fs.readFileSync(ENC_FILE, 'utf8'));
}

function printKeys(files) {
  for (const [name, content] of Object.entries(files)) {
    console.log(`  ${name}: ${envKeys(content).join(', ') || '(ว่าง)'}`);
  }
}

// เตือนค่าที่ทำให้เดโมพังบ่อย (ไม่แสดงค่าจริง)
function demoWarnings(files) {
  const warnings = [];
  const docker = files['.env'];
  if (docker === undefined) {
    warnings.push('ไม่มี .env ที่ root — docker compose จะใช้ค่าเริ่มต้นทั้งหมด');
    return warnings;
  }
  if (!envValue(docker, 'TU_API_KEY')) warnings.push('TU_API_KEY ว่าง → Login เป็นโหมดจำลอง (เข้าได้เฉพาะ MOCK_USERS)');
  if (!envValue(docker, 'JWT_SECRET') || envValue(docker, 'JWT_SECRET') === 'change-me') {
    warnings.push('JWT_SECRET ยังเป็นค่าเริ่มต้น change-me');
  }
  if (!envValue(docker, 'ALLOWED_DEPARTMENTS')) warnings.push('ALLOWED_DEPARTMENTS ว่าง → ยังไม่ตรวจสาขา (US14)');
  return warnings;
}

async function main(cmd) {
  if (cmd === 'encrypt') {
    const files = {};
    for (const name of FILES) {
      const full = path.join(ROOT, name);
      if (fs.existsSync(full)) files[name] = fs.readFileSync(full, 'utf8');
    }
    if (Object.keys(files).length === 0) throw new Error('ไม่พบ .env หรือ backend/.env ในเครื่องนี้');
    console.log('จะเข้ารหัสไฟล์:');
    printKeys(files);
    const password = await askHidden(`ตั้งรหัสผ่าน (อย่างน้อย ${MIN_PASSWORD} ตัวอักษร): `);
    if (password.length < MIN_PASSWORD) throw new Error(`รหัสผ่านสั้นเกินไป ต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`);
    if (!process.env.ENV_SECRET_PASSWORD) {
      const again = await askHidden('พิมพ์รหัสผ่านอีกครั้ง: ');
      if (again !== password) throw new Error('รหัสผ่านสองครั้งไม่ตรงกัน');
    }
    fs.mkdirSync(path.dirname(ENC_FILE), { recursive: true });
    fs.writeFileSync(ENC_FILE, `${JSON.stringify(encryptBundle(files, password), null, 2)}\n`);
    console.log(`\n✅ บันทึก ${path.relative(ROOT, ENC_FILE)} แล้ว — commit ไฟล์นี้ได้ (ไฟล์ .env จริงยังไม่ขึ้น Git)`);
    console.log('   ส่งรหัสผ่านให้เพื่อนทางแชทส่วนตัว ห้ามส่งในกลุ่ม');
    return;
  }

  if (cmd === 'decrypt' || cmd === 'list') {
    const bundle = readBundle();
    const password = await askHidden('รหัสผ่านไฟล์ .env ของทีม: ');
    const files = decryptBundle(bundle, password);
    if (cmd === 'list') {
      console.log('ตัวแปรในไฟล์เข้ารหัส (ไม่แสดงค่า):');
      printKeys(files);
      return;
    }
    console.log('');
    for (const r of writeFiles(files)) console.log(`✅ ${r.name}: ${r.action}`);
    console.log('\nตัวแปรที่ได้ (ไม่แสดงค่า):');
    printKeys(files);
    const warnings = demoWarnings(files);
    if (warnings.length) {
      console.log('');
      for (const w of warnings) console.log(`⚠️  ${w}`);
    }
    console.log('\nต่อไป: docker compose up --build (ถ้าเปลี่ยนค่าแล้ว ต้องรันใหม่ทุกครั้ง)');
    return;
  }

  console.log([
    'ใช้งาน:',
    '  node scripts/env-secret.js encrypt   รวม .env + backend/.env → secrets/env.enc',
    '  node scripts/env-secret.js decrypt   secrets/env.enc → .env + backend/.env',
    '  node scripts/env-secret.js list      ดูชื่อตัวแปรในไฟล์เข้ารหัส',
  ].join('\n'));
  if (cmd) process.exitCode = 1;
}

if (require.main === module) {
  main(process.argv[2]).catch((err) => {
    console.error(`❌ ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { encryptBundle, decryptBundle, envKeys, envValue, writeFiles, demoWarnings, FORMAT };
