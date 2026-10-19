// ===== ตารางสถานะห้องว่างแบบ Real-time (US2) =====
// ไฟล์แยกจาก booking.js — ดึงข้อมูลจริงจาก Backend มาแสดงใน
//   1) ตาราง Real-time (วันนี้ / พรุ่งนี้) + ปุ่มรีเฟรช + รีเฟรชอัตโนมัติ
//   2) ชื่อห้อง/ความจุบนการ์ดผังห้อง
//   3) ตารางรายสัปดาห์ (pop-up) ของห้องที่คลิก
// API ที่ใช้: GET /rooms และ GET /booking?date=YYYY-MM-DD (ไม่ต้อง login)
// ห่อด้วยฟังก์ชันเพื่อไม่ให้ชื่อตัวแปรชนกับ booking.js

(() => {
  const BASE_URL = typeof API_URL !== "undefined" ? API_URL : "http://localhost:3000";
  const SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
  const AUTO_REFRESH_MS = 30000; // รีเฟรชเองทุก 30 วินาที
  const WEEK_DAYS = ["วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์"];

  const scheduleBody = document.querySelector("#schedule-body");
  const todayButton = document.querySelector("#today-button");
  const tomorrowButton = document.querySelector("#tomorrow-button");
  const refreshButton = document.querySelector("#refresh-button");
  const legend = document.querySelector("#availability .legend");
  const footnote = document.querySelector("#availability .table-footnote");
  const formMessage = document.querySelector("#form-message");
  const roomCards = document.querySelectorAll(".room-card");
  const weeklyBody = document.querySelector("#weekly-schedule-body");
  const weekRange = document.querySelector("#schedule-week-range");

  if (!scheduleBody) return;

  let rooms = [];
  let selectedOffset = 0; // 0 = วันนี้, 1 = พรุ่งนี้

  // ---------- ตัวช่วย ----------
  const localDate = (date) => date.toLocaleDateString("sv-SE"); // YYYY-MM-DD ตามเวลาเครื่อง
  const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
  const thaiShortDate = (date) =>
    new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(date);
  const nowHHMM = () => new Date().toTimeString().slice(0, 5);

  // ช่วงเวลา slot ถูกจองถ้ามีการจองที่ start <= slot < end
  const isBooked = (bookings, roomId, slot) =>
    bookings.some((b) => b.room_id === roomId && b.start_time <= slot && b.end_time > slot);

  function statusCell(state, slot) {
    const cell = document.createElement("td");
    const span = document.createElement("span");
    const label = { available: "ว่าง", booked: "ถูกจอง", past: "หมดเวลา" }[state];
    span.className = `slot-status ${state === "past" ? "booked" : state}`;
    if (state === "past") span.style.opacity = "0.45";
    span.textContent = label;
    span.setAttribute("aria-label", `${slot} ${label}`);
    cell.append(span);
    return cell;
  }

  async function getJSON(path) {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) throw new Error(`${path} ตอบ ${res.status}`);
    return res.json();
  }

  // ---------- ข้อมูลห้อง: ชื่อบนการ์ด + หัวแถวตาราง ----------
  async function loadRooms() {
    rooms = await getJSON("/rooms");
    roomCards.forEach((card, i) => {
      const room = rooms[i];
      if (!room) return;
      const title = card.querySelector("h3");
      const capacity = card.querySelector(".capacity span");
      if (title) title.textContent = room.room_name;
      if (capacity) capacity.textContent = `${room.capacity} ที่นั่ง`;
    });
  }

  // ---------- ตาราง Real-time ----------
  async function loadAvailability() {
    const day = addDays(new Date(), selectedOffset);
    const date = localDate(day);
    const isToday = selectedOffset === 0;

    try {
      if (!rooms.length) await loadRooms();
      const bookings = await getJSON(`/booking?date=${date}`);

      scheduleBody.replaceChildren();
      rooms.forEach((room) => {
        const row = document.createElement("tr");
        row.dataset.roomRow = room.room_id;
        const header = document.createElement("th");
        header.innerHTML = `${room.room_name} <small>จุ ${room.capacity} ที่นั่ง</small>`;
        row.append(header);

        SLOTS.forEach((slot) => {
          let state = isBooked(bookings, room.room_id, slot) ? "booked" : "available";
          if (state === "available" && isToday && slot <= nowHHMM()) state = "past";
          row.append(statusCell(state, slot));
        });
        scheduleBody.append(row);
      });

      if (legend) {
        legend.innerHTML =
          '<span><i class="legend-dot available"></i> ช่องสีเขียว = ว่าง</span> ' +
          '<span style="margin-left:16px"><i class="legend-dot booked"></i> ช่องสีแดง = มีผู้จองแล้ว</span>';
      }
      if (footnote) {
        footnote.textContent = `อัปเดตล่าสุด ${nowHHMM()} น. · รีเฟรชอัตโนมัติทุก ${AUTO_REFRESH_MS / 1000} วินาที`;
      }
    } catch (error) {
      console.error(error);
      if (footnote) footnote.textContent = "โหลดสถานะห้องไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่";
    }
  }

  // ---------- ตารางรายสัปดาห์ (pop-up) ----------
  function mondayOfThisWeek() {
    const d = new Date();
    const day = d.getDay(); // 0 = อาทิตย์
    const offset = day === 0 ? 1 : day === 6 ? 2 : 1 - day; // เสาร์-อาทิตย์ = สัปดาห์ถัดไป
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async function loadWeekly(room) {
    if (!weeklyBody || !room) return;
    const monday = mondayOfThisWeek();
    const days = WEEK_DAYS.map((_, i) => addDays(monday, i));
    try {
      const perDay = await Promise.all(days.map((d) => getJSON(`/booking?date=${localDate(d)}`)));
      weeklyBody.replaceChildren();
      days.forEach((d, i) => {
        const row = document.createElement("tr");
        const header = document.createElement("th");
        header.scope = "row";
        header.textContent = WEEK_DAYS[i];
        row.append(header);
        const isToday = localDate(d) === localDate(new Date());
        const isPastDay = localDate(d) < localDate(new Date());
        SLOTS.forEach((slot) => {
          let state = isBooked(perDay[i], room.room_id, slot) ? "booked" : "available";
          if (state === "available" && (isPastDay || (isToday && slot <= nowHHMM()))) state = "past";
          row.append(statusCell(state, slot));
        });
        weeklyBody.append(row);
      });
      if (weekRange) weekRange.textContent = `${thaiShortDate(days[0])} - ${thaiShortDate(days[4])}`;
    } catch (error) {
      console.error(error);
      if (weekRange) weekRange.textContent = "โหลดข้อมูลรายสัปดาห์ไม่ได้";
    }
  }

  // ---------- ปุ่มต่างๆ ----------
  todayButton?.addEventListener("click", () => { selectedOffset = 0; loadAvailability(); });
  tomorrowButton?.addEventListener("click", () => { selectedOffset = 1; loadAvailability(); });
  refreshButton?.addEventListener("click", () => {
    // booking.js เดิมเขียนข้อความ "ยังไม่มีข้อมูลสถานะห้อง..." ไว้ ลบออกเพราะตอนนี้มีข้อมูลจริงแล้ว
    if (formMessage && formMessage.textContent.startsWith("ยังไม่มีข้อมูลสถานะห้อง")) formMessage.textContent = "";
    loadAvailability();
  });
  roomCards.forEach((card, i) => card.addEventListener("click", () => loadWeekly(rooms[i])));

  // จองสำเร็จแล้วอัปเดตตารางทันที (booking.js เขียนคำว่า "จองสำเร็จ" ลงใน #form-message)
  if (formMessage) {
    new MutationObserver(() => {
      if (formMessage.textContent.includes("จองสำเร็จ")) loadAvailability();
    }).observe(formMessage, { childList: true, characterData: true, subtree: true });
  }

  loadAvailability();
  setInterval(loadAvailability, AUTO_REFRESH_MS);
})();
