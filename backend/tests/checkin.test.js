// US8: Check-in ตรวจระยะ 5 เมตร — ทดสอบกฎโดยไม่ต้องต่อฐานข้อมูล
const test = require('node:test');
const assert = require('node:assert');
const {
  distanceMeters,
  parseCoordinates,
  assertCheckinTime,
  assertWithinRadius,
} = require('../src/services/bookingRules');

// พิกัดห้องสมมติ และการเลื่อนพิกัดไปทางเหนือ n เมตร (1 องศาละติจูด ≈ 111,195 เมตร)
const ROOM = { latitude: 14.0722, longitude: 100.605 };
const north = (m) => ROOM.latitude + m / 111195;

// การจอง 10:00 วันที่ 22 ต.ค. 2026 (ตามตัวอย่างใน TC)
const booking = { booking_date: '2026-10-22', start_time: '10:00' };
const at = (hhmm) => new Date(`2026-10-22T${hhmm}:00`);

// เรียกฟังก์ชันที่คาดว่าจะ throw แล้วคืน error ออกมาตรวจต่อ
function errorOf(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  assert.fail('ควร throw error');
}

// ---------- คำนวณระยะ (Haversine) ----------
test('ระยะจากจุดเดียวกัน = 0 เมตร', () => {
  assert.equal(distanceMeters(ROOM.latitude, ROOM.longitude, ROOM.latitude, ROOM.longitude), 0);
});

test('คำนวณระยะ 3 เมตร และ 50 เมตรได้ใกล้เคียง', () => {
  assert.ok(Math.abs(distanceMeters(north(3), ROOM.longitude, ROOM.latitude, ROOM.longitude) - 3) < 0.05);
  assert.ok(Math.abs(distanceMeters(north(50), ROOM.longitude, ROOM.latitude, ROOM.longitude) - 50) < 0.2);
});

test('ระยะเท่ากันไม่ว่าจะคำนวณจากฝั่งไหน', () => {
  const a = distanceMeters(14.0722, 100.605, 14.0725, 100.6053);
  const b = distanceMeters(14.0725, 100.6053, 14.0722, 100.605);
  assert.ok(Math.abs(a - b) < 1e-9);
});

// ---------- US8 TC1: ห่าง 3 เมตร เวลา 10:05 → สำเร็จ ----------
test('US8 TC1: ห่าง 3 เมตร กดเวลา 10:05 ผ่านทั้งระยะและเวลา', () => {
  const d = distanceMeters(north(3), ROOM.longitude, ROOM.latitude, ROOM.longitude);
  assert.doesNotThrow(() => assertWithinRadius(d));
  assert.doesNotThrow(() => assertCheckinTime(booking, at('10:05')));
});

test('ห่าง 5 เมตรพอดี ยังผ่าน', () => {
  assert.doesNotThrow(() => assertWithinRadius(5));
});

// ---------- US8 TC2: ห่าง 50 เมตร → นอกระยะ ----------
test('US8 TC2: ห่าง 50 เมตร ขึ้น "คุณอยู่นอกระยะ 5 เมตรจากห้องที่จอง"', () => {
  const d = distanceMeters(north(50), ROOM.longitude, ROOM.latitude, ROOM.longitude);
  const err = errorOf(() => assertWithinRadius(d));
  assert.equal(err.status, 400);
  assert.equal(err.message, 'คุณอยู่นอกระยะ 5 เมตรจากห้องที่จอง');
  assert.deepEqual(err.details, ['ระยะประมาณ 50 เมตร']);
});

// ---------- US8 TC3: ไม่อนุญาตตำแหน่ง / พิกัดไม่ถูกต้อง ----------
test('US8 TC3: ไม่ส่งพิกัด หรือพิกัดผิด ขึ้นข้อความขอสิทธิ์ตำแหน่ง', () => {
  const bad = [
    {},
    { latitude: 14.07 },
    { latitude: null, longitude: null },
    { latitude: '', longitude: '' },
    { latitude: 'abc', longitude: 100.6 },
    { latitude: 91, longitude: 100.6 },
    { latitude: 14.07, longitude: 181 },
  ];
  for (const body of bad) {
    const err = errorOf(() => parseCoordinates(body));
    assert.equal(err.status, 400);
    assert.equal(err.message, 'กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อยืนยันการเข้าใช้งาน');
  }
});

test('พิกัดถูกต้องอ่านเป็นตัวเลขได้ (รับเป็น string ก็ได้) และ accuracy ไม่บังคับ', () => {
  assert.deepEqual(parseCoordinates({ latitude: '14.0722', longitude: '100.605', accuracy: 8 }), {
    latitude: 14.0722, longitude: 100.605, accuracy: 8,
  });
  assert.equal(parseCoordinates({ latitude: 0, longitude: 0 }).accuracy, null);
});

// ---------- US8 TC4: เลย 15 นาที ----------
test('US8 TC4: กดเวลา 10:20 ขึ้น "เลยเวลายืนยันการเข้าใช้งานแล้ว"', () => {
  const err = errorOf(() => assertCheckinTime(booking, at('10:20')));
  assert.equal(err.status, 409);
  assert.equal(err.message, 'เลยเวลายืนยันการเข้าใช้งานแล้ว');
});

test('กดเวลา 10:15 พอดี ยังทัน', () => {
  assert.doesNotThrow(() => assertCheckinTime(booking, at('10:15')));
});

// ---------- US8 TC5: เร็วเกินไป ----------
test('US8 TC5: กดเวลา 09:45 ขึ้น "ยืนยันการเข้าใช้งานได้ตั้งแต่ 09:50"', () => {
  const err = errorOf(() => assertCheckinTime(booking, at('09:45')));
  assert.equal(err.status, 400);
  assert.equal(err.message, 'ยืนยันการเข้าใช้งานได้ตั้งแต่ 09:50');
});

test('กดเวลา 09:50 พอดี ยังกดได้', () => {
  assert.doesNotThrow(() => assertCheckinTime(booking, at('09:50')));
});

test('การจอง 13:00 เปิดให้กดตั้งแต่ 12:50', () => {
  const err = errorOf(() => assertCheckinTime({ booking_date: '2026-10-22', start_time: '13:00' }, at('12:00')));
  assert.equal(err.message, 'ยืนยันการเข้าใช้งานได้ตั้งแต่ 12:50');
});