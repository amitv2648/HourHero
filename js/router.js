// ============================================================
// HourHero — js/router.js
// ============================================================
// Because getUserRole now reads from localStorage first,
// all role lookups are instant after the first login.
// No timeouts needed. No retries needed in the normal path.
// ============================================================

window.HH    = window.HH || {};
HH.Router    = {};


// ============================================================
// BASE PATH DETECTION
// ============================================================
HH.Router._base = (function () {
  var href = window.location.href;
  if (
    href.indexOf("/volunteer/") !== -1 ||
    href.indexOf("/org/")       !== -1
  ) {
    return "../";
  }
  return "";
}());


// ============================================================
// ROUTE DEFINITIONS
// ============================================================
HH.Router.PATHS = {
  landing: HH.Router._base + "index.html",
  auth:    HH.Router._base + "auth.html",

  volunteer: {
    dashboard:     HH.Router._base + "volunteer/dashboard.html",
    logHours:      HH.Router._base + "volunteer/log-hours.html",
    opportunities: HH.Router._base + "volunteer/opportunities.html",
    settings:      HH.Router._base + "volunteer/settings.html",
    install:       HH.Router._base + "volunteer/install.html"
  },

  org: {
    dashboard:    HH.Router._base + "org/dashboard.html",
    createOpp:    HH.Router._base + "org/create-opportunity.html",
    manageOpps:   HH.Router._base + "org/manage-opportunities.html",
    participants: HH.Router._base + "org/participants.html",
    submissions:  HH.Router._base + "org/submissions.html",
    settings:     HH.Router._base + "org/settings.html"
  }
};


// ============================================================
// REDIRECT LOCK
// ============================================================
HH.Router._redirecting = false;


// ============================================================
// PROTECT
// ============================================================
// Hides the page, waits for Firebase auth state, then either
// shows the page (role matches) or redirects.
//
// Because getUserRole checks localStorage first, the role
// lookup completes synchronously in the same tick as the
// Firebase callback on every session after the first login.
// ============================================================
HH.Router.protect = function (requiredRole) {
  document.documentElement.style.visibility = "hidden";

  var settled = false;

  HH.onAuthStateChange(function (user) {
    if (settled) return;

    if (!user) {
      settled = true;
      window.location.replace(HH.Router.PATHS.auth);
      return;
    }

    // Try localStorage first — instant
    var cached = HH._getCachedRole(user.uid);
    if (cached) {
      settled = true;
      if (cached !== requiredRole) {
        HH.Router._redirectToDashboard(cached);
        return;
      }
      window.HH._currentUid  = user.uid;
      window.HH._currentRole = cached;
      document.documentElement.style.visibility = "visible";
      if (typeof HH.Router._readyCallback === "function") {
        HH.Router._readyCallback(user.uid, cached);
        HH.Router._readyCallback = null;
      }
      return;
    }

    // Cache miss — read from DB once (first login on this device)
    HH.getUserRole(user.uid).then(function (role) {
      if (settled) return;
      settled = true;

      if (!role) {
        HH.signOut().then(function () {
          window.location.replace(HH.Router.PATHS.auth);
        });
        return;
      }

      if (role !== requiredRole) {
        HH.Router._redirectToDashboard(role);
        return;
      }

      window.HH._currentUid  = user.uid;
      window.HH._currentRole = role;
      document.documentElement.style.visibility = "visible";

      if (typeof HH.Router._readyCallback === "function") {
        HH.Router._readyCallback(user.uid, role);
        HH.Router._readyCallback = null;
      }
    }).catch(function (err) {
      if (settled) return;
      settled = true;
      console.error("HourHero Router: getUserRole failed in protect()", err);
      // Show the page rather than leaving it blank forever
      document.documentElement.style.visibility = "visible";
    });
  });
};


// ============================================================
// ON READY
// ============================================================
HH.Router.onReady = function (callback) {
  HH.Router._readyCallback = callback;
};


// ============================================================
// INIT PUBLIC PAGE — for index.html and auth.html only
// ============================================================
HH.Router.initPublicPage = function () {
  var fired = false;

  HH.onAuthStateChange(function (user) {
    if (fired)                  return;
    if (HH.Router._redirecting) return;
    if (!user)                  return;

    fired = true;
    HH.Router._redirecting = true;
    HH.Router._doRedirectAfterAuth(user.uid);
  });
};


// ============================================================
// REDIRECT AFTER AUTH — called from login button
// ============================================================
HH.Router.redirectAfterAuth = function (uid) {
  if (HH.Router._redirecting) return;
  HH.Router._redirecting = true;
  HH.Router._doRedirectAfterAuth(uid);
};


// ============================================================
// INTERNAL — get role then navigate
// ============================================================
// Because getUserRole checks localStorage first, this is
// instant for any user who has logged in before.
// For a brand-new signup, the role was cached in HH.signUp
// before this function is ever called, so it is also instant.
// The database is never touched in the normal login/signup path.
// ============================================================
HH.Router._doRedirectAfterAuth = function (uid) {
  HH.getUserRole(uid).then(function (role) {
    if (role) {
      HH.Router._redirectToDashboard(role);
      return;
    }

    // Role not in cache or DB yet — only happens if signup DB
    // write hasn't landed yet. Retry every 600ms.
    function retry() {
      HH.getUserRole(uid).then(function (r) {
        if (r) {
          HH.Router._redirectToDashboard(r);
        } else {
          setTimeout(retry, 600);
        }
      }).catch(function () {
        setTimeout(retry, 600);
      });
    }
    setTimeout(retry, 600);

  }).catch(function (err) {
    console.error("HourHero Router: _doRedirectAfterAuth error", err);
    setTimeout(function () {
      HH.Router._doRedirectAfterAuth(uid);
    }, 800);
  });
};


// ============================================================
// GO TO
// ============================================================
HH.Router.goTo = function (mode, page) {
  var paths = HH.Router.PATHS[mode];
  if (!paths || !paths[page]) {
    console.error("HourHero Router: unknown route", mode, page);
    return;
  }
  window.location.href = paths[page];
};


// ============================================================
// SIGN OUT
// ============================================================
HH.Router.signOutAndRedirect = function () {
  HH.Router._redirecting = false;
  HH.signOut().then(function () {
    window.location.replace(HH.Router.PATHS.auth);
  }).catch(function () {
    window.location.replace(HH.Router.PATHS.auth);
  });
};


// ============================================================
// PRIVATE — navigate to the dashboard for a given role
// ============================================================
HH.Router._redirectToDashboard = function (role) {
  if (role === "volunteer") {
    window.location.replace(HH.Router.PATHS.volunteer.dashboard);
  } else if (role === "org") {
    window.location.replace(HH.Router.PATHS.org.dashboard);
  } else {
    console.error("HourHero Router: unknown role", role);
    window.location.replace(HH.Router.PATHS.auth);
  }
};