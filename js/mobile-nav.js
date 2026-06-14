// ============================================================
// HourHero — js/mobile-nav.js
// Shared mobile sidebar / hamburger menu toggle
// ============================================================

(function () {
  window.HH = window.HH || {};

  HH.MobileNav = {
    init: function (dropdownId, btnSelector) {
      dropdownId  = dropdownId  || "app-mobile-dropdown";
      btnSelector = btnSelector || ".app-mobile-menu-btn";

      window.toggleMobileMenu = function () {
        var dropdown = document.getElementById(dropdownId);
        if (dropdown) dropdown.classList.toggle("open");
      };

      document.addEventListener("click", function (e) {
        var dropdown = document.getElementById(dropdownId);
        var btn      = document.querySelector(btnSelector);
        if (!dropdown || !btn) return;
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
          dropdown.classList.remove("open");
        }
      });
    }
  };
}());
