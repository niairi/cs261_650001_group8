const historyFilters = document.querySelectorAll(".history-filter");

historyFilters.forEach((filter) => {
  filter.addEventListener("click", () => {
    historyFilters.forEach((item) => {
      const isActive = item === filter;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });
  });
});
