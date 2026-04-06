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