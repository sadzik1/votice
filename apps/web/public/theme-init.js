// runs before first paint to avoid a white flash in dark mode.
// separate file because the CSP blocks inline scripts. keep in sync with src/lib/theme.ts
(() => {
  try {
    const stored = localStorage.getItem("theme");
    const preference = stored === "light" || stored === "dark" ? stored : "system";
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
    const dark = preference === "dark" || (preference === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", dark);
  } catch {
    // localStorage can throw in private mode
  }
})();
