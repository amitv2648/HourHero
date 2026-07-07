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


// ============================================================
// ORG — approve / reject volunteer hour submissions
// ============================================================
HH.approveSubmission = function (submissionKey, volunteerId, hours) {
  hours = parseFloat(hours || 0);

  return HH.db.ref("users/" + volunteerId + "/total_hours")
    .once("value")
    .then(function (snap) {
      var currentHours  = parseFloat(snap.val() || 0);
      var updatedHours  = currentHours + hours;

      return HH.db.ref("users/" + volunteerId + "/pending_count")
        .once("value")
        .then(function (pendingSnap) {
          var pending = parseInt(pendingSnap.val() || 0, 10);
          var updates = {};
          updates["submissions/" + submissionKey + "/status"]      = "approved";
          updates["submissions/" + submissionKey + "/reviewed_at"] = HH.TIMESTAMP;
          updates["users/" + volunteerId + "/total_hours"]         = updatedHours;
          if (pending > 0) {
            updates["users/" + volunteerId + "/pending_count"] = pending - 1;
          }
          return HH.db.ref().update(updates);
        });
    });
};

HH.rejectSubmission = function (submissionKey, volunteerId, note) {
  return HH.db.ref("users/" + volunteerId + "/pending_count")
    .once("value")
    .then(function (pendingSnap) {
      var pending = parseInt(pendingSnap.val() || 0, 10);
      var updates = {};
      updates["submissions/" + submissionKey + "/status"]         = "rejected";
      updates["submissions/" + submissionKey + "/reviewed_at"]    = HH.TIMESTAMP;
      updates["submissions/" + submissionKey + "/rejection_note"] = note || null;
      if (pending > 0) {
        updates["users/" + volunteerId + "/pending_count"] = pending - 1;
      }
      return HH.db.ref().update(updates);
    });
};


// ============================================================
// ORG — delete opportunity + unenroll participants
// ============================================================
HH.deleteOpportunity = function (orgUid, oppKey) {
  return HH.db.ref("opportunities/" + oppKey).once("value").then(function (snap) {
    if (!snap.exists()) {
      throw new Error("Opportunity not found.");
    }

    var opp = snap.val();
    if (opp.org_id !== orgUid) {
      throw new Error("You cannot delete this opportunity.");
    }

    var participantIds = opp.participants
      ? Object.keys(opp.participants)
      : [];

    var updates = {};
    updates["opportunities/" + oppKey]                             = null;
    updates["organizations/" + orgUid + "/opportunities/" + oppKey] = null;

    participantIds.forEach(function (volId) {
      updates["users/" + volId + "/joined_opportunities/" + oppKey] = null;
    });

    var meta = {
      title:   opp.title || "Untitled opportunity",
      orgName: opp.org_name || "",
      date:    opp.date || ""
    };

    return HH.db.ref().update(updates).then(function () {
      if (!participantIds.length) {
        return { volunteers: [], title: meta.title, orgName: meta.orgName, date: meta.date };
      }

      return Promise.all(participantIds.map(function (volId) {
        return HH.db.ref("users/" + volId).once("value").then(function (uSnap) {
          var v = uSnap.val() || {};
          return {
            email: v.email || "",
            name:  v.name  || "Volunteer"
          };
        });
      })).then(function (volunteers) {
        return {
          volunteers: volunteers.filter(function (v) { return v.email; }),
          title:      meta.title,
          orgName:    meta.orgName,
          date:       meta.date
        };
      });
    });
  });
};


HH.notifyOpportunityDeleted = function (payload) {
  return fetch("/api/notify-opportunity-deleted", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload)
  }).then(function (r) {
    return r.json().then(function (data) {
      if (!r.ok) throw new Error((data && data.error) || "Notification failed");
      return data;
    });
  });
};