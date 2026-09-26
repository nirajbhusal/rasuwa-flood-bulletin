/*! Electricity / बिजुली — renders only data/nea_electricity.json. */
(function () {
  "use strict";

  var DATA = null;
  var map = null;
  var markers = {};
  var activeId = "";
  var filterProv = "all";
  var filterDc = "all";
  var DIG = "०१२३४५६७८९";
  var MO_NE = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"];
  var MO_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var BS = {
    2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2085: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2087: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2088: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2090: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30]
  };
  var ANCHOR = Date.UTC(2026, 3, 14);
  var DIST_NE = {
    Rasuwa: "रसुवा",
    Nuwakot: "नुवाकोट",
    Dhading: "धादिङ",
    Sindhupalchowk: "सिन्धुपाल्चोक",
    Kavre: "काभ्रे"
  };
  var CATS = ["hotline", "central", "complaint", "information", "directorate", "dc_chief", "no_light"];
  var CAT_KEY = {
    hotline: "elec_cat_hotline",
    central: "elec_cat_central",
    complaint: "elec_cat_complaint",
    information: "elec_cat_information",
    directorate: "elec_cat_directorate",
    dc_chief: "elec_cat_dc_chief",
    no_light: "elec_cat_no_light"
  };

  function en() { return document.documentElement.lang === "en"; }
  function t(key, fb) {
    if (window.t) {
      var v = window.t(key);
      if (v) return v;
    }
    return fb || "";
  }
  function dig(n) {
    return String(n).replace(/[0-9]/g, function (d) { return DIG[d]; });
  }
  function tx(ne, eng) { return en() ? (eng || ne || "") : (ne || eng || ""); }
  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }
  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  function toBS(y, m, d) {
    if (window.__nptToBS) {
      var got = window.__nptToBS(y, m, d);
      if (got) return got;
    }
    var delta = Math.round((Date.UTC(y, m - 1, d) - ANCHOR) / 86400000);
    var year = 2083;
    var month = 0;
    if (delta >= 0) {
      while (true) {
        var len = BS[year];
        if (!len) return null;
        if (delta < len[month]) break;
        delta -= len[month];
        month += 1;
        if (month > 11) { month = 0; year += 1; }
      }
    } else {
      while (delta < 0) {
        month -= 1;
        if (month < 0) { month = 11; year -= 1; }
        var prev = BS[year];
        if (!prev) return null;
        delta += prev[month];
      }
    }
    return { year: year, month: month, day: delta + 1 };
  }
  function parts(iso) {
    var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (!m) return null;
    return { y: +m[1], mo: +m[2], d: +m[3], hh: m[4] == null ? null : +m[4], mm: m[5] == null ? null : +m[5] };
  }
  function fmtDate(iso, withTime) {
    var p = parts(iso);
    if (!p) return "";
    var bs = toBS(p.y, p.mo, p.d);
    var time = "";
    if (withTime && p.hh != null) {
      var hh = p.hh < 10 ? "0" + p.hh : String(p.hh);
      var mm = p.mm < 10 ? "0" + p.mm : String(p.mm);
      time = hh + ":" + mm;
    }
    if (en()) {
      var enDate = p.d + " " + MO_EN[p.mo - 1] + " " + p.y;
      return time ? enDate + ", " + time : enDate;
    }
    var neDate = bs ? (dig(bs.year) + " " + MO_NE[bs.month] + " " + dig(bs.day)) : dig(p.d) + " " + MO_EN[p.mo - 1] + " " + dig(p.y);
    return time ? neDate + ", " + dig(time) : neDate;
  }
  function fmtChecked(iso) {
    var when = fmtDate(iso, false);
    if (!when) return "";
    return en() ? ("Checked: " + when) : ("जाँच: " + when);
  }
  function live(row) {
    var s = row && row.status_at_check;
    return s === "upcoming" || s === "ongoing";
  }
  function byStartDesc(a, b) {
    return String(b.start || "").localeCompare(String(a.start || ""));
  }
  function sortedRows(rows) {
    var top = [];
    var rest = [];
    (rows || []).forEach(function (row) {
      if (live(row)) top.push(row);
      else rest.push(row);
    });
    top.sort(byStartDesc);
    rest.sort(byStartDesc);
    return top.concat(rest);
  }
  function unique(rows, key) {
    var out = [];
    var seen = {};
    rows.forEach(function (row) {
      var v = row[key];
      if (!v || seen[v]) return;
      seen[v] = 1;
      out.push(v);
    });
    return out;
  }
  function telHref(num) {
    return "tel:" + String(num == null ? "" : num).replace(/[\s-]/g, "");
  }
  function districtLabel(name) {
    if (!name) return "";
    if (!en() && DIST_NE[name]) return DIST_NE[name];
    return name;
  }
  function colorFor(type) {
    if (type === "hydropower_plant") return { color: "#c41e3a", fill: "#c41e3a" };
    if (type === "substation") return { color: "#334155", fill: "#334155" };
    if (type === "solar_plant") return { color: "#b45309", fill: "#d97706" };
    return { color: "#64748b", fill: "#64748b" };
  }
  function setChecked() {
    if (!DATA) return;
    document.querySelectorAll(".elec-checked[data-elec-block]").forEach(function (node) {
      var key = node.getAttribute("data-elec-block");
      var block = DATA[key];
      var iso = block && block.checked_at;
      node.textContent = iso ? (" · " + fmtChecked(iso)) : "";
    });
  }
  function paintCheckedOnly() {
    setChecked();
  }

  function chipRow(label, values, current, attr) {
    var wrap = el("div", "elec-chiprow");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", label);
    function add(value, text) {
      var b = el("button", "ns-chip" + (value === current ? " on" : ""));
      b.type = "button";
      b.setAttribute(attr, value);
      b.textContent = text;
      wrap.appendChild(b);
    }
    add("all", t("elec_all", en() ? "All" : "सबै"));
    values.forEach(function (v) { add(v, v); });
    return wrap;
  }
  function rowMatches(row) {
    if (filterProv !== "all" && row.province !== filterProv) return false;
    if (filterDc !== "all" && row.distribution_centre !== filterDc) return false;
    return true;
  }
  function applyFilter(table) {
    if (!table) return;
    table.querySelectorAll("tbody tr").forEach(function (tr) {
      var prov = tr.getAttribute("data-prov") || "";
      var dc = tr.getAttribute("data-dc") || "";
      var show = (filterProv === "all" || prov === filterProv) && (filterDc === "all" || dc === filterDc);
      tr.hidden = !show;
    });
  }
  function cell(text, label, empty) {
    var td = el("td");
    td.setAttribute("data-label", label);
    if (empty) td.className = "elec-empty";
    if (text) td.textContent = text;
    return td;
  }
  function paintShutdowns() {
    var host = document.getElementById("elec-shutdowns");
    if (!host || !DATA) return;
    var block = DATA.planned_shutdowns || {};
    var rows = sortedRows(block.rows || []);
    clear(host);
    var cover = el("p", "elec-cover");
    var line = DATA.coverage_line || {};
    cover.textContent = tx(line.ne, line.en);
    host.appendChild(cover);

    var filters = el("div", "elec-filters");
    filters.appendChild(chipRow(t("elec_filter_prov", en() ? "Province" : "प्रदेश"), unique(rows, "province"), filterProv, "data-elec-prov"));
    filters.appendChild(chipRow(t("elec_filter_dc", en() ? "Distribution centre" : "वितरण केन्द्र"), unique(rows, "distribution_centre"), filterDc, "data-elec-dc"));
    host.appendChild(filters);

    var gaps = block.flood_districts_without_rows || [];
    if (gaps.length) {
      var gk = el("p", "elec-gap-k");
      gk.textContent = t("elec_none_k", en() ? "No NEA-published shutdowns:" : "प्राधिकरणले प्रकाशित नगरेका जिल्ला:");
      host.appendChild(gk);
      var grow = el("div", "elec-gap");
      gaps.forEach(function (name) {
        var chip = el("span", "elec-muted");
        chip.textContent = districtLabel(name);
        grow.appendChild(chip);
      });
      host.appendChild(grow);
    }

    var heads = [
      [t("elec_th_dc", en() ? "Distribution centre" : "वितरण केन्द्र"), "dc"],
      [t("elec_th_feeder", en() ? "Feeder" : "फिडर"), "feeder"],
      [t("elec_th_area", en() ? "Area" : "क्षेत्र"), "area"],
      [t("elec_th_from", en() ? "From" : "देखि"), "from"],
      [t("elec_th_to", en() ? "To" : "सम्म"), "to"],
      [t("elec_th_reason", en() ? "Reason" : "कारण"), "reason"],
      [t("elec_th_published", en() ? "Published" : "प्रकाशित"), "pub"],
      [t("elec_th_notice", en() ? "Notice" : "सूचना"), "notice"]
    ];
    var table = el("table", "elec-table");
    var thead = el("thead");
    var hr = el("tr");
    heads.forEach(function (h) {
      var th = el("th");
      th.textContent = h[0];
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = el("tbody");
    rows.forEach(function (row) {
      var tr = el("tr", live(row) ? "elec-live" : "elec-past");
      tr.setAttribute("data-prov", row.province || "");
      tr.setAttribute("data-dc", row.distribution_centre || "");
      tr.appendChild(cell(row.distribution_centre || "", heads[0][0]));
      tr.appendChild(cell(row.feeder || "", heads[1][0]));
      var area = cell(row.area_ne || "", heads[2][0]);
      area.classList.add("elec-area");
      tr.appendChild(area);
      tr.appendChild(cell(fmtDate(row.start, true), heads[3][0]));
      tr.appendChild(cell(fmtDate(row.end, true), heads[4][0]));
      tr.appendChild(cell(row.reason || "", heads[5][0], !row.reason));
      tr.appendChild(cell(fmtDate(row.published, false), heads[6][0]));
      var notice = el("td");
      notice.setAttribute("data-label", heads[7][0]);
      if (row.notice_url) {
        var a = el("a");
        a.href = row.notice_url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = t("elec_th_notice", en() ? "Notice" : "सूचना");
        notice.appendChild(a);
      } else notice.className = "elec-empty";
      tr.appendChild(notice);
      if (!rowMatches(row)) tr.hidden = true;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    var wrap = el("div", "elec-table-wrap");
    wrap.appendChild(table);
    host.appendChild(wrap);
    filters.addEventListener("click", function (ev) {
      var b = ev.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-elec-prov")) {
        filterProv = b.getAttribute("data-elec-prov") || "all";
        filters.querySelectorAll("[data-elec-prov]").forEach(function (n) { n.classList.toggle("on", n === b); });
      } else if (b.hasAttribute("data-elec-dc")) {
        filterDc = b.getAttribute("data-elec-dc") || "all";
        filters.querySelectorAll("[data-elec-dc]").forEach(function (n) { n.classList.toggle("on", n === b); });
      } else return;
      applyFilter(table);
    });
  }

  function extLink(href, text) {
    var a = el("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = text;
    return a;
  }
  function paintStatements() {
    var host = document.getElementById("elec-statements");
    if (!host || !DATA) return;
    var items = ((DATA.statements && DATA.statements.items) || []).slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    clear(host);
    var list = el("div", "elec-timeline");
    items.forEach(function (item) {
      var card = el("article", "card elec-state");
      var time = el("time");
      time.dateTime = item.date || "";
      time.textContent = fmtDate(item.date, false);
      card.appendChild(time);
      var who = el("p", "elec-speaker");
      who.textContent = tx(item.speaker_ne, item.speaker_en);
      card.appendChild(who);
      var sum = el("p", "elec-sum");
      sum.textContent = tx(item.summary_ne, item.summary_en);
      card.appendChild(sum);
      var links = el("p", "elec-links");
      if (item.nea_own_post_url) {
        links.appendChild(extLink(item.nea_own_post_url, t("elec_nea_post", en() ? "NEA post" : "प्राधिकरणको पोस्ट")));
      }
      (item.sources || []).forEach(function (src) {
        var name = src.as_quoted_in || src.source_name || "";
        var label = en()
          ? (t("elec_quoted", "as quoted in") + " " + name)
          : (name + " " + t("elec_quoted", "मा उद्धृत"));
        if (src.source_url) links.appendChild(extLink(src.source_url, label));
      });
      if (links.childNodes.length) card.appendChild(links);
      var outlet = item.outlet_reporting;
      if (outlet && (outlet.text_ne || outlet.text_en)) {
        var line = el("p", "elec-outlet");
        var k = el("span", "elec-outlet-k");
        k.textContent = t("elec_reported", en() ? "as reported by The Kathmandu Post" : "काठमाडौं पोस्टका अनुसार");
        line.appendChild(k);
        line.appendChild(document.createTextNode(" "));
        var body = tx(outlet.text_ne, outlet.text_en);
        var href = outlet.source && outlet.source.source_url;
        if (href) line.appendChild(extLink(href, body));
        else line.appendChild(document.createTextNode(body));
        card.appendChild(line);
      }
      list.appendChild(card);
    });
    host.appendChild(list);
  }

  function markerStyle(type, on) {
    var c = colorFor(type);
    return {
      radius: on ? 9 : 6,
      color: c.color,
      weight: on ? 2.5 : 1.25,
      fillColor: c.fill,
      fillOpacity: on ? 1 : 0.92
    };
  }
  function highlight(id, pan) {
    activeId = id || "";
    Object.keys(markers).forEach(function (key) {
      var m = markers[key];
      if (m && m.setStyle) m.setStyle(markerStyle(m.__type, key === activeId));
      if (key === activeId && m && m.bringToFront) m.bringToFront();
    });
    document.querySelectorAll(".elec-asset").forEach(function (node) {
      var on = node.getAttribute("data-id") === activeId;
      node.classList.toggle("is-on", on);
      if (on && node.scrollIntoView) {
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        try { node.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); } catch (e) {}
      }
    });
    if (pan && map && markers[activeId]) {
      try { map.panTo(markers[activeId].getLatLng()); } catch (e2) {}
    }
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
  function bindFullscreen(host) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "map-ctl-btn map-ctl-fs";
    function cssOn() { return host.classList.contains("is-map-fs"); }
    function nativeFs() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
    function active() { return nativeFs() === host || cssOn(); }
    function sync() {
      var on = active();
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? t("map_full_exit", en() ? "Exit full screen" : "पूरा स्क्रिन बन्द गर्नुहोस्") : t("map_full", en() ? "Full screen" : "पूरा स्क्रिन"));
      btn.innerHTML = mapIcon(on ? "compress" : "expand");
    }
    function refit() {
      if (map) {
        try { map.invalidateSize(); } catch (e) {}
      }
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
        host.classList.remove("is-map-fs");
        if (!document.querySelector(".is-map-fs") && !nativeFs()) document.documentElement.classList.remove("map-fs-lock");
        sync();
        refit();
      } else {
        var req = host.requestFullscreen || host.webkitRequestFullscreen;
        if (!req) {
          host.classList.add("is-map-fs");
          document.documentElement.classList.add("map-fs-lock");
          sync();
          refit();
          return;
        }
        try {
          var done = req.call(host);
          if (done && done.then) done.then(function () { sync(); refit(); }).catch(function () {
            host.classList.add("is-map-fs");
            document.documentElement.classList.add("map-fs-lock");
            sync();
            refit();
          });
          else { sync(); refit(); }
        } catch (err2) {
          host.classList.add("is-map-fs");
          document.documentElement.classList.add("map-fs-lock");
          sync();
          refit();
        }
      }
    });
    document.addEventListener("fullscreenchange", function () {
      if (!host.isConnected) return;
      if (!nativeFs()) host.classList.remove("is-map-fs");
      if (!document.querySelector(".is-map-fs") && !nativeFs()) document.documentElement.classList.remove("map-fs-lock");
      sync();
      refit();
    });
    sync();
    return btn;
  }
  function paintMap(items) {
    var box = document.getElementById("elec-map");
    var wrap = document.getElementById("elec-mapwrap");
    if (!box || !window.L) return;
    var points = items.filter(function (item) { return item.lat != null && item.lon != null; });
    if (map) {
      try { map.remove(); } catch (e) {}
      map = null;
    }
    markers = {};
    map = window.L.map(box, {
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: false,
      tap: true
    });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 16,
      attribution: ""
    }).addTo(map);
    var bounds = [];
    points.forEach(function (item) {
      var ll = [item.lat, item.lon];
      bounds.push(ll);
      var marker = window.L.circleMarker(ll, markerStyle(item.type, false));
      marker.__type = item.type;
      marker.on("click", function () { highlight(item.id, false); });
      marker.addTo(map);
      markers[item.id] = marker;
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 11 });
    if (window.L.control && wrap && !wrap.querySelector(".map-ctl")) {
      var chrome = window.L.control({ position: "topright" });
      chrome.onAdd = function () {
        var bar = window.L.DomUtil.create("div", "map-ctl");
        function zbtn(key, fb, icon, delta) {
          var b = window.L.DomUtil.create("button", "map-ctl-btn", bar);
          b.type = "button";
          b.setAttribute("aria-label", t(key, fb));
          b.innerHTML = mapIcon(icon);
          window.L.DomEvent.on(b, "click", function (ev) {
            window.L.DomEvent.stop(ev);
            map.setZoom(map.getZoom() + delta);
          });
        }
        zbtn("map_zoom_in", en() ? "Zoom in" : "ठूलो पार्नुहोस्", "plus", 1);
        zbtn("map_zoom_out", en() ? "Zoom out" : "सानो पार्नुहोस्", "minus", -1);
        bar.appendChild(bindFullscreen(wrap));
        window.L.DomEvent.disableClickPropagation(bar);
        window.L.DomEvent.disableScrollPropagation(bar);
        return bar;
      };
      chrome.addTo(map);
    }
    window.setTimeout(function () { try { map.invalidateSize(); } catch (e2) {} }, 60);
  }
  function paintAssets() {
    var host = document.getElementById("elec-assets");
    if (!host || !DATA) return;
    var items = (DATA.damaged_assets && DATA.damaged_assets.items) || [];
    clear(host);
    items.forEach(function (item) {
      var mapped = item.lat != null && item.lon != null;
      var btn = el("button", "elec-asset");
      btn.type = "button";
      btn.setAttribute("data-id", item.id || "");
      var dot = el("i", "elec-dot");
      dot.style.background = colorFor(item.type).fill;
      if (!mapped) dot.classList.add("is-off");
      btn.appendChild(dot);
      var body = el("span", "elec-asset-body");
      var name = el("strong");
      name.textContent = tx(item.name_ne, item.name_en);
      body.appendChild(name);
      var status = el("span", "elec-asset-status");
      status.textContent = tx(item.status_ne, item.status_en);
      body.appendChild(status);
      var when = el("span", "elec-asset-date");
      when.textContent = fmtDate(item.statement_date, false);
      body.appendChild(when);
      btn.appendChild(body);
      btn.addEventListener("click", function () { highlight(item.id, mapped); });
      var row = el("div", "elec-asset-row");
      row.appendChild(btn);
      if (item.coord_source) {
        var osm = extLink(item.coord_source, "OSM");
        osm.className = "elec-osm";
        row.appendChild(osm);
      }
      host.appendChild(row);
    });
    paintMap(items);
    if (activeId) highlight(activeId, false);
  }

  function paintHelplines() {
    var host = document.getElementById("elec-helplines");
    if (!host || !DATA) return;
    var items = (DATA.helplines && DATA.helplines.items) || [];
    clear(host);
    var groups = {};
    items.forEach(function (item) {
      var key = item.category || "";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    var order = CATS.filter(function (key) { return groups[key]; });
    Object.keys(groups).forEach(function (key) {
      if (order.indexOf(key) < 0) order.push(key);
    });
    order.forEach(function (key) {
      var sec = el("section", "elec-hl-group");
      var h = el("h3");
      h.textContent = t(CAT_KEY[key], key);
      sec.appendChild(h);
      var grid = el("div", "elec-hl-grid");
      groups[key].forEach(function (item) {
        var card = el("article", "card elec-hl-card");
        var title = el("h4");
        title.textContent = tx(item.label_ne, item.label_en);
        card.appendChild(title);
        if (item.district) {
          var dist = el("p", "elec-hl-dist");
          dist.textContent = districtLabel(item.district);
          card.appendChild(dist);
        }
        var nums = el("p", "elec-hl-nums");
        (item.numbers || []).forEach(function (num) {
          var a = el("a");
          a.href = telHref(num);
          a.textContent = num;
          nums.appendChild(a);
        });
        card.appendChild(nums);
        if (item.email) {
          var mail = el("a", "elec-mail");
          mail.href = "mailto:" + item.email;
          mail.textContent = item.email;
          card.appendChild(mail);
        }
        if (item.label_note_ne || item.label_note_en) {
          var note = el("p", "elec-note");
          if (item.source_url) note.appendChild(extLink(item.source_url, tx(item.label_note_ne, item.label_note_en)));
          else note.textContent = tx(item.label_note_ne, item.label_note_en);
          card.appendChild(note);
        }
        if (item.published_on) {
          var foot = el("p", "elec-hl-foot");
          foot.appendChild(extLink(item.published_on, t("elec_nea_page", en() ? "NEA page" : "प्राधिकरणको पाना")));
          card.appendChild(foot);
        }
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      host.appendChild(sec);
    });
  }

  function paintPage() {
    if (!document.getElementById("elec-shutdowns")) return;
    paintShutdowns();
    paintStatements();
    if (document.getElementById("elec-assets")) paintAssets();
    if (document.getElementById("elec-helplines")) paintHelplines();
    paintCheckedOnly();
  }

  function paintHome() {
    var lead = document.getElementById("elec-home-lead");
    var sum = document.getElementById("elec-home-sum");
    var tel = document.getElementById("elec-home-tel");
    if (!DATA || (!lead && !sum && !tel)) return;
    var rows = (DATA.planned_shutdowns && DATA.planned_shutdowns.rows) || [];
    var n = rows.filter(live).length;
    if (lead) {
      var label = t("elec_home_count", en() ? "upcoming or ongoing" : "आगामी वा चलिरहेको");
      lead.textContent = en() ? (n + " " + label) : (dig(n) + " " + label);
    }
    var items = ((DATA.statements && DATA.statements.items) || []).slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    var latest = items[0];
    if (sum && latest) {
      sum.textContent = fmtDate(latest.date, false) + " — " + tx(latest.summary_ne, latest.summary_en);
    }
    var hot = null;
    ((DATA.helplines && DATA.helplines.items) || []).forEach(function (item) {
      if (!hot && item.category === "hotline") hot = item;
    });
    if (tel && hot && hot.numbers && hot.numbers[0]) {
      tel.href = telHref(hot.numbers[0]);
      tel.textContent = hot.numbers[0];
      var note = tx(hot.label_note_ne, hot.label_note_en);
      if (note) tel.setAttribute("aria-label", tx(hot.label_ne, hot.label_en) + " " + hot.numbers[0]);
    }
  }

  function paint() {
    paintPage();
    paintHome();
  }
  function boot() {
    var url = window.ELEC_SRC || "data/nea_electricity.json";
    fetch(url + (url.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        if (!json) return;
        DATA = json;
        paint();
      })
      .catch(function () {});
  }
  function onLang() { if (DATA) paint(); }
  if (window.__addLangHook) window.__addLangHook(onLang);
  else {
    window.__langHookQ = window.__langHookQ || [];
    window.__langHookQ.push(onLang);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
