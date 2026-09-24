/*! Rasuwa flood bulletin · DHM weather alert board · driven by data/weather-alert.json */
(function () {
  var mounts = document.querySelectorAll("[data-wx-mount]");
  if (!mounts.length) return;

  var data = null;
  var selected = null;
  var dayMode = "overview";
  var justShifted = false;
  var liveState = "idle";
  var liveNote = null;
  var VER = window.PAGE_VER || "2026-09-24-dhm-12299";
  var districts = null;
  var showDistricts = true;
  var hotDistrict = null;
  var LIVE_MS = 4000;

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
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgEl(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }
  function provinceById(id) {
    var list = (data && data.provinces) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function geoById(id) {
    var list = (data && data.geo && data.geo.provinces) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function districtById(id) {
    var list = (districts && districts.districts) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function districtLabel(d) {
    if (!d) return "";
    return lang() === "en" ? d.en : d.ne;
  }
  function activeDay() {
    if (!data || dayMode === "overview") return null;
    var days = data.warning_days || [];
    for (var i = 0; i < days.length; i++) if (days[i].date === dayMode) return days[i];
    return null;
  }
  function alertKey(p) {
    var day = activeDay();
    var raw = day && day.provinces && day.provinces[p.id] && day.provinces[p.id].level;
    if (raw === "red" || raw === "orange" || raw === "yellow" || raw === "green") return raw;
    if (p.level === "very_heavy_extreme") return "red";
    if (p.level === "heavy_very_heavy") return "orange";
    if (p.level === "heavy") return "yellow";
    return "green";
  }
  function levelOf(p) {
    var key = alertKey(p);
    return (data.warn_levels && data.warn_levels[key]) || { color: "#1b7f3a", ne: "हरियो", en: "Green" };
  }
  function districtLine(p) {
    var day = activeDay();
    var rec = day && day.provinces && day.provinces[p.id];
    var list = (rec && rec.districts) || p.districts;
    if (!list || !list.length) return "";
    return list.map(function (d) { return tx(d); }).filter(Boolean).join(", ");
  }
  function fmt(tpl, map) {
    return String(tpl || "").replace(/\{(\w+)\}/g, function (_, k) {
      return map[k] != null ? map[k] : "";
    });
  }
  function dayLabel(date) {
    var days = (data.timeline && data.timeline.days) || [];
    for (var i = 0; i < days.length; i++) if (days[i].date === date) return tx(days[i]);
    return date;
  }
  function detailText(p) {
    var day = activeDay();
    if (!day || !day.provinces || !day.provinces[p.id]) return tx(p.detail);
    var rec = day.provinces[p.id];
    var lv = (data.warn_levels && data.warn_levels[rec.level]) || { ne: "", en: "" };
    var body = fmt(tx(data.ui.day_detail), { when: dayLabel(day.date), name: tx(p), level: tx(lv) });
    if (rec.also && rec.also.length) {
      var names = rec.also.map(function (k) {
        return tx((data.warn_levels && data.warn_levels[k]) || {});
      }).filter(Boolean).join(", ");
      if (names) body += fmt(tx(data.ui.day_also), { also: names });
    }
    return body;
  }
  function kathmanduToday() {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });
    } catch (e) {
      return "";
    }
  }
  function order() {
    return (data && data.keyboard_order) || [];
  }

  function paintPressed() {
    var tab = selected || (order()[0] || "");
    document.querySelectorAll(".wxb-prov").forEach(function (path) {
      var id = path.getAttribute("data-id");
      var on = !!(selected && id === selected);
      path.setAttribute("aria-pressed", on ? "true" : "false");
      path.classList.toggle("is-on", on);
      path.setAttribute("tabindex", id === tab ? "0" : "-1");
    });
  }
  function paintPop(root, id, districtId) {
    var pop = root && root.querySelector(".wxb-pop");
    if (!pop) return;
    var distRec = districtId ? districtById(districtId) : null;
    if (!id && distRec) id = distRec.province;
    if (!id) {
      pop.hidden = true;
      return;
    }
    var p = provinceById(id);
    if (!p) { pop.hidden = true; return; }
    var lv = levelOf(p);
    var name = pop.querySelector(".wxb-pop-name");
    var row = pop.querySelector(".wxb-pop-lv");
    var body = pop.querySelector(".wxb-pop-body");
    var dist = pop.querySelector(".wxb-pop-dist");
    var x = pop.querySelector(".wxb-pop-x");
    if (name) name.textContent = distRec ? districtLabel(distRec) : tx(p);
    if (row) {
      row.replaceChildren();
      var sw = el("i", "wxb-sw wxb-sw-" + alertKey(p));
      row.appendChild(sw);
      row.appendChild(document.createTextNode((lv.ne || "") + " / " + (lv.en || "")));
    }
    if (body) body.textContent = distRec ? tx(p) : detailText(p);
    if (dist) {
      if (distRec) {
        dist.hidden = false;
        dist.textContent = detailText(p);
      } else {
        var line = districtLine(p);
        dist.hidden = !line;
        dist.textContent = line;
      }
    }
    if (x) x.setAttribute("aria-label", tx(data.ui.pop_close));
    pop.hidden = false;
  }
  function clearSelect() {
    selected = null;
    hotDistrict = null;
    document.querySelectorAll(".wxb-dist.is-on").forEach(function (n) { n.classList.remove("is-on"); });
    paintPressed();
    document.querySelectorAll("[data-wx-mount]").forEach(function (root) { paintPop(root, null); });
  }

  function show(root, id) {
    paintPop(root, id);
  }

  function focusBar(bar) {
    if (!bar || !bar.focus) return;
    if (bar.focus === "overview") {
      if (dayMode !== "overview") justShifted = true;
      dayMode = "overview";
      renderAll();
      return;
    }
    select(bar.focus, false);
    var root = document.querySelector("[data-wx-mount]");
    var map = root && root.querySelector(".wxb-mapwrap");
    if (map && map.scrollIntoView) map.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function select(id, focus) {
    if (!provinceById(id)) return;
    selected = id;
    paintPressed();
    document.querySelectorAll("[data-wx-mount]").forEach(function (root) {
      paintPop(root, id);
    });
    if (focus) {
      var path = document.querySelector('.wxb-prov[data-id="' + id + '"]');
      if (path) path.focus();
    }
  }

  function onKey(e) {
    var path = e.target.closest && e.target.closest(".wxb-prov");
    if (!path) return;
    var ids = order();
    var id = path.getAttribute("data-id");
    var i = ids.indexOf(id);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      select(ids[(i + 1) % ids.length], true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      select(ids[(i - 1 + ids.length) % ids.length], true);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(ids[0], true);
    } else if (e.key === "End") {
      e.preventDefault();
      select(ids[ids.length - 1], true);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(id, false);
    }
  }

  function drawDistricts(svg) {
    if (!districts || !svg) return;
    var g = svg.querySelector(".wxb-dists");
    if (!g || g.childNodes.length) return;
    (districts.districts || []).forEach(function (d) {
      var path = svgEl("path");
      path.setAttribute("d", d.d);
      path.setAttribute("class", "wxb-dist");
      path.setAttribute("data-id", d.id);
      path.setAttribute("data-prov", d.province);
      var p = provinceById(d.province);
      var label = districtLabel(d);
      if (p) label += ". " + tx(p) + ". " + tx(levelOf(p));
      path.setAttribute("role", "button");
      path.setAttribute("tabindex", "0");
      path.setAttribute("aria-label", label);
      g.appendChild(path);
    });
    if (!showDistricts) g.setAttribute("hidden", "");
  }
  function buildMap(svg) {
    var geo = data.geo || {};
    svg.setAttribute("viewBox", geo.viewBox || "0 0 672.5 391.7");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", tx(data.ui.map_h));
    var layer = svgEl("g");
    layer.setAttribute("class", "wxb-zoom");
    svg._layer = layer;
    svg.appendChild(layer);
    var ring = geo.ring;
    if (ring) {
      var ell = svgEl("ellipse");
      ell.setAttribute("cx", ring.cx);
      ell.setAttribute("cy", ring.cy);
      ell.setAttribute("rx", ring.rx);
      ell.setAttribute("ry", ring.ry);
      ell.setAttribute("class", "wxb-ring");
      layer.appendChild(ell);
    }
    (geo.provinces || []).forEach(function (g) {
      var p = provinceById(g.id);
      if (!p) return;
      var key = alertKey(p);
      var path = svgEl("path");
      path.setAttribute("d", g.d);
      path.setAttribute("class", "wxb-prov wxb-lv-" + key);
      path.setAttribute("data-id", g.id);
      path.setAttribute("data-alert", key);
      path.setAttribute("role", "button");
      path.setAttribute("tabindex", (selected ? g.id === selected : g.id === (order()[0] || "")) ? "0" : "-1");
      path.setAttribute("aria-pressed", g.id === selected ? "true" : "false");
      path.setAttribute("aria-label", tx(p) + ". " + tx(levelOf(p)) + ". " + detailText(p));
      layer.appendChild(path);
    });
    var dlayer = svgEl("g");
    dlayer.setAttribute("class", "wxb-dists");
    if (!showDistricts) dlayer.setAttribute("hidden", "");
    layer.appendChild(dlayer);
    drawDistricts(svg);
    var pin = geo.pin;
    if (pin) {
      var line = svgEl("line");
      var vb = (geo.viewBox || "0 0 836 520").trim().split(/[\s,]+/).map(Number);
      var vx = vb.length === 4 ? vb[0] : 0;
      var vy = vb.length === 4 ? vb[1] : 0;
      var vw = vb.length === 4 ? vb[2] : 836;
      var vh = vb.length === 4 ? vb[3] : 520;
      line.setAttribute("x1", pin.x);
      line.setAttribute("y1", pin.y);
      line.setAttribute("x2", vx + vw - 12);
      line.setAttribute("y2", vy + Math.min(88, vh * 0.16));
      line.setAttribute("class", "wxb-connector");
      layer.appendChild(line);
      var mark = svgEl("g");
      mark.setAttribute("class", "wxb-pin");
      mark.setAttribute("transform", "translate(" + pin.x + " " + pin.y + ")");
      mark.setAttribute("aria-hidden", "true");
      var drop = svgEl("path");
      drop.setAttribute("d", "M0 0c-6-8-12-14-12-20a12 12 0 1 1 24 0c0 6-6 12-12 20z");
      var dot = svgEl("circle");
      dot.setAttribute("cy", "-20");
      dot.setAttribute("r", "4.2");
      mark.appendChild(drop);
      mark.appendChild(dot);
      layer.appendChild(mark);
    }
    function markDistrict(id) {
      document.querySelectorAll(".wxb-dist").forEach(function (n) {
        n.classList.toggle("is-on", !!(id && n.getAttribute("data-id") === id));
      });
    }
    var touchPick = null;
    function armPick(e) {
      if (svg._dragged || svg._pinching) {
        svg._dragged = false;
        return;
      }
      var dist = e.target.closest && e.target.closest(".wxb-dist");
      if (dist) {
        var did = dist.getAttribute("data-id");
        var prov = dist.getAttribute("data-prov");
        hotDistrict = did;
        selected = prov;
        paintPressed();
        markDistrict(did);
        document.querySelectorAll("[data-wx-mount]").forEach(function (root) { paintPop(root, prov, did); });
        return;
      }
      var path = e.target.closest && e.target.closest(".wxb-prov");
      if (!path) {
        hotDistrict = null;
        markDistrict(null);
        clearSelect();
        return;
      }
      hotDistrict = null;
      markDistrict(null);
      select(path.getAttribute("data-id"), false);
    }
    svg.addEventListener("pointerdown", function (e) {
      if ((e.pointerType || "mouse") === "mouse") return;
      touchPick = { id: e.pointerId, x: e.clientX, y: e.clientY, cancel: false };
    });
    svg.addEventListener("pointercancel", function (e) {
      if (touchPick && e.pointerId === touchPick.id) touchPick.cancel = true;
    });
    svg.addEventListener("pointerup", function (e) {
      if (!touchPick || e.pointerId !== touchPick.id) return;
      var g = touchPick;
      touchPick = null;
      if (g.cancel || svg._pinching) return;
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 14) return;
      armPick(e);
      svg._skipClick = true;
      window.setTimeout(function () { svg._skipClick = false; }, 500);
    });
    svg.addEventListener("click", function (e) {
      if (svg._skipClick) return;
      if ((e.pointerType || "mouse") !== "mouse") return;
      armPick(e);
    });
    svg.addEventListener("pointerover", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      var dist = e.target.closest && e.target.closest(".wxb-dist");
      var path = dist || (e.target.closest && e.target.closest(".wxb-prov"));
      if (!path) return;
      svg.querySelectorAll(".wxb-prov.is-hot, .wxb-dist.is-hot").forEach(function (n) { n.classList.remove("is-hot"); });
      path.classList.add("is-hot");
      var root = svg.closest("[data-wx-mount]");
      if (!root) return;
      if (dist) paintPop(root, dist.getAttribute("data-prov"), dist.getAttribute("data-id"));
      else show(root, path.getAttribute("data-id"));
    });
    svg.addEventListener("pointerout", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      var path = e.target.closest && (e.target.closest(".wxb-dist") || e.target.closest(".wxb-prov"));
      if (!path) return;
      var next = e.relatedTarget && e.relatedTarget.closest && (e.relatedTarget.closest(".wxb-dist") || e.relatedTarget.closest(".wxb-prov"));
      if (next) return;
      svg.querySelectorAll(".wxb-prov.is-hot, .wxb-dist.is-hot").forEach(function (n) { n.classList.remove("is-hot"); });
      var root = svg.closest("[data-wx-mount]");
      if (root) paintPop(root, selected, hotDistrict);
    });
    svg.addEventListener("focusin", function (e) {
      var dist = e.target.closest && e.target.closest(".wxb-dist");
      var path = dist || (e.target.closest && e.target.closest(".wxb-prov"));
      if (!path) return;
      var root = svg.closest("[data-wx-mount]");
      if (!root) return;
      if (dist) paintPop(root, dist.getAttribute("data-prov"), dist.getAttribute("data-id"));
      else show(root, path.getAttribute("data-id"));
    });
    svg.addEventListener("keydown", onKey);
  }

  function buildTimeline(host) {
    var tl = data.timeline || { days: [], bars: [] };
    var today = kathmanduToday();
    var head = el("div", "wxb-gantt-head");
    head.appendChild(el("div", "wxb-gantt-spacer"));
    var days = el("div", "wxb-days");
    var spanCols = tl.days.length || 5;
    days.style.gridTemplateColumns = "repeat(" + spanCols + ", 1fr)";
    tl.days.forEach(function (d) {
      var on = d.date === today;
      var cell = el("div", "wxb-day" + (on ? " is-today" : ""));
      cell.appendChild(el("span", "wxb-day-name", tx(d)));
      cell.appendChild(el("span", "wxb-day-sub", on ? tx(data.ui.today) : (lang() === "en" ? d.dow_en : d.dow_ne)));
      days.appendChild(cell);
    });
    head.appendChild(days);
    host.appendChild(head);

    var span = tl.days.length || 5;
    tl.bars.forEach(function (bar) {
      var row = el("div", "wxb-gantt-row");
      row.setAttribute("role", "listitem");
      var meta = el("div", "wxb-meta");
      var tone = { yellow: "yellow", blue: "orange", magenta: "red", red: "red", orange: "orange", green: "green" }[bar.tone] || "yellow";
      var name = el("span", "wxb-bname", tx(bar.name));
      if (bar.live) name.appendChild(el("em", "wxb-live", tx(data.ui.live)));
      meta.appendChild(name);
      var track = el("div", "wxb-track");
      track.setAttribute("aria-hidden", "true");
      var stripe = 100 / span;
      track.style.background = "repeating-linear-gradient(90deg, transparent 0, transparent calc(" + stripe + "% - 1px), #e2e8f0 calc(" + stripe + "% - 1px), #e2e8f0 " + stripe + "%)";
      var left = (bar.start / span) * 100;
      var width = ((bar.end - bar.start) / span) * 100;
      var b = el("div", "wxb-bar wxb-bar-" + tone + " wxb-arr-" + (bar.arrows || "end"));
      b.style.left = left + "%";
      b.style.width = width + "%";
      b.appendChild(el("span", null, tx(bar.span)));
      track.appendChild(b);
      row.appendChild(meta);
      row.appendChild(track);
      var label = tx(bar.name) + " · " + tx(bar.span);
      if (bar.focus) label += ". " + tx(data.ui.gantt_btn);
      row.setAttribute("aria-label", label);
      if (bar.focus) {
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.classList.add("is-btn");
        if (bar.focus) row.setAttribute("data-focus", bar.focus);
        if (bar.focus === "overview" && dayMode === "overview") row.classList.add("is-on");
        row.addEventListener("click", function () { focusBar(bar); });
        row.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            focusBar(bar);
          }
        });
      }
      host.appendChild(row);
    });
    host.setAttribute("role", "list");
    host.setAttribute("aria-label", tx(data.ui.timeline_h));
  }

  function buildGallery(host) {
    host.replaceChildren();
    var h = el("h3", "wxb-h", tx(data.ui.maps_h));
    host.appendChild(h);
    var grid = el("div", "wx-maps");
    (data.maps || []).forEach(function (m, i) {
      var fig = el("figure");
      var a = document.createElement("a");
      a.href = m.file;
      a.target = "_blank";
      a.rel = "noopener";
      var img = document.createElement("img");
      img.src = m.file;
      img.width = m.w || 1200;
      img.height = m.h || 738;
      img.alt = tx(m);
      img.loading = i === 0 ? "eager" : "lazy";
      a.appendChild(img);
      var cap = el("figcaption", null, tx(m));
      fig.appendChild(a);
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
    host.appendChild(grid);
    host.appendChild(el("p", "wxb-note", tx(data.ui.maps_legend)));
  }

  function iconBell() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 22a2.4 2.4 0 0 0 2.4-2.2H9.6A2.4 2.4 0 0 0 12 22zm7-6.2V11a7 7 0 0 0-5.2-6.7V3.5a1.8 1.8 0 1 0-3.6 0v.8A7 7 0 0 0 5 11v4.8L3.2 17.6v1.1h17.6v-1.1L19 15.8z"/></svg>';
  }
  function iconCal() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2zm12 8H5v10h14V10zM5 8h14V6H5v2z"/></svg>';
  }
  function iconCloud() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 18a5 5 0 0 1-.4-10 6 6 0 0 1 11.5-1.2A4.5 4.5 0 1 1 18 18H7z"/></svg>';
  }
  function iconClock() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 .01 20.01A10 10 0 0 0 12 2zm1 11H7v-2h4V6h2v7z"/></svg>';
  }
  function iconPin() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>';
  }

  function art() {
    var wrap = el("div", "wxb-art");
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML =
      '<svg viewBox="0 0 180 110" width="168" height="102">' +
      '<path fill="#1e3a5f" d="M8 92 L48 48 L68 70 L92 36 L128 86 L150 62 L174 92 Z"/>' +
      '<path fill="#334e73" d="M20 92 L58 58 L78 78 L104 50 L140 92 Z"/>' +
      '<path fill="#e8eef5" d="M38 58 L48 48 L58 58 L52 58 L48 54 L44 58 Z"/>' +
      '<path fill="#e8eef5" d="M82 48 L92 36 L102 48 L96 48 L92 43 L88 48 Z"/>' +
      '<ellipse cx="78" cy="28" rx="28" ry="16" fill="#64748b"/>' +
      '<ellipse cx="104" cy="32" rx="24" ry="14" fill="#475569"/>' +
      '<ellipse cx="58" cy="34" rx="18" ry="12" fill="#94a3b8"/>' +
      '<path stroke="#fbbf24" stroke-width="3" fill="none" d="M118 18 l8 14 h-6 l8 16"/>' +
      '<g stroke="#60a5fa" stroke-width="2" stroke-linecap="round">' +
      '<path d="M62 50 l-4 12"/><path d="M74 52 l-4 14"/><path d="M86 50 l-4 12"/><path d="M98 54 l-3 10"/>' +
      "</g></svg>";
    return wrap;
  }

  function buildPop() {
    var pop = el("div", "wxb-pop");
    pop.hidden = true;
    pop.setAttribute("role", "dialog");
    var x = document.createElement("button");
    x.type = "button";
    x.className = "wxb-pop-x";
    x.textContent = "×";
    x.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearSelect();
    });
    pop.appendChild(x);
    pop.appendChild(el("p", "wxb-pop-name"));
    pop.appendChild(el("p", "wxb-pop-lv"));
    pop.appendChild(el("p", "wxb-pop-body"));
    pop.appendChild(el("p", "wxb-pop-dist"));
    return pop;
  }

  function applyFills(svg) {
    svg.querySelectorAll(".wxb-prov").forEach(function (path) {
      var p = provinceById(path.getAttribute("data-id"));
      if (!p) return;
      var key = alertKey(p);
      path.setAttribute("data-alert", key);
      ["red", "orange", "yellow", "green"].forEach(function (k) {
        path.classList.toggle("wxb-lv-" + k, k === key);
      });
      path.setAttribute("aria-label", tx(p) + ". " + tx(levelOf(p)) + ". " + detailText(p));
    });
  }

  function syncDays() {
    document.querySelectorAll(".wxb-svg").forEach(function (svg) {
      svg.classList.add("is-shifting");
      applyFills(svg);
    });
    document.querySelectorAll(".wxb-chip").forEach(function (b) {
      var on = b.getAttribute("data-day") === dayMode;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".wxb-dayhint").forEach(function (n) {
      n.textContent = tx(activeDay() ? data.ui.day_method : data.ui.day_switch_hint);
    });
    document.querySelectorAll(".wxb-gantt-row[data-focus]").forEach(function (row) {
      row.classList.toggle("is-on", row.getAttribute("data-focus") === "overview" && dayMode === "overview");
    });
    document.querySelectorAll("[data-wx-mount]").forEach(function (root) {
      var hot = root.querySelector(".wxb-prov.is-hot");
      var hotDist = root.querySelector(".wxb-dist.is-hot");
      paintPop(root, (hot && hot.getAttribute("data-id")) || selected, hotDist ? hotDist.getAttribute("data-id") : hotDistrict);
    });
    window.setTimeout(function () {
      document.querySelectorAll(".wxb-svg.is-shifting").forEach(function (n) { n.classList.remove("is-shifting"); });
    }, 520);
  }

  function buildZoom(svg) {
    var ui = data.ui;
    var bar = el("div", "wxb-zoom-ui");
    function btn(key, factor) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wxb-zbtn";
      b.textContent = tx(ui[key]);
      b.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (svg._zoomBy) svg._zoomBy(factor);
      });
      bar.appendChild(b);
    }
    btn("zoom_in", 1.35);
    btn("zoom_out", 1 / 1.35);
    var reset = document.createElement("button");
    reset.type = "button";
    reset.className = "wxb-zbtn";
    reset.textContent = tx(ui.zoom_reset);
    reset.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (svg._zoomReset) svg._zoomReset();
    });
    bar.appendChild(reset);
    return bar;
  }

  function bindNav(wrap, svg) {
    var layer = svg._layer;
    var st = { s: 1, x: 0, y: 0 };
    function apply() {
      if (layer) layer.setAttribute("transform", "translate(" + st.x + " " + st.y + ") scale(" + st.s + ")");
    }
    function userBox() {
      var vb = svg.viewBox && svg.viewBox.baseVal;
      if (vb && vb.width) return { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
      return { x: 0, y: 0, w: 836, h: 520 };
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
    svg._zoomReset = function () { st.s = 1; st.x = 0; st.y = 0; apply(); };
    var ptr = {};
    wrap.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest(".wxb-zoom-ui, .wxb-pop")) return;
      ptr[e.pointerId] = {
        x: e.clientX,
        y: e.clientY,
        ox: e.clientX,
        oy: e.clientY,
        type: e.pointerType || "mouse"
      };
      var ids = Object.keys(ptr).filter(function (k) { return k !== "_span" && k !== "_scale"; });
      if ((e.pointerType || "mouse") !== "touch") {
        try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
      } else if (ids.length >= 2) {
        ids.forEach(function (id) { try { wrap.setPointerCapture(Number(id)); } catch (err) {} });
        var a = ptr[ids[0]];
        var b = ptr[ids[1]];
        ptr._span = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        ptr._scale = st.s;
      }
    });
    wrap.addEventListener("pointermove", function (e) {
      var cur = ptr[e.pointerId];
      if (!cur) return;
      var ids = Object.keys(ptr).filter(function (k) { return k !== "_span" && k !== "_scale"; });
      if (cur.type === "touch") {
        if (ids.length < 2) {
          if (st.s > 1.02 && Math.hypot(e.clientX - cur.ox, e.clientY - cur.oy) > 10) {
            svg._dragged = true;
            var pan = svg.getScreenCTM();
            st.x += pan && pan.a ? (e.clientX - cur.x) / pan.a : 0;
            st.y += pan && pan.d ? (e.clientY - cur.y) / pan.d : 0;
            apply();
          }
          cur.x = e.clientX;
          cur.y = e.clientY;
          return;
        }
        cur.x = e.clientX;
        cur.y = e.clientY;
        svg._pinching = true;
        e.preventDefault();
        var a = ptr[ids[0]];
        var b = ptr[ids[1]];
        var span = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        var next = Math.max(1, Math.min(4, (ptr._scale || st.s) * (span / (ptr._span || span))));
        st.s = next;
        if (st.s <= 1.01) { st.s = 1; st.x = 0; st.y = 0; }
        apply();
        return;
      }
      if (Math.hypot(e.clientX - cur.ox, e.clientY - cur.oy) > 6) svg._dragged = true;
      if (!svg._dragged) return;
      var m = svg.getScreenCTM();
      var ux = m && m.a ? (e.clientX - cur.x) / m.a : (e.clientX - cur.x);
      var uy = m && m.d ? (e.clientY - cur.y) / m.d : (e.clientY - cur.y);
      st.x += ux;
      st.y += uy;
      cur.x = e.clientX;
      cur.y = e.clientY;
      apply();
    });
    function endPtr(e) {
      delete ptr[e.pointerId];
      var ids = Object.keys(ptr).filter(function (k) { return k !== "_span" && k !== "_scale"; });
      if (ids.length < 2) {
        delete ptr._span;
        delete ptr._scale;
        window.setTimeout(function () { svg._pinching = false; }, 80);
      }
      window.setTimeout(function () { svg._dragged = false; }, 40);
    }
    wrap.addEventListener("pointerup", endPtr);
    wrap.addEventListener("pointercancel", endPtr);
    wrap.addEventListener("wheel", function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      var local = null;
      var m = svg.getScreenCTM();
      if (m && svg.createSVGPoint) {
        var pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        var u = pt.matrixTransform(m.inverse());
        local = { x: (u.x - st.x) / st.s, y: (u.y - st.y) / st.s };
      }
      zoomBy(e.deltaY < 0 ? 1.12 : 0.89, local);
    }, { passive: false });
  }

  function renderMount(root) {
    var mode = root.getAttribute("data-wx-mode") || "home";
    var ui = data.ui;
    root.replaceChildren();
    var board = el("article", "wxb" + (mode === "section" ? " wxb-section" : " wxb-home"));
    var titleId = "wxb-title-" + mode + "-" + Math.random().toString(36).slice(2, 6);
    board.setAttribute("aria-labelledby", titleId);

    var head = el("header", "wxb-head");
    var brand = el("div", "wxb-brand");
    brand.appendChild(el("span", "wxb-mark", "R"));
    var brandTxt = el("div", "wxb-brand-txt");
    brandTxt.appendChild(el("p", "wxb-brandname", tx(ui.brand)));
    var pills = el("div", "wxb-pills");
    var badge = el("span", "wxb-badge");
    badge.innerHTML = iconBell();
    badge.appendChild(document.createTextNode(" " + tx(ui.badge)));
    var issued = el("span", "wxb-issued");
    issued.innerHTML = iconCal();
    issued.appendChild(document.createTextNode(" " + tx(ui.issued)));
    pills.appendChild(badge);
    pills.appendChild(issued);
    brandTxt.appendChild(pills);
    brand.appendChild(brandTxt);
    head.appendChild(brand);
    head.appendChild(art());
    board.appendChild(head);

    var h2 = el("h2", "wxb-title", tx(ui.title));
    h2.id = titleId;
    board.appendChild(h2);
    board.appendChild(el("p", "wxb-sub", tx(ui.sub)));

    var mapPanel = el("section", "wxb-panel");
    var mh = el("h3", "wxb-h");
    mh.innerHTML = iconCloud();
    mh.appendChild(document.createTextNode(" " + tx(ui.map_h)));
    mapPanel.appendChild(mh);
    var svg = svgEl("svg");
    svg.setAttribute("class", "wxb-svg" + (justShifted ? " is-shifting" : ""));
    buildMap(svg);
    var dbtn = document.createElement("button");
    dbtn.type = "button";
    dbtn.className = "wxb-dist-toggle" + (showDistricts ? " is-on" : "");
    dbtn.setAttribute("aria-pressed", showDistricts ? "true" : "false");
    dbtn.textContent = tx(ui.districts || { ne: "जिल्ला", en: "Districts" });
    dbtn.addEventListener("click", function () {
      showDistricts = !showDistricts;
      document.querySelectorAll(".wxb-dists").forEach(function (g) {
        if (showDistricts) g.removeAttribute("hidden");
        else g.setAttribute("hidden", "");
      });
      document.querySelectorAll(".wxb-dist-toggle").forEach(function (b) {
        b.classList.toggle("is-on", showDistricts);
        b.setAttribute("aria-pressed", showDistricts ? "true" : "false");
        b.textContent = tx((data.ui && data.ui.districts) || { ne: "जिल्ला", en: "Districts" });
      });
    });
    var drow = el("div", "wxb-dist-row");
    drow.appendChild(dbtn);
    drow.appendChild(el("p", "wxb-dist-hint", tx(ui.districts_hint || { ne: "जिल्लाको रेखा खोल्न वा बन्द गर्न सकिन्छ। रङ प्रदेशको चेतावनी हो।", en: "District lines can be turned on or off. Colour is the province warning." })));
    var tools = el("div", "wxb-maptools");
    tools.appendChild(drow);
    tools.appendChild(buildZoom(svg));
    mapPanel.appendChild(tools);
    var stage = el("div", "wxb-stage");
    var mapWrap = el("div", "wxb-mapwrap");
    mapWrap.appendChild(svg);
    bindNav(mapWrap, svg);
    stage.appendChild(mapWrap);
    var call = data.callout || {};
    var aside = el("aside", "wxb-callout");
    var ct = el("p", "wxb-call-t");
    ct.innerHTML = iconPin();
    ct.appendChild(document.createTextNode(" " + tx(call.title)));
    aside.appendChild(ct);
    aside.appendChild(el("p", "wxb-call-b", tx(call.body)));
    aside.appendChild(el("p", "wxb-call-m", tx(call.meta)));
    stage.appendChild(aside);
    mapPanel.appendChild(stage);
    mapPanel.appendChild(buildPop());

    var switcher = el("div", "wxb-dayswitch");
    switcher.setAttribute("role", "tablist");
    switcher.setAttribute("aria-label", tx(ui.days_h));
    function dayChip(id, label, on) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wxb-chip" + (on ? " is-on" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.textContent = label;
      b.setAttribute("data-day", id);
      b.addEventListener("click", function () {
        if (dayMode === id) return;
        dayMode = id;
        syncDays();
      });
      switcher.appendChild(b);
    }
    dayChip("overview", tx(ui.day_overview), dayMode === "overview");
    ((data.timeline && data.timeline.days) || []).forEach(function (d) {
      var sub = lang() === "en" ? d.dow_en : d.dow_ne;
      dayChip(d.date, tx(d) + " · " + sub, dayMode === d.date);
    });
    mapPanel.appendChild(switcher);
    mapPanel.appendChild(el("p", "wxb-dayhint", tx(activeDay() ? ui.day_method : ui.day_switch_hint)));

    var legend = el("ul", "wxb-legend");
    ["red", "orange", "yellow", "green"].forEach(function (key) {
      var lv = (data.warn_levels && data.warn_levels[key]) || {};
      var li = el("li");
      li.appendChild(el("i", "wxb-sw wxb-sw-" + key));
      li.appendChild(document.createTextNode((lv.ne || key) + " / " + (lv.en || key)));
      legend.appendChild(li);
    });
    mapPanel.appendChild(el("p", "wxb-tap", tx(ui.tap)));
    mapPanel.appendChild(legend);
    mapPanel.appendChild(el("p", "wxb-hint", tx(ui.hint)));
    board.appendChild(mapPanel);

    var timePanel = el("section", "wxb-panel");
    var th = el("h3", "wxb-h");
    th.innerHTML = iconClock();
    th.appendChild(document.createTextNode(" " + tx(ui.timeline_h)));
    timePanel.appendChild(th);
    var gantt = el("div", "wxb-gantt");
    buildTimeline(gantt);
    timePanel.appendChild(gantt);
    board.appendChild(timePanel);

    if (mode === "section") {
      var det = el("section", "wxb-panel wxb-copy");
      det.appendChild(el("h3", "wxb-h", tx(ui.details_h)));
      det.appendChild(el("p", null, tx(ui.system)));
      det.appendChild(el("h4", null, tx(ui.impacts_h)));
      var ul = el("ul", "wxb-impacts");
      (ui.impacts[lang()] || ui.impacts.ne || []).forEach(function (line) {
        ul.appendChild(el("li", null, line));
      });
      det.appendChild(ul);
      var help = el("p", "wxb-help");
      var a = document.createElement("a");
      a.href = data.links.helpline;
      a.textContent = tx(ui.helpline_label);
      var tel = document.createElement("a");
      tel.href = data.links.helpline_tel;
      tel.textContent = "1155";
      help.appendChild(a);
      help.appendChild(document.createTextNode(" · "));
      help.appendChild(tel);
      det.appendChild(help);
      board.appendChild(det);
      var gal = el("section", "wxb-panel wxb-gallery");
      buildGallery(gal);
      board.appendChild(gal);
    }

    var foot = el("footer", "wxb-foot" + (mode === "home" ? " is-home" : ""));
    var qrA = document.createElement("a");
    qrA.className = "wxb-qr";
    qrA.href = data.links.section;
    var qrImg = document.createElement("img");
    qrImg.src = data.links.qr;
    qrImg.width = 84;
    qrImg.height = 84;
    qrImg.alt = "";
    var qrLab = el("span", null, tx(ui.qr));
    var qrSub = el("small", null, tx(ui.qr_sub));
    qrA.appendChild(qrImg);
    qrA.appendChild(qrLab);
    qrA.appendChild(qrSub);
    var site = document.createElement("a");
    site.className = "wxb-site";
    site.href = data.links.site;
    site.target = "_blank";
    site.rel = "noopener";
    site.textContent = data.links.site_label;
    var src = el("p", "wxb-src");
    src.appendChild(document.createTextNode(tx(ui.sources_label) + ": "));
    (data.timeline.bars || []).forEach(function (bar, i) {
      if (i) src.appendChild(document.createTextNode(" · "));
      var link = document.createElement("a");
      link.href = bar.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = tx(bar.name);
      src.appendChild(link);
    });
    if (mode === "section") foot.appendChild(qrA);
    foot.appendChild(site);
    foot.appendChild(src);
    board.appendChild(foot);
    root.appendChild(board);
    paintPressed();
    if (selected) paintPop(root, selected);
  }

  function paintLive() {
    if (!liveNote || !liveNote.changed || !data) return;
    document.querySelectorAll("[data-wx-mount]").forEach(function (root) {
      var board = root.querySelector(".wxb");
      if (!board || board.querySelector(".wxb-live-note")) return;
      var note = el("p", "wxb-live-note is-changed");
      note.appendChild(document.createTextNode(fmt(tx(data.ui.live_changed), { when: liveNote.when })));
      if (data.lead.url) {
        note.appendChild(document.createTextNode(" "));
        var a = document.createElement("a");
        a.href = data.lead.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = tx(data.ui.sources_label) + ": DHM";
        note.appendChild(a);
      }
      var foot = board.querySelector(".wxb-foot");
      if (foot) board.insertBefore(note, foot);
      else board.appendChild(note);
    });
  }

  function liveSignal() {
    try {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        return AbortSignal.timeout(LIVE_MS);
      }
    } catch (e) {}
    if (typeof AbortController === "undefined") return undefined;
    var ctrl = new AbortController();
    window.setTimeout(function () { try { ctrl.abort(); } catch (err) {} }, LIVE_MS);
    return ctrl.signal;
  }
  function afterPaint(fn) {
    var raf = window.requestAnimationFrame;
    if (typeof raf === "function") raf(function () { raf(fn); });
    else window.setTimeout(fn, 0);
  }
  function checkLive() {
    if (!data || !data.lead || !data.lead.api) return;
    if (liveState === "done") {
      paintLive();
      return;
    }
    if (liveState === "busy") return;
    liveState = "busy";
    var opts = { cache: "no-store" };
    var signal = liveSignal();
    if (signal) opts.signal = signal;
    fetch(data.lead.api, opts)
      .then(function (r) { if (!r.ok) throw new Error("dhm"); return r.json(); })
      .then(function (page) {
        var seen = data.lead.api_update_at || "";
        var now = (page && page.update_at) || "";
        liveNote = { changed: !!(now && seen && now !== seen), when: now };
        liveState = "done";
        paintLive();
      })
      .catch(function () { liveState = "idle"; });
  }

  function renderAll() {
    if (!data) return;
    mounts.forEach(renderMount);
    if (justShifted) {
      justShifted = false;
      window.setTimeout(function () {
        document.querySelectorAll(".wxb-svg.is-shifting").forEach(function (n) {
          n.classList.remove("is-shifting");
        });
      }, 520);
    }
    afterPaint(checkLive);
  }

  function boot() {
    var url = "data/weather-alert.json?v=" + encodeURIComponent(VER);
    fetch(url, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("weather-alert");
        return r.json();
      })
      .then(function (json) {
        data = json;
        renderAll();
      })
      .catch(function () {
        mounts.forEach(function (root) {
          root.classList.add("wxb-fallback");
        });
      });
  }

  document.addEventListener("pointerdown", function (e) {
    if (!data) return;
    if (e.target.closest && e.target.closest(".wxb-prov, .wxb-dist, .wxb-dist-toggle, .wxb-pop, .wxb-zoom-ui, .wxb-dayswitch, .wxb-gantt-row")) return;
    if (!selected) return;
    clearSelect();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && selected) {
      e.preventDefault();
      clearSelect();
    }
  });

  if (window.__addLangHook) window.__addLangHook(renderAll);
  fetch("data/nepal-districts-svg.json?v=" + encodeURIComponent(VER), { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("districts"); return r.json(); })
    .then(function (json) {
      districts = json;
      document.querySelectorAll(".wxb-svg").forEach(drawDistricts);
    })
    .catch(function () {});
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
