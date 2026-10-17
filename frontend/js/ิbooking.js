// Frontend placeholder: room and availability data will be supplied by the backend later.
const roomCards = document.querySelectorAll(".room-card");
const roomSelect = document.querySelector("#room-select");
const form = document.querySelector("#booking-form");
const formMessage = document.querySelector("#form-message");
const navigationLinks = document.querySelectorAll(".main-nav .nav-link[href^='#']");

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

roomCards.forEach((card) => {
  card.addEventListener("click", () => {
    roomCards.forEach((item) => {
      item.classList.remove("selected");
      item.setAttribute("aria-pressed", "false");
    });
    card.classList.add("selected");
    card.setAttribute("aria-pressed", "true");
    roomSelect.value = card.dataset.room;
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

// Prevent fake bookings before backend integration.
form.addEventListener("submit", (event) => {
  event.preventDefault();
  formMessage.textContent = "ยังไม่ได้ส่งคำขอจองจริง: หน้านี้รอเชื่อมต่อ Backend ก่อน";
});