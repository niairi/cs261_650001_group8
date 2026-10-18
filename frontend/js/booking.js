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
const submitButton = form.querySelector(".submit-button");
const navigationLinks = document.querySelectorAll(".main-nav .nav-link[href^='#']");
const roomScheduleDialog = document.querySelector("#room-schedule-dialog");
const roomScheduleLabel = document.querySelector("#schedule-room-label");
const roomScheduleRange = document.querySelector("#schedule-week-range");
const weeklyScheduleBody = document.querySelector("#weekly-schedule-body");
const weekDays = ["วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์"];
const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
const weeklyAvailability = {
  "1": [
    [true, false, false, true, true, true, true],
    [true, true, true, false, false, true, true],
    [false, false, true, true, true, true, false],
    [true, true, true, true, true, false, false],
    [true, true, false, false, true, true, true]
  ],
  "2": [
    [true, true, false, false, true, true, true],
    [false, true, true, true, false, false, true],
    [true, false, false, true, true, true, true],
    [true, true, true, false, true, false, true],
    [false, false, true, true, true, true, false]
  ],
  "3": [
    [true, false, true, true, false, true, true],
    [true, true, false, true, false, true, true],
    [false, true, true, true, true, false, false],
    [true, false, true, true, true, false, true],
    [true, true, false, true, true, true, false]
  ]
};

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

function updateScheduleWeekRange() {
  const weekStart = new Date();
  const currentDay = weekStart.getDay();
  const daysUntilMonday = currentDay === 0 ? 1 : currentDay === 6 ? 2 : 1 - currentDay;
  weekStart.setDate(weekStart.getDate() + daysUntilMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);
  roomScheduleRange.textContent = `ข้อมูลตัวอย่าง · ${thaiDate(weekStart)} - ${thaiDate(weekEnd)}`;
}

function renderWeeklySchedule(roomNumber) {
  roomScheduleLabel.textContent = `ห้องที่ ${roomNumber}`;
  weeklyScheduleBody.replaceChildren();

  weeklyAvailability[roomNumber].forEach((dayAvailability, dayIndex) => {
    const row = document.createElement("tr");
    const dayHeader = document.createElement("th");
    dayHeader.scope = "row";
    dayHeader.textContent = weekDays[dayIndex];
    row.append(dayHeader);

    dayAvailability.forEach((isAvailable, slotIndex) => {
      const cell = document.createElement("td");
      const status = document.createElement("span");
      status.className = `slot-status ${isAvailable ? "available" : "booked"}`;
      status.textContent = isAvailable ? "ว่าง" : "ถูกจอง";
      status.setAttribute("aria-label", `${timeSlots[slotIndex]} ${isAvailable ? "ว่าง" : "ถูกจองแล้ว"}`);
      cell.append(status);
      row.append(cell);
    });

    weeklyScheduleBody.append(row);
  });

  updateScheduleWeekRange();
}

document.querySelector("#schedule-modal-x").addEventListener("click", () => roomScheduleDialog.close());
document.querySelector("#schedule-modal-close").addEventListener("click", () => roomScheduleDialog.close());
roomScheduleDialog.addEventListener("click", (event) => {
  if (event.target === roomScheduleDialog) roomScheduleDialog.close();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && roomScheduleDialog.open) roomScheduleDialog.close();
});

roomCards.forEach((card) => {
  card.addEventListener("click", () => {
    roomCards.forEach((item) => {
      item.classList.remove("selected");
      item.setAttribute("aria-pressed", "false");
    });
    card.classList.add("selected");
    card.setAttribute("aria-pressed", "true");
    roomSelect.value = card.dataset.roomId || card.dataset.room;
    renderWeeklySchedule(card.dataset.room);
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
});
document.querySelector("#tomorrow-button").addEventListener("click", () => {
  document.querySelector("#tomorrow-button").classList.add("active");
  document.querySelector("#today-button").classList.remove("active");
  bookingDateInput.value = localDate(tomorrow);
});
document.querySelector("#refresh-button").addEventListener("click", () => {
  formMessage.textContent = "ยังไม่มีข้อมูลสถานะห้อง — เมื่อเชื่อมต่อ Backend แล้ว ปุ่มนี้จะดึงข้อมูลล่าสุด";
});

// ===== ส่งคำขอจองไปที่ Backend (POST /booking) =====
function showMessage(text, ok) {
  formMessage.textContent = text;
  formMessage.style.color = ok ? "#1a7f37" : "#c62828";
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
    const rooms = await res.json();

    const placeholder = new Option("กรุณาเลือกห้อง", "", true, true);
    placeholder.disabled = true;
    roomSelect.replaceChildren(placeholder);
    rooms.forEach((room) => {
      roomSelect.append(new Option(`${room.room_name} (จุได้ ${room.capacity} คน)`, room.room_id));
    });

    // การ์ดผังห้องใบที่ 1, 2, 3 จับคู่กับห้องตามลำดับที่ได้จาก Backend
    roomCards.forEach((card, index) => {
      if (rooms[index]) card.dataset.roomId = rooms[index].room_id;
    });
  } catch (error) {
    console.error(error);
    showMessage("โหลดรายการห้องไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่", false);
  }
}
loadRooms();

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
      `จองสำเร็จ! ${data.room_name} วันที่ ${data.booking_date} เวลา ${data.start_time} - ${data.end_time} น.`,
      true
    );
    form.reset();
    bookingDateInput.value = localDate(today);
  } catch {
    showMessage("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่", false);
  } finally {
    submitButton.disabled = false;
  }
});
