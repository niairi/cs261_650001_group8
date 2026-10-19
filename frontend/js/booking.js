// ===== ตั้งค่าการเชื่อมต่อ Backend =====
const API_URL = "http://localhost:3000";
const TOKEN_KEY = "token"; // ต้องตรงกับชื่อที่ login.js ใช้เก็บ token ใน localStorage
const USER_KEY = "user";   // ข้อมูลผู้ใช้จาก login (name, student_id)

// ===== ต้อง login ก่อนเข้าหน้านี้ =====
function goToLogin() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "./login.html";
}
if (!localStorage.getItem(TOKEN_KEY)) goToLogin();

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
}

const roomCards = document.querySelectorAll(".room-card");
const roomSelect = document.querySelector("#room-select");
const form = document.querySelector("#booking-form");
const formMessage = document.querySelector("#form-message");
const bookingConfirmationDialog = document.querySelector("#booking-confirmation-dialog");
const submitButton = form.querySelector(".submit-button");
const navigationLinks = document.querySelectorAll(".main-nav .nav-link[href^='#']");
const roomScheduleDialog = document.querySelector("#room-schedule-dialog");
const roomScheduleLabel = document.querySelector("#schedule-room-label");
const roomScheduleRange = document.querySelector("#schedule-week-range");
const weeklyScheduleBody = document.querySelector("#weekly-schedule-body");
const weekDays = ["วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์"];
const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
const AUTO_REFRESH_MS = 30000; // ตาราง Real-time รีเฟรชเองทุก 30 วินาที
let rooms = [];               // รายการห้องจาก GET /rooms
let selectedDayOffset = 0;    // 0 = วันนี้, 1 = พรุ่งนี้

function updateNavigationState() {
  const currentHash = window.location.hash;
  const hasMatchingLink = [...navigationLinks].some((navigationLink) => navigationLink.hash === currentHash);
  const activeHash = hasMatchingLink ? currentHash : "#rooms";

  navigationLinks.forEach((navigationLink) => {
    const isActive = navigationLink.hash === activeHash;
    navigationLink.classList.toggle("active", isActive);

    if (isActive) {
      navigationLink.setAttribute("aria-current", "page");
    } else {
      navigationLink.removeAttribute("aria-current");
    }
  });
}

window.addEventListener("hashchange", updateNavigationState);
updateNavigationState();

