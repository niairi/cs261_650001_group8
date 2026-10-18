// ===== ตั้งค่าการเชื่อมต่อ Backend =====
const API_URL = "http://localhost:3000";
const TOKEN_KEY = "token"; // ต้องตรงกับชื่อที่ login.js ใช้เก็บ token ใน localStorage
const OPEN_HOUR = 9;   // เปิด 09:00
const CLOSE_HOUR = 17; // ปิด 17:00 (ตรงกับ CLOSE ใน backend)
const AUTO_REFRESH_MS = 60 * 1000;

const pad = (n) => String(n).padStart(2, "0");
const timeSlots = [];
for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) timeSlots.push(`${pad(h)}:00`);
const weekDays = ["วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์"];

const roomList = document.querySelector("#room-list");
const roomSelect = document.querySelector("#room-select");
const capacityHint = document.querySelector("#capacity-hint");
const peopleInput = document.querySelector("#people");
const form = document.querySelector("#booking-form");
const formMessage = document.querySelector("#form-message");
const submitButton = form.querySelector(".submit-button");
const bookingDateInput = document.querySelector("#booking-date");
const scheduleBody = document.querySelector("#schedule-body");
const navigationLinks = document.querySelectorAll(".main-nav .nav-link[href^='#']");
const roomScheduleDialog = document.querySelector("#room-schedule-dialog");
const roomScheduleLabel = document.querySelector("#schedule-room-label");
const roomScheduleRange = document.querySelector("#schedule-week-range");
const weeklyScheduleBody = document.querySelector("#weekly-schedule-body");
const todayButton = document.querySelector("#today-button");
const tomorrowButton = document.querySelector("#tomorrow-button");

let rooms = [];

// ===== ฟังก์ชันช่วย =====
function localDate(date) {
  return date.toLocaleDateString("sv-SE"); // YYYY-MM-DD ตามเวลาเครื่อง
}

function thaiDate(date) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function nextHour(slot) {
  return `${pad(Number(slot.slice(0, 2)) + 1)}:00`;
}

// ช่องเวลานี้ถูกจองหรือไม่ (ช่วงเวลาทับกัน)
function isSlotBooked(bookings, roomId, slot) {
  const slotEnd = nextHour(slot);
  return bookings.some((b) => b.room_id === roomId && b.start_time < slotEnd && b.end_time > slot);
}

// ช่องเวลานี้ผ่านไปแล้วหรือยัง
function isSlotPast(dateStr, slot) {
  const now = new Date();
  const todayStr = localDate(now);
  const nowTime = now.toTimeString().slice(0, 5);
  return dateStr < todayStr || (dateStr === todayStr && slot <= nowTime);
}

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || "เกิดข้อผิดพลาด");
    error.details = data.details;
    throw error;
  }
  return data;
}

function showMessage(text, ok) {
  formMessage.textContent = text;
  formMessage.style.color = ok ? "#1a7f37" : "#c62828";
}

function slotCell(status) {
  const cell = document.createElement("td");
  const span = document.createElement("span");
  const labels = { available: "ว่าง", booked: "ถูกจอง", past: "ผ่านแล้ว" };
  span.className = `slot-status ${status === "available" ? "available" : "booked"}`;
  span.textContent = labels[status];
  cell.append(span);
  return cell;
}

// ===== แสดงชื่อผู้ใช้จาก token =====
function getStudentIdFromToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.student_id ? String(payload.student_id) : null;
  } catch {
    return null;
  }
}

function renderUser() {
  const studentId = getStudentIdFromToken();
  const label = studentId ? `รหัสนักศึกษา ${studentId}` : "ยังไม่ได้เข้าสู่ระบบ";
  document.querySelector("#user-name").textContent = label;
  document.querySelector("#booking-user").textContent = label;
  const profile = document.querySelector(".profile-details");
  if (profile) {
    profile.querySelector("strong").textContent = studentId ? "นักศึกษา" : "Guest";
    profile.querySelector("small").textContent = studentId || "-";
  }
}

