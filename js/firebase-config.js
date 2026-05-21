// ============================================================
// HourHero — js/firebase-config.js
// ============================================================
// PASTE YOUR REAL VALUES FROM THE FIREBASE CONSOLE BELOW.
// Every "YOUR_..." placeholder must be replaced.
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyCnex3xYs8M7cyny4_oO8iKDjQvDWF_ufU",
  authDomain:        "hourhero-000.firebaseapp.com",
  databaseURL:       "https://hourhero-000-default-rtdb.firebaseio.com",
  projectId:         "hourhero-000",
  storageBucket:     "hourhero-000.firebasestorage.app",
  messagingSenderId: "365662665813",
  appId:             "1:365662665813:web:9f9cc391b2bee58882e8dc"
};

firebase.initializeApp(firebaseConfig);

window.HH = window.HH || {};
window.HH.auth = firebase.auth();
window.HH.db   = firebase.database();
window.HH.TIMESTAMP = firebase.database.ServerValue.TIMESTAMP;
window.HH._currentUid  = null;
window.HH._currentRole = null;

// Pre-warm the database WebSocket connection immediately on
// page load so it is already open when the user clicks a button
window.HH.db.ref(".info/connected").on("value", function () {});


// ============================================================
// DB HELPERS — client-side filters (no Firebase indexes needed)
// Indexed .orderByChild().equalTo() queries fail without
// console indexes and leave dashboards stuck on "Loading...".
// ============================================================
HH._forEachChild = function (snap, fn) {
  if (!snap || !snap.exists()) return;
  snap.forEach(fn);
};

HH.listSubmissionsForVolunteer = function (uid) {
  return HH.db.ref("submissions").once("value").then(function (snap) {
    var list = [];
    HH._forEachChild(snap, function (c) {
      var s = c.val();
      if (s && s.volunteer_id === uid) {
        s._key = c.key;
        list.push(s);
      }
    });
    return list;
  });
};

HH.listenSubmissionsForVolunteer = function (uid, callback, onError) {
  return HH.db.ref("submissions").on(
    "value",
    function (snap) {
      var list = [];
      HH._forEachChild(snap, function (c) {
        var s = c.val();
        if (s && s.volunteer_id === uid) {
          s._key = c.key;
          list.push(s);
        }
      });
      callback(list);
    },
    onError || function (err) { console.error("HourHero DB:", err); callback([]); }
  );
};

HH.listSubmissionsForOrg = function (uid) {
  return HH.db.ref("submissions").once("value").then(function (snap) {
    var list = [];
    HH._forEachChild(snap, function (c) {
      var s = c.val();
      if (s && s.org_id === uid) {
        s._key = c.key;
        list.push(s);
      }
    });
    return list;
  });
};

HH.listenSubmissionsForOrg = function (uid, callback, onError) {
  return HH.db.ref("submissions").on(
    "value",
    function (snap) {
      var list = [];
      HH._forEachChild(snap, function (c) {
        var s = c.val();
        if (s && s.org_id === uid) {
          s._key = c.key;
          list.push(s);
        }
      });
      callback(list);
    },
    onError || function (err) { console.error("HourHero DB:", err); callback([]); }
  );
};

HH.listOpenOpportunities = function () {
  return HH.db.ref("opportunities").once("value").then(function (snap) {
    var list = [];
    HH._forEachChild(snap, function (c) {
      var o = c.val();
      if (o && (o.status === "open" || o.status == null)) {
        o._key = c.key;
        list.push(o);
      }
    });
    list.sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
    return list;
  });
};

HH._isOpenOpportunity = function (o) {
  return o && (o.status === "open" || o.status == null);
};

HH.listenOpenOpportunities = function (callback, onError) {
  return HH.db.ref("opportunities").on(
    "value",
    function (snap) {
      var list = [];
      HH._forEachChild(snap, function (c) {
        var o = c.val();
        if (HH._isOpenOpportunity(o)) {
          o._key = c.key;
          list.push(o);
        }
      });
      list.sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
      callback(list);
    },
    onError || function (err) { console.error("HourHero DB:", err); callback([]); }
  );
};

HH.listOpportunitiesForOrg = function (uid) {
  return HH.db.ref("opportunities").once("value").then(function (snap) {
    var list = [];
    HH._forEachChild(snap, function (c) {
      var o = c.val();
      if (o && o.org_id === uid) {
        o._key = c.key;
        list.push(o);
      }
    });
    list.sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
    return list;
  });
};

HH.listenOpportunitiesForOrg = function (uid, callback, onError) {
  return HH.db.ref("opportunities").on(
    "value",
    function (snap) {
      var list = [];
      HH._forEachChild(snap, function (c) {
        var o = c.val();
        if (o && o.org_id === uid) {
          o._key = c.key;
          list.push(o);
        }
      });
      list.sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
      callback(list);
    },
    onError || function (err) { console.error("HourHero DB:", err); callback([]); }
  );
};