// วันจันทร์ของสัปดาห์นี้ (ถ้าเป็นเสาร์-อาทิตย์ใช้สัปดาห์ถัดไป)
function mondayOfThisWeek() {
  const weekStart = new Date();
  const currentDay = weekStart.getDay();
  const daysUntilMonday = currentDay === 0 ? 1 : currentDay === 6 ? 2 : 1 - currentDay;
  weekStart.setDate(weekStart.getDate() + daysUntilMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

// ===== ช่องเวลา: ว่าง / ถูกจอง / หมดเวลา =====
function isSlotBooked(bookings, roomId, slot) {
  return bookings.some((b) => b.room_id === roomId && b.start_time <= slot && b.end_time > slot);
}

function isSlotPast(dateStr, slot) {
  const now = new Date();
  const todayStr = localDate(now);
  return dateStr < todayStr || (dateStr === todayStr && slot <= now.toTimeString().slice(0, 5));
}

function createSlotCell(state, slot) {
  const label = { available: "ว่าง", booked: "ถูกจอง", past: "หมดเวลา" }[state];
  const cell = document.createElement("td");
  const status = document.createElement("span");
  status.className = `slot-status ${state === "past" ? "booked" : state}`;
  if (state === "past") status.style.opacity = "0.45";
  status.textContent = label;
  status.setAttribute("aria-label", `${slot} ${label}`);
  cell.append(status);
  return cell;
}

function slotState(bookings, roomId, dateStr, slot) {
  if (isSlotBooked(bookings, roomId, slot)) return "booked";
  if (isSlotPast(dateStr, slot)) return "past";
  return "available";
}

// GET /booking?date= คืนช่วงเวลาที่ถูกจอง (BOOKED / CONFIRMED) ของทุกห้องในวันนั้น
async function fetchBookings(dateStr) {
  const res = await fetch(`${API_URL}/booking?date=${dateStr}`);
  if (!res.ok) throw new Error(`GET /booking ${res.status}`);
  return res.json();
}

// ===== ตารางรายสัปดาห์ (pop-up) จากข้อมูลจริง =====
async function renderWeeklySchedule(cardIndex) {
  const room = rooms[cardIndex];
  roomScheduleLabel.textContent = room ? room.room_name : `ห้องที่ ${cardIndex + 1}`;
  weeklyScheduleBody.replaceChildren();
  if (!room) {
    roomScheduleRange.textContent = "โหลดข้อมูลห้องไม่ได้";
    return;
  }

  const monday = mondayOfThisWeek();
  const days = weekDays.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  roomScheduleRange.textContent = "กำลังโหลด...";

  try {
    const perDay = await Promise.all(days.map((d) => fetchBookings(localDate(d))));
    days.forEach((day, dayIndex) => {
      const row = document.createElement("tr");
      const dayHeader = document.createElement("th");
      dayHeader.scope = "row";
      dayHeader.textContent = weekDays[dayIndex];
      row.append(dayHeader);
      timeSlots.forEach((slot) => {
        row.append(createSlotCell(slotState(perDay[dayIndex], room.room_id, localDate(day), slot), slot));
      });
      weeklyScheduleBody.append(row);
    });
    roomScheduleRange.textContent = `${thaiDate(days[0])} - ${thaiDate(days[4])}`;
  } catch (error) {
    console.error(error);
    roomScheduleRange.textContent = "โหลดข้อมูลรายสัปดาห์ไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่";
  }
}

document.querySelector("#schedule-modal-x").addEventListener("click", () => roomScheduleDialog.close());
document.querySelector("#schedule-modal-close").addEventListener("click", () => roomScheduleDialog.close());
roomScheduleDialog.addEventListener("click", (event) => {
  if (event.target === roomScheduleDialog) roomScheduleDialog.close();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && roomScheduleDialog.open) roomScheduleDialog.close();
});

roomCards.forEach((card, cardIndex) => {
  card.addEventListener("click", () => {
    roomCards.forEach((item) => {
      item.classList.remove("selected");
      item.setAttribute("aria-pressed", "false");
    });
    card.classList.add("selected");
    card.setAttribute("aria-pressed", "true");
    roomSelect.value = card.dataset.roomId || card.dataset.room;
    renderWeeklySchedule(cardIndex);
    roomScheduleDialog.showModal();
  });
});

function thaiDate(date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "short", year: "numeric"
  }).format(date);
}

// วันที่ตามเวลาเครื่อง (YYYY-MM-DD) — toISOString() ใช้เวลา UTC ทำให้ช่วงเช้าในไทยได้วันที่ของเมื่อวาน
function localDate(date) {
  return date.toLocaleDateString("sv-SE");
}

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const bookingDateInput = document.querySelector("#booking-date");
document.querySelector("#today-label").textContent = thaiDate(today);
document.querySelector("#tomorrow-label").textContent = thaiDate(tomorrow);
bookingDateInput.value = localDate(today);
bookingDateInput.min = localDate(today); // ห้ามเลือกวันย้อนหลัง

document.querySelector("#today-button").addEventListener("click", () => {
  document.querySelector("#today-button").classList.add("active");
  document.querySelector("#tomorrow-button").classList.remove("active");
  bookingDateInput.value = localDate(today);
  selectedDayOffset = 0;
  loadAvailability();
});
document.querySelector("#tomorrow-button").addEventListener("click", () => {
  document.querySelector("#tomorrow-button").classList.add("active");
  document.querySelector("#today-button").classList.remove("active");
  bookingDateInput.value = localDate(tomorrow);
  selectedDayOffset = 1;
  loadAvailability();
});
document.querySelector("#refresh-button").addEventListener("click", () => loadAvailability());

<<<<<<< HEAD
=======
// ===== ส่งคำขอจองไปที่ Backend (POST /booking) =====
function showMessage(text, ok) {
  formMessage.textContent = text;
  formMessage.style.color = ok ? "#1a7f37" : "#c62828";
}

