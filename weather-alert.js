/*! Rasuwa flood bulletin · DHM weather alert board · driven by data/weather-alert.json */
(function () {
  var mounts = document.querySelectorAll("[data-wx-mount]");
  if (!mounts.length) return;

  var data = null;
  var selected = null;
  var dayMode = "";
  var justShifted = false;
  var liveState = "idle";
  var liveNote = null;
  var VER = window.PAGE_VER || "2026-09-25-polish2";
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
  function outlookTitle() {
    if (typeof window.t === "function") {
      var s = window.t("wx_rain_outlook");
      if (s && s !== "wx_rain_outlook") return s;
    }
    return tx((data && data.ui && data.ui.map_h) || { ne: "वर्षाको सम्भावना", en: "Rainfall outlook" });
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
  function warningDates() {
    var days = (data && data.warning_days) || [];
    var out = [];
    for (var i = 0; i < days.length; i++) if (days[i] && days[i].date) out.push(days[i].date);
    out.sort();
    return out;
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
  function defaultDate() {
    var dates = warningDates();
    if (!dates.length) return "";
    var today = kathmanduToday();
    if (!today || today < dates[0]) return dates[0];
    if (today > dates[dates.length - 1]) return dates[dates.length - 1];
    for (var i = 0; i < dates.length; i++) if (dates[i] >= today) return dates[i];
    return dates[dates.length - 1];
  }
  function ensureDay() {
    var dates = warningDates();
    if (!dates.length) {
      dayMode = "";
      return;
    }
    if (dates.indexOf(dayMode) < 0) dayMode = defaultDate();
  }
  function activeDay() {
    if (!data || !dayMode) return null;
    var days = data.warning_days || [];
    for (var i = 0; i < days.length; i++) if (days[i].date === dayMode) return days[i];
    return null;
  }
  function alertKey(p) {
    var day = activeDay();
    var raw = day && day.provinces && day.provinces[p.id] && day.provinces[p.id].level;
    if (raw === "red" || raw === "orange" || raw === "yellow" || raw === "green") return raw;
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
  function neDigits(s) {
    return String(s).replace(/\d/g, function (d) { return "०१२३४५६७८९".charAt(+d); });
  }
  function shownDateText() {
    var day = activeDay();
    if (!day) return "";
    var meta = null;
    var days = (data.timeline && data.timeline.days) || [];
    for (var i = 0; i < days.length; i++) if (days[i].date === day.date) meta = days[i];
    var parts = String(day.date).split("-");
    var month = parseInt(parts[1], 10) || 0;
    var dom = parseInt(parts[2], 10) || 0;
    var monthsNe = ["", "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
    var monthsEn = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (lang() === "en") return ((meta && meta.en) || day.date) + " · " + dom + " " + (monthsEn[month] || "");
    return ((meta && meta.ne) || day.date) + " · " + neDigits(dom) + " " + (monthsNe[month] || "");
  }
  function alsoLine(p) {
    var day = activeDay();
    var rec = day && day.provinces && day.provinces[p.id];
    if (!rec || !rec.also || !rec.also.length) return "";
    var names = rec.also.map(function (k) {
      return tx((data.warn_levels && data.warn_levels[k]) || {});
    }).filter(Boolean).join(", ");
    if (!names) return "";
    return String(fmt(tx(data.ui.day_also), { also: names }) || "").replace(/^\s+/, "");
  }
  function detailText(p) {
    var bits = [];
    var day = activeDay();
    if (day && day.provinces && day.provinces[p.id]) {
      var rec = day.provinces[p.id];
      var lv = (data.warn_levels && data.warn_levels[rec.level]) || { ne: "", en: "" };
      var when = shownDateText() || dayLabel(day.date);
      bits.push(fmt(tx(data.ui.day_detail), { when: when, name: tx(p), level: tx(lv) }));
      var also = alsoLine(p);
      if (also) bits.push(also);
    }
    var detail = tx(p.detail);
    if (detail) bits.push(detail);
    return bits.join(" ");
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
      var lvText = (lv.ne || "") + " / " + (lv.en || "");
      var when = shownDateText();
      row.appendChild(document.createTextNode(when ? (when + " · " + lvText) : lvText));
    }
    var also = alsoLine(p);
    if (body) {
      body.classList.add("wxb-pop-also");
      body.hidden = !also;
      body.textContent = also;
    }
    if (dist) {
      var detail = tx(p.detail);
      if (distRec) {
        var pname = tx(p);
        detail = pname ? (detail ? pname + " — " + detail : pname) : detail;
      } else {
        var line = districtLine(p);
        if (line) detail = detail ? (detail + " " + line) : line;
      }
      dist.hidden = !detail;
      dist.textContent = detail;
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
      var next = defaultDate();
      if (next && dayMode !== next) {
        justShifted = true;
        dayMode = next;
        renderAll();
      }
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
    if (!g || g.childNodes.length || g._drawing) return;
    var list = districts.districts || [];
    var i = 0;
    g._drawing = true;
    function chunk() {
      if (!g.isConnected) { g._drawing = false; return; }
      var end = Math.min(list.length, i + 8);
      for (; i < end; i++) {
        var d = list[i];
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
      }
      if (i < list.length) {
        (window.requestAnimationFrame || window.setTimeout)(chunk);
        return;
      }
      g._drawing = false;
      if (!showDistricts) g.setAttribute("hidden", "");
    }
    chunk();
  }
  function subpathArea(part) {
    var tokens = [];
    var re = /[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g;
    var m;
    while ((m = re.exec(part))) tokens.push(m[0]);
    var i = 0;
    var cmd = "";
    var x = 0;
    var y = 0;
    var minx = Infinity;
    var miny = Infinity;
    var maxx = -Infinity;
    var maxy = -Infinity;
    var n = 0;
    function num() { return +tokens[i++]; }
    function pt(px, py) {
      if (px < minx) minx = px;
      if (py < miny) miny = py;
      if (px > maxx) maxx = px;
      if (py > maxy) maxy = py;
      x = px;
      y = py;
      n += 1;
    }
    while (i < tokens.length) {
      if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
      if (!cmd) break;
      var rel = cmd === cmd.toLowerCase();
      var C = cmd.toUpperCase();
      if (C === "Z") continue;
      if (C === "M" || C === "L") {
        var nx = num();
        var ny = num();
        pt(rel ? x + nx : nx, rel ? y + ny : ny);
        if (C === "M") cmd = rel ? "l" : "L";
        continue;
      }
      if (C === "H") { var hx = num(); pt(rel ? x + hx : hx, y); continue; }
      if (C === "V") { var vy = num(); pt(x, rel ? y + vy : vy); continue; }
      if (C === "C") {
        var ox = x;
        var oy = y;
        var c1x = num();
        var c1y = num();
        var c2x = num();
        var c2y = num();
        var ex = num();
        var ey = num();
        if (rel) { c1x += ox; c1y += oy; c2x += ox; c2y += oy; ex += ox; ey += oy; }
        pt(c1x, c1y);
        pt(c2x, c2y);
        pt(ex, ey);
        continue;
      }
      break;
    }
    if (!n) return 0;
    return Math.max(0, maxx - minx) * Math.max(0, maxy - miny);
  }
  function provinceOutline(d) {
    var src = String(d || "");
    var marks = [];
    var re = /[Mm]/g;
    var m;
    while ((m = re.exec(src))) marks.push(m.index);
    if (marks.length < 2) return src;
    var parts = [];
    for (var k = 0; k < marks.length; k++) parts.push(src.slice(marks[k], marks[k + 1]));
    var best = 0;
    var bestArea = -1;
    var areas = parts.map(function (part, idx) {
      var area = subpathArea(part);
      if (area > bestArea) { bestArea = area; best = idx; }
      return area;
    });
    var kept = parts.filter(function (part, idx) { return idx === best || areas[idx] >= 400; });
    return kept.join("");
  }
  function buildMap(svg) {
    var geo = data.geo || {};
    svg.setAttribute("viewBox", geo.viewBox || "0 0 672.5 391.7");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", outlookTitle());
    var layer = svgEl("g");
    layer.setAttribute("class", "wxb-zoom");
    svg._layer = layer;
    svg.appendChild(layer);
    (geo.provinces || []).forEach(function (g) {
      var p = provinceById(g.id);
      if (!p) return;
      var key = alertKey(p);
      var path = svgEl("path");
      path.setAttribute("d", provinceOutline(g.d));
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
      meta.appendChild(el("i", "wxb-sw wxb-sw-" + tone));
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
      path.setAttribute("aria-label", tx(p) + ". " + shownDateText() + ". " + tx(levelOf(p)) + ". " + detailText(p));
    });
    svg.querySelectorAll(".wxb-dist").forEach(function (path) {
      var d = districtById(path.getAttribute("data-id"));
      var p = d && provinceById(d.province);
      if (!d || !p) return;
      path.setAttribute("aria-label", districtLabel(d) + ". " + tx(p) + ". " + shownDateText() + ". " + tx(levelOf(p)));
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
    document.querySelectorAll(".wxb-shown").forEach(function (n) {
      n.textContent = shownDateText();
    });
    document.querySelectorAll(".wxb-dayhint").forEach(function (n) {
      var method = tx(data.ui.day_method);
      var when = shownDateText();
      n.textContent = when ? (when + " — " + method) : method;
    });
    document.querySelectorAll(".wxb-gantt-row[data-focus='overview']").forEach(function (row) {
      row.classList.remove("is-on");
    });
    document.querySelectorAll(".wxb-sum-host").forEach(function (n) {
      n.replaceChildren(buildSummary());
    });
    document.querySelectorAll(".wxb-provlist-slot").forEach(function (n) {
      n.replaceChildren(buildProvList());
    });
    document.querySelectorAll(".wxb-matrix-slot").forEach(function (n) {
      n.replaceChildren(buildMatrix());
    });
    document.querySelectorAll(".wxb-home-extra").forEach(function (n) {
      n.replaceWith(buildHomeExtras());
    });
    paintHigh();
    document.querySelectorAll("[data-wx-mount]").forEach(function (root) {
      var hot = root.querySelector(".wxb-prov.is-hot");
      var hotDist = root.querySelector(".wxb-dist.is-hot");
      paintPop(root, (hot && hot.getAttribute("data-id")) || selected, hotDist ? hotDist.getAttribute("data-id") : hotDistrict);
    });
    window.setTimeout(function () {
      document.querySelectorAll(".wxb-svg.is-shifting").forEach(function (n) { n.classList.remove("is-shifting"); });
    }, 520);
    document.querySelectorAll("[data-wx-mount]").forEach(function (root) {
      try {
        root.dispatchEvent(new CustomEvent("wx-rendered", { bubbles: true, detail: { date: dayMode, alert: data } }));
      } catch (err) {}
    });
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

  function bothNames(node) {
    if (!node) return "";
    if (typeof node === "string") return node;
    var ne = node.ne || "";
    var en = node.en || "";
    if (ne && en && ne !== en) return ne + " · " + en;
    return ne || en;
  }
  function corridorRecord() {
    var hist = (data && data.history) || [];
    for (var i = 0; i < hist.length; i++) {
      if (hist[i].role === "active_corridor_companion") return hist[i];
    }
    return null;
  }
  function corridorInFocus() {
    var comp = corridorRecord();
    if (!comp) return false;
    var bars = (data.timeline && data.timeline.bars) || [];
    var bar = null;
    for (var i = 0; i < bars.length; i++) if (bars[i].page_id === comp.page_id) bar = bars[i];
    if (!bar) return true;
    var day = activeDay();
    if (!day) return true;
    var days = (data.timeline && data.timeline.days) || [];
    var idx = -1;
    for (var j = 0; j < days.length; j++) if (days[j].date === day.date) idx = j;
    if (idx < 0) return true;
    return (idx + 1) > Number(bar.start) && idx < Number(bar.end);
  }
  function highAreas() {
    var groups = { red: [], orange: [] };
    var day = activeDay();
    var ids = order();
    var list = ((data && data.provinces) || []).slice().sort(function (a, b) {
      var ia = ids.indexOf(a.id);
      var ib = ids.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    if (!day) return groups;
    list.forEach(function (p) {
      var rec = day.provinces && day.provinces[p.id];
      if (!rec) return;
      var key = rec.level;
      var names = [];
      if (rec.districts && rec.districts.length) {
        rec.districts.forEach(function (d) {
          var label = bothNames(d);
          if (label) names.push(label);
        });
      }
      if (key !== "red" && key !== "orange") return;
      if (!names.length) names.push(bothNames(p));
      names.forEach(function (name) {
        if (groups[key].indexOf(name) === -1) groups[key].push(name);
      });
    });
    return groups;
  }
  function dayTone(date) {
    if (date === "overview") return "peak";
    var days = (data && data.warning_days) || [];
    var day = null;
    var rank = { green: 1, yellow: 2, orange: 3, red: 4 };
    for (var i = 0; i < days.length; i++) if (days[i].date === date) day = days[i];
    if (!day || !day.provinces) return "green";
    var best = "green";
    Object.keys(day.provinces).forEach(function (id) {
      var lv = day.provinces[id] && day.provinces[id].level;
      if ((rank[lv] || 0) > (rank[best] || 0)) best = lv;
    });
    return best;
  }
  function iconAlert() {
    return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2.6 1.7 21h20.6L12 2.6zm0 6.1 6.1 10.8H5.9L12 8.7zM11 11.6h2v4.1h-2v-4.1zm0 5.3h2V19h-2v-2.1z"/></svg>';
  }
  function buildHigh() {
    var ui = data.ui || {};
    var card = el("section", "wxb-high");
    var title = tx(ui.high_h || { ne: "उच्च सतर्कता जिल्ला र क्षेत्र", en: "High-alert districts and areas" });
    card.setAttribute("aria-label", title);
    var head = el("h3", "wxb-high-h");
    head.innerHTML = iconAlert();
    head.appendChild(document.createTextNode(" " + title));
    card.appendChild(head);
    var when = shownDateText();
    var dayNote = tx(ui.high_day);
    card.appendChild(el("p", "wxb-high-k", when ? (when + (dayNote ? " · " + dayNote : "")) : dayNote));
    var groups = highAreas();
    ["red", "orange"].forEach(function (key) {
      if (!groups[key].length) return;
      var lv = (data.warn_levels && data.warn_levels[key]) || {};
      var row = el("div", "wxb-high-row wxb-high-" + key);
      var lab = el("p", "wxb-high-lv");
      lab.appendChild(el("i", "wxb-sw wxb-sw-" + key));
      lab.appendChild(document.createTextNode(" " + (lv.ne || key) + " / " + (lv.en || key)));
      row.appendChild(lab);
      var chips = el("ul", "wxb-high-chips");
      groups[key].forEach(function (name) {
        chips.appendChild(el("li", "wxb-high-chip", name));
      });
      row.appendChild(chips);
      card.appendChild(row);
    });
    if (corridorInFocus()) {
      var call = data.callout || {};
      var dists = call.districts || [];
      if (dists.length) {
        var crow = el("div", "wxb-high-row wxb-high-corridor");
        var clab = el("p", "wxb-high-lv");
        clab.innerHTML = iconPin();
        clab.appendChild(document.createTextNode(" " + tx(call.title)));
        if (tx(call.body)) clab.appendChild(document.createTextNode(" · " + tx(call.body)));
        crow.appendChild(clab);
        var cchips = el("ul", "wxb-high-chips");
        dists.forEach(function (d) {
          var name = bothNames(d);
          if (name) cchips.appendChild(el("li", "wxb-high-chip", name));
        });
        crow.appendChild(cchips);
        if (tx(call.meta)) crow.appendChild(el("p", "wxb-high-meta", tx(call.meta)));
        card.appendChild(crow);
      }
    }
    return card;
  }
  function paintHigh() {
    document.querySelectorAll(".wxb-high").forEach(function (n) {
      n.replaceWith(buildHigh());
    });
  }

  function buildCite(links) {
    var row = el("p", "wxb-dcite");
    (links || []).forEach(function (item, i) {
      if (!item || !item.url) return;
      if (row.childNodes.length) row.appendChild(document.createTextNode(" · "));
      var a = document.createElement("a");
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = tx(item);
      row.appendChild(a);
    });
    return row.childNodes.length ? row : null;
  }
  function buildDistrictCard(card) {
    var art = el("article", "wxb-dcard is-" + (card.tone || "medium"));
    if (card.id) art.id = "wx-d-" + card.id;
    var body = el("div", "wxb-dcard-body");
    var name = el("h3", "wxb-dname", tx(card.name));
    body.appendChild(name);
    if (tx(card.province)) body.appendChild(el("p", "wxb-dprov", tx(card.province)));
    if (tx(card.risk)) body.appendChild(el("p", "wxb-drisk", tx(card.risk)));
    if (tx(card.window)) body.appendChild(el("p", "wxb-dwin", tx(card.window)));
    if (tx(card.forecast)) body.appendChild(el("p", "wxb-dfore", tx(card.forecast)));
    var impacts = (card.impacts && (card.impacts[lang()] || card.impacts.ne)) || [];
    if (impacts.length) {
      var ul = el("ul", "wxb-dimpacts");
      impacts.forEach(function (line) { ul.appendChild(el("li", null, line)); });
      body.appendChild(ul);
    }
    if (tx(card.note)) body.appendChild(el("p", "wxb-dnote", tx(card.note)));
    art.appendChild(body);
    return art;
  }
  function buildDistrictBlock(mode) {
    var cards = data.district_warnings || [];
    if (!cards.length) return null;
    var sec = el("section", "wxb-districts");
    var head = el("div", "wxb-dhead");
    if (mode === "section") head.appendChild(el("h3", "wxb-dh", tx(data.ui.title)));
    sec.appendChild(head);
    var grid = el("div", "wxb-dgrid");
    cards.forEach(function (card) { grid.appendChild(buildDistrictCard(card)); });
    sec.appendChild(grid);
    var cite = buildCite(data.district_cite);
    if (cite) sec.appendChild(cite);
    return sec;
  }
  function buildNowcast() {
    var n = data.nowcast;
    if (!n) return null;
    var sec = el("section", "wxb-now");
    sec.appendChild(el("h3", "wxb-dh", tx((data.ui && data.ui.now_h) || { ne: "हालको वर्षा", en: "Rainfall now" })));
    if (tx(n.when)) sec.appendChild(el("p", "wxb-dwin", tx(n.when)));
    if (tx(n.body)) sec.appendChild(el("p", "wxb-dfore", tx(n.body)));
    if (tx(n.max)) sec.appendChild(el("p", "wxb-dmax", tx(n.max)));
    var cite = buildCite(n.cite);
    if (cite) sec.appendChild(cite);
    return sec;
  }

  function levelShort(key) {
    var lv = (data.warn_levels && data.warn_levels[key]) || {};
    var full = tx(lv);
    var bit = String(full || "").split("·")[0].trim();
    return bit || key || "";
  }
  function colorCounts() {
    var counts = { red: 0, orange: 0, yellow: 0, green: 0 };
    order().forEach(function (id) {
      var p = provinceById(id);
      if (!p) return;
      var key = alertKey(p);
      if (counts[key] != null) counts[key] += 1;
    });
    return counts;
  }
  function buildSummary() {
    var counts = colorCounts();
    var wrap = el("div", "wxb-sum");
    var bar = el("div", "wxb-sum-bar");
    var bits = [];
    ["red", "orange", "yellow", "green"].forEach(function (key) {
      var n = counts[key];
      var short = levelShort(key);
      bits.push(short + " " + n);
      var seg = el("span", "wxb-sum-seg wxb-sum-" + key + (n ? "" : " is-zero"));
      seg.style.flexGrow = String(n);
      seg.textContent = String(n);
      seg.setAttribute("aria-label", short + " " + n);
      bar.appendChild(seg);
    });
    wrap.appendChild(bar);
    wrap.setAttribute("aria-label", (shownDateText() ? shownDateText() + " · " : "") + bits.join(", "));
    return wrap;
  }
  function buildProvList() {
    var ul = el("ul", "wxb-provlist");
    order().forEach(function (id) {
      var p = provinceById(id);
      if (!p) return;
      var key = alertKey(p);
      var li = el("li", "wxb-provline");
      var top = el("p", "wxb-provtop");
      top.appendChild(el("i", "wxb-sw wxb-sw-" + key));
      top.appendChild(el("strong", null, tx(p)));
      top.appendChild(document.createTextNode(" · " + tx(levelOf(p))));
      li.appendChild(top);
      var also = alsoLine(p);
      if (also) li.appendChild(el("p", "wxb-prov-also", also));
      if (tx(p.detail)) li.appendChild(el("p", "wxb-prov-detail", tx(p.detail)));
      ul.appendChild(li);
    });
    return ul;
  }
  function buildMatrix() {
    var table = el("table", "wxb-matrix");
    var cap = el("caption", null, lang() === "en" ? "Five-day warning colours" : "पाँच दिनको चेतावनी रङ");
    table.appendChild(cap);
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    hr.appendChild(el("th", null, lang() === "en" ? "Province" : "प्रदेश"));
    var days = (data.timeline && data.timeline.days) || [];
    days.forEach(function (d) {
      var th = el("th", d.date === dayMode ? "is-on" : "", tx(d));
      th.setAttribute("scope", "col");
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tb = document.createElement("tbody");
    order().forEach(function (id) {
      var p = provinceById(id);
      if (!p) return;
      var tr = document.createElement("tr");
      var rh = el("th", null, tx(p));
      rh.setAttribute("scope", "row");
      tr.appendChild(rh);
      ((data.warning_days) || []).forEach(function (day) {
        var rec = day.provinces && day.provinces[id];
        var key = (rec && rec.level) || "green";
        var lv = (data.warn_levels && data.warn_levels[key]) || {};
        var td = el("td", "wxb-mx wxb-mx-" + key + (day.date === dayMode ? " is-on" : ""));
        var vis = el("span", "wxb-mx-t", levelShort(key));
        vis.setAttribute("aria-hidden", "true");
        td.appendChild(vis);
        var when = "";
        for (var i = 0; i < days.length; i++) if (days[i].date === day.date) when = tx(days[i]);
        td.appendChild(el("span", "sr-only", tx(p) + ", " + (when || day.date) + ", " + (tx(lv) || key)));
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    return table;
  }
  function buildHomeExtras() {
    var ui = data.ui || {};
    var wrap = el("div", "wxb-home-extra");
    var chips = el("ul", "wxb-minis");
    (data.district_warnings || []).forEach(function (card) {
      var tone = card.tone === "high" ? "high" : "medium";
      var li = el("li", "wxb-mini is-" + tone);
      var bits = [tx(card.name), tx(card.risk), tx(card.window)].filter(Boolean);
      li.textContent = bits.join(" · ");
      chips.appendChild(li);
    });
    if (corridorInFocus()) {
      var call = data.callout || {};
      var li2 = el("li", "wxb-mini is-corridor");
      li2.textContent = [tx(call.title), tx(call.body), tx(call.meta)].filter(Boolean).join(" · ");
      chips.appendChild(li2);
    }
    wrap.appendChild(chips);
    var n = data.nowcast;
    if (n) {
      var line = [tx(ui.now_h), tx(n.when), tx(n.max)].filter(Boolean).join(" · ");
      wrap.appendChild(el("p", "wxb-nowline", line));
    }
    return wrap;
  }
  function sectionLink(cls, labelNe, labelEn, href) {
    var p = el("p", cls);
    var a = document.createElement("a");
    a.href = href;
    if (/^https?:/i.test(href)) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    a.textContent = lang() === "en" ? labelEn : labelNe;
    p.appendChild(a);
    return p;
  }

  function renderSummary(root) {
    var ui = data.ui || {};
    root.replaceChildren();
    var board = el("article", "wxb wxb-home wxdb-sumcard");
    var h = el("h2", "wxb-title", tx(ui.title));
    board.appendChild(h);
    board.appendChild(el("p", "wxb-sub", tx(ui.sub)));
    board.appendChild(el("p", "wxb-shown", shownDateText()));
    board.appendChild(buildSummary());
    board.appendChild(sectionLink("wxb-jump", "पूरा मौसम", "Full weather", "weather.html"));
    root.appendChild(board);
  }

  function renderMount(root) {
    var mode = root.getAttribute("data-wx-mode") || "home";
    if (mode === "summary") {
      renderSummary(root);
      return;
    }
    var ui = data.ui;
    root.replaceChildren();
    var board = el("article", "wxb" + (mode === "section" ? " wxb-section" : " wxb-home"));
    var titleId = "wxb-title-" + mode + "-" + Math.random().toString(36).slice(2, 6);
    var sectionTitle = mode === "section" ? document.getElementById("wx-section-title") : null;
    board.setAttribute("aria-labelledby", sectionTitle ? sectionTitle.id : titleId);

    var head = el("header", "wxb-head");
    var titles = el("div", "wxb-titles");
    if (!sectionTitle) {
      var h2 = el("h2", "wxb-title", tx(ui.title));
      h2.id = titleId;
      titles.appendChild(h2);
    }
    titles.appendChild(el("p", "wxb-sub", tx(ui.sub)));
    var issued = el("p", "wxb-issued-meta");
    issued.innerHTML = iconCal();
    issued.appendChild(document.createTextNode(" " + tx(ui.issued)));
    titles.appendChild(issued);
    head.appendChild(titles);
    board.appendChild(head);

    var mapPanel = el("section", "wxb-panel wxb-map-panel");
    var svg = svgEl("svg");
    svg.setAttribute("class", "wxb-svg" + (justShifted ? " is-shifting" : ""));
    svg.setAttribute("viewBox", (data.geo && data.geo.viewBox) || "-18 -12 880 548");
    var tools = el("div", "wxb-maptools");
    mapPanel.appendChild(tools);
    var stage = el("div", "wxb-stage");
    var mapWrap = el("div", "wxb-mapwrap");
    mapWrap.appendChild(svg);
    stage.appendChild(mapWrap);
    var call = data.callout || {};
    var aside = el("aside", "wxb-callout");
    aside.id = "wx-callout";
    var ct = el("p", "wxb-call-t");
    ct.innerHTML = iconPin();
    ct.appendChild(document.createTextNode(" " + tx(call.title)));
    aside.appendChild(ct);
    aside.appendChild(el("p", "wxb-call-b", tx(call.body)));
    aside.appendChild(el("p", "wxb-call-m", tx(call.meta)));
    if (mode === "section") {
      var cd = el("ul", "wxb-call-dists");
      (call.districts || []).forEach(function (d) {
        var name = bothNames(d);
        if (name) cd.appendChild(el("li", null, name));
      });
      if (cd.childNodes.length) aside.appendChild(cd);
      stage.appendChild(aside);
    }
    mapPanel.appendChild(stage);
    mapPanel.appendChild(buildPop());

    var switcher = el("div", "wxb-dayswitch");
    switcher.setAttribute("role", "tablist");
    switcher.setAttribute("aria-label", tx(ui.days_h));
    var todayIso = kathmanduToday();
    function dayChip(id, label, on, isToday) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wxb-chip wxb-chip-" + dayTone(id) + (on ? " is-on" : "") + (isToday ? " is-today" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.appendChild(document.createTextNode(label));
      if (isToday) b.appendChild(el("em", "wxb-today", tx(ui.today)));
      b.setAttribute("data-day", id);
      b.addEventListener("click", function () {
        if (dayMode === id) return;
        dayMode = id;
        syncDays();
      });
      switcher.appendChild(b);
    }
    ((data.timeline && data.timeline.days) || []).forEach(function (d) {
      var sub = lang() === "en" ? d.dow_en : d.dow_ne;
      var isToday = d.date === todayIso;
      dayChip(d.date, tx(d) + " · " + sub, dayMode === d.date, isToday);
    });
    mapPanel.appendChild(switcher);
    if (mode === "section") {
      var method = tx(ui.day_method);
      var whenShown = shownDateText();
      mapPanel.appendChild(el("p", "wxb-dayhint", whenShown ? (whenShown + " — " + method) : method));
    }

    var legend = el("ul", "wxb-legend");
    ["red", "orange", "yellow", "green"].forEach(function (key) {
      var lv = (data.warn_levels && data.warn_levels[key]) || {};
      var li = el("li");
      li.appendChild(el("i", "wxb-sw wxb-sw-" + key));
      li.appendChild(document.createTextNode((lv.ne || key) + " / " + (lv.en || key)));
      legend.appendChild(li);
    });
    mapPanel.appendChild(el("p", "wxb-tap", tx(ui.tap)));
    mapPanel.appendChild(el("p", "wxb-shown wxb-legend-date", shownDateText()));
    mapPanel.appendChild(legend);
    var sumHost = el("div", "wxb-sum-host");
    sumHost.appendChild(buildSummary());
    mapPanel.appendChild(sumHost);
    if (mode === "section") mapPanel.appendChild(el("p", "wxb-hint", tx(ui.hint)));
    var nowHost = el("div", "wxb-now-host");
    nowHost.setAttribute("data-wx-now-host", "");
    mapPanel.appendChild(nowHost);
    board.appendChild(mapPanel);
    var dalertSlot = el("div", "dalert-slot");
    dalertSlot.setAttribute("data-district-alerts", mode);
    board.appendChild(dalertSlot);

    if (mode === "home") {
      board.appendChild(buildHomeExtras());
      board.appendChild(sectionLink("wxb-jump", "पूर्ण विवरण", "Full details", "weather.html#warnings"));
    } else {
      board.appendChild(buildHigh());
      var listHost = el("section", "wxb-panel wxb-provlist-host");
      listHost.appendChild(el("h3", "wxb-h", tx(ui.details_h)));
      var listSlot = el("div", "wxb-provlist-slot");
      listSlot.appendChild(buildProvList());
      listHost.appendChild(listSlot);
      board.appendChild(listHost);
      var matrixHost = el("section", "wxb-panel wxb-matrix-host");
      matrixHost.appendChild(el("h3", "wxb-h", lang() === "en" ? "Five-day colours" : "पाँच दिनको रङ"));
      var matrixSlot = el("div", "wxb-matrix-slot");
      matrixSlot.appendChild(buildMatrix());
      matrixHost.appendChild(matrixSlot);
      board.appendChild(matrixHost);
      var districtBlock = buildDistrictBlock(mode);
      if (districtBlock) board.appendChild(districtBlock);
      var nowBlock = buildNowcast();
      if (nowBlock) board.appendChild(nowBlock);
      var timePanel = el("section", "wxb-panel wxb-time-panel");
      var th = el("h3", "wxb-h");
      th.innerHTML = iconClock();
      th.appendChild(document.createTextNode(" " + tx(ui.timeline_h)));
      timePanel.appendChild(th);
      var gantt = el("div", "wxb-gantt");
      buildTimeline(gantt);
      timePanel.appendChild(gantt);
      board.appendChild(timePanel);
      var det = el("section", "wxb-panel wxb-copy");
      det.appendChild(el("h3", "wxb-h", tx(ui.impacts_h)));
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
      var official = (data.lead && data.lead.url) || "https://dhm.gov.np/mfd/";
      board.appendChild(sectionLink("wxb-official", "आधिकारिक नक्सा हेर्नुहोस्", "View official map", official));
    }
    root.appendChild(board);
    whenNear(mapWrap, function () { armMap(svg, tools, mapWrap); });
    paintPressed();
    if (selected) paintPop(root, selected);
    try {
      root.dispatchEvent(new CustomEvent("wx-rendered", { bubbles: true, detail: { date: dayMode, alert: data } }));
    } catch (err) {}
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
  function armMap(svg, tools, mapWrap) {
    if (!svg || !svg.isConnected || svg._armed) return;
    svg._armed = true;
    buildMap(svg);
    if (tools && !tools.querySelector(".wxb-zoom-ui")) tools.appendChild(buildZoom(svg));
    bindNav(mapWrap, svg);
    ensureDistricts();
  }
  function whenNear(node, fn) {
    if (!node) return;
    function go() {
      if (!node.isConnected) return;
      var ric = window.requestIdleCallback;
      if (typeof ric === "function") ric(function () { if (node.isConnected) fn(); }, { timeout: 900 });
      else afterPaint(fn);
    }
    if (typeof IntersectionObserver !== "function") {
      afterPaint(go);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        io.disconnect();
        go();
        return;
      }
    }, { rootMargin: "280px 0px", threshold: 0.01 });
    io.observe(node);
  }
  var districtsLoading = false;
  function ensureDistricts() {
    if (districts) {
      document.querySelectorAll(".wxb-svg").forEach(drawDistricts);
      return;
    }
    if (districtsLoading) return;
    districtsLoading = true;
    fetch("data/nepal-districts-svg.json?v=" + encodeURIComponent(VER), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("districts"); return r.json(); })
      .then(function (json) {
        districts = json;
        document.querySelectorAll(".wxb-svg").forEach(drawDistricts);
      })
      .catch(function () { districtsLoading = false; });
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
    ensureDay();
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
    if (e.target.closest && e.target.closest(".wxb-prov, .wxb-dist, .wxb-pop, .wxb-zoom-ui, .wxb-dayswitch, .wxb-gantt-row, .wxb-nepal-now, .wxdb-pop")) return;
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
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
