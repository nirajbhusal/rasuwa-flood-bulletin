/*! District alerts card. Reads data/weather-alert.json and the district shapes. */
(function () {
  var VER = window.PAGE_VER || "2026-09-25-no-contact";
  var data = null;
  var geo = null;
  var selected = "";
  var painting = false;
  var timer = 0;
  var tick = 0;

  /* Cells read from the NMD impact images (git 1ac09ce):
     impact-sindhupalchok.jpg — high impact × medium likelihood = orange
     impact-baglung.jpg and impact-myagdi.jpg — medium × medium = yellow
     Corridor #12307 isolated heavy follows levels.heavy = yellow. */
  var MATRIX = {
    "high|medium": "orange",
    "medium|medium": "yellow"
  };
  var RANK = { red: 0, orange: 1, yellow: 2, green: 3 };

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
  function t(key, fallback) {
    var pack = (window.I18N && window.I18N[lang()]) || {};
    return pack[key] != null ? pack[key] : fallback;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgEl(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }
  function digits(n) {
    var s = String(n);
    if (lang() !== "ne") return s;
    return s.replace(/\d/g, function (d) { return "०१२३४५६७८९"[d]; });
  }
  function ensureCss() {
    if (document.querySelector('link[href*="district-alerts.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "district-alerts.css?v=" + encodeURIComponent(VER);
    link.setAttribute("data-district-alerts-css", "");
    document.head.appendChild(link);
  }
  function matrix() {
    var map = {};
    Object.keys(MATRIX).forEach(function (k) { map[k] = MATRIX[k]; });
    (data && data.impact_matrix || []).forEach(function (row) {
      if (!row || !row.impact || !row.likelihood || !row.level) return;
      map[row.impact + "|" + row.likelihood] = row.level;
    });
    return map;
  }
  function resolveLevel(entry) {
    if (!entry) return "";
    var levels = (data && data.warn_levels) || {};
    if (entry.level && levels[entry.level]) return entry.level;
    var impact = entry.impact || "";
    var like = entry.likelihood || "";
    var hit = matrix()[impact + "|" + like];
    if (hit && levels[hit]) return hit;
    return "";
  }
  function colorOf(level) {
    var lv = data && data.warn_levels && data.warn_levels[level];
    return (lv && lv.color) || "#cbd5e1";
  }
  function isCurrent(node, now) {
    if (!node) return false;
    if (!node.window_end) return true;
    var end = Date.parse(node.window_end);
    if (isNaN(end)) return true;
    return now < end;
  }
  function districtById(id) {
    var list = (geo && geo.districts) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function shapeId(item) {
    if (item && item.id && districtById(item.id)) return item.id;
    var en = (item && item.en) || "";
    var key = String(en).toLowerCase().replace(/[^a-z0-9]/g, "");
    var list = (geo && geo.districts) || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].en || "").toLowerCase().replace(/[^a-z0-9]/g, "") === key) return list[i].id;
    }
    return item && item.id || "";
  }
  function pageMode(host) {
    return (host && host.getAttribute("data-district-alerts")) || "home";
  }
  function impactHref(id, mode) {
    var hash = "wx-d-" + id;
    if (mode === "section") return "#" + hash;
    var path = location.pathname || "";
    if (/notices\.html$/.test(path)) return "#" + hash;
    return "notices.html#" + hash;
  }
  function spanLabel(ms, future) {
    var mins = Math.max(0, Math.round(ms / 60000));
    var days = Math.floor(mins / 1440);
    var hours = Math.floor((mins - days * 1440) / 60);
    var remMin = mins - days * 1440 - hours * 60;
    var en = lang() === "en";
    var parts = [];
    if (days) parts.push(digits(days) + (en ? (days === 1 ? " day" : " days") : " दिन"));
    if (hours || days) {
      if (hours) parts.push(digits(hours) + (en ? " h" : " घण्टा"));
    } else {
      parts.push(digits(remMin) + (en ? " min" : " मिनेट"));
    }
    var when = parts.join(" ");
    if (en) return (future ? "starts in " : "ends in ") + when;
    return when + (future ? "मा सुरु" : "मा सकिन्छ");
  }
  function remainInfo(startIso, endIso, now) {
    var start = Date.parse(startIso || "");
    var end = Date.parse(endIso || "");
    if (isNaN(end)) return { text: "", pct: 0 };
    var future = !isNaN(start) && now < start;
    var text = spanLabel(future ? (start - now) : (end - now), future);
    var pct = 100;
    if (!isNaN(start) && end > start) {
      if (now <= start) pct = 100;
      else pct = Math.max(0, Math.min(100, ((end - now) / (end - start)) * 100));
    }
    return { text: text, pct: pct };
  }
  function entries(now) {
    var list = [];
    var seen = {};
    (data.district_warnings || []).forEach(function (card, i) {
      if (!isCurrent(card, now)) return;
      var id = shapeId(card);
      if (!id || seen[id]) return;
      seen[id] = true;
      list.push({
        id: id,
        name: card.name,
        level: resolveLevel(card),
        risk: card.risk,
        window: card.window,
        forecast: card.forecast,
        start: card.window_start,
        end: card.window_end,
        kind: "impact",
        seq: i
      });
    });
    var call = data.callout;
    if (call && isCurrent(call, now)) {
      var level = resolveLevel(call) || "yellow";
      (call.districts || []).forEach(function (d, i) {
        var id = shapeId(d);
        if (!id || seen[id]) return;
        seen[id] = true;
        list.push({
          id: id,
          name: d,
          level: level,
          risk: call.body,
          window: call.meta,
          forecast: call.body,
          start: call.window_start,
          end: call.window_end,
          kind: "corridor",
          url: call.url || "",
          seq: 100 + i
        });
      });
    }
    list.sort(function (a, b) {
      var ra = RANK[a.level] == null ? 9 : RANK[a.level];
      var rb = RANK[b.level] == null ? 9 : RANK[b.level];
      if (ra !== rb) return ra - rb;
      return a.seq - b.seq;
    });
    return list;
  }
  function signature(rows) {
    return lang() + "|" + rows.map(function (r) {
      return r.id + ":" + r.level;
    }).join(",");
  }
  function shortForecast(node) {
    var text = tx(node);
    if (text.length > 160) return text.slice(0, 157) + "…";
    return text;
  }
  function buildMap(rows, pop) {
    var svg = svgEl("svg");
    svg.setAttribute("class", "dalert-svg");
    svg.setAttribute("viewBox", (geo && geo.viewBox) || "-18 -12 880 548");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", t("dalert_h", "जिल्लागत चेतावनी"));
    var byId = {};
    rows.forEach(function (r) { byId[r.id] = r; });
    var shapes = (geo.districts || []).slice().sort(function (a, b) {
      return (byId[a.id] ? 1 : 0) - (byId[b.id] ? 1 : 0);
    });
    var shapeAt = 0;
    function drawShapeChunk() {
      if (!svg.isConnected && shapeAt > 0) return;
      var end = Math.min(shapes.length, shapeAt + 10);
      for (; shapeAt < end; shapeAt++) {
        var d = shapes[shapeAt];
        var row = byId[d.id];
        var path = svgEl("path");
        path.setAttribute("d", d.d);
        path.setAttribute("class", row ? "dalert-dist" : "dalert-quiet");
        path.setAttribute("data-id", d.id);
        path.setAttribute("vector-effect", "non-scaling-stroke");
        if (row) {
          var label = tx(row.name) + ". " + tx((data.warn_levels || {})[row.level]) + ". " + tx(row.window) + ". " + shortForecast(row.forecast);
          path.setAttribute("fill", colorOf(row.level));
          path.setAttribute("fill-opacity", "0.92");
          path.setAttribute("stroke", "#ffffff");
          path.setAttribute("stroke-width", "1.6");
          path.setAttribute("role", "button");
          path.setAttribute("tabindex", "0");
          path.setAttribute("aria-label", label);
          path.setAttribute("aria-pressed", row.id === selected ? "true" : "false");
        } else {
          path.setAttribute("fill", "#f8fafc");
          path.setAttribute("stroke", "#cbd5e1");
          path.setAttribute("stroke-width", "1");
        }
        svg.appendChild(path);
      }
      if (shapeAt < shapes.length) (window.requestAnimationFrame || window.setTimeout)(drawShapeChunk);
    }
    drawShapeChunk();
    function open(id) {
      selected = id || "";
      svg.querySelectorAll(".dalert-dist").forEach(function (n) {
        n.setAttribute("aria-pressed", n.getAttribute("data-id") === selected ? "true" : "false");
      });
      paintPop(pop, byId[selected]);
    }
    svg.addEventListener("click", function (e) {
      var path = e.target.closest && e.target.closest(".dalert-dist");
      if (!path) return;
      e.stopPropagation();
      var id = path.getAttribute("data-id");
      open(selected === id ? "" : id);
    });
    svg.addEventListener("pointerover", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      var path = e.target.closest && e.target.closest(".dalert-dist");
      if (!path) return;
      open(path.getAttribute("data-id"));
    });
    svg.addEventListener("keydown", function (e) {
      var path = e.target.closest && e.target.closest(".dalert-dist");
      if (!path) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        var id = path.getAttribute("data-id");
        open(selected === id ? "" : id);
      }
    });
    return { svg: svg, open: open, byId: byId };
  }
  function paintPop(pop, row) {
    if (!pop) return;
    if (!row) {
      pop.hidden = true;
      return;
    }
    pop.hidden = false;
    pop.querySelector(".dalert-pop-name").textContent = tx(row.name);
    var lv = (data.warn_levels || {})[row.level] || {};
    var lvEl = pop.querySelector(".dalert-pop-lv");
    lvEl.textContent = tx(lv);
    lvEl.style.color = "#0f172a";
    pop.querySelector(".dalert-pop-win").textContent = tx(row.window);
    pop.querySelector(".dalert-pop-fore").textContent = shortForecast(row.forecast);
  }
  function buildPop() {
    var pop = el("div", "dalert-pop");
    pop.hidden = true;
    pop.setAttribute("role", "dialog");
    var x = document.createElement("button");
    x.type = "button";
    x.className = "dalert-x";
    x.setAttribute("aria-label", t("close", "बन्द"));
    x.textContent = "×";
    x.addEventListener("click", function (e) {
      e.stopPropagation();
      selected = "";
      var card = pop.closest(".dalert");
      if (card) {
        card.querySelectorAll(".dalert-dist").forEach(function (n) {
          n.setAttribute("aria-pressed", "false");
        });
      }
      pop.hidden = true;
    });
    pop.appendChild(x);
    pop.appendChild(el("p", "dalert-pop-name"));
    pop.appendChild(el("p", "dalert-pop-lv"));
    pop.appendChild(el("p", "dalert-pop-win"));
    pop.appendChild(el("p", "dalert-pop-fore"));
    return pop;
  }
  function build(mode) {
    var now = Date.now();
    var rows = entries(now);
    if (!rows.length || !geo) return null;
    var sec = el("section", "dalert");
    sec.setAttribute("data-sig", signature(rows));
    var title = t("dalert_h", lang() === "en" ? "District alerts" : "जिल्लागत चेतावनी");
    var h = el("h3", "dalert-h", title);
    h.id = "dalert-h-" + mode;
    sec.setAttribute("aria-labelledby", h.id);
    sec.appendChild(h);
    var layout = el("div", "dalert-layout");
    var mapbox = el("div", "dalert-mapbox");
    var pop = buildPop();
    var built = buildMap(rows, pop);
    mapbox.appendChild(built.svg);
    mapbox.appendChild(pop);
    layout.appendChild(mapbox);
    var ul = el("ul", "dalert-list");
    rows.forEach(function (row) {
      var li = el("li", "dalert-row");
      var badge = el("span", "dalert-badge");
      badge.style.background = colorOf(row.level);
      badge.setAttribute("aria-hidden", "true");
      li.appendChild(badge);
      var main = el("div", "dalert-main");
      var name = el("p", "dalert-name", tx(row.name));
      main.appendChild(name);
      if (tx(row.risk)) main.appendChild(el("p", "dalert-risk", tx(row.risk)));
      if (tx(row.window)) main.appendChild(el("p", "dalert-win", tx(row.window)));
      var info = remainInfo(row.start, row.end, now);
      var remain = el("p", "dalert-remain", info.text);
      remain.setAttribute("data-start", row.start || "");
      remain.setAttribute("data-end", row.end || "");
      main.appendChild(remain);
      var track = el("div", "dalert-track");
      var fill = el("i", "dalert-fill");
      fill.style.width = info.pct + "%";
      fill.style.background = colorOf(row.level);
      fill.setAttribute("data-start", row.start || "");
      fill.setAttribute("data-end", row.end || "");
      var bar = el("div");
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", "100");
      bar.setAttribute("aria-valuenow", String(Math.round(info.pct)));
      bar.setAttribute("aria-valuetext", info.text);
      bar.appendChild(track);
      track.appendChild(fill);
      main.appendChild(bar);
      var a = document.createElement("a");
      a.className = "dalert-more";
      if (row.kind === "corridor" && row.url) {
        a.href = row.url;
        a.target = "_blank";
        a.rel = "noopener";
      } else {
        a.href = impactHref(row.id, mode);
      }
      a.textContent = t("dalert_details", lang() === "en" ? "Details" : "विवरण");
      main.appendChild(a);
      li.appendChild(main);
      ul.appendChild(li);
    });
    layout.appendChild(ul);
    sec.appendChild(layout);
    if (selected && built.byId[selected]) paintPop(pop, built.byId[selected]);
    return sec;
  }
  function hosts() {
    var out = [];
    document.querySelectorAll("[data-district-alerts]").forEach(function (n) {
      if (n.closest(".dalert")) return;
      out.push(n);
    });
    if (out.length) return out;
    document.querySelectorAll("[data-wx-mount]").forEach(function (root) {
      var board = root.querySelector(".wxb");
      if (!board) return;
      var slot = board.querySelector("[data-district-alerts]");
      if (!slot) {
        slot = document.createElement("div");
        slot.className = "dalert-slot";
        slot.setAttribute("data-district-alerts", root.getAttribute("data-wx-mode") || "home");
        var map = board.querySelector(".wxb-map-panel");
        if (map) map.insertAdjacentElement("afterend", slot);
        else board.appendChild(slot);
      }
      out.push(slot);
    });
    return out;
  }
  function paintAll() {
    if (!data || !geo || painting) return;
    painting = true;
    try {
      ensureCss();
      hosts().forEach(function (host) {
        var mode = pageMode(host);
        var rows = entries(Date.now());
        var sig = signature(rows);
        var existing = host.firstElementChild && host.firstElementChild.classList.contains("dalert") ? host.firstElementChild : null;
        if (existing && existing.getAttribute("data-sig") === sig) return;
        var card = build(mode);
        if (card) host.replaceChildren(card);
        else host.replaceChildren();
      });
    } finally {
      painting = false;
    }
  }
  function schedule() {
    if (painting) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(paintAll, 40);
  }
  function refreshTimes() {
    var now = Date.now();
    var stale = false;
    document.querySelectorAll(".dalert-remain").forEach(function (n) {
      var end = Date.parse(n.getAttribute("data-end") || "");
      if (!isNaN(end) && now >= end) stale = true;
      var info = remainInfo(n.getAttribute("data-start"), n.getAttribute("data-end"), now);
      n.textContent = info.text;
      var bar = n.parentNode && n.parentNode.querySelector("[role='progressbar']");
      var fill = n.parentNode && n.parentNode.querySelector(".dalert-fill");
      if (fill) fill.style.width = info.pct + "%";
      if (bar) {
        bar.setAttribute("aria-valuenow", String(Math.round(info.pct)));
        bar.setAttribute("aria-valuetext", info.text);
      }
    });
    if (stale) paintAll();
  }
  function watch() {
    if (!window.MutationObserver) return;
    var obs = new MutationObserver(function () { schedule(); });
    document.querySelectorAll("[data-wx-mount]").forEach(function (root) {
      obs.observe(root, { childList: true });
    });
  }
  function boot() {
    ensureCss();
    var wxUrl = "data/weather-alert.json?v=" + encodeURIComponent(VER);
    var geoUrl = "data/nepal-districts-svg.json?v=" + encodeURIComponent(VER);
    Promise.all([
      fetch(wxUrl, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("wx"); return r.json(); }),
      fetch(geoUrl, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("geo"); return r.json(); })
    ]).then(function (pair) {
      data = pair[0];
      geo = pair[1];
      paintAll();
      watch();
      window.clearInterval(tick);
      tick = window.setInterval(refreshTimes, 60000);
    }).catch(function () {});
  }
  document.addEventListener("wx-rendered", schedule);
  document.addEventListener("click", function (e) {
    if (!selected) return;
    if (e.target.closest && e.target.closest(".dalert-mapbox")) return;
    selected = "";
    document.querySelectorAll(".dalert-pop").forEach(function (n) { n.hidden = true; });
    document.querySelectorAll(".dalert-dist").forEach(function (n) { n.setAttribute("aria-pressed", "false"); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !selected) return;
    selected = "";
    document.querySelectorAll(".dalert-pop").forEach(function (n) { n.hidden = true; });
    document.querySelectorAll(".dalert-dist").forEach(function (n) { n.setAttribute("aria-pressed", "false"); });
  });
  if (window.__addLangHook) window.__addLangHook(function () { selected = ""; paintAll(); });
  function start() {
    if (start._done || start._watching) return;
    var node = document.querySelector("[data-district-alerts]");
    if (!node) return;
    start._watching = true;
    function go() {
      if (start._done) return;
      start._done = true;
      boot();
    }
    if (typeof IntersectionObserver !== "function") {
      window.setTimeout(go, 400);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        io.disconnect();
        go();
        return;
      }
    }, { rootMargin: "80px 0px", threshold: 0.01 });
    io.observe(node);
  }
  document.addEventListener("wx-rendered", start);
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
