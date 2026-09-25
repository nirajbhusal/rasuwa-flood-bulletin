/*! Opening weather alert — DHM lead only, once per session until the bulletin changes. */
(function () {
  var SEEN = "rfb-open-alert-id";
  var SESSION = "rfb-open-alert-session";
  var HOLD = 8000;
  var data = null;
  var sheet = null;
  var shownId = "";
  var timer = 0;
  var paused = false;
  var remain = HOLD;
  var startedAt = 0;

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
  function dig(s) {
    if (lang() === "en") return String(s);
    return String(s).replace(/[0-9]/g, function (d) { return "०१२३४५६७८९"[d]; });
  }
  function reduceMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    var top = "";
    ["red", "orange", "yellow"].forEach(function (key) {
      if (!groups[key].length) return;
      if (!top) top = key;
      if (sentences.length >= 2) return;
      var bits = splitLevel(levels[key] || {});
      if (!bits.color) return;
      var line = joinNames(groups[key]) + ": " + bits.color;
      if (bits.action) line += " — " + bits.action;
      line += lang() === "en" ? "." : "।";
      sentences.push(line);
    });
    if (!sentences.length || !top) return null;
    var bits = splitLevel(levels[top] || {});
    var en = lang() === "en";
    var headline = bits.color || (en ? "Weather alert" : "मौसम चेतावनी");
    if (bits.action) headline += " — " + bits.action;
    return {
      id: bulletinId(json),
      level: top,
      headline: headline,
      issued: cleanIssued(tx(json.ui && json.ui.issued)),
      expect: sentences.join(" "),
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
  function clearTimer() {
    if (timer) window.clearTimeout(timer);
    timer = 0;
  }
  function placeAlert() {
    var root = document.documentElement;
    if (!sheet) {
      root.classList.remove("has-open-alert");
      root.style.removeProperty("--open-alert-h");
      return;
    }
    root.classList.add("has-open-alert");
    root.style.setProperty("--open-alert-h", sheet.offsetHeight + "px");
  }
  function dismiss() {
    clearTimer();
    if (shownId) write(window.localStorage, SEEN, shownId);
    if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
    sheet = null;
    paused = false;
    placeAlert();
  }
  function fadeOut() {
    if (!sheet || paused) return;
    clearTimer();
    if (reduceMotion()) {
      dismiss();
      return;
    }
    sheet.classList.remove("is-in");
    sheet.classList.add("is-out");
    timer = window.setTimeout(dismiss, 380);
  }
  function paintBar() {
    if (!sheet) return;
    var bar = sheet.querySelector(".open-alert-bar > i");
    if (!bar) return;
    var left = remain;
    if (!paused && startedAt) left = remain - (Date.now() - startedAt);
    var frac = Math.max(0, Math.min(1, left / HOLD));
    bar.style.transform = "scaleX(" + frac + ")";
  }
  function tick() {
    if (!sheet || paused) return;
    var left = remain - (Date.now() - startedAt);
    paintBar();
    if (left <= 0) {
      fadeOut();
      return;
    }
    timer = window.setTimeout(tick, 80);
  }
  function arm() {
    clearTimer();
    if (paused || !sheet) return;
    startedAt = Date.now();
    tick();
  }
  function pause() {
    if (!paused && startedAt) remain = Math.max(0, remain - (Date.now() - startedAt));
    paused = true;
    clearTimer();
    paintBar();
    if (sheet) sheet.classList.add("is-paused");
  }
  function resume() {
    if (!paused) return;
    paused = false;
    if (sheet) sheet.classList.remove("is-paused");
    arm();
  }
  function tel(parent, num, label) {
    var a = document.createElement("a");
    a.href = "tel:" + num;
    a.textContent = label || dig(num);
    parent.appendChild(a);
  }
  function stayLine() {
    var p = document.createElement("p");
    p.className = "open-alert-s";
    if (lang() === "en") {
      p.appendChild(document.createTextNode("Stay away from the riverbank. In an emergency call "));
      tel(p, "1234");
      p.appendChild(document.createTextNode(" or police "));
      tel(p, "100");
      p.appendChild(document.createTextNode("."));
    } else {
      p.appendChild(document.createTextNode("नदी किनार नजानुहोस्। आपत्कालमा "));
      tel(p, "1234", "१२३४");
      p.appendChild(document.createTextNode(" वा प्रहरी "));
      tel(p, "100", "१००");
      p.appendChild(document.createTextNode(" मा फोन गर्नुहोस्।"));
    }
    return p;
  }
  function icon() {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "28");
    svg.setAttribute("height", "28");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("open-alert-ico");
    svg.innerHTML = '<path d="M12 3.2 2.4 20.2h19.2L12 3.2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9.2v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16.8" r="1" fill="currentColor"/>';
    return svg;
  }
  function render(pack) {
    if (!pack || !pack.id) return;
    var fresh = !sheet || shownId !== pack.id;
    shownId = pack.id;
    write(window.sessionStorage, SESSION, pack.id);
    write(window.localStorage, SEEN, pack.id);
    if (!sheet) {
      sheet = document.createElement("aside");
      sheet.className = "open-alert";
      sheet.setAttribute("role", "status");
      sheet.setAttribute("aria-live", "polite");
      document.body.appendChild(sheet);
      sheet.addEventListener("pointerenter", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        pause();
      });
      sheet.addEventListener("pointerleave", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        resume();
      });
      sheet.addEventListener("focusin", pause);
      sheet.addEventListener("focusout", function (e) {
        if (sheet && e.relatedTarget && sheet.contains(e.relatedTarget)) return;
        resume();
      });
      window.addEventListener("resize", placeAlert);
    }
    sheet.className = "open-alert is-" + pack.level;
    sheet.replaceChildren();
    var band = document.createElement("div");
    band.className = "open-alert-band";
    band.appendChild(icon());
    var h = document.createElement("p");
    h.className = "open-alert-h";
    h.textContent = pack.headline;
    band.appendChild(h);
    var x = document.createElement("button");
    x.type = "button";
    x.className = "open-alert-x";
    x.setAttribute("aria-label", pack.close);
    x.textContent = "×";
    x.addEventListener("click", dismiss);
    band.appendChild(x);
    var body = document.createElement("p");
    body.className = "open-alert-b";
    body.textContent = pack.expect;
    var row = document.createElement("p");
    row.className = "open-alert-row";
    var a = document.createElement("a");
    a.href = "weather.html";
    a.textContent = pack.more;
    row.appendChild(a);
    if (pack.issued) {
      var kicker = document.createElement("p");
      kicker.className = "open-alert-k";
      kicker.textContent = pack.issued;
      sheet.appendChild(kicker);
    }
    sheet.appendChild(band);
    sheet.appendChild(body);
    sheet.appendChild(stayLine());
    sheet.appendChild(row);
    var bar = document.createElement("div");
    bar.className = "open-alert-bar";
    bar.setAttribute("aria-hidden", "true");
    var fill = document.createElement("i");
    bar.appendChild(fill);
    sheet.appendChild(bar);
    if (fresh) {
      paused = false;
      remain = HOLD;
    }
    placeAlert();
    if (reduceMotion()) {
      sheet.classList.add("is-in");
      if (fresh) arm();
      return;
    }
    if (fresh) sheet.classList.remove("is-in");
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (sheet) sheet.classList.add("is-in");
        placeAlert();
      });
    });
    if (fresh) arm();
  }
  function paint() {
    if (!data) return;
    var pack = todayPack(data);
    if (!pack) {
      if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
      sheet = null;
      placeAlert();
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
    fetch("data/weather-alert.json?t=" + Date.now(), { cache: "no-store" })
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
