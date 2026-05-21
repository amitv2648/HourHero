/**
 * HourHero — js/geocode.js
 * Shared geocoding with Nominatim + Photon fallback for better pin accuracy.
 */
(function () {
  window.HH = window.HH || {};

  var CACHE = {};
  var UA = "HourHero/1.0 (https://hourhero.app; contact@hourhero.app)";

  function scoreResult(r) {
    var type = String(r.type || "").toLowerCase();
    var cls  = String(r.class || "").toLowerCase();
    var add  = String(r.addresstype || "").toLowerCase();
    var score = parseFloat(r.importance || 0) * 12;

    if (add === "house_number" || type === "house" || type === "building") score += 40;
    if (cls === "building" || cls === "amenity" || cls === "shop" || cls === "office") score += 25;
    if (type === "residential" || type === "commercial") score += 15;
    if (r.display_name && r.display_name.length < 120) score += 5;
    return score;
  }

  function pickBestNominatim(results) {
    if (!results || !results.length) return null;
    var best = results[0];
    var bestScore = scoreResult(best);
    for (var i = 1; i < results.length; i++) {
      var s = scoreResult(results[i]);
      if (s > bestScore) {
        best = results[i];
        bestScore = s;
      }
    }
    return best;
  }

  function nominatimSearch(query) {
    var url =
      "https://nominatim.openstreetmap.org/search?" +
      "q=" + encodeURIComponent(query) +
      "&format=json&limit=5&addressdetails=1";

    return fetch(url, {
      headers: {
        "Accept":          "application/json",
        "Accept-Language": "en",
        "User-Agent":      UA
      }
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var hit = pickBestNominatim(data);
        if (!hit) return null;
        return {
          lat: parseFloat(hit.lat),
          lng: parseFloat(hit.lon),
          source: "nominatim"
        };
      });
  }

  function photonSearch(query) {
    var url =
      "https://photon.komoot.io/api/?q=" +
      encodeURIComponent(query) + "&limit=3&lang=en";

    return fetch(url, { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var feats = (data && data.features) || [];
        if (!feats.length) return null;
        var best = feats[0];
        var bestScore = -1;
        feats.forEach(function (f) {
          var p = f.properties || {};
          var s = (p.osm_value === "house" ? 40 : 0) +
                  (p.osm_key === "building" ? 30 : 0) +
                  (p.importance || 0) * 10;
          if (s > bestScore) {
            best = f;
            bestScore = s;
          }
        });
        var coords = best.geometry && best.geometry.coordinates;
        if (!coords) return null;
        return {
          lat: coords[1],
          lng: coords[0],
          source: "photon"
        };
      });
  }

  HH.Geocode = {
    resolve: function (location) {
      var key = String(location || "").trim();
      if (!key) return Promise.resolve(null);
      if (CACHE[key]) return Promise.resolve(CACHE[key]);

      return nominatimSearch(key)
        .then(function (coord) {
          if (coord) {
            CACHE[key] = coord;
            return coord;
          }
          return photonSearch(key);
        })
        .then(function (coord) {
          if (coord) CACHE[key] = coord;
          return coord;
        })
        .catch(function () { return null; });
    }
  };
}());
