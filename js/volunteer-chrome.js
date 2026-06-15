// ============================================================
// HourHero — js/volunteer-chrome.js
// Shared volunteer sidebar HTML + init helpers
// ============================================================

(function () {
  window.HH = window.HH || {};

  var NAV_ITEMS = [
    { id: "dashboard",     href: "dashboard.html",     label: "Dashboard", icon: "dashboard" },
    { id: "log-hours",     href: "log-hours.html",     label: "Log hours", icon: "clock" },
    { id: "opportunities", href: "opportunities.html", label: "Explore",   icon: "search" },
    { id: "badges",        href: "badges.html",        label: "Badges",    icon: "badge" },
    { id: "leaderboard",   href: "leaderboard.html",   label: "Leaderboard", icon: "trophy" }
  ];

  var ICONS = {
    dashboard: '<svg class="org-nav-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    clock:     '<svg class="org-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    search:    '<svg class="org-nav-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    badge:     '<svg class="org-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>',
    trophy:    '<svg class="org-nav-icon" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
    settings:  '<svg class="org-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
  };

  function navLink(item, activePage) {
    var cls = item.id === activePage ? "org-nav-item active" : "org-nav-item";
    return '<a href="' + item.href + '" class="' + cls + '">' +
      ICONS[item.icon] + item.label + "</a>";
  }

  function mobileLink(item, activePage) {
    var cls = item.id === activePage ? "active" : "";
    return '<a href="' + item.href + '" class="' + cls + '">' + item.label + "</a>";
  }

  HH.VolunteerChrome = {
    render: function (activePage) {
      var mainNav = NAV_ITEMS.map(function (item) {
        return navLink(item, activePage);
      }).join("");

      var mobileNav = NAV_ITEMS.map(function (item) {
        return mobileLink(item, activePage);
      }).join("");

      var settingsActive = activePage === "settings" ? " active" : "";
      var settingsMobile = activePage === "settings" ? " active" : "";

      return (
        '<aside class="app-sidebar vol-sidebar org-sidebar">' +
          '<div class="sidebar-header">' +
            '<div class="org-sidebar-logo">HourHero</div>' +
          '</div>' +
          '<div class="org-sidebar-label">Main</div>' +
          '<nav class="org-sidebar-nav">' + mainNav + "</nav>" +
          '<div class="org-sidebar-label" style="margin-top:auto;">Account</div>' +
          '<nav class="org-sidebar-nav">' +
            '<a href="settings.html" class="org-nav-item' + settingsActive + '">' +
              ICONS.settings + "Settings" +
            "</a>" +
          "</nav>" +
        "</aside>" +
        '<nav class="app-mobile-nav">' +
          '<span class="app-mobile-nav-logo">HourHero</span>' +
          '<div class="app-mobile-nav-right">' +
            '<button type="button" class="app-mobile-menu-btn" onclick="toggleMobileMenu()" title="Menu">' +
              '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' +
              "</svg>" +
            "</button>" +
            '<div class="profile-menu-mount"></div>' +
          "</div>" +
        "</nav>" +
        '<div class="app-mobile-dropdown" id="app-mobile-dropdown">' +
          mobileNav +
          '<a href="settings.html" class="' + settingsMobile + '">Settings</a>' +
        "</div>" +
        '<div class="app-profile-corner">' +
          '<div class="profile-menu-mount"></div>' +
        "</div>"
      );
    },

    mount: function (activePage) {
      var mount = document.getElementById("vol-chrome-root");
      if (!mount) return;
      mount.innerHTML = HH.VolunteerChrome.render(activePage);
      HH.MobileNav.init("app-mobile-dropdown");
      HH.NavMenu.init({
        role: "volunteer",
        settingsPath: "settings.html",
        mountSelector: ".profile-menu-mount"
      });

      if (window.HH.Sidebar) {
        HH.Sidebar.init("volunteer");
      }
    }
  };
}());
