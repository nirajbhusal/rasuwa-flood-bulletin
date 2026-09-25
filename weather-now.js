/*! High-alert places for Nepal now. Same rules as scripts/weather/build.py. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WeatherNow = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var LEVEL_RANK = { red: 4, orange: 3, yellow: 2, green: 1 };
  var FEW_REDS = 8;
  var HOME_CAP = 12;
  var CORRIDOR_PAGE = 12311;
  var CORRIDOR_ORDER = ["rasuwa", "nuwakot", "dhading", "gorkha", "chitwan"];
  var LEVEL_COLOR = { red: "#d7191c", orange: "#e65c00", yellow: "#e6b800", green: "#1b7f3a" };

  function windowOpen(end, nowIso) {
    if (!end) return false;
    var endMs = Date.parse(end);
    var nowMs = nowIso ? Date.parse(nowIso) : Date.now();
    if (isNaN(endMs) || isNaN(nowMs)) return false;
    return endMs > nowMs;
  }

  function provincesAt(alert, date, level) {
    var days = (alert && alert.warning_days) || [];
    for (var i = 0; i < days.length; i++) {
      if (days[i].date !== date) continue;
      var found = [];
      var provinces = days[i].provinces || {};
      Object.keys(provinces).forEach(function (pid) {
        if (provinces[pid] && provinces[pid].level === level) found.push(pid);
      });
      return found;
    }
    return [];
  }

  function pageId(call) {
    var n = parseInt(call && call.page_id, 10);
    return isNaN(n) ? null : n;
  }

  function warningLevel(alert, date, province) {
    var days = (alert && alert.warning_days) || [];
    for (var i = 0; i < days.length; i++) {
      if (days[i].date === date) {
        var cell = (days[i].provinces || {})[province] || {};
        return cell.level || null;
      }
    }
    return null;
  }

  function districtDayLevel(alert, date, districtId) {
    var days = (alert && alert.warning_days) || [];
    for (var i = 0; i < days.length; i++) {
      if (days[i].date !== date) continue;
      var dists = days[i].districts;
      if (!dists || !districtId || !dists[districtId]) return null;
      var cell = dists[districtId];
      return typeof cell === "string" ? cell : (cell.level || null);
    }
    return null;
  }

  function dayHasDistricts(alert, date) {
    var days = (alert && alert.warning_days) || [];
    for (var i = 0; i < days.length; i++) {
      if (days[i].date === date && days[i].districts && Object.keys(days[i].districts).length) return true;
    }
    return false;
  }

  function alertLevel(alert, districtId, province, date, nowIso) {
    var found = [];
    var own = districtDayLevel(alert, date, districtId);
    if (LEVEL_RANK[own]) found.push(own);
    else if (!dayHasDistricts(alert, date)) {
      var dayLevel = warningLevel(alert, date, province);
      if (LEVEL_RANK[dayLevel]) found.push(dayLevel);
    }
    ((alert && alert.district_warnings) || []).forEach(function (row) {
      if (row.id === districtId && windowOpen(row.window_end, nowIso) && LEVEL_RANK[row.level]) found.push(row.level);
    });
    var call = (alert && alert.callout) || {};
    var ids = (call.districts || []).map(function (row) { return row.id; });
    if (ids.indexOf(districtId) >= 0 && windowOpen(call.window_end, nowIso) && LEVEL_RANK[call.level]) found.push(call.level);
    if (!found.length) return null;
    return found.sort(function (a, b) { return LEVEL_RANK[b] - LEVEL_RANK[a]; })[0];
  }

  function selectAlertPlaces(alert, catalog, date, nowIso) {
    catalog = catalog || [];
    var byId = {};
    catalog.forEach(function (row) {
      if (row && row.district) byId[row.district] = row;
    });
    var redIds = catalog.filter(function (row) {
      if (dayHasDistricts(alert, date)) return districtDayLevel(alert, date, row.district) === "red";
      return provincesAt(alert, date, "red").indexOf(row.province) >= 0;
    }).sort(function (a, b) {
      return String(a.en || "").localeCompare(String(b.en || ""));
    }).map(function (row) { return row.district; });
    var orangeIds = [];
    if (redIds.length < FEW_REDS) {
      orangeIds = catalog.filter(function (row) {
        if (dayHasDistricts(alert, date)) {
          return districtDayLevel(alert, date, row.district) === "orange" && redIds.indexOf(row.district) < 0;
        }
        return provincesAt(alert, date, "orange").indexOf(row.province) >= 0 && redIds.indexOf(row.district) < 0;
      }).sort(function (a, b) {
        return String(a.en || "").localeCompare(String(b.en || ""));
      }).map(function (row) { return row.district; });
    }
    var call = (alert && alert.callout) || {};
    var callOpen = windowOpen(call.window_end, nowIso);
    var pins = callOpen && pageId(call) === CORRIDOR_PAGE ? CORRIDOR_ORDER.slice() : [];
    var extra = callOpen ? (call.districts || []).map(function (row) { return row.id; }) : [];
    var warns = [];
    ((alert && alert.district_warnings) || []).forEach(function (row) {
      if (windowOpen(row.window_end, nowIso) && row.id) warns.push(row.id);
    });
    var ordered = [];
    var seen = {};
    function add(id) {
      if (!id || seen[id] || !byId[id]) return;
      seen[id] = 1;
      ordered.push(id);
    }
    pins.concat(warns, extra, redIds, orangeIds).forEach(add);
    return ordered.map(function (id) {
      var copy = {};
      var base = byId[id];
      Object.keys(base).forEach(function (key) { copy[key] = base[key]; });
      copy.level = alertLevel(alert, id, base.province, date, nowIso);
      return copy;
    });
  }

  function levelColor(alert, level) {
    var row = alert && alert.warn_levels && alert.warn_levels[level];
    return (row && row.color) || LEVEL_COLOR[level] || "#9aa3ad";
  }

  return {
    HOME_CAP: HOME_CAP,
    selectAlertPlaces: selectAlertPlaces,
    levelColor: levelColor,
    windowOpen: windowOpen
  };
});
