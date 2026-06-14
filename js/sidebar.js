// ============================================================
// HourHero — js/sidebar.js
// Collapsible sidebar for volunteer + organization modes
// ============================================================

(function () {
  window.HH = window.HH || {};

  var STORAGE = {
    volunteer: "hh_sidebar_collapsed_volunteer",
    org:       "hh_sidebar_collapsed_org"
  };

  (function applyStoredStateEarly() {
    var path = window.location.pathname || "";
    var mode = path.indexOf("/volunteer/") !== -1
      ? "volunteer"
      : path.indexOf("/org/") !== -1
        ? "org"
        : null;
    if (!mode) return;
    try {
      if (localStorage.getItem(STORAGE[mode]) === "1") {
        document.documentElement.classList.add("sidebar-collapsed");
        document.documentElement.setAttribute("data-sidebar-mode", mode);
      }
    } catch (e) {}
  }());

  var CHEVRON =
    '<svg class="sidebar-toggle-icon" width="18" height="18" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="15 18 9 12 15 6"/>' +
    "</svg>";

  function isCollapsed(mode) {
    try {
      return localStorage.getItem(STORAGE[mode]) === "1";
    } catch (e) {
      return false;
    }
  }

  function setCollapsed(mode, collapsed) {
    document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
    document.documentElement.setAttribute("data-sidebar-mode", mode);
    try {
      localStorage.setItem(STORAGE[mode], collapsed ? "1" : "0");
    } catch (e) {}

    var btn = document.querySelector(".app-sidebar .sidebar-toggle");
    if (btn) {
      btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      btn.setAttribute(
        "aria-label",
        collapsed ? "Expand sidebar" : "Collapse sidebar"
      );
      btn.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
    }
  }

  function ensureHeader(sidebar) {
    var header = sidebar.querySelector(".sidebar-header");
    var logo   = sidebar.querySelector(".org-sidebar-logo");

    if (!header) {
      header = document.createElement("div");
      header.className = "sidebar-header";
      if (logo) {
        logo.parentNode.insertBefore(header, logo);
        header.appendChild(logo);
      }
      sidebar.insertBefore(header, sidebar.firstChild);
    }

    if (!header.querySelector(".sidebar-toggle")) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sidebar-toggle";
      btn.innerHTML = CHEVRON;
      header.appendChild(btn);
    }
  }

  HH.Sidebar = {
    init: function (mode) {
      var selector = mode === "volunteer" ? ".vol-sidebar" : ".org-sidebar";
      var sidebar  = document.querySelector(selector);
      if (!sidebar) return;

      sidebar.classList.add("app-sidebar");

      ensureHeader(sidebar);

      var btn = sidebar.querySelector(".sidebar-toggle");
      if (!btn || btn._hhSidebarBound) return;
      btn._hhSidebarBound = true;

      setCollapsed(mode, isCollapsed(mode));

      btn.addEventListener("click", function () {
        var collapsed = !document.documentElement.classList.contains(
          "sidebar-collapsed"
        );
        setCollapsed(mode, collapsed);
      });
    }
  };
}());
