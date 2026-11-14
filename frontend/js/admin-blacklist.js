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
  const search = document.querySelector("#blacklist-search");
  const rows = document.querySelector("#blacklist-rows");
  const message = document.querySelector("#blacklist-message");
  const empty = document.querySelector("#blacklist-empty");
  const confirmDialog = document.querySelector("#blacklist-confirm-dialog");
  const confirmStudent = document.querySelector("#blacklist-confirm-student");
  const confirmError = document.querySelector("#blacklist-confirm-error");
  const releaseButton = document.querySelector("#blacklist-release-submit");

  if (
    !(accountName instanceof HTMLElement)
    || !(search instanceof HTMLInputElement)
    || !(rows instanceof HTMLTableSectionElement)
    || !(message instanceof HTMLElement)
    || !(empty instanceof HTMLElement)
    || !(confirmDialog instanceof HTMLDialogElement)
    || !(confirmStudent instanceof HTMLElement)
    || !(confirmError instanceof HTMLElement)
    || !(releaseButton instanceof HTMLButtonElement)
  ) {
    console.error("Admin blacklist page elements are missing.");
    return;
  }

  accountName.textContent = user.name
    ? `${user.name} (${user.student_id})`
    : `เจ้าหน้าที่ (${user.student_id})`;

  let entries = [];
  let selectedEntry = null;
  let loading = false;

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
      throw new Error(data.error || "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
    }

    if (!response.ok) {
      const details = Array.isArray(data.details) ? `: ${data.details.join(", ")}` : "";
      throw new Error(`${data.error || "ดำเนินการไม่สำเร็จ"}${details}`);
    }
    return data;
  }

  function appendCell(row, text, className) {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text || "—";
    row.append(cell);
    return cell;
  }

  function renderEntries() {
    const query = search.value.trim().toLocaleLowerCase();
    const filtered = entries.filter((entry) =>
      `${entry.name} ${entry.student_id}`.toLocaleLowerCase().includes(query)
    );
    const fragment = document.createDocumentFragment();

    filtered.forEach((entry) => {
      const row = document.createElement("tr");
      const studentCell = document.createElement("td");
      const name = document.createElement("span");
      name.className = "blacklist-student-name";
      name.textContent = entry.name || "ไม่พบชื่อในระบบ";
      const studentId = document.createElement("span");
      studentId.className = "blacklist-student-id";
      studentId.textContent = entry.student_id;
      studentCell.append(name, studentId);
      row.append(studentCell);

      appendCell(row, entry.reason, "blacklist-muted");
      appendCell(row, displayDate(entry.start_date), "blacklist-muted");
      appendCell(row, displayDate(entry.end_date), "blacklist-muted");

      const actionCell = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "blacklist-release-button";
      button.innerHTML = '<i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i> ปลด Blacklist';
      button.addEventListener("click", () => openReleaseDialog(entry));
      actionCell.append(button);
      row.append(actionCell);
      fragment.append(row);
    });

    rows.replaceChildren(fragment);
    empty.textContent = entries.length === 0
      ? "ไม่มีนักศึกษาที่ถูกระงับสิทธิ์"
      : "ไม่พบรายชื่อที่ตรงกับการค้นหา";
    empty.hidden = filtered.length !== 0;
  }

  async function loadEntries() {
    message.textContent = "กำลังโหลดรายชื่อ...";
    try {
      const data = await apiRequest("/admin/blacklist");
      if (!Array.isArray(data.rows) || !Number.isSafeInteger(data.count) || data.count < 0) {
        throw new Error("รูปแบบข้อมูล Blacklist จาก API ไม่ถูกต้อง");
      }
      entries = data.rows;
      renderEntries();
      message.classList.remove("is-error");
      message.textContent = `แสดงรายชื่อ ${data.count} รายการ`;
    } catch (error) {
      console.error("Could not load admin blacklist.", error);
      entries = [];
      rows.replaceChildren();
      empty.hidden = true;
      message.classList.add("is-error");
      message.textContent = error.message || "โหลดรายชื่อ Blacklist ไม่สำเร็จ";
    }
  }

  function openReleaseDialog(entry) {
    if (loading) return;
    selectedEntry = entry;
    confirmStudent.textContent = `${entry.name || "ไม่พบชื่อในระบบ"} (${entry.student_id})`;
    confirmError.hidden = true;
    confirmError.textContent = "";
    confirmDialog.showModal();
  }

  confirmDialog.querySelectorAll("[data-cancel-release]").forEach((button) => {
    button.addEventListener("click", () => confirmDialog.close());
  });
  confirmDialog.addEventListener("click", (event) => {
    if (event.target === confirmDialog) confirmDialog.close();
  });

  releaseButton.addEventListener("click", async () => {
    if (!selectedEntry || loading) return;

    loading = true;
    releaseButton.disabled = true;
    confirmError.hidden = true;
    releaseButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> กำลังปลดระงับ...';
    try {
      await apiRequest(`/admin/blacklist/${encodeURIComponent(selectedEntry.blacklist_id)}/lift`, {
        method: "POST"
      });
      confirmDialog.close();
      message.textContent = `ปลดระงับสิทธิ์ของ ${selectedEntry.student_id} แล้ว`;
      await loadEntries();
    } catch (error) {
      console.error("Could not release blacklist entry.", error);
      confirmError.textContent = error.message || "ปลดระงับสิทธิ์ไม่สำเร็จ";
      confirmError.hidden = false;
    } finally {
      loading = false;
      releaseButton.disabled = false;
      releaseButton.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> ยืนยันการปลด';
    }
  });

  search.addEventListener("input", renderEntries);
  loadEntries();
})();
