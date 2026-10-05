/*! Rasuwa flood bulletin · DHM flood forecast · data/flood-bulletin.json */
(function () {
  var mounts = document.querySelectorAll("[data-flood-mount]");
  if (!mounts.length) return;

  var VER = window.PAGE_VER || "2026-09-25-dhm-12310";
  var data = null;
  var geo = null;
  var ndrrmaDoc = null;
  var liveDoc = null;
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
    if ((day.very_high || []).indexOf(id) >= 0) return "very_high";
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
    if (!rows || !rows.length) return null;
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
  function statusBoard() {
    var present = data.present || {};
    var box = el("div", "fld-statuses");
    [
      ["above", lang() === "en" ? "Above alert" : "सतर्कता तह माथि"],
      ["near", lang() === "en" ? "Near alert" : "सतर्कता नजिक"],
      ["below", lang() === "en" ? "Below alert" : "सतर्कताभन्दा तल"]
    ].forEach(function (row) {
      var group = chipGroup(row[1], present[row[0]] || [], row[0]);
      if (group) box.appendChild(group);
    });
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
    if ((data.corridor || []).length) {
      var cor = el("div", "fld-cor-days");
      data.corridor.forEach(function (item) {
        var tone = item.today === "very_high" ? "red" : (item.today === "high" ? "orange" : (item.today === "medium" ? "yellow" : "green"));
        var cell = el("span", "fld-cell fld-" + tone);
        cell.appendChild(el("b", null, nameOf(item.id)));
        cell.appendChild(document.createTextNode(riskWord(item.today) + " · " + riskWord(item.tomorrow)));
        cor.appendChild(cell);
      });
      card.appendChild(cor);
    }
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
  function buildRiskChips(panel, ids, title) {
    if (!ids || !ids.length) return null;
    var box = el("div", "fld-highs");
    box.appendChild(el("p", "fld-status-k", title));
    var ul = el("ul", "fld-chips");
    ids.forEach(function (id) {
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
  function buildFlashChips(panel) {
    var day = flashDay() || {};
    var frag = document.createDocumentFragment();
    var veryHigh = buildRiskChips(panel, day.very_high || [], lang() === "en" ? "Very high risk" : "अति उच्च जोखिम");
    var high = buildRiskChips(panel, day.high || [], lang() === "en" ? "High risk" : "उच्च जोखिम");
    if (veryHigh) frag.appendChild(veryHigh);
    if (high) frag.appendChild(high);
    if (!veryHigh && !high) return null;
    return frag;
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
    var highs = buildFlashChips(panel);
    if (highs) panel.appendChild(highs);
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

  function newestAlert(doc) {
    var rows = (doc && doc.alerts) || [];
    if (!rows.length) return null;
    return rows.slice().sort(function (a, b) {
      return String(b.issued_npt || "").localeCompare(String(a.issued_npt || ""));
    })[0];
  }
  function meterLabel(n, forceDecimal) {
    var num = Number(n);
    if (!isFinite(num)) return "";
    var s = forceDecimal ? num.toFixed(1) : (Math.round(num) === num ? String(Math.round(num)) : String(num));
    return lang() === "en" ? s : digits(s);
  }
  function devghatLive(doc) {
    var rivers = (doc && doc.corridor && doc.corridor.rivers) || [];
    for (var i = 0; i < rivers.length; i++) {
      var row = rivers[i];
      if (row && Number(row.id) === 265 && row.level_m != null && row.fresh) return row;
    }
    return null;
  }
  function renderCard(alert, opt) {
    if (!alert) return null;
    opt = opt || {};
    var en = lang() === "en";
    var art = el("article", "ndr-alert" + (opt.place === "now" ? " is-now" : ""));
    if (opt.anchor !== false) art.id = "ndrrma-flood-alert";
    art.setAttribute("data-ndrrma", alert.id || "");
    var title = el("h3", "ndr-title");
    title.id = opt.anchor === false ? "ndr-h-now" : "ndr-h";
    var river = alert.river || {};
    title.textContent = (alert.title_ne || "विशेष बाढी चेतावनी") + " · " + (alert.title_en || "Special flood alert") + " — " + (river.ne || "नारायणी") + " · " + (river.en || "Narayani");
    art.setAttribute("aria-labelledby", title.id);
    art.appendChild(title);
    art.appendChild(el("p", "ndr-lead", en ? (alert.lead_en || "") : (alert.lead_ne || "")));
    var peak = Number(alert.expected_peak_m);
    var current = Number(alert.current_m);
    var danger = Number(alert.danger_m);
    var scale = peak > 0 ? peak : Math.max(current || 0, danger || 0, 1);
    function pct(v) {
      if (!isFinite(v)) return 0;
      return Math.max(0, Math.min(100, (v / scale) * 100));
    }
    var gauge = el("div", "ndr-gauge");
    var currentTxt = meterLabel(current, false);
    var dangerTxt = meterLabel(danger, false);
    var peakTxt = meterLabel(peak, true);
    var unit = en ? " m" : " मिटर";
    gauge.setAttribute("role", "img");
    gauge.setAttribute("aria-label", en
      ? "Current " + currentTxt + " m, danger " + dangerTxt + " m, expected peak about " + peakTxt + " m"
      : "हालको स्तर " + currentTxt + " मिटर, खतराको तह " + dangerTxt + " मिटर, अपेक्षित उच्चतम करिब " + peakTxt + " मिटर");
    var track = el("div", "ndr-track");
    var fill = el("div", "ndr-fill");
    fill.style.width = pct(current) + "%";
    track.appendChild(fill);
    var mark = el("i", "ndr-mark");
    mark.style.left = "calc(" + pct(danger) + "% - 1px)";
    track.appendChild(mark);
    gauge.appendChild(track);
    var legend = el("ul", "ndr-legend");
    [
      (en ? "Current " : "हालको स्तर ") + currentTxt + unit,
      (en ? "Danger " : "खतराको तह ") + dangerTxt + unit,
      (en ? "Expected peak about " : "अपेक्षित उच्चतम करिब ") + peakTxt + unit
    ].forEach(function (label) {
      legend.appendChild(el("li", null, label));
    });
    gauge.appendChild(legend);
    art.appendChild(gauge);
    var chips = el("ul", "ndr-chips");
    (alert.districts || []).forEach(function (d) {
      chips.appendChild(el("li", null, en ? (d.en || d.ne || "") : (d.ne || d.en || "")));
    });
    art.appendChild(chips);
    var actions = el("ul", "ndr-actions");
    (alert.actions || []).forEach(function (row) {
      var text = en ? (row.en || row.ne || "") : (row.ne || row.en || "");
      if (text) actions.appendChild(el("li", null, text));
    });
    art.appendChild(actions);
    art.appendChild(el("p", "ndr-issued", en ? (alert.issued_en || "") : (alert.issued_ne || "")));
    if (alert.source_url) {
      var src = el("p", "ndr-src");
      var link = document.createElement("a");
      link.href = alert.source_url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = en ? "NDRRMA post" : "NDRRMA पोस्ट";
      src.appendChild(link);
      art.appendChild(src);
    }
    var live = devghatLive(opt.live);
    if (live) {
      var when = "";
      var stamp = String(live.obs_at || "").match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
      if (stamp) when = stamp[1] + " " + stamp[2] + " NPT";
      var line = "hydrology.gov.np live reading · " + live.level_m + " m" + (when ? " · " + when : "");
      art.appendChild(el("p", "ndr-live", line));
    }
    return art;
  }
  function mountNdrrm(parent, anchor) {
    var alert = newestAlert(ndrrmaDoc);
    if (!alert || alert.active !== true) return;
    var card = renderCard(alert, { live: liveDoc, anchor: anchor, place: "flood" });
    if (card) parent.appendChild(card);
  }
  window.NdrrmFlood = { newest: newestAlert, renderCard: renderCard };

  function sourceLine() {
    var p = el("p", "fld-src");
    var a = document.createElement("a");
    a.href = data.source.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = tx(data.source.label);
    p.appendChild(a);
    return p;
  }

  function renderSection(root) {
    root.replaceChildren();
    var board = el("article", "fld fld-section");
    board.id = "flood-outlook";
    mountNdrrm(board, true);
    var head = el("header", "fld-head");
    head.appendChild(el("h2", "fld-title", lang() === "en" ? "River and flood outlook" : "नदी र बाढी पूर्वानुमान"));
    head.appendChild(el("p", "fld-sub", tx(data.source.label)));
    board.appendChild(head);
    board.appendChild(el("p", "fld-lead", tx(data.present.text)));
    board.appendChild(statusBoard());
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
  function nptClock(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var parts;
    try {
      parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", hour: "numeric", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
    } catch (e) { return ""; }
    var hh = 0;
    var mm = "00";
    parts.forEach(function (p) {
      if (p.type === "hour") hh = Number(p.value);
      if (p.type === "minute") mm = p.value;
    });
    var h12 = hh % 12;
    if (h12 === 0) h12 = 12;
    var hm = h12 + ":" + mm;
    if (lang() === "en") return hm + (hh >= 12 ? " PM" : " AM");
    var part = hh < 12 ? "बिहान" : (hh < 17 ? "दिउँसो" : (hh < 20 ? "साँझ" : "राति"));
    return part + " " + digits(hm);
  }
  function gaugeHot(row) {
    if (!row || !row.fresh) return false;
    return row.level === "red" || row.level === "orange" || row.level === "yellow";
  }
  function bulletinNotNormal() {
    var present = data && data.present;
    if (present && (((present.above || []).length) || ((present.near || []).length))) return true;
    var stations = (data && data.stations) || [];
    for (var i = 0; i < stations.length; i++) {
      var days = stations[i].days || [];
      for (var j = 0; j < days.length; j++) {
        var tone = (levelMeta(days[j]) || {}).tone;
        if (tone && tone !== "green" && tone !== "mint") return true;
      }
    }
    return false;
  }
  function riversUrgent() {
    if (bulletinNotNormal()) return true;
    var rivers = (liveDoc && liveDoc.corridor && liveDoc.corridor.rivers) || [];
    for (var i = 0; i < rivers.length; i++) if (gaugeHot(rivers[i])) return true;
    return false;
  }
  function placeFloodHome() {
    var flood = document.getElementById("flood-home");
    var roads = document.getElementById("dor-home");
    if (!flood || !roads || !flood.parentNode || flood.parentNode !== roads.parentNode) return;
    if (riversUrgent()) roads.parentNode.insertBefore(flood, roads);
    else flood.parentNode.insertBefore(roads, flood);
  }
  function gaugeLine(row) {
    var li = el("li", "fld-gauge" + (row.fresh ? " is-" + (row.level || "none") : " is-off"));
    li.appendChild(el("i", "fld-dot fld-dot-" + (row.fresh ? (row.level || "none") : "none")));
    li.appendChild(el("span", "fld-gauge-name", tx(row)));
    if (row.fresh && row.level_m != null) {
      li.appendChild(el("span", "fld-gauge-m", meterLabel(row.level_m, false) + (lang() === "en" ? " m" : " मि")));
      if (row.warning_m != null) {
        li.appendChild(el("span", "fld-gauge-alert", (lang() === "en" ? "alert " : "सतर्कता ") + meterLabel(row.warning_m, false) + (lang() === "en" ? " m" : " मि")));
      }
      var when = nptClock(row.obs_at);
      if (when) li.appendChild(el("span", "fld-gauge-t", when));
    }
    return li;
  }
  function buildFlashChips() {
    var wrap = el("div", "fld-flash");
    var ru = data.rasuwa || {};
    var ras = nameOf(ru.id || "rasuwa");
    wrap.appendChild(el("p", "fld-cor-risk", lang() === "en"
      ? ras + " flash-flood risk: " + riskWord(ru.today || "low") + " today, " + riskWord(ru.tomorrow || "low") + " tomorrow."
      : ras + "मा आकस्मिक बाढीको जोखिम आज " + riskWord(ru.today || "low") + ", भोलि " + riskWord(ru.tomorrow || "low") + "।"));
    if ((data.corridor || []).length) {
      var cor = el("div", "fld-cor-days");
      data.corridor.forEach(function (item) {
        var tone = item.today === "very_high" ? "red" : (item.today === "high" ? "orange" : (item.today === "medium" ? "yellow" : "green"));
        var cell = el("span", "fld-cell fld-" + tone);
        cell.appendChild(el("b", null, nameOf(item.id)));
        cell.appendChild(document.createTextNode(riskWord(item.today) + " · " + riskWord(item.tomorrow)));
        cor.appendChild(cell);
      });
      wrap.appendChild(cor);
    }
    return wrap;
  }
  function renderHome(root) {
    root.replaceChildren();
    var card = el("article", "fld fld-home");
    mountNdrrm(card, true);
    card.appendChild(el("h2", "fld-title", lang() === "en" ? "Rivers and flood" : "नदी र बाढी"));
    if (data.source && data.source.label) card.appendChild(el("p", "fld-sub", tx(data.source.label)));
    if (data.present && tx(data.present.text)) card.appendChild(el("p", "fld-lead", tx(data.present.text)));
    [
      ["above", "Above alert", "सतर्कता तह माथि"],
      ["near", "Near alert", "सतर्कता नजिक"]
    ].forEach(function (row) {
      var items = (data.present && data.present[row[0]]) || [];
      if (!items.length) return;
      card.appendChild(el("p", "fld-home-r", lang() === "en"
        ? row[1] + ": " + items.map(tx).join(", ") + "."
        : row[2] + ": " + items.map(tx).join(", ") + "।"));
    });
    var rivers = (liveDoc && liveDoc.corridor && liveDoc.corridor.rivers) || [];
    var fresh = [];
    var offline = [];
    rivers.forEach(function (row) {
      if (row && row.fresh && row.level_m != null) fresh.push(row);
      else if (row) offline.push(row);
    });
    if (fresh.length) {
      var list = el("ul", "fld-gauges");
      fresh.forEach(function (row) { list.appendChild(gaugeLine(row)); });
      card.appendChild(list);
    }
    if (offline.length) {
      card.appendChild(el("p", "fld-offline", (lang() === "en" ? "No fresh reading: " : "ताजा रिडिङ छैन: ") + offline.map(tx).join(", ")));
    }
    card.appendChild(buildFlashChips());
    var bulletin = liveDoc && liveDoc.bulletin;
    var freshBulletin = window.RasuwaWx && typeof window.RasuwaWx.bulletinFresh === "function" && window.RasuwaWx.bulletinFresh(bulletin, liveDoc && liveDoc.generated_at);
    if (freshBulletin) {
      var blink = document.createElement("a");
      blink.className = "fld-bull";
      blink.href = bulletin.url;
      blink.target = "_blank";
      blink.rel = "noopener";
      blink.textContent = bulletin.title || (lang() === "en" ? "DHM bulletin" : "DHM बुलेटिन");
      card.appendChild(blink);
    }
    var a = document.createElement("a");
    a.className = "fld-more";
    a.href = "weather.html#flood-outlook";
    a.textContent = "सबै हेर्नुहोस् · See all";
    card.appendChild(a);
    root.appendChild(card);
  }
  function renderCorridorMount(root) {
    root.replaceChildren();
  }
  function renderMount(root) {
    var mode = root.getAttribute("data-flood-mode") || "section";
    if (mode === "home") renderHome(root);
    else if (mode === "corridor") renderCorridorMount(root);
    else renderSection(root);
  }
  function paintAll() {
    mounts.forEach(renderMount);
    placeFloodHome();
  }

  function boot() {
    function softJSON(url) {
      return fetch(bust(url), { cache: "no-store" }).then(function (r) {
        if (!r.ok) return null;
        return r.json();
      }).catch(function () { return null; });
    }
    Promise.all([
      fetch(bust("data/flood-bulletin.json"), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("flood"); return r.json(); }),
      fetch(bust("data/nepal-districts-svg.json"), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("geo"); return r.json(); }),
      softJSON("data/ndrrma_flood_alerts.json"),
      softJSON("data/weather/now.json")
    ]).then(function (pair) {
      data = pair[0];
      geo = pair[1];
      ndrrmaDoc = pair[2];
      liveDoc = pair[3];
      (geo.districts || []).forEach(function (d) { byId[d.id] = d; });
      paintAll();
    }).catch(function () {});
  }
  boot();
  var lastLang = lang();
  if (typeof MutationObserver === "function") {
    new MutationObserver(function () {
      var now = lang();
      if (now === lastLang) return;
      lastLang = now;
      if (data) paintAll();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
})();
