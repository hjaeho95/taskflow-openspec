// Applied as early as possible (loaded before the Tailwind CDN script) to
// minimize the light->dark flash on page load.
(function applyStoredTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.classList.toggle("dark", theme === "dark");
})();

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeToggleButtons();
}

function updateThemeToggleButtons() {
  const isDark = document.documentElement.classList.contains("dark");
  document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
    btn.textContent = isDark ? "☀️" : "🌙";
    btn.setAttribute("aria-label", isDark ? "라이트 모드로 전환" : "다크 모드로 전환");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateThemeToggleButtons();
  document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", toggleTheme);
  });
});
