(() => {
  const filters = document.querySelectorAll("#booking-filters input, #booking-filters select");
  const rows = document.querySelector("#booking-rows");
  const summary = document.querySelector("#result-summary");
  const pagination = document.querySelector("#pagination");
  const noResults = document.querySelector("#no-results");

  filters.forEach((filter) => {
    filter.disabled = true;
  });

  rows.innerHTML = `
    <tr>
      <td class="backend-pending-row" colspan="6" role="status">
        กำลังรอเชื่อมต่อ Backend เพื่อโหลดข้อมูลการจองและนักศึกษา
      </td>
    </tr>
  `;
  summary.textContent = "รอข้อมูลการจองจาก Backend";
  pagination.replaceChildren();
  noResults.hidden = true;
})();
