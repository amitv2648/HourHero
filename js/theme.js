// ============================================================
// HourHero — js/theme.js
// ============================================================
// This file MUST be loaded first on every page, before the
// Firebase SDK and before any other scripts.
//
// It reads the saved theme from localStorage and applies it
// to <html> instantly, before the page renders, so there is
// never a white flash when dark mode is active.
//
// Usage on root pages (index.html, auth.html):
//   <script src="js/theme.js"></script>
//
// Usage on subfolder pages (volunteer/, org/):
//   <script src="../js/theme.js"></script>
//
// The theme is toggled by calling HH.Theme.set("dark") or
// HH.Theme.set("light") from any settings page.
// ============================================================

(function () {
  var saved = localStorage.getItem("hh_theme");

  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else if (saved === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }
  // If nothing saved, CSS media query handles system preference automatically

  // Expose a simple API for the settings pages to call
  window.HH = window.HH || {};
  window.HH.Theme = {

    // Get current effective theme
    get: function () {
      var attr = document.documentElement.getAttribute("data-theme");
      if (attr) return attr;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark" : "light";
    },

    // Set and persist a theme
    set: function (theme) {
      localStorage.setItem("hh_theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    },

    // Toggle between dark and light
    toggle: function () {
      window.HH.Theme.set(
        window.HH.Theme.get() === "dark" ? "light" : "dark"
      );
    },

    // Return true if dark mode is currently active
    isDark: function () {
      return window.HH.Theme.get() === "dark";
    }
  };
}());