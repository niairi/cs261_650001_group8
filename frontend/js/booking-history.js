
document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "tuCsSpaceBookings";

  const historyFilters = document.querySelectorAll(".history-filter");
  const totalCount = document.querySelector("#total-count");
  const historyTotal = document.querySelector("#history-total");
  const historyList = document.querySelector("#history-list");
  const historyEmpty = document.querySelector("#history-empty");
  const historyEmptyTitle = document.querySelector("#history-empty-title");
  const historyEmptyMessage = document.querySelector("#history-empty p");

  const statusLabels = {
    upcoming: "กำลังจะมาถึง",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิกแล้ว"
  };

  let bookings = [];
  let currentFilter = "all";

  function getBookings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.error("อ่านข้อมูลการจองไม่สำเร็จ:", error);
      return [];
    }
  }

  function saveBookings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }

  function getStatus(booking) {
    if (
      ["upcoming", "completed", "cancelled"].includes(booking.status)
    ) {
      return booking.status;
    }

    if (!booking.date) return "upcoming";

    const endDate = new Date(
      `${booking.date}T${booking.endTime || "23:59"}`
    );

    return endDate < new Date() ? "completed" : "upcoming";
  }

  function formatThaiDate(dateString) {
    if (!dateString) return "ไม่ระบุวันที่";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function createText(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function updateCounts() {
    const counts = {
      all: bookings.length,
      upcoming: 0,
      completed: 0,
      cancelled: 0
    };

    bookings.forEach((booking) => {
      const status = getStatus(booking);

      if (status in counts && status !== "all") {
        counts[status]++;
      }
    });

    if (totalCount) {
      totalCount.textContent = counts.all;
    }

    if (historyTotal) {
      historyTotal.setAttribute(
        "aria-label",
        `รายการจองทั้งหมด ${counts.all} รายการ`
      );
    }

    document.querySelectorAll("[data-count]").forEach((element) => {
      const key = element.dataset.count;

      if (key in counts) {
        element.textContent = counts[key];
      }
    });
  }

  function createBookingCard(booking) {
    const status = getStatus(booking);

    const card = document.createElement("article");
    card.className = "history-card";

    if (status === "cancelled") {
      card.classList.add("is-cancelled");
    }

    const details = document.createElement("div");
    details.className = "history-card-details";

    const heading = document.createElement("div");
    heading.className = "history-card-heading";

    const room = createText(
      "h3",
      "history-room",
      booking.room || "ไม่ระบุห้อง"
    );

    const statusElement = document.createElement("span");
    statusElement.className = `history-status ${status}`;

    const statusDot = document.createElement("span");
    statusDot.className = "history-status-dot";
    statusDot.setAttribute("aria-hidden", "true");

    statusElement.append(
      statusDot,
      document.createTextNode(statusLabels[status] || status)
    );

    heading.append(room, statusElement);

    const timing = document.createElement("div");
    timing.className = "history-timing";

    timing.append(
      createText(
        "p",
        "history-date",
        `วันที่จอง: ${formatThaiDate(booking.date)}`
      ),
      createText(
        "p",
        "history-time",
        `เวลา: ${booking.startTime || "--:--"} - ${
          booking.endTime || "--:--"
        } น.`
      ),
      createText(
        "p",
        "history-people",
        `จำนวนผู้เข้าร่วม: ${
          booking.people ?? booking.participants ?? "-"
        } คน`
      ),
      createText(
        "p",
        "history-purpose",
        `วัตถุประสงค์: ${booking.purpose || "ไม่ระบุ"}`
      )
    );

    details.append(heading, timing);
    card.append(details);

    // ปุ่มยกเลิก เฉพาะรายการที่ยังไม่ถูกยกเลิกและยังไม่เสร็จสิ้น
    if (status === "upcoming") {
      const actions = document.createElement("div");
      actions.className = "history-card-actions";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "history-cancel-button";
      cancelButton.textContent = "ยกเลิกการจอง";

      cancelButton.addEventListener("click", () => {
        showConfirmDialog(booking);
      });

      actions.append(cancelButton);
      card.append(actions);
    }

    if (status === "completed") {
      card.append(
        createText(
          "p",
          "history-completed-note",
          "การจองนี้เสร็จสิ้นแล้ว"
        )
      );
    }

    if (status === "cancelled") {
      card.append(
        createText(
          "p",
          "history-cancelled-note",
          "รายการจองนี้ถูกยกเลิกแล้ว"
        )
      );
    }

    return card;
  }

  function showDialog({
    title,
    message,
    confirmText,
    onConfirm,
    success = false
  }) {
    document.querySelector(".history-dialog-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.className = "history-dialog-overlay";

    const dialog = document.createElement("section");
    dialog.className = "history-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "history-dialog-title");

    const icon = document.createElement("div");
    icon.className =
      `history-dialog-icon${success ? " success" : ""}`;
    icon.textContent = success ? "✓" : "!";

    const heading = createText(
      "h2",
      "history-dialog-title",
      title
    );
    heading.id = "history-dialog-title";

    const description = createText(
      "p",
      "history-dialog-message",
      message
    );

    const actions = document.createElement("div");
    actions.className = "history-dialog-actions";

    function closeDialog() {
      document.removeEventListener("keydown", handleEscape);
      overlay.remove();
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        closeDialog();
      }
    }

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "history-dialog-button secondary";
    backButton.textContent = success ? "ตกลง" : "กลับ";
    backButton.addEventListener("click", closeDialog);

    actions.append(backButton);

    if (!success) {
      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className = "history-dialog-button danger";
      confirmButton.textContent =
        confirmText || "ยืนยันการยกเลิก";

      confirmButton.addEventListener("click", () => {
        confirmButton.disabled = true;
        onConfirm(closeDialog);
      });

      actions.append(confirmButton);
    }

    dialog.append(icon, heading, description, actions);
    overlay.append(dialog);
    document.body.append(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeDialog();
      }
    });

    document.addEventListener("keydown", handleEscape);
    backButton.focus();

    return { close: closeDialog };
  }

  function showConfirmDialog(booking) {
    showDialog({
      title: "ยืนยันการยกเลิกการจอง",
      message: "คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?",
      confirmText: "ยืนยันการยกเลิก",

      onConfirm: (closeDialog) => {
        const index = bookings.indexOf(booking);

        if (index === -1) {
          closeDialog();

          showDialog({
            title: "ไม่พบรายการจอง",
            message: "กรุณารีเฟรชหน้าเว็บแล้วลองใหม่อีกครั้ง",
            success: true
          });

          return;
        }

        if (getStatus(bookings[index]) !== "upcoming") {
          closeDialog();
          bookings = getBookings();
          updateCounts();
          renderHistory();

          showDialog({
            title: "ไม่สามารถยกเลิกได้",
            message: "รายการนี้ไม่ได้อยู่ในสถานะที่ยกเลิกได้แล้ว",
            success: true
          });

          return;
        }

        const previousStatus = bookings[index].status;
        bookings[index].status = "cancelled";

        try {
          saveBookings();

          closeDialog();
          updateCounts();
          renderHistory();

          showDialog({
            title: "ยกเลิกการจองสำเร็จ",
            message: "ยกเลิกการจองเรียบร้อยแล้ว",
            success: true
          });
        } catch (error) {
          bookings[index].status = previousStatus;

          console.error("บันทึกสถานะไม่สำเร็จ:", error);
          closeDialog();

          showDialog({
            title: "เกิดข้อผิดพลาด",
            message: "ไม่สามารถบันทึกการยกเลิกได้ กรุณาลองใหม่อีกครั้ง",
            success: true
          });
        }
      }
    });
  }

  function renderHistory() {
    if (!historyList || !historyEmpty) return;

    historyList.replaceChildren();

    const filteredBookings = bookings.filter((booking) => {
      return currentFilter === "all" ||
        getStatus(booking) === currentFilter;
    });

    if (filteredBookings.length === 0) {
      historyList.hidden = true;
      historyEmpty.hidden = false;

      if (bookings.length === 0) {
        historyEmptyTitle.textContent = "ยังไม่มีประวัติการจอง";
        historyEmptyMessage.textContent =
          "เมื่อคุณจองห้อง รายการจองจะแสดงที่นี่";
      } else {
        historyEmptyTitle.textContent = "ไม่พบรายการจอง";
        historyEmptyMessage.textContent =
          "ไม่มีรายการจองในหมวดหมู่ที่เลือก";
      }

      return;
    }

    historyEmpty.hidden = true;
    historyList.hidden = false;

    filteredBookings.forEach((booking) => {
      historyList.append(createBookingCard(booking));
    });
  }

  historyFilters.forEach((filter) => {
    filter.setAttribute(
      "aria-pressed",
      String(filter.dataset.filter === currentFilter)
    );

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

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      bookings = getBookings();
      updateCounts();
      renderHistory();
    }
  });


  bookings = getBookings();
  updateCounts();
  renderHistory();
});
