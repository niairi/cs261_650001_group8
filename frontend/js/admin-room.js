(() => {
  const API_URL = "http://localhost:3000";
  const TOKEN_KEY = "token";
  const USER_KEY = "user";
  const token = localStorage.getItem(TOKEN_KEY);
  let user;

  if (!token) {
    window.location.replace("./login.html");
    return;
  }

  try {
    user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch (error) {
    console.error("Could not read the logged-in user.", error);
    localStorage.removeItem(USER_KEY);
  }

  if (user?.role !== "admin") {
    window.location.replace("./booking.html");
    return;
  }

  const accountName = document.querySelector("#admin-account-name");
  const roomGrid = document.querySelector("#room-status-grid");
  const roomsMessage = document.querySelector("#rooms-message");
  const maintenanceDialog = document.querySelector("#maintenance-dialog");
  const maintenanceForm = document.querySelector("#maintenance-form");
  const maintenanceRoomName = document.querySelector("#maintenance-room-name");
  const maintenanceReason = document.querySelector("#maintenance-reason");
  const maintenanceReasonCount = document.querySelector("#maintenance-reason-count");
  const maintenanceDate = document.querySelector("#maintenance-date");
  const maintenanceError = document.querySelector("#maintenance-error");
  const maintenanceSubmit = document.querySelector("#maintenance-submit");

  if (
    !(accountName instanceof HTMLElement)
    || !(roomGrid instanceof HTMLElement)
    || !(roomsMessage instanceof HTMLElement)
    || !(maintenanceDialog instanceof HTMLDialogElement)
    || !(maintenanceForm instanceof HTMLFormElement)
    || !(maintenanceRoomName instanceof HTMLElement)
    || !(maintenanceReason instanceof HTMLTextAreaElement)
    || !(maintenanceReasonCount instanceof HTMLOutputElement)
    || !(maintenanceDate instanceof HTMLInputElement)
    || !(maintenanceError instanceof HTMLElement)
    || !(maintenanceSubmit instanceof HTMLButtonElement)
  ) {
    console.error("Admin room page elements are missing.");
    return;
  }

  accountName.textContent = user.name
    ? `${user.name} (${user.student_id})`
    : `เจ้าหน้าที่ (${user.student_id})`;

  function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const today = toDateInputValue(new Date());
  maintenanceDate.min = today;
  maintenanceDate.value = today;

  let rooms = [];
  let bookings = [];
  let selectedRoom = null;
  let loading = false;

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.replace("./login.html");
      throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
    }

    if (response.status === 403) {
      window.location.replace("./booking.html");
      throw new Error("บัญชีนี้ไม่มีสิทธิ์จัดการห้อง");
    }

    if (!response.ok) {
      const details = Array.isArray(data.details) ? `: ${data.details.join(", ")}` : "";
      throw new Error(`${data.error || "ดำเนินการไม่สำเร็จ"}${details}`);
    }
    return data;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function getRoomClosure(room, date = today) {
    return room.closures.find((closure) => closure.date === date) || null;
  }

  function getRoomStatus(room) {
    if (!room.is_active || getRoomClosure(room)) return "unavailable";
    if (bookings.some((booking) =>
      Number(booking.room_id) === Number(room.room_id)
      && ["BOOKED", "CONFIRMED"].includes(String(booking.status).toUpperCase())
    )) return "reserved";
    return "available";
  }

  function makeButton(text, className, onClick) {
    const button = createElement("button", `room-action-button ${className}`, text);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
  }

  function renderRooms() {
    const fragment = document.createDocumentFragment();
    const labels = {
      available: ["fa-circle-check", "AVAILABLE"],
      reserved: ["fa-clock", "RESERVED"],
      unavailable: ["fa-triangle-exclamation", "UNAVAILABLE"]
    };

    rooms.forEach((room) => {
      const status = getRoomStatus(room);
      const closure = getRoomClosure(room);
      const nextClosure = closure || room.closures[0] || null;
      const card = createElement("article", `room-status-card${status === "unavailable" ? " is-unavailable" : ""}`);
      const heading = createElement("div", "room-card-heading");
      const roomNumber = createElement("span", "room-number", `${room.room_name} (${room.room_id})`);
      const badge = createElement("span", `room-state-badge ${status}`);
      const [icon, label] = labels[status];
      const badgeIcon = createElement("i", `fa-solid ${icon}`);
      badgeIcon.setAttribute("aria-hidden", "true");
      badge.append(badgeIcon, document.createTextNode(` ${label}`));
      heading.append(roomNumber, badge);

      const title = createElement("h2", "", room.room_name);
      const facts = createElement("div", "room-card-facts");
      const capacity = createElement("p");
      capacity.append(createElement("span", "", "ความจุ:"), createElement("strong", "", `${room.capacity} ที่นั่ง`));
      const currentStatus = createElement("p");
      const statusDescription = status === "available"
        ? "พร้อมใช้งาน"
        : status === "reserved"
          ? "มีรายการจองวันนี้"
          : !room.is_active
            ? "ปิดใช้งานในระบบ"
            : "ปิดปรับปรุง (Unavailable)";
      currentStatus.append(
        createElement("span", "", "สถานะปัจจุบัน:"),
        createElement("strong", `status-${status}`, statusDescription)
      );
      facts.append(capacity, currentStatus);
      card.append(heading, title, facts);

      if (closure) {
        const detail = createElement("div", "room-maintenance-details");
        detail.append(createElement("p", "", `สาเหตุ: ${closure.reason || "ไม่ได้ระบุเหตุผล"}`));
        card.append(detail);
      } else if (nextClosure) {
        const detail = createElement("div", "room-maintenance-details");
        detail.append(createElement("p", "", `ปิดปรับปรุง ${nextClosure.date}${nextClosure.reason ? `: ${nextClosure.reason}` : ""}`));
        card.append(detail);
      }

      const actions = createElement("div", "room-card-actions");
      if (!room.is_active) {
        actions.append(makeButton("เปิดใช้งานห้อง", "restore-action", () => updateRoom(room.room_id)));
      } else if (nextClosure) {
        const label = closure ? "คืนสถานะเป็น Available" : `ยกเลิกปิดปรับปรุง ${nextClosure.date}`;
        actions.append(makeButton(label, "restore-action", () => removeClosure(room.room_id, nextClosure.date)));
      } else {
        actions.append(makeButton(
          "ตั้งสถานะเป็น Unavailable (ปิดปรับปรุง)",
          "unavailable-action",
          () => openMaintenanceDialog(room)
        ));
      }
      card.append(actions);
      fragment.append(card);
    });

    roomGrid.replaceChildren(fragment);
    roomsMessage.textContent = rooms.length ? `แสดงห้องทั้งหมด ${rooms.length} ห้อง` : "ไม่พบข้อมูลห้อง";
  }

  async function loadRooms() {
    roomsMessage.textContent = "กำลังโหลดข้อมูลห้อง...";
    try {
      const [roomData, bookingData] = await Promise.all([
        apiRequest("/admin/rooms"),
        apiRequest(`/admin/bookings?date=${encodeURIComponent(today)}&limit=1000`)
      ]);
      if (!Array.isArray(roomData.rooms) || !Array.isArray(bookingData.bookings)) {
        throw new Error("รูปแบบข้อมูลห้องหรือรายการจองไม่ถูกต้อง");
      }
      rooms = roomData.rooms;
      bookings = bookingData.bookings;
      renderRooms();
    } catch (error) {
      console.error("Could not load admin rooms.", error);
      roomGrid.replaceChildren();
      roomsMessage.textContent = error.message || "โหลดข้อมูลห้องไม่สำเร็จ";
    }
  }

  function openMaintenanceDialog(room) {
    if (loading) return;
    selectedRoom = room;
    maintenanceRoomName.textContent = `${room.room_name} (${room.room_id})`;
    maintenanceReason.value = "";
    maintenanceDate.value = today;
    maintenanceError.hidden = true;
    maintenanceError.textContent = "";
    updateReasonCount();
    maintenanceDialog.showModal();
    maintenanceReason.focus();
  }

  function updateReasonCount() {
    maintenanceReasonCount.textContent = `${maintenanceReason.value.length}/255 ตัวอักษร`;
  }

  async function updateRoom(roomId) {
    if (loading) return;
    loading = true;
    roomsMessage.textContent = "กำลังเปิดใช้งานห้อง...";
    try {
      await apiRequest(`/admin/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: true })
      });
      await loadRooms();
    } catch (error) {
      console.error("Could not activate room.", error);
      roomsMessage.textContent = error.message || "เปิดใช้งานห้องไม่สำเร็จ";
    } finally {
      loading = false;
    }
  }

  async function removeClosure(roomId, date) {
    if (loading) return;
    loading = true;
    roomsMessage.textContent = "กำลังคืนสถานะห้อง...";
    try {
      await apiRequest(`/admin/rooms/${roomId}/closures/${date}`, { method: "DELETE" });
      await loadRooms();
    } catch (error) {
      console.error("Could not reopen room.", error);
      roomsMessage.textContent = error.message || "คืนสถานะห้องไม่สำเร็จ";
    } finally {
      loading = false;
    }
  }

  maintenanceReason.addEventListener("input", updateReasonCount);
  maintenanceDialog.querySelectorAll("[data-reason]").forEach((button) => {
    button.addEventListener("click", () => {
      maintenanceReason.value = button.dataset.reason || "";
      updateReasonCount();
      maintenanceReason.focus();
    });
  });
  maintenanceDialog.querySelectorAll("[data-close-maintenance]").forEach((button) => {
    button.addEventListener("click", () => maintenanceDialog.close());
  });
  maintenanceDialog.addEventListener("click", (event) => {
    if (event.target === maintenanceDialog) maintenanceDialog.close();
  });

  maintenanceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const reason = maintenanceReason.value.trim();
    if (!selectedRoom || !reason) {
      maintenanceError.textContent = "กรุณาระบุสาเหตุการปิดปรับปรุง";
      maintenanceError.hidden = false;
      maintenanceReason.focus();
      return;
    }
    if (!maintenanceForm.reportValidity() || loading) return;

    loading = true;
    maintenanceSubmit.disabled = true;
    maintenanceError.hidden = true;
    maintenanceSubmit.textContent = "กำลังบันทึก...";
    try {
      await apiRequest(`/admin/rooms/${selectedRoom.room_id}/closures`, {
        method: "POST",
        body: JSON.stringify({ date: maintenanceDate.value, reason })
      });
      maintenanceDialog.close();
      roomsMessage.textContent = "บันทึกสถานะปิดปรับปรุงแล้ว";
      await loadRooms();
    } catch (error) {
      console.error("Could not close room for maintenance.", error);
      maintenanceError.textContent = error.message || "ปิดปรับปรุงห้องไม่สำเร็จ";
      maintenanceError.hidden = false;
    } finally {
      loading = false;
      maintenanceSubmit.disabled = false;
      maintenanceSubmit.innerHTML = '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> ยืนยันปิดปรับปรุงห้อง';
    }
  });

  loadRooms();
})();
