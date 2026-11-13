// ===== หน้าประวัติการจอง + ยกเลิกการจอง (US4) เชื่อมกับ Backend =====
// API ที่ใช้ (ต้อง login):
//   GET   /booking/me            การจองทั้งหมดของผู้ใช้ที่ login อยู่
//   POST  /booking/:id/checkin   ยืนยันการเข้าใช้งานด้วยพิกัด GPS
//   GET   /users/me/status       จำนวน No-show และสถานะ Blacklist
//   PATCH /booking/:id/cancel    ยกเลิกการจอง
//   PATCH /booking/:id           แก้ไขห้อง/วัน/เวลาของการจอง

document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://localhost:3000";
  const TOKEN_KEY = "token";   // ต้องตรงกับ login.js
  const USER_KEY = "user";
  const AUTO_REFRESH_MS = 60000;

  // ---------- ต้อง login ก่อน ----------
  function goToLogin() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "./login.html";
  }
  const getToken = () => localStorage.getItem(TOKEN_KEY);
  if (!getToken()) {
    goToLogin();
    return;
  }

  const historyFilters = document.querySelectorAll(".history-filter");
  const totalCount = document.querySelector("#total-count");
  const historyTotal = document.querySelector("#history-total");
  const historyList = document.querySelector("#history-list");
  const historyEmpty = document.querySelector("#history-empty");
  const historyEmptyTitle = document.querySelector("#history-empty-title");
  const historyEmptyMessage = document.querySelector("#history-empty p");
  const dataNote = document.querySelector(".history-data-note");
  const blacklistState = document.querySelector("#blacklist-state");
  const blacklistMessage = document.querySelector("#blacklist-message");
  const noShowCount = document.querySelector("#no-show-count");
  const noShowDots = document.querySelector("#no-show-dots");

  const statusLabels = {
    upcoming: "รอเข้าใช้งาน",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิกแล้ว",
    expired: "หมดอายุ (Expired)"
  };

  let bookings = [];
  let currentFilter = "all";
  let accountStatus = null;

  // ---------- เรียก Backend ----------
  // คืนค่า { res, data } และพาไปหน้า login ถ้า token หมดอายุ
  async function api(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      setNote("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      setTimeout(goToLogin, 1500);
      throw new Error("unauthorized");
    }
    return { res, data };
  }

  // แปลงข้อมูลจาก Backend ให้อยู่ในรูปที่หน้านี้ใช้แสดงผล
  function fromApi(row) {
    return {
      id: row.booking_id,
      roomId: row.room_id,
      room: row.room_name,
      date: row.booking_date,
      startTime: row.start_time,
      endTime: row.end_time,
      apiStatus: row.status, // BOOKED | CONFIRMED | CANCELLED | EXPIRED
      people: row.people,
      purpose: row.purpose
    };
  }

  function setNote(text) {
    if (!dataNote) return;
    dataNote.textContent = text;
    dataNote.hidden = !text;
  }

  async function loadBookings() {
    try {
      const { res, data } = await api("/booking/me");
      if (!res.ok) throw new Error(data.error || `GET /booking/me ${res.status}`);
      bookings = data.map(fromApi);
      setNote("");
    } catch (error) {
      if (error.message === "unauthorized") return;
      console.error(error);
      setNote("โหลดประวัติการจองไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่");
    }
    updateCounts();
    renderHistory();
  }

  async function loadAccountStatus() {
    try {
      const { res, data } = await api("/users/me/status");
      if (!res.ok) throw new Error(data.error || `GET /users/me/status ${res.status}`);
      accountStatus = data;
      renderAccountStatus();
    } catch (error) {
      if (error.message === "unauthorized") return;
      console.error(error);
      if (blacklistState) blacklistState.textContent = "โหลดสถานะไม่ได้";
      if (blacklistMessage) blacklistMessage.textContent = "ไม่สามารถโหลดจำนวน No-show และสถานะ Blacklist ได้ กรุณาลองใหม่";
    }
  }

  function renderAccountStatus() {
    if (!accountStatus) return;
    const count = Math.max(0, Number(accountStatus.no_show_count) || 0);
    const limit = Math.max(1, Number(accountStatus.no_show_limit) || 3);
    const banned = Boolean(accountStatus.banned);

    if (blacklistState) {
      blacklistState.textContent = banned ? "ถูกระงับ" : "ปกติ";
      blacklistState.classList.toggle("is-banned", banned);
    }
    if (blacklistMessage) {
      blacklistMessage.textContent = banned
        ? `คุณถูกระงับสิทธิ์การจอง${accountStatus.banned_until ? ` ถึงวันที่ ${formatThaiDate(accountStatus.banned_until)}` : ""}`
        : `หากไม่เข้าใช้งาน (No-show) ครบ ${limit} ครั้ง ระบบจะระงับสิทธิ์การจองชั่วคราว 30 วัน`;
    }
    if (noShowCount) noShowCount.textContent = `${count} / ${limit} ครั้ง`;
    if (noShowDots) {
      noShowDots.replaceChildren();
      for (let strike = 0; strike < limit; strike++) {
        const dot = document.createElement("span");
        if (strike < count) dot.classList.add("is-counted");
        noShowDots.append(dot);
      }
    }
  }

  async function refreshHistory() {
    await Promise.all([loadBookings(), loadAccountStatus()]);
  }

  // ---------- สถานะ ----------
  const localDate = (d) => d.toLocaleDateString("sv-SE"); // YYYY-MM-DD ตามเวลาเครื่อง

  // ถึงเวลาเริ่มแล้วหรือยัง (Backend ไม่ให้ยกเลิกหลังถึงเวลาเริ่ม)
  // ยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย 30 นาที (US4 TC4) ต้องตรงกับ backend
  const CANCEL_BEFORE_MIN = 30;
  function canCancel(booking) {
    const startAt = new Date(`${booking.date}T${booking.startTime}:00`);
    return startAt.getTime() - Date.now() >= CANCEL_BEFORE_MIN * 60 * 1000;
  }

  function canEdit(booking) {
    return booking.apiStatus === "BOOKED" && canCancel(booking);
  }

  function minutesUntilStart(booking) {
    const startAt = new Date(`${booking.date}T${booking.startTime}:00`);
    return (startAt.getTime() - Date.now()) / 60000;
  }

  function canCheckin(booking) {
    const minutes = minutesUntilStart(booking);
    return booking.apiStatus === "BOOKED" && minutes <= 10 && minutes >= -15;
  }

  function getStatus(booking) {
    if (booking.apiStatus === "CANCELLED") return "cancelled";
    if (booking.apiStatus === "EXPIRED") return "expired";
    if (booking.apiStatus === "CONFIRMED") {
      const endAt = new Date(`${booking.date}T${booking.endTime}:00`);
      return endAt.getTime() <= Date.now() ? "completed" : "upcoming";
    }
    return "upcoming";
  }

  // ---------- ตัวช่วยแสดงผล ----------
  function formatThaiDate(dateString) {
    if (!dateString) return "ไม่ระบุวันที่";
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  }

  function createText(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function renderUser() {
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      user = null;
    }
    if (!user) return;
    const name = user.name || user.student_id;
    document.querySelector(".profile-details strong").textContent = name;
    document.querySelector(".profile-details small").textContent = user.student_id;
    document.querySelector(".profile-avatar").textContent = name.trim().charAt(0) || "U";
    document.querySelector(".user-profile")
      .setAttribute("aria-label", `ผู้ใช้ ${name} รหัสนักศึกษา ${user.student_id}`);
  }

  function updateCounts() {
    const counts = { all: bookings.length, upcoming: 0, completed: 0, cancelled: 0, expired: 0 };
    bookings.forEach((booking) => {
      counts[getStatus(booking)]++;
    });

    if (totalCount) totalCount.textContent = counts.all;
    if (historyTotal) historyTotal.setAttribute("aria-label", `รายการจองทั้งหมด ${counts.all} รายการ`);

    document.querySelectorAll("[data-count]").forEach((element) => {
      const key = element.dataset.count;
      if (key in counts) element.textContent = counts[key];
    });
  }

  function createBookingCard(booking) {
    const status = getStatus(booking);

    const card = document.createElement("article");
    card.className = "history-card";
    if (status === "cancelled") card.classList.add("is-cancelled");

    const details = document.createElement("div");
    details.className = "history-card-details";

    const heading = document.createElement("div");
    heading.className = "history-card-heading";

    const room = createText("h3", "history-room", booking.room || "ไม่ระบุห้อง");

    const statusElement = document.createElement("span");
    statusElement.className = `history-status ${status}`;
    const statusDot = document.createElement("span");
    statusDot.className = "history-status-dot";
    statusDot.setAttribute("aria-hidden", "true");
    const visibleStatus = booking.apiStatus === "CONFIRMED" && status === "upcoming"
      ? "ยืนยันแล้ว"
      : statusLabels[status] || status;
    statusElement.append(statusDot, document.createTextNode(visibleStatus));

    heading.append(room, statusElement);

    const timing = document.createElement("div");
    timing.className = "history-timing";
    timing.append(
      createText("p", "history-date", `วันที่จอง: ${formatThaiDate(booking.date)}`),
      createText("p", "history-time", `เวลา: ${booking.startTime || "--:--"} - ${booking.endTime || "--:--"} น.`)
    );
    if (booking.people) {
      timing.append(createText("p", "history-people", `จำนวนผู้เข้าร่วม: ${booking.people} คน`));
    }
    if (booking.purpose) {
      timing.append(createText("p", "history-purpose", `วัตถุประสงค์: ${booking.purpose}`));
    }

    details.append(heading, timing);
    card.append(details);

    if (status === "upcoming" && booking.apiStatus === "BOOKED") {
      const actions = document.createElement("div");
      actions.className = "history-card-actions";

      if (canCheckin(booking)) {
        const checkinButton = document.createElement("button");
        checkinButton.type = "button";
        checkinButton.className = "history-checkin-button";
        checkinButton.textContent = "Check-in / ยืนยันการเข้าใช้งาน";
        checkinButton.addEventListener("click", () => checkinBooking(booking, checkinButton));
        actions.append(checkinButton);
      }

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "history-edit-button";
      editButton.textContent = "แก้ไขการจอง";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "history-cancel-button";
      cancelButton.textContent = "ยกเลิกการจอง";

      actions.append(editButton, cancelButton);
      if (canEdit(booking)) {
        editButton.addEventListener("click", () => showEditDialog(booking, editButton));
      } else {
        editButton.disabled = true;
        actions.append(createText("p", "history-edit-note", `แก้ไขได้ก่อนเวลาเริ่มอย่างน้อย ${CANCEL_BEFORE_MIN} นาที`));
      }

      if (canCancel(booking)) {
        cancelButton.addEventListener("click", () => showConfirmDialog(booking));
      } else {
        cancelButton.disabled = true;
        actions.append(createText("p", "history-cancel-note", `ยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย ${CANCEL_BEFORE_MIN} นาที`));
      }
      card.append(actions);
    }

    if (status === "completed") {
      const note = booking.apiStatus === "EXPIRED"
        ? "การจองนี้หมดอายุแล้ว"
        : "การจองนี้เสร็จสิ้นแล้ว";
      card.append(createText("p", "history-completed-note", note));
    }

    if (status === "cancelled") {
      card.append(createText("p", "history-cancelled-note", "รายการจองนี้ถูกยกเลิกแล้ว"));
    }

    if (status === "expired") {
      card.append(createText("p", "history-expired-note", "การจองนี้หมดอายุแล้ว เนื่องจากไม่ได้ Check-in ภายในเวลาที่กำหนด"));
    }

    return card;
  }

  // ---------- กล่องข้อความ (หน้าตาเดิมจากทีม frontend) ----------
  function showDialog({ title, message, confirmText, onConfirm, success = false }) {
    document.querySelector(".history-dialog-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.className = "history-dialog-overlay";

    const dialog = document.createElement("section");
    dialog.className = "history-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "history-dialog-title");

    const icon = document.createElement("div");
    icon.className = `history-dialog-icon${success ? " success" : ""}`;
    icon.textContent = success ? "✓" : "!";

    const heading = createText("h2", "history-dialog-title", title);
    heading.id = "history-dialog-title";

    const description = createText("p", "history-dialog-message", message);

    const actions = document.createElement("div");
    actions.className = "history-dialog-actions";

    function closeDialog() {
      document.removeEventListener("keydown", handleEscape);
      overlay.remove();
    }

    function handleEscape(event) {
      if (event.key === "Escape") closeDialog();
    }

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "history-dialog-button secondary";
    backButton.textContent = success ? "ตกลง" : "กลับ";
    backButton.addEventListener("click", closeDialog);
    actions.append(backButton);

    if (!success && typeof onConfirm === "function") {
      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className = "history-dialog-button danger";
      confirmButton.textContent = confirmText || "ยืนยันการยกเลิก";
      confirmButton.addEventListener("click", () => {
        confirmButton.disabled = true;
        backButton.disabled = true;
        confirmButton.textContent = "กำลังยกเลิก...";
        onConfirm(closeDialog);
      });
      actions.append(confirmButton);
    }

    dialog.append(icon, heading, description, actions);
    overlay.append(dialog);
    document.body.append(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeDialog();
    });
    document.addEventListener("keydown", handleEscape);
    backButton.focus();

    return { close: closeDialog };
  }

  function showResult(title, message) {
    showDialog({ title, message, success: true });
  }

  function showError(title, message) {
    showDialog({ title, message });
  }

  function getBrowserPosition() {
    if (!navigator.geolocation) {
      return Promise.reject(new Error("เบราว์เซอร์นี้ไม่รองรับการขอตำแหน่ง"));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
    });
  }

  function locationErrorMessage(error) {
    if (error instanceof Error && !("code" in error)) return error.message;
    if (error.code === 1) return "กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ เพื่อยืนยันการเข้าใช้งาน";
    if (error.code === 2) return "ไม่สามารถระบุตำแหน่งของคุณได้ กรุณาลองอีกครั้ง";
    if (error.code === 3) return "การค้นหาตำแหน่งใช้เวลานานเกินไป กรุณาลองอีกครั้ง";
    return "ไม่สามารถขอตำแหน่งจากเบราว์เซอร์ได้ กรุณาตรวจสอบการตั้งค่าตำแหน่ง";
  }

  async function checkinBooking(booking, button) {
    button.disabled = true;
    button.textContent = "กำลังขอตำแหน่ง...";

    try {
      const position = await getBrowserPosition();
      button.textContent = "กำลังยืนยัน...";
      const { res, data } = await api(`/booking/${booking.id}/checkin`, {
        method: "POST",
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      });

      if (!res.ok) {
        const details = Array.isArray(data.details) ? ` (${data.details.join(", ")})` : "";
        const outsideRadius = typeof data.error === "string" && data.error.includes("นอกระยะ");
        showError(
          outsideRadius ? "ไม่อนุญาตให้ Check-in" : "Check-in ไม่สำเร็จ",
          `${data.error || "ยืนยันการเข้าใช้งานไม่สำเร็จ"}${details}`
        );
        if (res.status === 409) await refreshHistory();
        return;
      }

      const distance = Number.isFinite(Number(data.distance_m))
        ? ` (ระยะประมาณ ${data.distance_m} เมตร)`
        : "";
      showResult("ยืนยันการเข้าใช้งานสำเร็จ", `${data.message || "Check-in สำเร็จ"}${distance}`);
      await refreshHistory();
    } catch (error) {
      if (error.message === "unauthorized") return;
      if (typeof error.code === "number") {
        showError("ไม่สามารถยืนยันตำแหน่งได้", locationErrorMessage(error));
      } else {
        console.error(error);
        showError("เกิดข้อผิดพลาด", error.message || "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = "Check-in / ยืนยันการเข้าใช้งาน";
      }
    }
  }

  let roomOptions;
  async function loadRoomOptions() {
    if (roomOptions) return roomOptions;
    const { res, data } = await api("/rooms");
    if (!res.ok) throw new Error(data.error || `GET /rooms ${res.status}`);
    roomOptions = data;
    return roomOptions;
  }

  function appendEditField(form, labelText, name, value, options) {
    const label = document.createElement("label");
    label.className = "history-edit-field";
    label.htmlFor = `history-edit-${name}`;
    label.append(createText("span", "", labelText));

    const input = options
      ? document.createElement("select")
      : document.createElement("input");
    input.id = `history-edit-${name}`;
    input.name = name;
    input.required = true;

    if (options) {
      options.forEach((option) => {
        input.append(new Option(option.label, option.value));
      });
    } else {
      input.type = name === "booking_date" ? "date" : "time";
      if (name === "booking_date") {
        input.min = localDate(new Date());
      } else {
        input.step = "3600";
      }
    }

    input.value = value;
    label.append(input);
    form.append(label);
    return input;
  }

  async function showEditDialog(booking, trigger) {
    if (!canEdit(booking)) {
      showResult("ไม่สามารถแก้ไขได้", `แก้ไขได้ก่อนเวลาเริ่มอย่างน้อย ${CANCEL_BEFORE_MIN} นาที`);
      return;
    }

    try {
      const rooms = await loadRoomOptions();
      if (!canEdit(booking)) {
        showResult("ไม่สามารถแก้ไขได้", `แก้ไขได้ก่อนเวลาเริ่มอย่างน้อย ${CANCEL_BEFORE_MIN} นาที`);
        return;
      }

      document.querySelector(".history-dialog-overlay")?.remove();
      const overlay = document.createElement("div");
      overlay.className = "history-dialog-overlay";

      const dialog = document.createElement("section");
      dialog.className = "history-dialog history-edit-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", "history-edit-title");
      dialog.setAttribute("tabindex", "-1");

      const heading = createText("h2", "history-dialog-title", "แก้ไขการจอง");
      heading.id = "history-edit-title";
      dialog.append(heading, createText("p", "history-dialog-message", "เลือกห้อง วัน และเวลาใหม่สำหรับการจอง"));

      const form = document.createElement("form");
      form.className = "history-edit-form";

      appendEditField(form, "ห้อง", "room_id", String(booking.roomId), rooms.map((room) => ({
        value: String(room.room_id),
        label: `${room.room_name} (จุได้ ${room.capacity} คน)`
      })));
      appendEditField(form, "วันที่", "booking_date", booking.date);
      appendEditField(form, "เวลาเริ่ม", "start_time", booking.startTime);
      appendEditField(form, "เวลาสิ้นสุด", "end_time", booking.endTime);

      const message = createText("p", "history-edit-message", "");
      message.setAttribute("role", "status");
      message.setAttribute("aria-live", "polite");
      message.hidden = true;

      const actions = document.createElement("div");
      actions.className = "history-dialog-actions";
      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "history-dialog-button secondary";
      cancelButton.textContent = "กลับ";

      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.className = "history-dialog-button primary";
      saveButton.textContent = "บันทึกการแก้ไข";
      actions.append(cancelButton, saveButton);

      function closeDialog() {
        document.removeEventListener("keydown", handleEscape);
        overlay.remove();
        trigger.focus();
      }

      function handleEscape(event) {
        if (event.key === "Escape") closeDialog();
      }

      cancelButton.addEventListener("click", closeDialog);
      form.append(message, actions);
      dialog.append(form);
      overlay.append(dialog);
      document.body.append(overlay);

      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeDialog();
      });
      document.addEventListener("keydown", handleEscape);
      dialog.focus();

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!canEdit(booking)) {
          message.textContent = `ไม่สามารถแก้ไขได้ เนื่องจากเหลือเวลาไม่ถึง ${CANCEL_BEFORE_MIN} นาทีก่อนเริ่ม`;
          message.hidden = false;
          saveButton.disabled = true;
          return;
        }

        const payload = {
          room_id: Number(form.elements.room_id.value),
          booking_date: form.elements.booking_date.value,
          start_time: form.elements.start_time.value,
          end_time: form.elements.end_time.value
        };
        saveButton.disabled = true;
        saveButton.textContent = "กำลังบันทึก...";
        message.hidden = true;

        try {
          const { res, data } = await api(`/booking/${booking.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const details = Array.isArray(data.details) ? ` (${data.details.join(", ")})` : "";
            message.textContent = `${data.error || "แก้ไขการจองไม่สำเร็จ"}${details}`;
            message.hidden = false;
            saveButton.disabled = false;
            saveButton.textContent = "บันทึกการแก้ไข";
            return;
          }

          closeDialog();
          showResult("แก้ไขการจองสำเร็จ", data.message || "บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว");
          await refreshHistory();
        } catch (error) {
          if (error.message === "unauthorized") {
            closeDialog();
            return;
          }
          console.error(error);
          message.textContent = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง";
          message.hidden = false;
          saveButton.disabled = false;
          saveButton.textContent = "บันทึกการแก้ไข";
        }
      });
    } catch (error) {
      if (error.message === "unauthorized") return;
      console.error(error);
      showResult("โหลดรายการห้องไม่ได้", "ไม่สามารถโหลดห้องได้ ตรวจว่า Backend รันอยู่หรือไม่");
    }
  }

  // ---------- ยกเลิกการจอง: PATCH /booking/:id/cancel ----------
  function showConfirmDialog(booking) {
    showDialog({
      title: "ยืนยันการยกเลิกการจอง",
      message:
        `คุณต้องการยกเลิกการจอง ${booking.room} วันที่ ${formatThaiDate(booking.date)} ` +
        `เวลา ${booking.startTime} - ${booking.endTime} น. ใช่หรือไม่?`,
      confirmText: "ยืนยันการยกเลิก",

      onConfirm: async (closeDialog) => {
        try {
          const { res, data } = await api(`/booking/${booking.id}/cancel`, { method: "PATCH" });
          closeDialog();

          if (res.ok) {
            showResult("ยกเลิกการจองสำเร็จ", data.message || "ยกเลิกการจองเรียบร้อยแล้ว");
          } else {
            // 400 ถึงเวลาเริ่มแล้ว / 403 ไม่ใช่การจองของตัวเอง / 404 ไม่พบ / 409 ยกเลิกหรือหมดอายุไปแล้ว
            showResult("ไม่สามารถยกเลิกได้", data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
          }
        } catch (error) {
          closeDialog();
          if (error.message === "unauthorized") return;
          console.error(error);
          showResult("เกิดข้อผิดพลาด", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่");
        }
        // โหลดข้อมูลล่าสุดจาก Backend ทุกครั้ง ให้สถานะตรงกับฐานข้อมูล
        refreshHistory();
      }
    });
  }

  function renderHistory() {
    if (!historyList || !historyEmpty) return;

    historyList.replaceChildren();

    const filteredBookings = bookings.filter(
      (booking) => currentFilter === "all" || getStatus(booking) === currentFilter
    );

    if (filteredBookings.length === 0) {
      historyList.hidden = true;
      historyEmpty.hidden = false;

      if (bookings.length === 0) {
        historyEmptyTitle.textContent = "ยังไม่มีประวัติการจอง";
        historyEmptyMessage.textContent = "เมื่อคุณจองห้อง รายการจองจะแสดงที่นี่";
      } else {
        historyEmptyTitle.textContent = "ไม่พบรายการจอง";
        historyEmptyMessage.textContent = "ไม่มีรายการจองในหมวดหมู่ที่เลือก";
      }
      return;
    }

    historyEmpty.hidden = true;
    historyList.hidden = false;
    filteredBookings.forEach((booking) => historyList.append(createBookingCard(booking)));
  }

  historyFilters.forEach((filter) => {
    filter.setAttribute("aria-pressed", String(filter.dataset.filter === currentFilter));

    filter.addEventListener("click", () => {
      currentFilter = filter.dataset.filter || "all";
      historyFilters.forEach((item) => {
        const active = item === filter;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      renderHistory();
    });
  });

  renderUser();
  setNote("กำลังโหลดประวัติการจอง...");
  refreshHistory();
  // โหลดใหม่เป็นระยะ และเมื่อกลับมาที่แท็บนี้ (เผื่อจองเพิ่มจากอีกแท็บ)
  setInterval(refreshHistory, AUTO_REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshHistory();
  });
});