// ===== pop-up ยืนยันการจอง (หน้าตาจากงานของทีม frontend) =====
>>>>>>> b9d3b2ff3aae3b742a08bb2ce0b8ea87cd4a6ae9
function formatConfirmationDate(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

// booking = ข้อมูลที่ Backend ตอบกลับหลังจองสำเร็จ, extra = ข้อมูลจากฟอร์มที่ Backend ไม่ได้ส่งกลับ
function showBookingConfirmation(booking, extra) {
  if (!bookingConfirmationDialog) return;
  const room = rooms.find((r) => r.room_id === booking.room_id);
  const capacity = room ? room.capacity : 8;
  document.querySelector("#confirmation-room").textContent = `${booking.room_name} (จุ ${capacity} ที่นั่ง)`;
  document.querySelector("#confirmation-date").textContent = formatConfirmationDate(booking.booking_date);
  document.querySelector("#confirmation-time").textContent = `${booking.start_time} - ${booking.end_time} น.`;
  document.querySelector("#confirmation-people").textContent = `${extra.people} คน`;
  document.querySelector("#confirmation-purpose").textContent = extra.purpose || "ไม่ได้ระบุ";
  document.querySelector("#confirmation-booker").textContent = document.querySelector("#booking-user").textContent.trim();
  bookingConfirmationDialog.showModal();
  bookingConfirmationDialog.focus({ preventScroll: true });
}

<<<<<<< HEAD
document.querySelector("#confirmation-home-button").addEventListener("click", () => {
  bookingConfirmationDialog.close();
  document.querySelector("#top").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#confirmation-history-button").addEventListener("click", () => {
  window.location.href = "./booking-his.html";
});

bookingConfirmationDialog.addEventListener("click", (event) => {
  if (event.target === bookingConfirmationDialog) bookingConfirmationDialog.close();
});

// ===== ส่งคำขอจองไปที่ Backend (POST /booking) =====
function showMessage(text, ok) {
  formMessage.textContent = text;
  formMessage.style.color = ok ? "#1a7f37" : "#c62828";
=======
if (bookingConfirmationDialog) {
  document.querySelector("#confirmation-home-button")?.addEventListener("click", () => {
    bookingConfirmationDialog.close();
    document.querySelector("#top").scrollIntoView({ behavior: "smooth" });
  });
  document.querySelector("#confirmation-history-button")?.addEventListener("click", () => {
    window.location.href = "./booking-his.html";
  });
  bookingConfirmationDialog.addEventListener("click", (event) => {
    if (event.target === bookingConfirmationDialog) bookingConfirmationDialog.close();
  });
>>>>>>> b9d3b2ff3aae3b742a08bb2ce0b8ea87cd4a6ae9
}

// ===== แสดงชื่อผู้ใช้จากผล login =====
function renderUser() {
  const user = getUser();
  if (!user) return;
  const name = user.name || user.student_id;
  const label = `${name} (${user.student_id})`;
  document.querySelector(".profile-details strong").textContent = name;
  document.querySelector(".profile-details small").textContent = user.student_id;
  document.querySelector(".profile-avatar").textContent = name.trim().charAt(0) || "U";
  document.querySelector(".user-profile").setAttribute("aria-label", `ผู้ใช้ ${name} รหัสนักศึกษา ${user.student_id}`);
  document.querySelector("#user-name").textContent = label;
  document.querySelector("#booking-user").textContent = label;
}
renderUser();

// ===== ดึงรายการห้องจาก Backend (GET /rooms) ใส่ใน dropdown =====
// รหัสห้องจะตรงกับฐานข้อมูลเสมอ ไม่ต้องเขียนตายตัวใน HTML
async function loadRooms() {
  try {
    const res = await fetch(`${API_URL}/rooms`);
    if (!res.ok) throw new Error(`GET /rooms ${res.status}`);
    rooms = await res.json();

    const placeholder = new Option("กรุณาเลือกห้อง", "", true, true);
    placeholder.disabled = true;
    roomSelect.replaceChildren(placeholder);
    rooms.forEach((room) => {
      roomSelect.append(new Option(`${room.room_name} (จุได้ ${room.capacity} คน)`, room.room_id));
    });

    // การ์ดผังห้องใบที่ 1, 2, 3 จับคู่กับห้องตามลำดับที่ได้จาก Backend
    roomCards.forEach((card, index) => {
      const room = rooms[index];
      if (!room) return;
      card.dataset.roomId = room.room_id;
      const title = card.querySelector("h3");
      const capacity = card.querySelector(".capacity span");
      if (title) title.textContent = room.room_name;
      if (capacity) capacity.textContent = `${room.capacity} ที่นั่ง`;
    });
  } catch (error) {
    console.error(error);
    showMessage("โหลดรายการห้องไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่", false);
  }
}
// ===== ตารางสถานะห้องว่างแบบ Real-time =====
const scheduleBody = document.querySelector("#schedule-body");
const availabilityLegend = document.querySelector("#availability .legend");
const availabilityFootnote = document.querySelector("#availability .table-footnote");

async function loadAvailability() {
  if (!rooms.length) return; // รอให้ loadRooms() โหลดห้องเสร็จก่อน
  const day = selectedDayOffset === 0 ? today : tomorrow;
  const dateStr = localDate(day);

  try {
    const bookings = await fetchBookings(dateStr);
    scheduleBody.replaceChildren();
    rooms.forEach((room) => {
      const row = document.createElement("tr");
      row.dataset.roomRow = room.room_id;
      const header = document.createElement("th");
      header.innerHTML = `${room.room_name} <small>จุ ${room.capacity} ที่นั่ง</small>`;
      row.append(header);
      timeSlots.forEach((slot) => row.append(createSlotCell(slotState(bookings, room.room_id, dateStr, slot), slot)));
      scheduleBody.append(row);
    });
    availabilityLegend.innerHTML =
      '<span><i class="legend-dot available"></i> ช่องสีเขียว = ว่าง</span> ' +
      '<span style="margin-left:16px"><i class="legend-dot booked"></i> ช่องสีแดง = มีผู้จองแล้ว</span>';
    availabilityFootnote.textContent =
      `อัปเดตล่าสุด ${new Date().toTimeString().slice(0, 5)} น. · รีเฟรชอัตโนมัติทุก ${AUTO_REFRESH_MS / 1000} วินาที`;
  } catch (error) {
    console.error(error);
    availabilityFootnote.textContent = "โหลดสถานะห้องไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่";
  }
}

loadRooms().then(loadAvailability);
setInterval(loadAvailability, AUTO_REFRESH_MS);

// ฐานข้อมูลไม่มีคอลัมน์ จำนวนคน / วัตถุประสงค์ จึงเก็บไว้ในเครื่องเพื่อให้หน้าประวัติการจองแสดงได้
const EXTRAS_KEY = "tuCsSpaceBookingExtras";
function saveBookingExtra(bookingId, extra) {
  try {
    const all = JSON.parse(localStorage.getItem(EXTRAS_KEY)) || {};
    all[bookingId] = extra;
    localStorage.setItem(EXTRAS_KEY, JSON.stringify(all));
  } catch (error) {
    console.error("บันทึกข้อมูลเพิ่มเติมของการจองไม่สำเร็จ:", error);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    showMessage("กรุณาเข้าสู่ระบบก่อนจองห้อง", false);
    return;
  }

  if (form.elements.endTime.value <= form.elements.startTime.value) {
    showMessage("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น", false);
    form.elements.endTime.focus();
    return;
  }

  const purpose = form.elements.purpose ? form.elements.purpose.value.trim() : "";
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
    const res = await fetch(`${API_URL}/booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      // token หมดอายุหรือไม่ถูกต้อง ให้ login ใหม่
      showMessage("กรุณาเข้าสู่ระบบใหม่อีกครั้ง", false);
      setTimeout(goToLogin, 1500);
      return;
    }

    if (!res.ok) {
      const details = data.details ? ` (${data.details.join(", ")})` : "";
      showMessage(`${data.error || "จองไม่สำเร็จ"}${details}`, false);
      return;
    }

    showMessage(
      `จองสำเร็จ! ${data.room_name} วันที่ ${data.booking_date} เวลา ${data.start_time} - ${data.end_time} น. ` +
        "ระบบได้ส่งรายละเอียดการจองไปยังอีเมลมหาวิทยาลัยของคุณแล้ว",
      true
    );
<<<<<<< HEAD
    showBookingConfirmation();
=======
    saveBookingExtra(data.booking_id, { people: payload.people, purpose });
    showBookingConfirmation(data, { people: payload.people, purpose });
>>>>>>> b9d3b2ff3aae3b742a08bb2ce0b8ea87cd4a6ae9
    form.reset();
    bookingDateInput.value = localDate(today);
    loadAvailability();
  } catch {
    showMessage("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่", false);
  } finally {
    submitButton.disabled = false;
  }
});
