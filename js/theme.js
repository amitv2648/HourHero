// ============================================================
// HourHero — js/theme.js
// Load in <head> before CSS when possible to avoid theme flash.
// ============================================================

(function () {
  var saved = localStorage.getItem("hh_theme");

  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else if (saved === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }

  window.HH = window.HH || {};
  window.HH.Theme = {

    get: function () {
      var attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") return attr;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark" : "light";
    },

    getSaved: function () {
      return localStorage.getItem("hh_theme");
    },

    set: function (theme) {
      localStorage.setItem("hh_theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    },

    toggle: function () {
      window.HH.Theme.set(
        window.HH.Theme.get() === "dark" ? "light" : "dark"
      );
    },

    isDark: function () {
      return window.HH.Theme.get() === "dark";
    },

    /** Wire settings page dark-mode checkbox + status label */
    bindToggle: function (checkboxId, statusId) {
      var cb     = document.getElementById(checkboxId);
      var status = statusId ? document.getElementById(statusId) : null;
      if (!cb) return;

      function syncUI() {
        var saved = localStorage.getItem("hh_theme");
        var dark  = window.HH.Theme.isDark();
        cb.checked = dark;
        if (status) {
          status.textContent = !saved
            ? "Follows system setting"
            : (dark ? "Dark mode on" : "Light mode on");
        }
      }

      cb.addEventListener("change", function () {
        window.HH.Theme.set(cb.checked ? "dark" : "light");
        syncUI();
        document.querySelectorAll(".nav-menu-theme-cb").forEach(function (el) {
          el.checked = cb.checked;
        });
      });

      syncUI();
    },

    /** Icon button for public pages (landing, auth, privacy) */
    bindPublicToggle: function (buttonId) {
      var btn = document.getElementById(buttonId);
      if (!btn) return;

      function syncIcon() {
        var dark = window.HH.Theme.isDark();
        btn.innerHTML = dark
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        btn.title = dark ? "Switch to light mode" : "Switch to dark mode";
        btn.setAttribute("aria-label", btn.title);
      }

      btn.addEventListener("click", function () {
        window.HH.Theme.toggle();
        syncIcon();
      });

      syncIcon();
    }
  };
}());
