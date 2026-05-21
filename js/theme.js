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
      });

      syncUI();
    }
  };
}());
