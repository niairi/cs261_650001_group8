// Frontend placeholder: room and availability data will be supplied by the backend later.
const roomCards = document.querySelectorAll(".room-card");
const roomSelect = document.querySelector("#room-select");
const form = document.querySelector("#booking-form");
const formMessage = document.querySelector("#form-message");
const bookingConfirmationDialog = document.querySelector("#booking-confirmation-dialog");
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
    roomSelect.value = card.dataset.room;
    renderWeeklySchedule(card.dataset.room);
    roomScheduleDialog.showModal();
  });
});

// Dates are placeholders for display only; backend integration can replace this logic.
function thaiDate(date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "short", year: "numeric"
  }).format(date);
}
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
document.querySelector("#today-label").textContent = thaiDate(today);
document.querySelector("#tomorrow-label").textContent = thaiDate(tomorrow);
document.querySelector("#booking-date").value = today.toISOString().slice(0, 10);

document.querySelector("#today-button").addEventListener("click", () => {
  document.querySelector("#today-button").classList.add("active");
  document.querySelector("#tomorrow-button").classList.remove("active");
  document.querySelector("#booking-date").value = today.toISOString().slice(0, 10);
});
document.querySelector("#tomorrow-button").addEventListener("click", () => {
  document.querySelector("#tomorrow-button").classList.add("active");
  document.querySelector("#today-button").classList.remove("active");
  document.querySelector("#booking-date").value = tomorrow.toISOString().slice(0, 10);
});
document.querySelector("#refresh-button").addEventListener("click", () => {
  formMessage.textContent = "ยังไม่มีข้อมูลสถานะห้อง — เมื่อเชื่อมต่อ Backend แล้ว ปุ่มนี้จะดึงข้อมูลล่าสุด";
});

function formatConfirmationDate(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function showBookingConfirmation() {
  const selectedRoom = roomSelect.options[roomSelect.selectedIndex].textContent;
  const purpose = document.querySelector("#purpose").value.trim();
  const booker = document.querySelector("#booking-user").textContent.trim();

  document.querySelector("#confirmation-room").textContent = `${selectedRoom} (จุ 8 ที่นั่ง)`;
  document.querySelector("#confirmation-date").textContent = formatConfirmationDate(
    document.querySelector("#booking-date").value
  );
  document.querySelector("#confirmation-time").textContent =
    `${document.querySelector("#start-time").value} - ${document.querySelector("#end-time").value} น.`;
  document.querySelector("#confirmation-people").textContent =
    `${document.querySelector("#people").value} คน`;
  document.querySelector("#confirmation-purpose").textContent = purpose || "ไม่ได้ระบุ";
  document.querySelector("#confirmation-booker").textContent = booker;
  bookingConfirmationDialog.showModal();
  bookingConfirmationDialog.focus({ preventScroll: true });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const startTime = document.querySelector("#start-time").value;
  const endTime = document.querySelector("#end-time").value;
  if (endTime <= startTime) {
    formMessage.textContent = "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น";
    document.querySelector("#end-time").focus();
    return;
  }

  formMessage.textContent = "ระบบได้ส่งข้อมูลและรายละเอียดการจองห้องไปยัง Email ของคุณเรียบร้อยแล้ว โปรดตรวจสอบที่กล่องข้อความหรืออีเมลมหาวิทยาลัย เลย";
  showBookingConfirmation();
});

document.querySelector("#confirmation-home-button").addEventListener("click", () => {
  bookingConfirmationDialog.close();
  document.querySelector("#top").scrollIntoView({ behavior: "smooth" });
});

bookingConfirmationDialog.addEventListener("click", (event) => {
  if (event.target === bookingConfirmationDialog) bookingConfirmationDialog.close();
});