// ===== เมนูด้านบน =====
function updateNavigationState() {
  const currentHash = window.location.hash;
  const hasMatchingLink = [...navigationLinks].some((link) => link.hash === currentHash);
  const activeHash = hasMatchingLink ? currentHash : "#rooms";
  navigationLinks.forEach((link) => {
    const isActive = link.hash === activeHash;
    link.classList.toggle("active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}
window.addEventListener("hashchange", updateNavigationState);
updateNavigationState();

// ===== ห้อง: ดึงจาก GET /rooms =====
async function loadRooms() {
  try {
    rooms = await api("/rooms");
  } catch {
    roomList.innerHTML = '<p class="muted small">โหลดข้อมูลห้องไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่</p>';
    roomSelect.innerHTML = '<option value="" selected disabled>โหลดรายชื่อห้องไม่ได้</option>';
    return;
  }
  renderRoomCards();
  renderRoomSelect();
}

function renderRoomCards() {
  roomList.innerHTML = rooms.map((room) => `
    <button class="room-card" type="button" data-room="${room.room_id}" aria-pressed="false">
      <div class="room-top">
        <span class="room-tag">${escapeHtml(room.room_name)}</span>
        <span class="capacity">
          <i class="fa-solid fa-users" aria-hidden="true"></i>
          <span>${room.capacity} ที่นั่ง</span>
        </span>
      </div>
      <h3>${escapeHtml(room.room_name)}</h3>
      <ul class="features">
        <li><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>${escapeHtml(room.location || "-")}</span></li>
        <li><i class="fa-solid fa-plug" aria-hidden="true"></i><span>ปลั๊กพ่วงกำลังไฟสูง</span></li>
        <li><i class="fa-solid fa-chalkboard" aria-hidden="true"></i><span>ไวท์บอร์ดกระจก</span></li>
        <li><i class="fa-solid fa-tv" aria-hidden="true"></i><span>Smart TV</span></li>
      </ul>
    </button>
  `).join("");

  roomList.querySelectorAll(".room-card").forEach((card) => {
    card.addEventListener("click", () => {
      roomList.querySelectorAll(".room-card").forEach((item) => {
        item.classList.remove("selected");
        item.setAttribute("aria-pressed", "false");
      });
      card.classList.add("selected");
      card.setAttribute("aria-pressed", "true");
      roomSelect.value = card.dataset.room;
      updateCapacityHint();
      openWeeklySchedule(Number(card.dataset.room));
    });
  });
}

function renderRoomSelect() {
  roomSelect.innerHTML = '<option value="" selected disabled>กรุณาเลือกห้อง</option>';
  rooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room.room_id;
    option.textContent = `${room.room_name} (จุ ${room.capacity} คน)`;
    roomSelect.append(option);
  });
}

function updateCapacityHint() {
  const room = rooms.find((r) => r.room_id === Number(roomSelect.value));
  if (!room) {
    capacityHint.textContent = "เลือกห้องเพื่อดูความจุ";
    peopleInput.removeAttribute("max");
    return;
  }
  capacityHint.textContent = `ความจุสูงสุด ${room.capacity} ที่นั่ง`;
  peopleInput.max = room.capacity;
}
roomSelect.addEventListener("change", updateCapacityHint);

// ===== ตารางสถานะ Real-time: GET /booking?date= =====
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
let selectedDate = localDate(today);

document.querySelector("#today-label").textContent = thaiDate(today);
document.querySelector("#tomorrow-label").textContent = thaiDate(tomorrow);
bookingDateInput.value = localDate(today);
bookingDateInput.min = localDate(today);

async function loadAvailability() {
  if (rooms.length === 0) {
    scheduleBody.innerHTML = '<tr><td colspan="9"><span class="empty-status">ไม่มีข้อมูลห้อง</span></td></tr>';
    return;
  }
  let bookings;
  try {
    bookings = await api(`/booking?date=${selectedDate}`);
  } catch {
    scheduleBody.innerHTML = '<tr><td colspan="9"><span class="empty-status">โหลดสถานะห้องไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่</span></td></tr>';
    return;
  }

  scheduleBody.replaceChildren();
  rooms.forEach((room) => {
    const row = document.createElement("tr");
    const header = document.createElement("th");
    header.innerHTML = `${escapeHtml(room.room_name)} <small>จุ ${room.capacity} ที่นั่ง</small>`;
    row.append(header);
    timeSlots.forEach((slot) => {
      let status = "available";
      if (isSlotBooked(bookings, room.room_id, slot)) status = "booked";
      else if (isSlotPast(selectedDate, slot)) status = "past";
      row.append(slotCell(status));
    });
    scheduleBody.append(row);
  });
}

function selectDay(date, activeButton, otherButton) {
  activeButton.classList.add("active");
  otherButton.classList.remove("active");
  selectedDate = localDate(date);
  bookingDateInput.value = selectedDate;
  loadAvailability();
}
todayButton.addEventListener("click", () => selectDay(today, todayButton, tomorrowButton));
tomorrowButton.addEventListener("click", () => selectDay(tomorrow, tomorrowButton, todayButton));
document.querySelector("#refresh-button").addEventListener("click", loadAvailability);

// ===== ตารางรายสัปดาห์ของห้อง (pop-up) =====
function getWeekDates() {
  const monday = new Date();
  const currentDay = monday.getDay();
  const daysUntilMonday = currentDay === 0 ? 1 : currentDay === 6 ? 2 : 1 - currentDay;
  monday.setDate(monday.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  return [0, 1, 2, 3, 4].map((i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

async function openWeeklySchedule(roomId) {
  const room = rooms.find((r) => r.room_id === roomId);
  const dates = getWeekDates();
  roomScheduleLabel.textContent = room ? room.room_name : "";
  roomScheduleRange.textContent = `${thaiDate(dates[0])} - ${thaiDate(dates[4])}`;
  weeklyScheduleBody.innerHTML = '<tr><td colspan="9">กำลังโหลด...</td></tr>';
  if (!roomScheduleDialog.open) roomScheduleDialog.showModal();

  let bookingsPerDay;
  try {
    bookingsPerDay = await Promise.all(dates.map((d) => api(`/booking?date=${localDate(d)}`)));
  } catch {
    weeklyScheduleBody.innerHTML = '<tr><td colspan="9">โหลดตารางไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่</td></tr>';
    return;
  }

  weeklyScheduleBody.replaceChildren();
  dates.forEach((date, dayIndex) => {
    const dateStr = localDate(date);
    const row = document.createElement("tr");
    const dayHeader = document.createElement("th");
    dayHeader.scope = "row";
    dayHeader.textContent = weekDays[dayIndex];
    row.append(dayHeader);
    timeSlots.forEach((slot) => {
      let status = "available";
      if (isSlotBooked(bookingsPerDay[dayIndex], roomId, slot)) status = "booked";
      else if (isSlotPast(dateStr, slot)) status = "past";
      row.append(slotCell(status));
    });
    weeklyScheduleBody.append(row);
  });
}

document.querySelector("#schedule-modal-x").addEventListener("click", () => roomScheduleDialog.close());
document.querySelector("#schedule-modal-close").addEventListener("click", () => roomScheduleDialog.close());
roomScheduleDialog.addEventListener("click", (event) => {
  if (event.target === roomScheduleDialog) roomScheduleDialog.close();
});

// ===== ฟอร์มจอง: POST /booking =====
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    showMessage("กรุณาเข้าสู่ระบบก่อนจองห้อง", false);
    return;
  }

  const payload = {
    room_id: Number(form.elements.room.value),
    people: Number(form.elements.people.value),
    booking_date: form.elements.date.value,
    start_time: form.elements.startTime.value,
    end_time: form.elements.endTime.value
  };

  submitButton.disabled = true;
  showMessage("กำลังส่งคำขอจอง...", true);

  try {
    const data = await api("/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    showMessage(
      `จองสำเร็จ! ${data.room_name} วันที่ ${data.booking_date} เวลา ${data.start_time} - ${data.end_time} น.`,
      true
    );
    form.reset();
    bookingDateInput.value = selectedDate;
    updateCapacityHint();
    loadAvailability(); // อัปเดตตารางให้เห็นการจองใหม่ทันที
  } catch (err) {
    if (err instanceof TypeError) {
      showMessage("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่", false);
    } else {
      const details = err.details ? ` (${err.details.join(", ")})` : "";
      showMessage(`${err.message}${details}`, false);
    }
  } finally {
    submitButton.disabled = false;
  }
});

// ===== เริ่มทำงาน =====
renderUser();
loadRooms().then(loadAvailability);
setInterval(loadAvailability, AUTO_REFRESH_MS);