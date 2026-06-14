// ============================================================
// HourHero — js/nav-menu.js
// Profile menu (theme, settings, sign out, delete account)
// Depends on: theme.js, auth.js, router.js, firebase-config.js
// ============================================================

(function () {
  window.HH = window.HH || {};

  var _role         = null;
  var _settingsPath = "settings.html";
  var _profile      = {};
  var _uid          = null;

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ensureModal() {
    if (document.getElementById("hh-delete-modal")) return;

    var modal = document.createElement("div");
    modal.id = "hh-delete-modal";
    modal.className = "hh-delete-modal";
    modal.innerHTML =
      '<div class="hh-delete-modal-backdrop"></div>' +
      '<div class="hh-delete-modal-panel" role="dialog" aria-labelledby="hh-delete-title">' +
        '<h2 id="hh-delete-title" class="hh-delete-modal-title">Delete account permanently?</h2>' +
        '<p class="hh-delete-modal-text">' +
          "This action cannot be undone. All your data will be permanently removed." +
        "</p>" +
        '<ul class="hh-delete-modal-list" id="hh-delete-list"></ul>' +
        '<label class="hh-delete-modal-label" for="hh-delete-password">' +
          "Enter your password to confirm" +
        "</label>" +
        '<input class="form-input" type="password" id="hh-delete-password" ' +
          'placeholder="Your current password" autocomplete="current-password"/>' +
        '<div class="hh-delete-modal-error" id="hh-delete-error"></div>' +
        '<div class="hh-delete-modal-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm" id="hh-delete-cancel">' +
            "Cancel" +
          "</button>" +
          '<button type="button" class="btn btn-danger btn-sm" id="hh-delete-confirm">' +
            "Yes, delete my account" +
          "</button>" +
        "</div>" +
      "</div>";

    document.body.appendChild(modal);

    modal.querySelector(".hh-delete-modal-backdrop").addEventListener("click", closeDeleteModal);
    document.getElementById("hh-delete-cancel").addEventListener("click", closeDeleteModal);
    document.getElementById("hh-delete-confirm").addEventListener("click", executeDelete);
  }

  function closeDeleteModal() {
    var modal = document.getElementById("hh-delete-modal");
    if (!modal) return;
    modal.classList.remove("open");
    document.getElementById("hh-delete-password").value = "";
    document.getElementById("hh-delete-error").textContent = "";
  }

  function openDeleteModal() {
    ensureModal();
    var list = document.getElementById("hh-delete-list");
    var items = _role === "org"
      ? [
          "Your organization profile will be removed",
          "All posted opportunities will be deleted",
          "All submission records will be lost"
        ]
      : [
          "Your account and login credentials will be removed",
          "All your submitted hour logs will be deleted",
          "Your total hours and points will be wiped from the leaderboard",
          "You will be removed from all joined opportunities"
        ];

    list.innerHTML = items.map(function (t) {
      return '<li>' + escHtml(t) + "</li>";
    }).join("");

    document.getElementById("hh-delete-modal").classList.add("open");
    document.getElementById("hh-delete-password").focus();
  }

  function executeDelete() {
    var pass   = document.getElementById("hh-delete-password").value;
    var errEl  = document.getElementById("hh-delete-error");
    var btn    = document.getElementById("hh-delete-confirm");
    errEl.textContent = "";

    if (!pass) {
      errEl.textContent = "Please enter your password to confirm.";
      return;
    }

    if (!_profile.email || !HH.auth.currentUser) {
      errEl.textContent = "Could not verify your account. Try signing in again.";
      return;
    }

    btn.disabled    = true;
    btn.textContent = "Deleting...";

    var credential = firebase.auth.EmailAuthProvider.credential(_profile.email, pass);

    HH.auth.currentUser.reauthenticateWithCredential(credential)
      .then(function () {
        if (_role === "org") {
          var updates = {};
          updates["organizations/" + _uid] = null;
          return HH.db.ref().update(updates);
        }

        var wipes = {};
        wipes["users/" + _uid] = null;
        var joinedIds = Object.keys(_profile.joined_opportunities || {});
        joinedIds.forEach(function (oppId) {
          wipes["opportunities/" + oppId + "/participants/" + _uid] = null;
        });
        return HH.db.ref().update(wipes);
      })
      .then(function () {
        if (_role === "volunteer") {
          return HH.listSubmissionsForVolunteer(_uid);
        }
        return [];
      })
      .then(function (list) {
        if (_role !== "volunteer" || !list.length) return;
        var submissionWipes = {};
        list.forEach(function (s) {
          submissionWipes["submissions/" + s._key] = null;
        });
        return HH.db.ref().update(submissionWipes);
      })
      .then(function () {
        HH._clearCachedRole(_uid);
        return HH.auth.currentUser.delete();
      })
      .then(function () {
        window.location.replace(HH.Router.PATHS.landing);
      })
      .catch(function (e) {
        btn.disabled    = false;
        btn.textContent = "Yes, delete my account";
        errEl.textContent = e.code === "auth/wrong-password"
          ? "Incorrect password."
          : (e.message || "Delete failed.");
      });
  }

  function closeDropdown() {
    document.querySelectorAll(".nav-menu-dropdown.open").forEach(function (el) {
      el.classList.remove("open");
    });
    document.querySelectorAll(".nav-avatar-btn[aria-expanded='true']").forEach(function (el) {
      el.setAttribute("aria-expanded", "false");
    });
  }

  function toggleDropdown(btn, menu) {
    var isOpen = menu.classList.contains("open");
    closeDropdown();
    if (!isOpen) {
      menu.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
    }
  }

    function syncThemeToggle(cb) {
      if (!cb) return;

      function syncAll() {
        var dark = HH.Theme.isDark();
        document.querySelectorAll(".nav-menu-theme-cb").forEach(function (el) {
          el.checked = dark;
        });
        var settingsToggle = document.getElementById("toggle-dark");
        if (settingsToggle) settingsToggle.checked = dark;
      }

      syncAll();
      cb.addEventListener("change", function () {
        HH.Theme.set(cb.checked ? "dark" : "light");
        syncAll();
      });
    }

  function buildMenuHTML() {
    return (
      '<div class="nav-menu-wrap">' +
        '<button type="button" class="nav-avatar nav-avatar-btn" ' +
          'aria-haspopup="true" aria-expanded="false" aria-label="Account menu">' +
          '<span class="nav-avatar-initials">HH</span>' +
        "</button>" +
        '<div class="nav-menu-dropdown" role="menu">' +
          '<div class="nav-menu-theme-row" role="none">' +
            '<span class="nav-menu-theme-label">Dark mode</span>' +
            '<label class="toggle-wrap nav-menu-theme-toggle">' +
              '<input type="checkbox" class="nav-menu-theme-cb" aria-label="Toggle dark mode"/>' +
              '<div class="toggle-track"><div class="toggle-thumb"></div></div>' +
            "</label>" +
          "</div>" +
          '<div class="nav-menu-divider"></div>' +
          '<a href="' + escHtml(_settingsPath) + '" class="nav-menu-item" role="menuitem">' +
            "Settings" +
          "</a>" +
          '<button type="button" class="nav-menu-item nav-menu-signout" role="menuitem">' +
            "Sign out" +
          "</button>" +
          '<div class="nav-menu-divider"></div>' +
          '<button type="button" class="nav-menu-item nav-menu-item-danger nav-menu-delete" ' +
            'role="menuitem">' +
            "Delete account" +
          "</button>" +
        "</div>" +
      "</div>"
    );
  }

  function wireMenu(container) {
    var btn  = container.querySelector(".nav-avatar-btn");
    var menu = container.querySelector(".nav-menu-dropdown");
    if (!btn || !menu) return;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleDropdown(btn, menu);
    });

    syncThemeToggle(container.querySelector(".nav-menu-theme-cb"));

    container.querySelector(".nav-menu-signout").addEventListener("click", function () {
      closeDropdown();
      HH.Router.signOutAndRedirect();
    });

    container.querySelector(".nav-menu-delete").addEventListener("click", function () {
      closeDropdown();
      openDeleteModal();
    });

    menu.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  function setAllInitials(initials) {
    document.querySelectorAll(".nav-avatar-initials").forEach(function (el) {
      el.textContent = initials;
    });
  }

  function loadProfile(uid) {
    var path = _role === "org" ? "organizations/" + uid : "users/" + uid;
    return HH.db.ref(path).once("value").then(function (snap) {
      _profile = snap.exists() ? snap.val() : {};
      _uid     = uid;
      var name = _profile.name || "HH";
      var parts = name.trim().split(" ");
      var initials = parts.length === 1
        ? parts[0].charAt(0).toUpperCase()
        : (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
      setAllInitials(initials);
    });
  }

  document.addEventListener("click", function () {
    closeDropdown();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeDropdown();
      closeDeleteModal();
    }
  });

  HH.NavMenu = {
    /**
     * Mount profile menu into container(s).
     * opts: { role, settingsPath, mountSelector, uid (optional) }
     */
    init: function (opts) {
      opts = opts || {};
      _role         = opts.role || "volunteer";
      _settingsPath = opts.settingsPath || "settings.html";

      var mounts = opts.mountSelector
        ? document.querySelectorAll(opts.mountSelector)
        : [document.querySelector(".top-nav-right")].filter(Boolean);

      if (!mounts.length) return;

      mounts.forEach(function (mount) {
        mount.innerHTML = buildMenuHTML();
        wireMenu(mount);
      });

      if (opts.uid) {
        loadProfile(opts.uid);
      } else if (HH.Router && HH.Router.onReady) {
        HH.Router.onReady(function (uid) {
          loadProfile(uid);
        });
      }
    },

    setInitials: function (initials) {
      setAllInitials(initials);
    },

    promptDelete: openDeleteModal
  };
}());
