(() => {
  const shell = document.querySelector(".staff-nav-shell");
  const toggle = shell?.querySelector(".staff-menu-toggle");
  const navigation = shell?.querySelector(".staff-tabs");
  const logoutLinks = shell?.querySelectorAll(".staff-logout");
  const logoutDialog = document.querySelector("#logout-dialog");
  const confirmLogoutButton = logoutDialog?.querySelector("[data-confirm-logout]");
  const cancelLogoutButtons = logoutDialog?.querySelectorAll("[data-cancel-logout]");

  if (
    !(shell instanceof HTMLElement)
    || !(toggle instanceof HTMLButtonElement)
    || !(navigation instanceof HTMLElement)
    || !logoutLinks?.length
    || ![...logoutLinks].every((link) => link instanceof HTMLAnchorElement)
    || !(logoutDialog instanceof HTMLDialogElement)
    || !(confirmLogoutButton instanceof HTMLButtonElement)
    || !cancelLogoutButtons?.length
  ) {
    return;
  }

  logoutLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      logoutDialog.showModal();
    });
  });

  cancelLogoutButtons.forEach((button) => {
    button.addEventListener("click", () => logoutDialog.close());
  });

  logoutDialog.addEventListener("click", (event) => {
    if (event.target === logoutDialog) logoutDialog.close();
  });

  confirmLogoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.assign(logoutLinks[0].href);
  });

  function setMenuOpen(isOpen) {
    shell.classList.toggle("is-menu-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "ปิดเมนู" : "เปิดเมนู");
  }

  toggle.addEventListener("click", () => {
    setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      toggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 700) {
      setMenuOpen(false);
    }
  });
})();
