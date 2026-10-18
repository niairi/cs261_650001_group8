const historyFilters = document.querySelectorAll(".history-filter");
const totalCount = document.querySelector("#total-count");
const historyTotal = document.querySelector("#history-total");
const historyEmptyTitle = document.querySelector("#history-empty-title");
const historyEmptyMessage = document.querySelector("#history-empty p");

function showWaitingForBackend() {
  totalCount.textContent = "0";
  historyTotal.setAttribute("aria-label", "รายการทั้งหมด 0 รายการ");
  historyEmptyTitle.textContent = "รอข้อมูลประวัติการจอง";
  historyEmptyMessage.textContent =
    "รายการจองและสถานะจะแสดงที่นี่เมื่อเชื่อมต่อระบบ Backend แล้ว";

  document.querySelectorAll("[data-count]").forEach((count) => {
    count.textContent = "0";
  });
}

historyFilters.forEach((filter) => {
  filter.addEventListener("click", () => {
    historyFilters.forEach((item) => {
      const isActive = item === filter;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });
  });
});

showWaitingForBackend();
