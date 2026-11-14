(() => {
  const API_URL = "http://localhost:3000";
  const TOKEN_KEY = "token";
  const USER_KEY = "user";
  const PAGE_SIZE = 20;
  const token = localStorage.getItem(TOKEN_KEY);
  let user;

  // // if (!token) {
  // //   window.location.replace("./login.html");
  // //   return;
  // // }

  // // try {
  // //   user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
  // // } catch (error) {
  // //   console.error("Could not read the logged-in user.", error);
  // //   localStorage.removeItem(USER_KEY);
  // // }

  // if (user?.role !== "admin") {
  //   window.location.replace("./booking.html");
  //   return;
  // }

  const accountName = document.querySelector("#admin-account-name");
  const bookingFilters = document.querySelector("#booking-filters");
  const bookingSearch = document.querySelector("#booking-search");
  const roomFilter = document.querySelector("#room-filter");
  const dateFilter = document.querySelector("#date-filter");
  const sortFilter = document.querySelector("#sort-filter");
  const bookingRows = document.querySelector("#booking-rows");
  const bookingSummary = document.querySelector("#result-summary");
  const reportTotal = document.querySelector("#report-total");
  const reportCancelled = document.querySelector("#report-cancelled");
  const reportNoShow = document.querySelector("#report-no-show");
  const reportSummaryMessage = document.querySelector("#report-summary-message");
  const pagination = document.querySelector("#pagination");
  const noResults = document.querySelector("#no-results");

  if (
    !(accountName instanceof HTMLElement)
    || !(bookingFilters instanceof HTMLFormElement)
    || !(bookingSearch instanceof HTMLInputElement)
    || !(roomFilter instanceof HTMLSelectElement)
    || !(dateFilter instanceof HTMLInputElement)
    || !(sortFilter instanceof HTMLSelectElement)
    || !(bookingRows instanceof HTMLTableSectionElement)
    || !(bookingSummary instanceof HTMLElement)
    || !(reportTotal instanceof HTMLElement)
    || !(reportCancelled instanceof HTMLElement)
    || !(reportNoShow instanceof HTMLElement)
    || !(reportSummaryMessage instanceof HTMLElement)
    || !(pagination instanceof HTMLElement)
    || !(noResults instanceof HTMLElement)
  ) {
    console.error("Admin page elements are missing.");
    return;
  }

  accountName.textContent = user.name
    ? `${user.name} (${user.student_id})`
    : `เจ้าหน้าที่ (${user.student_id})`;

  const statusLabels = {
    BOOKED: "จองแล้ว",
    CONFIRMED: "ยืนยันแล้ว",
    CANCELLED: "ยกเลิก",
    EXPIRED: "No-show"
  };
  const statusClasses = {
    BOOKED: "status-booked",
    CONFIRMED: "status-confirmed",
    CANCELLED: "status-expired",
    EXPIRED: "status-expired"
  };
  const numberFormatter = new Intl.NumberFormat("th-TH");
  let bookings = [];
  let currentPage = 1;
  let bookingRequestId = 0;
  let reportRequestId = 0;
  let searchTimer;

  function displayDate(value) {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return value || "—";
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function queryString(values) {
    const query = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== "" && value !== "all" && value !== undefined) {
        query.set(key, value);
      }
    });
    return query.toString();
  }

  async function apiGet(path) {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json();

    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.replace("./login.html");
      throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
    }

    if (response.status === 403) {
      window.location.replace("./booking.html");
      throw new Error("บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้าจัดการการจอง");
    }

    if (!response.ok) {
      const details = Array.isArray(data.details) ? `: ${data.details.join(", ")}` : "";
      throw new Error(`${data.error || "เรียกข้อมูลไม่สำเร็จ"}${details}`);
    }

    return data;
  }

  function showBookingMessage(message) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "backend-pending-row";
    cell.colSpan = 6;
    cell.textContent = message;
    row.append(cell);
    bookingRows.replaceChildren(row);
  }

  function appendCell(row, text, className) {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text || "—";
    row.append(cell);
    return cell;
  }

  function renderBookings() {
    const pageCount = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pageCount);
    const start = (currentPage - 1) * PAGE_SIZE;
    const visibleBookings = bookings.slice(start, start + PAGE_SIZE);
    const fragment = document.createDocumentFragment();

    visibleBookings.forEach((booking, index) => {
      const row = document.createElement("tr");
      appendCell(row, String(start + index + 1), "row-number");

      const dateCell = document.createElement("td");
      const date = document.createElement("span");
      date.className = "booking-date";
      date.textContent = displayDate(booking.booking_date);
      const time = document.createElement("span");
      time.className = "booking-time";
      time.textContent = `${booking.start_time || "—"} – ${booking.end_time || "—"}`;
      dateCell.append(date, time);
      row.append(dateCell);

      appendCell(row, booking.room_name, "room-name");
      appendCell(row, booking.student_id, "student-id");

      const purposeCell = document.createElement("td");
      const purpose = document.createElement("span");
      purpose.className = "purpose-title";
      purpose.textContent = booking.purpose || "—";
      const attendees = document.createElement("span");
      attendees.className = "attendee-count";
      attendees.textContent = booking.people == null ? "" : `${booking.people} คน`;
      purposeCell.append(purpose, attendees);
      row.append(purposeCell);

      const statusCell = document.createElement("td");
      statusCell.className = "status-cell";
      const status = document.createElement("span");
      const statusCode = String(booking.status || "").toUpperCase();
      status.className = `booking-status ${statusClasses[statusCode] || ""}`;
      status.textContent = statusLabels[statusCode] || statusCode || "ไม่ทราบสถานะ";
      statusCell.append(status);
      row.append(statusCell);

      fragment.append(row);
    });

    bookingRows.replaceChildren(fragment);
    noResults.hidden = bookings.length !== 0;
    bookingSummary.textContent = bookings.length
      ? `รายการ ${start + 1}–${Math.min(start + PAGE_SIZE, bookings.length)} จาก ${numberFormatter.format(bookings.length)} รายการ`
      : "ไม่พบรายการจอง";
    renderPagination(pageCount);
  }

  function renderPagination(pageCount) {
    pagination.replaceChildren();
    if (pageCount <= 1) return;

    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "page-button";
    previous.textContent = "ก่อนหน้า";
    previous.disabled = currentPage === 1;
    previous.addEventListener("click", () => {
      currentPage -= 1;
      renderBookings();
    });

    const pageLabel = document.createElement("span");
    pageLabel.className = "page-button";
    pageLabel.textContent = `${currentPage} / ${pageCount}`;
    pageLabel.setAttribute("aria-current", "page");

    const next = document.createElement("button");
    next.type = "button";
    next.className = "page-button";
    next.textContent = "ถัดไป";
    next.disabled = currentPage === pageCount;
    next.addEventListener("click", () => {
      currentPage += 1;
      renderBookings();
    });

    pagination.append(previous, pageLabel, next);
  }

  async function loadBookings() {
    const requestId = ++bookingRequestId;
    const query = queryString({
      student_id: bookingSearch.value.trim(),
      room_id: roomFilter.value,
      date: dateFilter.value,
      order: sortFilter.value,
      limit: "1000"
    });
    bookingSummary.textContent = "กำลังโหลดรายการจอง...";
    noResults.hidden = true;
    showBookingMessage("กำลังโหลดข้อมูลการจอง...");

    try {
      const data = await apiGet(`/admin/bookings?${query}`);
      if (requestId !== bookingRequestId) return;
      if (!Array.isArray(data.bookings)) throw new Error("รูปแบบข้อมูลรายการจองไม่ถูกต้อง");
      bookings = data.bookings;
      currentPage = 1;
      renderBookings();
    } catch (error) {
      if (requestId !== bookingRequestId) return;
      console.error("Could not load admin bookings.", error);
      bookings = [];
      showBookingMessage(error.message || "โหลดรายการจองไม่สำเร็จ");
      bookingSummary.textContent = "โหลดรายการจองไม่สำเร็จ";
      pagination.replaceChildren();
    }
  }

  async function loadReportSummary() {
    const requestId = ++reportRequestId;
    const selectedDate = dateFilter.value;
    const query = queryString({
      room_id: roomFilter.value,
      date_from: selectedDate,
      date_to: selectedDate
    });
    reportTotal.textContent = "…";
    reportCancelled.textContent = "…";
    reportNoShow.textContent = "…";
    reportSummaryMessage.textContent = "";

    try {
      const data = await apiGet(`/admin/reports/summary?${query}`);
      if (requestId !== reportRequestId) return;
      const totals = data.totals;
      const values = [totals?.total, totals?.cancelled, totals?.no_show];
      if (values.some((value) => value === undefined || value === null || !Number.isFinite(Number(value)))) {
        throw new Error("รูปแบบข้อมูลรายงานสรุปไม่ถูกต้อง");
      }

      [reportTotal, reportCancelled, reportNoShow].forEach((element, index) => {
        element.textContent = numberFormatter.format(Number(values[index]));
      });
    } catch (error) {
      if (requestId !== reportRequestId) return;
      console.error("Could not load admin report summary.", error);
      reportTotal.textContent = "—";
      reportCancelled.textContent = "—";
      reportNoShow.textContent = "—";
      reportSummaryMessage.textContent = error.message || "โหลดรายงานสรุปไม่สำเร็จ";
    }
  }

  bookingFilters.addEventListener("submit", (event) => {
    event.preventDefault();
    loadBookings();
  });
  bookingSearch.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(loadBookings, 300);
  });
  [roomFilter, dateFilter].forEach((filter) => {
    filter.addEventListener("change", () => {
      loadBookings();
      loadReportSummary();
    });
  });
  sortFilter.addEventListener("change", loadBookings);
  loadBookings();
  loadReportSummary();
})();
