(() => {
  const adminLinks = document.querySelectorAll("[data-admin-menu]");
  if (!adminLinks.length) return;

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    console.error("Could not read the logged-in user role.", error);
  }

  adminLinks.forEach((link) => {
    if (link instanceof HTMLAnchorElement) {
      link.hidden = user?.role !== "admin";
    }
  });
})();
