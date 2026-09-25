/*! Rasuwa flood bulletin · DHM special flood forecast · data/flood-bulletin.json */
(function () {
  var mounts = document.querySelectorAll("[data-flood-mount]");
  if (!mounts.length) return;

  var VER = window.PAGE_VER || "2026-09-25-dhm-12310";
  var data = null;
  var geo = null;
  var byId = {};
  var dayKey = "today";

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "ne";
  }
  function tx(node) {
    if (node == null) return "";
    if (typeof node === "string") return node;
    var l = lang();
    if (node[l] != null && node[l] !== "") return node[l];
    return node.ne || node.en || "";
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
  function bust(url) {
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(VER);
  }
  function names(id) {
    var row = byId[id] || (data && data.catalog && data.catalog[id]) || {};
    return { ne: row.ne || id, en: row.en || id };
  }
  function digits(n) {
    var s = String(n);
    if (lang() === "en") return s;
    return s.replace(/[0-9]/g, function (d) { return "०१२३४५६७८९"[d]; });
  }
  function nameOf(id) {
    var n = names(id);
    return lang() === "en" ? n.en : n.ne;
  }
  function flashDay() {
    return data && data.flash && data.flash[dayKey];
  }
  function riskOf(id, day) {
    day = day || flashDay();
    if (!day) return "low";
    if ((day.high || []).indexOf(id) >= 0) return "high";
    if ((day.medium || []).indexOf(id) >= 0) return "medium";
    return "low";
  }
  var RISK = {
    low: { fill: "#1b7f3a" },
    medium: { fill: "#e6b800" },
    high: { fill: "#e65c00" },
    very_high: { fill: "#d7191c" }
  };
  function riskWord(id) {
    var scale = (data.flash && data.flash.scale) || [];
    for (var i = 0; i < scale.length; i++) if (scale[i].id === id) return tx(scale[i]);
    return id;
  }
  function levelMeta(code) {
    return (data.levels && data.levels[code]) || { ne: code, en: code, tone: "green" };
  }

  function chipGroup(title, rows, tone) {
    var box = el("div", "fld-status fld-" + tone);
    box.appendChild(el("p", "fld-status-k", title));
    var ul = el("ul", "fld-chips");
    rows.forEach(function (row) {
      var li = el("li", "fld-chip");
      li.textContent = tx(row);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  function buildHeat() {
    var wrap = el("div", "fld-heatwrap");
    var table = document.createElement("table");
    table.className = "fld-heat";
    var cap = document.createElement("caption");
    cap.textContent = tx(data.outlook_note);
    table.appendChild(cap);
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    hr.appendChild(el("th", "fld-sticky", lang() === "en" ? "Station" : "स्टेशन"));
    (data.days || []).forEach(function (d) {
      hr.appendChild(el("th", null, tx(d)));
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tb = document.createElement("tbody");
    var lastBasin = "";
    (data.stations || []).forEach(function (st) {
      var basin = tx(st.basin);
      if (basin !== lastBasin) {
        var br = document.createElement("tr");
        br.className = "fld-basin";
        var bc = document.createElement("th");
        bc.colSpan = 1 + (data.days || []).length;
        bc.textContent = basin;
        br.appendChild(bc);
        tb.appendChild(br);
        lastBasin = basin;
      }
      var tr = document.createElement("tr");
      if (st.highlight) tr.className = "is-trishuli";
      var th = document.createElement("th");
      th.className = "fld-sticky";
      th.scope = "row";
      var label = st.river + " · " + st.station;
      if (st.district) label += " · " + st.district;
      th.textContent = label;
      tr.appendChild(th);
      (st.days || []).forEach(function (code, i) {
        var meta = levelMeta(code);
        var td = document.createElement("td");
        td.className = "fld-cell fld-" + (meta.tone || "green");
        td.textContent = lang() === "en" ? (meta.en || "") : (meta.ne || "");
        var day = (data.days || [])[i];
        td.title = (day ? tx(day) + " · " : "") + tx(meta);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    wrap.appendChild(table);
    return wrap;
  }

  function buildCorridor() {
    var card = el("article", "fld-corridor");
    card.appendChild(el("h3", "fld-h", lang() === "en" ? "Rasuwa corridor" : "रसुवा करिडोर"));
    var st = null;
    (data.stations || []).forEach(function (row) { if (row.highlight) st = row; });
    if (st) {
      card.appendChild(el("p", "fld-cor-name", st.river + " · " + st.station));
      var row = el("div", "fld-cor-days");
      (st.days || []).forEach(function (code, i) {
        var meta = levelMeta(code);
        var cell = el("span", "fld-cell fld-" + (meta.tone || "green"));
        var day = (data.days || [])[i];
        cell.appendChild(el("b", null, day ? tx(day) : ""));
        cell.appendChild(document.createTextNode(tx(meta)));
        row.appendChild(cell);
      });
      card.appendChild(row);
    }
    var ru = data.rasuwa || {};
    var today = data.flash && data.flash.today;
    var tomorrow = data.flash && data.flash.tomorrow;
    var p = el("p", "fld-cor-risk");
    var ras = nameOf(ru.id || "rasuwa");
    p.textContent = lang() === "en"
      ? ras + " flash-flood risk: " + riskWord(ru.today || "medium") + " today, " + riskWord(ru.tomorrow || "medium") + " tomorrow."
      : ras + "मा आकस्मिक बाढीको जोखिम आज " + riskWord(ru.today || "medium") + ", भोलि " + riskWord(ru.tomorrow || "medium") + "।";
    card.appendChild(p);
    if (today && today.valid) {
      card.appendChild(el("p", "fld-valid", tx(today.valid)));
    }
    if (tomorrow) {
      /* validity of today is the line above; tomorrow's window stays in the sentence */
    }
    return card;
  }

  function mapIcon(kind) {
    var d = {
      plus: "M12 5v14M5 12h14",
      minus: "M5 12h14",
      expand: "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
      compress: "M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
    }[kind] || "";
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="' + d + '"/></svg>';
  }
  function nativeFs() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  function bindFullscreen(host, svg) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "map-ctl-btn map-ctl-fs";
    function cssOn() { return host.classList.contains("is-map-fs"); }
    function active() { return nativeFs() === host || cssOn(); }
    function sync() {
      var on = active();
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on
        ? (lang() === "en" ? "Exit full screen" : "पूरा स्क्रिन बन्द गर्नुहोस्")
        : (lang() === "en" ? "Full screen" : "पूरा स्क्रिन"));
      btn.innerHTML = mapIcon(on ? "compress" : "expand");
    }
    function refit() {
      if (svg && svg._zoomReset) svg._zoomReset();
    }
    function enterCss() {
      host.classList.add("is-map-fs");
      document.documentElement.classList.add("map-fs-lock");
      sync();
      refit();
    }
    function exitCss() {
      host.classList.remove("is-map-fs");
      if (!document.querySelector(".is-map-fs") && !nativeFs()) document.documentElement.classList.remove("map-fs-lock");
      sync();
      refit();
    }
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (active()) {
        var cur = nativeFs();
        if (cur) {
          var ex = document.exitFullscreen || document.webkitExitFullscreen;
          if (ex) { try { ex.call(document); } catch (err) {} }
        }
        if (cssOn()) exitCss();
      } else {
        var req = host.requestFullscreen || host.webkitRequestFullscreen;
        if (!req) { enterCss(); return; }
        var done;
        try { done = req.call(host); } catch (err2) { enterCss(); return; }
        if (done && typeof done.then === "function") done.then(sync).catch(enterCss);
        else enterCss();
      }
    });
    document.addEventListener("fullscreenchange", function () {
      if (!host.isConnected) return;
      if (!nativeFs()) host.classList.remove("is-map-fs");
      if (!document.querySelector(".is-map-fs") && !nativeFs()) document.documentElement.classList.remove("map-fs-lock");
      sync();
    });
    sync();
    return btn;
  }
  function tuneStrokes(svg) {
    svg.querySelectorAll(".fld-dist").forEach(function (path) {
      path.setAttribute("vector-effect", "non-scaling-stroke");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("stroke-width", "0.55");
    });
    svg.querySelectorAll(".fld-prov-edge").forEach(function (path) {
      path.setAttribute("vector-effect", "non-scaling-stroke");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("stroke-width", "1");
    });
  }
  function bindNav(wrap, svg) {
    var layer = svg.querySelector(".fld-zoom");
    var st = { s: 1, x: 0, y: 0 };
    function apply() {
      if (layer) layer.setAttribute("transform", "translate(" + st.x + " " + st.y + ") scale(" + st.s + ")");
    }
    function userBox() {
      var vb = svg.viewBox && svg.viewBox.baseVal;
      if (vb && vb.width) return { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
      return { x: -18, y: -12, w: 880, h: 548 };
    }
    function zoomBy(factor, local) {
      var box = userBox();
      var lx = local ? local.x : (box.x + box.w / 2 - st.x) / st.s;
      var ly = local ? local.y : (box.y + box.h / 2 - st.y) / st.s;
      var next = Math.max(1, Math.min(4, st.s * factor));
      if (Math.abs(next - st.s) < 0.001) return;
      st.x = st.x + lx * (st.s - next);
      st.y = st.y + ly * (st.s - next);
      st.s = next;
      if (st.s <= 1.01) { st.s = 1; st.x = 0; st.y = 0; }
      apply();
    }
    svg._zoomBy = zoomBy;
    svg._zoomReset = function () {
      st.s = 1; st.x = 0; st.y = 0;
      apply();
      tuneStrokes(svg);
    };
    var ptr = {};
    wrap.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest(".map-ctl, .fld-pop")) return;
      ptr[e.pointerId] = { x: e.clientX, y: e.clientY, ox: e.clientX, oy: e.clientY, moved: false };
      try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
    });
    wrap.addEventListener("pointermove", function (e) {
      var p = ptr[e.pointerId];
      if (!p) return;
      var dx = e.clientX - p.x;
      var dy = e.clientY - p.y;
      if (Math.abs(e.clientX - p.ox) + Math.abs(e.clientY - p.oy) > 6) p.moved = true;
      if (!p.moved || st.s <= 1.01) return;
      var rect = svg.getBoundingClientRect();
      var box = userBox();
      var sx = box.w / Math.max(rect.width, 1);
      var sy = box.h / Math.max(rect.height, 1);
      st.x += dx * sx;
      st.y += dy * sy;
      p.x = e.clientX;
      p.y = e.clientY;
      apply();
    });
    function end(e) {
      var p = ptr[e.pointerId];
      if (!p) return;
      delete ptr[e.pointerId];
      if (!p.moved) {
        var path = e.target.closest && e.target.closest(".fld-dist");
        if (path) openPop(wrap, path.getAttribute("data-id"), e.clientX, e.clientY);
        else closePop(wrap);
      }
    }
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointercancel", end);
    wrap.addEventListener("wheel", function (e) {
      if (!wrap.contains(document.activeElement) && !wrap.matches(":hover")) return;
      e.preventDefault();
      var rect = svg.getBoundingClientRect();
      var box = userBox();
      var lx = box.x + ((e.clientX - rect.left) / Math.max(rect.width, 1)) * box.w;
      var ly = box.y + ((e.clientY - rect.top) / Math.max(rect.height, 1)) * box.h;
      lx = (lx - st.x) / st.s;
      ly = (ly - st.y) / st.s;
      zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2, { x: lx, y: ly });
    }, { passive: false });
  }
  function closePop(wrap) {
    var pop = wrap.querySelector(".fld-pop");
    if (pop) pop.hidden = true;
    wrap.querySelectorAll(".fld-dist.is-on").forEach(function (p) { p.classList.remove("is-on"); });
  }
  function openPop(wrap, id, clientX, clientY) {
    var pop = wrap.querySelector(".fld-pop");
    if (!pop || !id) return;
    var on = wrap.querySelector('.fld-dist.is-on[data-id="' + id + '"]');
    wrap.querySelectorAll(".fld-dist.is-on").forEach(function (p) { p.classList.remove("is-on"); });
    if (on) { pop.hidden = true; return; }
    var path = wrap.querySelector('.fld-dist[data-id="' + id + '"]');
    if (path) path.classList.add("is-on");
    pop.replaceChildren();
    pop.appendChild(el("strong", null, nameOf(id)));
    pop.appendChild(el("span", null, riskWord(riskOf(id))));
    pop.hidden = false;
    var host = wrap.getBoundingClientRect();
    var left = (clientX || host.left + 24) - host.left + 8;
    var top = (clientY || host.top + 24) - host.top + 8;
    if (left > host.width - 140) left = Math.max(8, host.width - 150);
    if (top > host.height - 64) top = Math.max(8, host.height - 72);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }
  function paintFlash(svg) {
    var day = flashDay();
    svg.querySelectorAll(".fld-dist").forEach(function (path) {
      var id = path.getAttribute("data-id");
      var key = riskOf(id, day);
      path.setAttribute("fill", (RISK[key] || RISK.low).fill);
      path.setAttribute("data-risk", key);
      path.setAttribute("aria-label", nameOf(id) + ". " + riskWord(key));
    });
    tuneStrokes(svg);
  }
  function buildMap(panel) {
    var wrap = el("div", "fld-mapwrap");
    wrap.tabIndex = 0;
    var svg = svgEl("svg");
    svg.setAttribute("class", "fld-svg");
    svg.setAttribute("viewBox", (data.geo && data.geo.viewBox) || (geo && geo.viewBox) || "-18 -12 880 548");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", lang() === "en" ? "Flash-flood risk by district" : "जिल्ला अनुसार आकस्मिक बाढीको जोखिम");
    var layer = svgEl("g");
    layer.setAttribute("class", "fld-zoom");
    (geo.districts || []).forEach(function (d) {
      var path = svgEl("path");
      path.setAttribute("class", "fld-dist");
      path.setAttribute("d", d.d);
      path.setAttribute("data-id", d.id);
      layer.appendChild(path);
    });
    ((data.geo && data.geo.provinces) || []).forEach(function (p) {
      var edge = svgEl("path");
      edge.setAttribute("class", "fld-prov-edge");
      edge.setAttribute("d", p.d);
      layer.appendChild(edge);
    });
    svg.appendChild(layer);
    wrap.appendChild(svg);
    var pop = el("div", "fld-pop");
    pop.hidden = true;
    pop.setAttribute("role", "status");
    wrap.appendChild(pop);
    var bar = el("div", "map-ctl");
    function zoomBtn(label, icon, factor) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "map-ctl-btn";
      b.setAttribute("aria-label", label);
      b.innerHTML = mapIcon(icon);
      b.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (svg._zoomBy) svg._zoomBy(factor);
      });
      bar.appendChild(b);
    }
    zoomBtn(lang() === "en" ? "Zoom in" : "ठूलो पार्नुहोस्", "plus", 1.35);
    zoomBtn(lang() === "en" ? "Zoom out" : "सानो पार्नुहोस्", "minus", 1 / 1.35);
    bar.appendChild(bindFullscreen(wrap, svg));
    wrap.appendChild(bar);
    panel._svg = svg;
    panel._wrap = wrap;
    paintFlash(svg);
    bindNav(wrap, svg);
    tuneStrokes(svg);
    return wrap;
  }

  function countRisk(day, key) {
    if (key === "high") return (day.high || []).length;
    if (key === "medium") return (day.medium || []).length;
    if (key === "very_high") return (day.very_high || []).length;
    var named = (day.high || []).length + (day.medium || []).length + ((day.very_high || []).length);
    return Math.max(0, Object.keys(byId).length - named);
  }
  function buildLegend() {
    var ul = el("ul", "fld-legend");
    var day = flashDay();
    ["low", "medium", "high", "very_high"].forEach(function (key) {
      var li = el("li");
      var sw = el("i", "fld-sw fld-sw-" + key);
      li.appendChild(sw);
      li.appendChild(document.createTextNode(riskWord(key) + " " + digits(countRisk(day, key))));
      ul.appendChild(li);
    });
    return ul;
  }
  function buildHighChips(panel) {
    var box = el("div", "fld-highs");
    var day = flashDay();
    box.appendChild(el("p", "fld-status-k", lang() === "en" ? "High risk" : "उच्च जोखिम"));
    var ul = el("ul", "fld-chips");
    (day.high || []).forEach(function (id) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fld-chip fld-chip-btn";
      b.textContent = nameOf(id);
      b.addEventListener("click", function () {
        var wrap = panel._wrap;
        if (!wrap) return;
        var path = wrap.querySelector('.fld-dist[data-id="' + id + '"]');
        var rect = path ? path.getBoundingClientRect() : wrap.getBoundingClientRect();
        openPop(wrap, id, rect.left + rect.width / 2, rect.top + 12);
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  function buildMapPanel() {
    var panel = el("section", "fld-panel");
    panel.appendChild(el("h3", "fld-h", lang() === "en" ? "Flash-flood risk" : "आकस्मिक बाढीको जोखिम"));
    var switcher = el("div", "fld-days");
    switcher.setAttribute("role", "tablist");
    ["today", "tomorrow"].forEach(function (key) {
      var day = data.flash[key];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fld-day" + (dayKey === key ? " is-on" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", dayKey === key ? "true" : "false");
      b.textContent = tx(day.label);
      b.addEventListener("click", function () {
        if (dayKey === key) return;
        dayKey = key;
        paintAll();
      });
      switcher.appendChild(b);
    });
    panel.appendChild(switcher);
    var valid = el("p", "fld-valid");
    valid.setAttribute("data-fld-valid", "");
    var day = flashDay();
    valid.textContent = day ? tx(day.valid) : "";
    panel.appendChild(valid);
    panel.appendChild(buildMap(panel));
    var legend = el("div", "fld-legend-host");
    legend.appendChild(buildLegend());
    panel.appendChild(legend);
    var highs = el("div", "fld-high-host");
    highs.appendChild(buildHighChips(panel));
    panel.appendChild(highs);
    panel.appendChild(el("p", "fld-after", tx(data.day_after)));
    return panel;
  }

  function buildAdvisory() {
    var sec = el("section", "fld-panel");
    sec.appendChild(el("h3", "fld-h", lang() === "en" ? "Advisory" : "परामर्श"));
    var grid = el("div", "fld-adv");
    (data.advisory || []).forEach(function (card) {
      var art = el("article", "fld-card fld-card-" + card.id);
      art.appendChild(el("h4", null, tx(card.level)));
      art.appendChild(el("p", "fld-card-k", lang() === "en" ? "Public" : "सर्वसाधारण"));
      art.appendChild(el("p", null, tx(card.public)));
      art.appendChild(el("p", "fld-card-k", lang() === "en" ? "Agencies" : "सरोकारवाला निकाय"));
      art.appendChild(el("p", null, tx(card.agency)));
      grid.appendChild(art);
    });
    sec.appendChild(grid);
    return sec;
  }

  function sourceLine() {
    var p = el("p", "fld-src");
    var a = document.createElement("a");
    a.href = data.source.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = tx(data.source.org) + " · " + tx(data.source.name);
    p.appendChild(a);
    p.appendChild(document.createTextNode(" · " + tx(data.source.issued)));
    return p;
  }

  function renderSection(root) {
    root.replaceChildren();
    var board = el("article", "fld fld-section");
    board.id = "flood-outlook";
    var head = el("header", "fld-head");
    head.appendChild(el("h2", "fld-title", lang() === "en" ? "River and flood outlook" : "नदी र बाढी पूर्वानुमान"));
    head.appendChild(el("p", "fld-sub", tx(data.source.issued)));
    board.appendChild(head);
    board.appendChild(el("p", "fld-lead", tx(data.present.text)));
    var status = el("div", "fld-statuses");
    status.appendChild(chipGroup(lang() === "en" ? "Near warning" : "सतर्कता नजिक", data.present.near, "near"));
    status.appendChild(chipGroup(lang() === "en" ? "Below warning" : "सतर्कताभन्दा तल", data.present.below, "below"));
    board.appendChild(status);
    var heat = el("section", "fld-panel");
    heat.appendChild(el("h3", "fld-h", lang() === "en" ? "Five-day station outlook" : "५ दिनको स्टेशन पूर्वानुमान"));
    heat.appendChild(buildHeat());
    board.appendChild(heat);
    board.appendChild(buildMapPanel());
    board.appendChild(buildCorridor());
    board.appendChild(buildAdvisory());
    board.appendChild(sourceLine());
    root.appendChild(board);
  }
  function renderHome(root) {
    root.replaceChildren();
    var day = data.flash.today;
    var card = el("article", "fld fld-home");
    card.appendChild(el("h2", "fld-title", lang() === "en" ? "River and flood outlook" : "नदी र बाढी पूर्वानुमान"));
    card.appendChild(el("p", "fld-sub", tx(data.source.issued)));
    var n = (day.high || []).length;
    card.appendChild(el("p", "fld-home-n", lang() === "en"
      ? n + " districts are at high flash-flood risk today."
      : "आज " + digits(n) + " जिल्लामा आकस्मिक बाढीको उच्च जोखिम छ।"));
    card.appendChild(el("p", "fld-home-r", lang() === "en"
      ? "Near warning: " + data.present.near.map(tx).join(", ") + "."
      : "सतर्कता नजिक: " + data.present.near.map(tx).join(", ") + "।"));
    var a = document.createElement("a");
    a.className = "fld-more";
    a.href = "weather.html#flood-outlook";
    a.textContent = lang() === "en" ? "River and flood outlook" : "नदी र बाढी पूर्वानुमान";
    card.appendChild(a);
    root.appendChild(card);
  }
  function renderCorridorMount(root) {
    root.replaceChildren();
    var board = el("div", "fld fld-corridor-mount");
    board.appendChild(buildCorridor());
    root.appendChild(board);
  }
  function renderMount(root) {
    var mode = root.getAttribute("data-flood-mode") || "section";
    if (mode === "home") renderHome(root);
    else if (mode === "corridor") renderCorridorMount(root);
    else renderSection(root);
  }
  function paintAll() {
    mounts.forEach(renderMount);
  }

  function boot() {
    Promise.all([
      fetch(bust("data/flood-bulletin.json"), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("flood"); return r.json(); }),
      fetch(bust("data/nepal-districts-svg.json"), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("geo"); return r.json(); })
    ]).then(function (pair) {
      data = pair[0];
      geo = pair[1];
      (geo.districts || []).forEach(function (d) { byId[d.id] = d; });
      paintAll();
    }).catch(function () {});
  }
  boot();
  var lastLang = lang();
  if (typeof MutationObserver === "function") {
    new MutationObserver(function () {
      if (lang() === lastLang || !data) return;
      lastLang = lang();
      paintAll();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
})();
