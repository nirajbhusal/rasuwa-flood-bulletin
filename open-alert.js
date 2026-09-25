/*! Opening weather alert — DHM lead only, once per session until the bulletin changes. */
(function () {
  var SEEN = "rfb-open-alert-id";
  var SESSION = "rfb-open-alert-session";
  var data = null;
  var sheet = null;
  var shownId = "";

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "ne";
  }
  function tx(node) {
    if (node == null) return "";
    if (typeof node === "string") return node;
    var l = lang();
    if (node[l] != null) return node[l];
    if (node.ne != null) return node.ne;
    return node.en || "";
  }
  function kathmanduToday() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kathmandu",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());
    } catch (e) {
      return "";
    }
  }
  function joinNames(names) {
    if (!names.length) return "";
    if (names.length === 1) return names[0];
    var last = names[names.length - 1];
    var head = names.slice(0, -1);
    if (lang() === "en") {
      if (names.length === 2) return head[0] + " and " + last;
      return head.join(", ") + ", and " + last;
    }
    return head.join(", ") + " र " + last;
  }
  function splitLevel(lv) {
    var raw = tx(lv);
    var parts = raw.split("·");
    return {
      color: (parts[0] || "").trim(),
      action: (parts.slice(1).join("·") || "").trim()
    };
  }
  function cleanIssued(s) {
    return String(s || "")
      .replace(/बुलेटिन\s*#\s*[०-९0-9]+/g, "")
      .replace(/bulletin\s*#\s*\d+/ig, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  function bulletinId(json) {
    var lead = json && json.lead;
    if (!lead || lead.page_id == null) return "";
    return String(lead.page_id) + "|" + (lead.api_update_at || lead.issued_at || json.updated_at || "");
  }
  function todayPack(json) {
    var lead = json && json.lead;
    if (!lead || lead.page_id == null) return null;
    var iso = kathmanduToday();
    if (!iso) return null;
    var days = json.warning_days || [];
    var day = null;
    for (var i = 0; i < days.length; i++) if (days[i] && days[i].date === iso) day = days[i];
    if (!day || !day.provinces) return null;
    var groups = { red: [], orange: [], yellow: [] };
    (json.provinces || []).forEach(function (p) {
      var rec = day.provinces[p.id];
      var level = rec && rec.level;
      if (groups[level]) groups[level].push(tx(p));
    });
    var levels = json.warn_levels || {};
    var sentences = [];
    ["red", "orange", "yellow"].forEach(function (key) {
      if (!groups[key].length || sentences.length >= 2) return;
      var bits = splitLevel(levels[key] || {});
      if (!bits.color) return;
      var line = joinNames(groups[key]) + ": " + bits.color;
      if (bits.action) line += " — " + bits.action;
      line += lang() === "en" ? "." : "।";
      sentences.push(line);
    });
    if (!sentences.length) return null;
    var en = lang() === "en";
    return {
      id: bulletinId(json),
      issued: cleanIssued(tx(json.ui && json.ui.issued)),
      expect: sentences.join(" "),
      stay: en
        ? "Stay away from the riverbank. In an emergency call 1234 or police 100."
        : "नदी किनार नजानुहोस्। आपत्कालमा १२३४ वा प्रहरी १०० मा फोन गर्नुहोस्।",
      more: en ? "Weather details" : "मौसमको विवरण",
      close: en ? "Close" : "बन्द"
    };
  }
  function read(store, key) {
    try { return store.getItem(key) || ""; } catch (e) { return ""; }
  }
  function write(store, key, value) {
    try { store.setItem(key, value); } catch (e) {}
  }
  function shouldShow(id) {
    if (!id) return false;
    if (read(window.sessionStorage, SESSION) === id) return false;
    if (read(window.localStorage, SEEN) === id) return false;
    return true;
  }
  function dismiss() {
    if (shownId) write(window.localStorage, SEEN, shownId);
    if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
    sheet = null;
  }
  function render(pack) {
    if (!pack || !pack.id) return;
    shownId = pack.id;
    write(window.sessionStorage, SESSION, pack.id);
    write(window.localStorage, SEEN, pack.id);
    if (!sheet) {
      sheet = document.createElement("aside");
      sheet.className = "open-alert";
      sheet.setAttribute("role", "status");
      document.body.appendChild(sheet);
    }
    sheet.replaceChildren();
    var x = document.createElement("button");
    x.type = "button";
    x.className = "open-alert-x";
    x.setAttribute("aria-label", pack.close);
    x.textContent = "×";
    x.addEventListener("click", dismiss);
    var kicker = document.createElement("p");
    kicker.className = "open-alert-k";
    if (pack.issued) kicker.textContent = pack.issued;
    var body = document.createElement("p");
    body.className = "open-alert-b";
    body.textContent = pack.expect;
    var stay = document.createElement("p");
    stay.className = "open-alert-s";
    stay.textContent = pack.stay;
    var row = document.createElement("p");
    row.className = "open-alert-row";
    var a = document.createElement("a");
    a.href = "weather.html";
    a.textContent = pack.more;
    row.appendChild(a);
    sheet.appendChild(x);
    if (pack.issued) sheet.appendChild(kicker);
    sheet.appendChild(body);
    sheet.appendChild(stay);
    sheet.appendChild(row);
  }
  function paint() {
    if (!data) return;
    var pack = todayPack(data);
    if (!pack) {
      if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
      sheet = null;
      return;
    }
    if (!sheet && !shouldShow(pack.id)) return;
    render(pack);
  }
  function unlockScroll() {
    var html = document.documentElement;
    var body = document.body;
    if (!body) return;
    if (html.classList.contains("ask-lock") || html.classList.contains("nav-drawer-open") || body.classList.contains("names-ov-lock") || body.classList.contains("ask-lock")) return;
    html.style.overflow = "";
    html.style.position = "";
    body.style.overflow = "";
    body.style.position = "";
    body.style.height = "";
    body.style.width = "";
    body.style.top = "";
  }
  function boot() {
    unlockScroll();
    var ver = window.PAGE_VER || "";
    fetch("data/weather-alert.json?v=" + encodeURIComponent(ver), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("weather-alert"); return r.json(); })
      .then(function (json) {
        data = json;
        paint();
      })
      .catch(function () {});
  }
  function start() {
    var ric = window.requestIdleCallback;
    if (typeof ric === "function") ric(boot, { timeout: 1600 });
    else window.setTimeout(boot, 500);
  }
  if (window.__addLangHook) window.__addLangHook(paint);
  window.addEventListener("pageshow", unlockScroll);
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
