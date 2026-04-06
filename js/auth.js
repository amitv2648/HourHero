// ============================================================
// HourHero — js/auth.js
// ============================================================
// Depends on: js/firebase-config.js (must load first)
// ============================================================

window.HH = window.HH || {};


// ============================================================
// ROLE CACHE — localStorage helpers
// ============================================================
// We cache the role in localStorage the moment we know it.
// This means after the very first login, every future login
// never needs a database read at all — the role is read from
// localStorage instantly, which is synchronous and always works.
// ============================================================
HH._cacheRole = function (uid, role) {
  try {
    localStorage.setItem("hh_role_" + uid, role);
  } catch (e) {
    // localStorage blocked (private browsing etc) — not fatal
  }
};

HH._getCachedRole = function (uid) {
  try {
    var r = localStorage.getItem("hh_role_" + uid);
    if (r === "volunteer" || r === "org") return r;
  } catch (e) {}
  return null;
};

HH._clearCachedRole = function (uid) {
  try {
    localStorage.removeItem("hh_role_" + uid);
  } catch (e) {}
};


// ============================================================
// SIGN UP
// ============================================================
// 1. Firebase creates the Auth user        (~400ms, only wait)
// 2. Role cached in localStorage instantly
// 3. DB profile write fires in background  (does NOT block)
// 4. Resolves with the role string immediately
//
// Total user-facing wait: just step 1.
// ============================================================
HH.signUp = function (name, email, password, role) {
  return HH.auth
    .createUserWithEmailAndPassword(email, password)
    .then(function (credential) {
      var uid = credential.user.uid;

      // Cache role immediately — this is what makes all future
      // logins instant
      HH._cacheRole(uid, role);

      // Write profile to DB in the background without waiting
      if (role === "volunteer") {
        HH._createVolunteerProfile(uid, name, email);
      } else if (role === "org") {
        HH._createOrgProfile(uid, name, email);
      }

      // Resolve immediately with the known role
      return role;
    });
};


// ============================================================
// SIGN IN
// ============================================================
HH.signIn = function (email, password) {
  return HH.auth.signInWithEmailAndPassword(email, password);
};


// ============================================================
// SIGN OUT
// ============================================================
// Clears the role cache for this user so a different account
// logging in on the same device starts fresh.
// ============================================================
HH.signOut = function () {
  var user = HH.auth.currentUser;
  if (user) HH._clearCachedRole(user.uid);
  return HH.auth.signOut();
};


// ============================================================
// SEND PASSWORD RESET EMAIL
// ============================================================
HH.sendPasswordReset = function (email) {
  return HH.auth.sendPasswordResetEmail(email);
};


// ============================================================
// GET CURRENT USER
// ============================================================
HH.getCurrentUser = function () {
  return HH.auth.currentUser;
};


// ============================================================
// ON AUTH STATE CHANGE
// ============================================================
HH.onAuthStateChange = function (callback) {
  HH.auth.onAuthStateChanged(callback);
};


// ============================================================
// GET USER ROLE
// ============================================================
// Checks localStorage FIRST — instant, no network.
// Only hits the database if the cache is empty, which only
// happens on the very first login on a new device/browser.
// Caches the result so every subsequent call is instant.
// ============================================================
HH.getUserRole = function (uid) {

  // Instant path — cached from a previous session
  var cached = HH._getCachedRole(uid);
  if (cached) {
    return Promise.resolve(cached);
  }

  // First-time path — read from database once, then cache
  return HH.db
    .ref("users/" + uid + "/role")
    .once("value")
    .then(function (snap) {
      if (snap.exists()) {
        HH._cacheRole(uid, snap.val());
        return snap.val();
      }

      // Not in users/ — check organizations/
      return HH.db
        .ref("organizations/" + uid + "/role")
        .once("value")
        .then(function (orgSnap) {
          if (orgSnap.exists()) {
            HH._cacheRole(uid, orgSnap.val());
            return orgSnap.val();
          }
          return null;
        });
    });
};


// ============================================================
// GET USER PROFILE
// ============================================================
HH.getUserProfile = function (uid, role) {
  var path = role === "org"
    ? "organizations/" + uid
    : "users/" + uid;
  return HH.db.ref(path).once("value").then(function (snap) {
    return snap.exists() ? snap.val() : null;
  });
};


// ============================================================
// UPDATE DISPLAY NAME
// ============================================================
HH.updateDisplayName = function (uid, role, newName) {
  var path = role === "org"
    ? "organizations/" + uid + "/name"
    : "users/" + uid + "/name";
  return HH.db.ref(path).set(newName);
};


// ============================================================
// UPDATE EMAIL
// ============================================================
HH.updateEmail = function (uid, role, newEmail) {
  var path = role === "org"
    ? "organizations/" + uid + "/email"
    : "users/" + uid + "/email";
  return HH.auth.currentUser.updateEmail(newEmail).then(function () {
    return HH.db.ref(path).set(newEmail);
  });
};


// ============================================================
// SAVE NOTIFICATION PREFERENCES
// ============================================================
HH.saveNotificationPrefs = function (uid, role, prefs) {
  var path = role === "org"
    ? "organizations/" + uid + "/preferences/notifications"
    : "users/" + uid + "/preferences/notifications";
  return HH.db.ref(path).set(prefs);
};


// ============================================================
// MARK INSTALLATION COMPLETE
// ============================================================
HH.markInstalled = function (uid) {
  return HH.db
    .ref("users/" + uid + "/preferences/has_installed")
    .set(true);
};


// ============================================================
// PRIVATE — Create volunteer profile (background write)
// ============================================================
HH._createVolunteerProfile = function (uid, name, email) {
  return HH.db.ref("users/" + uid).set({
    uid:                  uid,
    name:                 name,
    email:                email,
    role:                 "volunteer",
    total_hours:          0,
    pending_count:        0,
    joined_opportunities: {},
    preferences: {
      notifications: {
        push:          true,
        email_summary: false
      },
      has_installed:  false,
      default_org_id: null
    },
    joined_at: Date.now()
  }).catch(function (err) {
    console.error("HourHero: volunteer profile write failed", err);
  });
};


// ============================================================
// PRIVATE — Create org profile (background write)
// ============================================================
HH._createOrgProfile = function (uid, name, email) {
  return HH.db.ref("organizations/" + uid).set({
    uid:           uid,
    name:          name,
    email:         email,
    role:          "org",
    opportunities: {},
    pending_count: 0,
    preferences: {
      notifications: {
        email_on_submission: true
      }
    },
    created_at: Date.now()
  }).catch(function (err) {
    console.error("HourHero: org profile write failed", err);
  });
};