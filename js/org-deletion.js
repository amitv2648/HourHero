// ============================================================
// HourHero — js/org-deletion.js
// Organization deletion, audit logging, and related functions
// Must load after firebase-config.js
// ============================================================

// ============================================================
// AUDIT LOGGING
// ============================================================
HH.logAuditEvent = function (action, orgId, data) {
  var timestamp = Date.now();
  var logId     = "" + timestamp + "_" + Math.random().toString(36).substr(2, 9);
  var logEntry  = {
    timestamp:        timestamp,
    action:           action,
    org_id:           orgId,
    opportunity_id:   data.opportunity_id   || null,
    opportunity_name: data.opportunity_name || null,
    org_name:         data.org_name         || null,
    volunteers_affected:  (data.volunteers || []).length,
    emails_sent:      data.emails_sent      || 0,
    emails_failed:    (data.emails_total || 0) - (data.emails_sent || 0)
  };
  return HH.db.ref("audit_logs/" + logId).set(logEntry)
    .catch(function (err) {
      console.error("HourHero: Audit log write failed", err);
    });
};


// ============================================================
// ORG — delete organization (cascade delete all opportunities)
// ============================================================
HH.deleteOrganization = function (orgUid) {
  return HH.db.ref("organizations/" + orgUid).once("value").then(function (snap) {
    if (!snap.exists()) {
      throw new Error("Organization not found.");
    }
    var org = snap.val();
    var orgName = org.name || "Untitled";
    var opportunities = org.opportunities || {};
    var oppIds = Object.keys(opportunities);
    var volunteerMap = {};

    var oppPromises = oppIds.map(function (oppId) {
      return HH.db.ref("opportunities/" + oppId).once("value").then(function (oppSnap) {
        if (!oppSnap.exists()) return [];
        var opp = oppSnap.val();
        var participants = opp.participants || {};
        return Object.keys(participants).map(function (volId) {
          return { oppId: oppId, volId: volId, oppTitle: opp.title || "" };
        });
      });
    });

    return Promise.all(oppPromises).then(function (results) {
      var allParticipants = [].concat.apply([], results);
      var volIds = {};
      allParticipants.forEach(function (p) {
        volIds[p.volId] = true;
      });

      var volPromises = Object.keys(volIds).map(function (volId) {
        return HH.db.ref("users/" + volId).once("value").then(function (vSnap) {
          if (vSnap.exists()) {
            var v = vSnap.val();
            volunteerMap[volId] = {
              email: v.email || "",
              name:  v.name  || "Volunteer"
            };
          }
          return volId;
        });
      });

      return Promise.all(volPromises).then(function () {
        var updates = {};
        updates["organizations/" + orgUid] = null;
        oppIds.forEach(function (oppId) {
          updates["opportunities/" + oppId] = null;
        });
        allParticipants.forEach(function (p) {
          updates["users/" + p.volId + "/joined_opportunities/" + p.oppId] = null;
        });

        return HH.db.ref().update(updates).then(function () {
          var volunteers = Object.keys(volunteerMap)
            .map(function (id) { return volunteerMap[id]; })
            .filter(function (v) { return v.email; });
          return {
            volunteers: volunteers,
            org_name:   orgName,
            opportunity_count: oppIds.length
          };
        });
      });
    });
  });
};

HH.notifyOrgDeleted = function (payload) {
  return fetch("/api/notify-org-deleted", {
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
