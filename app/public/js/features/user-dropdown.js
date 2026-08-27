document.addEventListener("DOMContentLoaded", () => {
  const userMenu = document.querySelector(".user-menu");
  const profileToggle = document.querySelector(".profile-toggle");

  if (!userMenu || !profileToggle) return;

  const dropdown = document.querySelector(".user-menu-dropdown");
  if (!dropdown) return;

  const closeDropdown = () => {
    userMenu.classList.remove("active");
    profileToggle.setAttribute("aria-expanded", "false");
  };

  const toggleDropdown = (event) => {
    event.stopPropagation();
    const isActive = userMenu.classList.toggle("active");
    profileToggle.setAttribute("aria-expanded", String(isActive));
  };

  profileToggle.addEventListener("click", toggleDropdown);

  document.addEventListener("click", (event) => {
    if (!userMenu.contains(event.target)) {
      closeDropdown();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDropdown();
    }
  });
});
