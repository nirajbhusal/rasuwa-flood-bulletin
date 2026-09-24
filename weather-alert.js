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
  var VER = window.PAGE_VER || "2026-09-24-live-maps-ui";

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
  function activeDay() {
    if (!data || dayMode === "overview") return null;
    var days = data.warning_days || [];
    for (var i = 0; i < days.length; i++) if (days[i].date === dayMode) return days[i];
    return null;
  }
  function levelOf(p) {
    var day = activeDay();
    if (day && day.provinces && day.provinces[p.id] && data.warn_levels) {
      return data.warn_levels[day.provinces[p.id].level] || { color: "#cbd5e1", ne: "", en: "" };
    }
    return (data.levels && data.levels[p.level]) || { color: "#cbd5e1", ne: "", en: "" };
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
    document.querySelectorAll(".wxb-prov").forEach(function (path) {
      var on = path.getAttribute("data-id") === selected;
      path.setAttribute("aria-pressed", on ? "true" : "false");
      path.classList.toggle("is-on", on);
      path.setAttribute("tabindex", on ? "0" : "-1");
    });
  }

  function fillDetail(root, id) {
    var box = root.querySelector(".wxb-detail");
    if (!box) return;
    var p = provinceById(id);
    if (!p) return;
    var lv = levelOf(p);
    box.replaceChildren();
    var k = el("p", "wxb-detail-k", tx(data.ui.map_h));
    var h = el("h4", null, tx(p));
    var row = el("p", "wxb-detail-lv");
    var sw = el("i", "wxb-sw");
    sw.style.background = lv.color;
    row.appendChild(sw);
    row.appendChild(document.createTextNode(tx(lv)));
    var body = el("p", "wxb-detail-p", detailText(p));
    box.appendChild(k);
    box.appendChild(h);
    box.appendChild(row);
    box.appendChild(body);
  }

  function show(root, id) {
    fillDetail(root, id);
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
      fillDetail(root, id);
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

  function buildMap(svg) {
    var geo = data.geo || {};
    svg.setAttribute("viewBox", geo.viewBox || "0 0 672.5 391.7");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", tx(data.ui.map_h));
    var ring = geo.ring;
    if (ring) {
      var ell = svgEl("ellipse");
      ell.setAttribute("cx", ring.cx);
      ell.setAttribute("cy", ring.cy);
      ell.setAttribute("rx", ring.rx);
      ell.setAttribute("ry", ring.ry);
      ell.setAttribute("class", "wxb-ring");
      svg.appendChild(ell);
    }
    (geo.provinces || []).forEach(function (g) {
      var p = provinceById(g.id);
      if (!p) return;
      var lv = levelOf(p);
      var path = svgEl("path");
      path.setAttribute("d", g.d);
      path.setAttribute("class", "wxb-prov");
      path.setAttribute("data-id", g.id);
      path.setAttribute("fill", lv.color);
      path.setAttribute("role", "button");
      path.setAttribute("tabindex", g.id === selected ? "0" : "-1");
      path.setAttribute("aria-pressed", g.id === selected ? "true" : "false");
      path.setAttribute("aria-label", tx(p) + ". " + tx(lv) + ". " + detailText(p));
      svg.appendChild(path);
      var text = svgEl("text");
      text.setAttribute("x", g.lx);
      text.setAttribute("y", g.ly);
      text.setAttribute("class", "wxb-label" + (g.id === "sudurpaschim" || g.id === "madhesh" ? " is-tight" : ""));
      text.setAttribute("aria-hidden", "true");
      text.textContent = tx(p);
      svg.appendChild(text);
    });
    var pin = geo.pin;
    if (pin) {
      var line = svgEl("line");
      line.setAttribute("x1", pin.x);
      line.setAttribute("y1", pin.y);
      line.setAttribute("x2", 668);
      line.setAttribute("y2", 78);
      line.setAttribute("class", "wxb-connector");
      svg.appendChild(line);
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
      svg.appendChild(mark);
    }
    svg.addEventListener("click", function (e) {
      var path = e.target.closest && e.target.closest(".wxb-prov");
      if (!path) return;
      select(path.getAttribute("data-id"), false);
    });
    svg.addEventListener("pointerenter", function (e) {
      var path = e.target.closest && e.target.closest(".wxb-prov");
      if (!path || e.pointerType !== "mouse") return;
      svg.querySelectorAll(".wxb-prov.is-hot").forEach(function (n) { n.classList.remove("is-hot"); });
      path.classList.add("is-hot");
      var root = svg.closest("[data-wx-mount]");
      if (root) show(root, path.getAttribute("data-id"));
    }, true);
    svg.addEventListener("pointerleave", function (e) {
      if (e.pointerType !== "mouse") return;
      svg.querySelectorAll(".wxb-prov.is-hot").forEach(function (n) { n.classList.remove("is-hot"); });
      var root = svg.closest("[data-wx-mount]");
      if (root) show(root, selected);
    }, true);
    svg.addEventListener("focusin", function (e) {
      var path = e.target.closest && e.target.closest(".wxb-prov");
      if (!path) return;
      var root = svg.closest("[data-wx-mount]");
      if (root) show(root, path.getAttribute("data-id"));
    });
    svg.addEventListener("keydown", onKey);
  }

  function buildTimeline(host) {
    var tl = data.timeline || { days: [], bars: [] };
    var today = kathmanduToday();
    var head = el("div", "wxb-gantt-head");
    head.appendChild(el("div", "wxb-gantt-spacer"));
    var days = el("div", "wxb-days");
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
      var bid = el("span", "wxb-bid wxb-bid-" + bar.tone, "#" + bar.page_id);
      var name = el("span", "wxb-bname", tx(bar.name));
      if (bar.live) name.appendChild(el("em", "wxb-live", tx(data.ui.live)));
      meta.appendChild(bid);
      meta.appendChild(name);
      var track = el("div", "wxb-track");
      track.setAttribute("aria-hidden", "true");
      var left = (bar.start / span) * 100;
      var width = ((bar.end - bar.start) / span) * 100;
      var b = el("div", "wxb-bar wxb-bar-" + bar.tone + " wxb-arr-" + (bar.arrows || "end"));
      b.style.left = left + "%";
      b.style.width = width + "%";
      b.appendChild(el("span", null, tx(bar.span)));
      track.appendChild(b);
      row.appendChild(meta);
      row.appendChild(track);
      var label = tx(bar.name) + " #" + bar.page_id + " · " + tx(bar.span);
      if (bar.focus) label += ". " + tx(data.ui.gantt_btn);
      row.setAttribute("aria-label", label);
      if (bar.focus) {
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.classList.add("is-btn");
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
    var stage = el("div", "wxb-stage");
    var mapWrap = el("div", "wxb-mapwrap");
    var svg = svgEl("svg");
    svg.setAttribute("class", "wxb-svg" + (justShifted ? " is-shifting" : ""));
    buildMap(svg);
    mapWrap.appendChild(svg);
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
      b.addEventListener("click", function () {
        if (dayMode === id) return;
        dayMode = id;
        justShifted = true;
        renderAll();
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
    var levels = activeDay() ? (data.warn_levels || {}) : (data.levels || {});
    Object.keys(levels).forEach(function (key) {
      var lv = levels[key];
      var li = el("li");
      var sw = el("i", "wxb-sw");
      sw.style.background = lv.color;
      li.appendChild(sw);
      li.appendChild(document.createTextNode(tx(lv)));
      legend.appendChild(li);
    });
    mapPanel.appendChild(el("p", "wxb-tap", tx(ui.tap)));
    mapPanel.appendChild(legend);
    mapPanel.appendChild(el("p", "wxb-hint", tx(ui.hint)));
    var detail = el("div", "wxb-detail");
    detail.setAttribute("role", "region");
    detail.setAttribute("aria-live", "polite");
    mapPanel.appendChild(detail);
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
    } else {
      var more = document.createElement("a");
      more.className = "wxb-more";
      more.href = data.links.section;
      more.textContent = tx(ui.more);
      board.appendChild(more);
    }

    var foot = el("footer", "wxb-foot");
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
      link.textContent = "DHM #" + bar.page_id;
      src.appendChild(link);
    });
    foot.appendChild(qrA);
    foot.appendChild(site);
    foot.appendChild(src);
    board.appendChild(foot);
    root.appendChild(board);
    fillDetail(root, selected);
    paintPressed();
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

  function checkLive() {
    if (!data || !data.lead || !data.lead.api) return;
    if (liveState === "done") {
      paintLive();
      return;
    }
    if (liveState === "busy") return;
    liveState = "busy";
    fetch(data.lead.api, { cache: "no-store" })
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
    if (!selected) selected = data.focus_province || "bagmati";
    mounts.forEach(renderMount);
    if (justShifted) {
      justShifted = false;
      window.setTimeout(function () {
        document.querySelectorAll(".wxb-svg.is-shifting").forEach(function (n) {
          n.classList.remove("is-shifting");
        });
      }, 520);
    }
    checkLive();
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

  if (window.__addLangHook) window.__addLangHook(renderAll);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
