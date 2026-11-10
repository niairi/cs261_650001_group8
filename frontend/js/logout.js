(() => {
  const logoutLink = document.querySelector(".user-logout");
  const logoutDialog = document.querySelector("#logout-dialog");
  const confirmLogoutButton = logoutDialog?.querySelector("[data-confirm-logout]");
  const cancelLogoutButtons = logoutDialog?.querySelectorAll("[data-cancel-logout]");

  if (
    !(logoutLink instanceof HTMLAnchorElement)
    || !(logoutDialog instanceof HTMLDialogElement)
    || !(confirmLogoutButton instanceof HTMLButtonElement)
    || !cancelLogoutButtons?.length
  ) {
    return;
  }

  logoutLink.addEventListener("click", (event) => {
    event.preventDefault();
    logoutDialog.showModal();
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
    window.location.assign(logoutLink.href);
  });
})();
