/*! Electricity / बिजुली — renders only data/nea_electricity.json. */
(function () {
  "use strict";

  var DATA = null;
  var GEO = null;
  var map = null;
  var markers = {};
  var activeId = "";
  var activeFeed = "";
  var activeFlow = "";
  var alertView = null;
  var flowPinned = false;
  var flowIndex = {};
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
  var PROV_KEY = {
    "Bagmati Province": "elec_prov_bagmati",
    "Gandaki Province": "elec_prov_gandaki"
  };
  var DC_KEY = {
    "Ratnapark Distribution Center": "elec_dc_ratnapark",
    "Pulchowk Distribution Center": "elec_dc_pulchowk",
    "Tandi Distribution Center": "elec_dc_tandi",
    "Arughat Distribution Center": "elec_dc_arughat",
    "Maharajgunj Distribution Center": "elec_dc_maharajgunj",
    "Baneshwor Distribution Center": "elec_dc_baneshwor",
    "Lagankhel Distribution Center": "elec_dc_lagankhel",
    "Hetauda Distribution Center": "elec_dc_hetauda"
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
  function officeLabel(value, keys) {
    if (!value) return "";
    var key = keys[value];
    if (!key) return value;
    return t(key, value);
  }
  function incident0() {
    var list = (DATA && DATA.incidents) || [];
    return list.length ? list[0] : null;
  }
  function assetItems() {
    var inc = incident0();
    return (inc && inc.damaged_assets && inc.damaged_assets.items) || [];
  }
  function stmtItems() {
    var inc = incident0();
    return (inc && inc.statements && inc.statements.items) || [];
  }
  function assetById(id) {
    var items = assetItems();
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    return null;
  }
  function stmtById(id) {
    var items = stmtItems();
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    return null;
  }
  function sourcePasses(src) {
    var tier = src && src.source_tier;
    return tier === "nea_official" || tier === "listed_outlet";
  }
  function passes(item) {
    return ((item && item.sources) || []).some(sourcePasses);
  }
  function visibleSources(item) {
    return ((item && item.sources) || []).filter(sourcePasses);
  }
  function fmtNum(n) {
    if (n == null || n === "") return "";
    return en() ? String(n) : dig(n);
  }
  function neaSrc(iso) {
    var when = fmtDate(iso, false);
    var who = t("elec_src_short", en() ? "NEA" : "प्राधिकरण");
    return when ? (who + " · " + when) : who;
  }
  function toneFor(item) {
    var s = ((item && item.status_en) || "").toLowerCase();
    if (/damaged|swept/.test(s)) return "bad";
    return "block";
  }
  function chipFor(item) {
    var s = ((item && item.status_en) || "").toLowerCase();
    if (/damaged|swept/.test(s)) return { tone: "bad", key: "elec_chip_damaged", fb: en() ? "Damaged" : "क्षति" };
    if (/blocked/.test(s)) return { tone: "block", key: "elec_chip_blocked", fb: en() ? "Blocked" : "अवरुद्ध" };
    if (/shut|affect/.test(s)) return { tone: "block", key: "elec_chip_affected", fb: en() ? "Affected" : "अवरुद्ध" };
    return { tone: "block", key: "elec_chip_disrupted", fb: en() ? "Disrupted" : "अवरुद्ध" };
  }
  function iconKind(type) {
    if (type === "substation") return "tower";
    if (type === "solar_plant") return "sun";
    if (type === "transmission_line") return "line";
    return "bolt";
  }
  function htmlIcon(kind) {
    var paths = {
      bolt: '<path fill="currentColor" d="M13 2 4.2 13.2h6.2L9.2 22 19.8 10.2H13.2z"/>',
      tower: '<path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" d="M12 2 4 22h4l4-10 4 10h4L12 2zM8 14h8"/>',
      plug: '<path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M8 3v6M16 3v6M7 9h10v3a5 5 0 0 1-10 0V9zM12 17v4"/>',
      sun: '<circle cx="12" cy="12" r="3.2" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>',
      line: '<path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M3 17 8 8l5 7 3-4 5 6"/>',
      link: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M10 13a5 5 0 0 0 7.2.5l2-2a5 5 0 0 0-7.1-7.1L10.6 6M14 11a5 5 0 0 0-7.2-.5l-2 2a5 5 0 0 0 7.1 7.1L13.4 18"/>'
    };
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' + (paths[kind] || paths.bolt) + "</svg>";
  }
  function fillTpl(str, map) {
    return String(str || "").replace(/\{(\w+)\}/g, function (_, k) {
      return map[k] == null ? "" : String(map[k]);
    });
  }
  function blockStamp(key) {
    if (!DATA) return "";
    if (key === "alert") return (DATA.alert && (DATA.alert.as_of || DATA.alert.checked_at)) || "";
    if (key === "statements" || key === "damaged_assets") {
      var inc = incident0();
      var block = inc && inc[key];
      return (block && block.checked_at) || "";
    }
    var top = DATA[key];
    return (top && (top.checked_at || top.as_of)) || "";
  }
  function setChecked() {
    if (!DATA) return;
    document.querySelectorAll(".elec-checked[data-elec-block]").forEach(function (node) {
      var iso = blockStamp(node.getAttribute("data-elec-block"));
      node.textContent = iso ? (" · " + fmtChecked(iso)) : "";
    });
  }
  function paintCheckedOnly() {
    setChecked();
  }

  function chipRow(label, values, current, attr, nameOf) {
    var block = el("div", "elec-filter");
    var k = el("p", "elec-filter-k");
    k.textContent = label;
    block.appendChild(k);
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
    values.forEach(function (v) { add(v, nameOf ? nameOf(v) : v); });
    block.appendChild(wrap);
    return block;
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
    var filters = el("div", "elec-filters");
    filters.appendChild(chipRow(t("elec_filter_prov", en() ? "Province" : "प्रदेश"), unique(rows, "province"), filterProv, "data-elec-prov", function (v) { return officeLabel(v, PROV_KEY); }));
    filters.appendChild(chipRow(t("elec_filter_dc", en() ? "Distribution centre" : "वितरण केन्द्र"), unique(rows, "distribution_centre"), filterDc, "data-elec-dc", function (v) { return v; }));
    host.appendChild(filters);

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
      var dcName = (!en() && row.distribution_centre_ne) ? row.distribution_centre_ne : (row.distribution_centre || "");
      tr.appendChild(cell(dcName, heads[0][0]));
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
    var items = stmtItems().slice().sort(function (a, b) {
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

  function syncMarkers() {
    Object.keys(markers).forEach(function (key) {
      var m = markers[key];
      var node = m && m.getElement && m.getElement();
      if (!node) return;
      var ico = node.querySelector(".elec-mico");
      if (ico) ico.classList.toggle("is-on", key === activeId);
      if (key === activeId && m.bringToFront) m.bringToFront();
    });
  }
  function markFlow() {
    document.querySelectorAll(".elec-flow [data-flow]").forEach(function (node) {
      var card = node.getAttribute("data-elec-card") || "";
      var id = node.getAttribute("data-flow") || "";
      node.classList.toggle("is-on", (!!card && card === activeId) || id === activeFlow);
    });
  }
  function highlight(id, pan, scroll) {
    activeId = id || "";
    syncMarkers();
    markFlow();
    document.querySelectorAll(".elec-asset").forEach(function (node) {
      var on = node.getAttribute("data-id") === activeId;
      node.classList.toggle("is-on", on);
      if (on && scroll && node.scrollIntoView) {
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
  function bindFullscreen(host, refitFn) {
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
      if (refitFn) {
        try { refitFn(); } catch (e0) {}
        return;
      }
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
  function svgEl(name, attrs) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] != null) node.setAttribute(k, String(attrs[k]));
    });
    return node;
  }
  function addGlyph(parent, kind, cx, cy) {
    var g = svgEl("g", { transform: "translate(" + (cx - 8) + " " + (cy - 8) + ")", "aria-hidden": "true" });
    var p;
    if (kind === "bolt") {
      p = svgEl("path", { d: "M9.2.6 2.4 8.8h4.2L5.4 15.4 13.8 6.4H9.4L9.2.6z", fill: "currentColor" });
    } else if (kind === "tower") {
      p = svgEl("path", { d: "M8 .4 1.2 15.6h3.2L8 5.8l3.6 9.8h3.2L8 .4zM3.4 10.2h9.2", fill: "none", stroke: "currentColor", "stroke-width": "1.4", "stroke-linejoin": "round", "stroke-linecap": "round" });
    } else if (kind === "plug") {
      p = svgEl("path", { d: "M5 1.2v4.4M11 1.2v4.4M4 5.6h8v2.2a4 4 0 0 1-8 0V5.6zM8 11.6v3", fill: "none", stroke: "currentColor", "stroke-width": "1.4", "stroke-linecap": "round", "stroke-linejoin": "round" });
    } else {
      p = svgEl("path", { d: "M8 1.5a6.5 6.5 0 1 0 .01 0zM8 4.6v6.8M4.6 8h6.8", fill: "none", stroke: "currentColor", "stroke-width": "1.4", "stroke-linecap": "round" });
    }
    g.appendChild(p);
    parent.appendChild(g);
  }
  function partFromAsset(id) {
    var a = assetById(id);
    if (!a) return null;
    return { text: tx(a.status_ne, a.status_en), date: a.statement_date, name: tx(a.name_ne, a.name_en) };
  }
  function nuwakotBits() {
    var c = stmtById("nea-2026-09-03");
    if (!c || !c.figures || c.figures.nuwakot_restored_pct_approx == null) return [];
    var text = fillTpl(t("elec_st_nuwakot", en() ? "About {pct}% of Nuwakot supply restored" : "नुवाकोटको करिब {pct}% क्षेत्रमा आपूर्ति पुनःस्थापित"), { pct: fmtNum(c.figures.nuwakot_restored_pct_approx) });
    if (c.figures.transformers_charged_additional != null) {
      text += en() ? ". " : "। ";
      text += fillTpl(t("elec_st_xf", en() ? "{xf} more transformers charged" : "थप {xf} ट्रान्सफर्मर चार्ज"), { xf: fmtNum(c.figures.transformers_charged_additional) });
    }
    return [{ text: text, date: c.date }];
  }
  function remember(spec) {
    if (spec.needAsset && !assetById(spec.needAsset)) return null;
    if (spec.needStmt && !stmtById(spec.needStmt)) return null;
    var parts = [];
    (spec.partAssets || []).forEach(function (id) {
      var p = partFromAsset(id);
      if (p) parts.push(p);
    });
    (spec.extra || []).forEach(function (ex) {
      var st = stmtById(ex.stmt);
      if (!st) return;
      var text = ex.text();
      if (text) parts.push({ text: text, date: st.date });
    });
    spec.parts = parts;
    if (spec.needAsset) {
      var a = assetById(spec.needAsset);
      if (!spec.popName) spec.popName = tx(a.name_ne, a.name_en);
      if (!spec.tone) spec.tone = toneFor(a);
    }
    if (!spec.popName) spec.popName = t(spec.shortKey, spec.shortFb || "");
    flowIndex[spec.id] = spec;
    return spec;
  }
  function placeText(text, nd, extra) {
    if (nd.place === "above") {
      text.setAttribute("x", nd.x);
      text.setAttribute("y", nd.y - 22 - (extra || 0));
      text.setAttribute("text-anchor", "middle");
    } else if (nd.place === "left") {
      text.setAttribute("x", nd.x - 20);
      text.setAttribute("y", nd.y + 4 + (extra || 0));
      text.setAttribute("text-anchor", "end");
    } else if (nd.place === "right") {
      text.setAttribute("x", nd.x + 20);
      text.setAttribute("y", nd.y + 4 + (extra || 0));
      text.setAttribute("text-anchor", "start");
    } else {
      text.setAttribute("x", nd.x);
      text.setAttribute("y", nd.y + 28 + (extra || 0));
      text.setAttribute("text-anchor", "middle");
    }
  }
  function drawNode(nd) {
    var g = svgEl("g", {
      class: "elec-node is-" + nd.tone,
      tabindex: "0",
      role: "button",
      "data-flow": nd.id,
      "data-elec-card": nd.card || ""
    });
    var name = t(nd.shortKey, nd.shortFb || "");
    var aria = name;
    if (nd.parts && nd.parts[0] && nd.parts[0].text) aria += ". " + nd.parts[0].text;
    g.setAttribute("aria-label", aria);
    if (nd.tone === "bad") g.appendChild(svgEl("circle", { class: "elec-halo", cx: nd.x, cy: nd.y, r: 16 }));
    g.appendChild(svgEl("circle", { class: "elec-hit", cx: nd.x, cy: nd.y, r: 20 }));
    g.appendChild(svgEl("circle", { class: "elec-core", cx: nd.x, cy: nd.y, r: 14 }));
    addGlyph(g, nd.kind, nd.x, nd.y);
    var text = svgEl("text", { class: "elec-lab" });
    placeText(text, nd, 0);
    text.textContent = name;
    g.appendChild(text);
    if (nd.sub) {
      var sub = svgEl("text", { class: "elec-sublab" });
      placeText(sub, nd, 22);
      sub.textContent = nd.sub;
      g.appendChild(sub);
    }
    return g;
  }
  function drawLine(ln) {
    var g = svgEl("g", {
      class: "elec-flow-line is-" + ln.tone,
      tabindex: "0",
      role: "button",
      "data-flow": ln.id,
      "data-elec-card": ln.card || ""
    });
    g.setAttribute("aria-label", ln.popName || ln.label || "");
    (ln.d || []).forEach(function (d) {
      g.appendChild(svgEl("path", { class: "elec-line-hit", d: d }));
      g.appendChild(svgEl("path", { class: "elec-line-vis", d: d }));
    });
    if (ln.label) {
      var lab = svgEl("text", { class: "elec-kv is-" + ln.tone, x: ln.lx, y: ln.ly, "text-anchor": "middle" });
      lab.textContent = ln.label;
      g.appendChild(lab);
    }
    return g;
  }
  function hideFlowPop(host) {
    var list = host ? [host] : Array.prototype.slice.call(document.querySelectorAll(".elec-flow"));
    list.forEach(function (root) {
      var pop = root.querySelector && root.querySelector(".elec-pop");
      if (pop) pop.hidden = true;
    });
  }
  function showFlowPop(id, anchor) {
    var spec = flowIndex[id];
    var host = anchor && anchor.closest ? anchor.closest(".elec-flow") : null;
    var pop = host && host.querySelector(".elec-pop");
    if (!spec || !pop || !anchor) return;
    clear(pop);
    var name = el("p", "elec-pop-name");
    name.textContent = spec.popName || "";
    pop.appendChild(name);
    (spec.parts || []).forEach(function (p) {
      var st = el("p", "elec-pop-status");
      st.textContent = p.text;
      pop.appendChild(st);
      if (p.date) {
        var dt = el("p", "elec-pop-date");
        dt.textContent = neaSrc(p.date);
        pop.appendChild(dt);
      }
    });
    pop.hidden = false;
    var host = pop.parentElement;
    var hb = host.getBoundingClientRect();
    var rb = anchor.getBoundingClientRect();
    var popW = Math.min(280, Math.max(160, hb.width - 16));
    pop.style.width = popW + "px";
    var left = rb.left - hb.left + rb.width / 2 - popW / 2;
    if (left < 8) left = 8;
    if (left > hb.width - popW - 8) left = Math.max(8, hb.width - popW - 8);
    var top = rb.bottom - hb.top + 8;
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    var ph = pop.offsetHeight;
    if (top + ph > hb.height - 8) pop.style.top = Math.max(8, rb.top - hb.top - ph - 8) + "px";
  }
  function bindFlow(host) {
    if (!host || host.getAttribute("data-flow-bound") === "1") return;
    host.setAttribute("data-flow-bound", "1");
    var popTimer = 0;
    function cancelHide() { window.clearTimeout(popTimer); }
    function scheduleHide() {
      window.clearTimeout(popTimer);
      popTimer = window.setTimeout(function () {
        if (flowPinned) return;
        activeFlow = "";
        highlight("", false, false);
        hideFlowPop();
      }, 200);
    }
    host.addEventListener("click", function (ev) {
      if (ev.target.closest && ev.target.closest(".elec-pop")) return;
      var node = ev.target.closest && ev.target.closest("[data-flow]");
      if (!node) {
        flowPinned = false;
        activeFlow = "";
        hideFlowPop();
        markFlow();
        return;
      }
      var id = node.getAttribute("data-flow");
      var card = node.getAttribute("data-elec-card") || "";
      if (flowPinned && activeFlow === id) {
        flowPinned = false;
        activeFlow = "";
        hideFlowPop();
        markFlow();
        return;
      }
      flowPinned = true;
      activeFlow = id;
      highlight(card, false, false);
      markFlow();
      showFlowPop(id, node);
    });
    host.addEventListener("pointerover", function (ev) {
      if (ev.pointerType && ev.pointerType !== "mouse") return;
      if (ev.target.closest && ev.target.closest(".elec-pop")) { cancelHide(); return; }
      var node = ev.target.closest && ev.target.closest("[data-flow]");
      if (!node) return;
      if (flowPinned) return;
      cancelHide();
      var card = node.getAttribute("data-elec-card") || "";
      activeFlow = node.getAttribute("data-flow");
      highlight(card, false, false);
      markFlow();
      showFlowPop(activeFlow, node);
    });
    host.addEventListener("pointerout", function (ev) {
      if (flowPinned) return;
      if (ev.pointerType && ev.pointerType !== "mouse") return;
      var rel = ev.relatedTarget;
      if (rel && host.contains(rel) && rel.closest && (rel.closest("[data-flow]") || rel.closest(".elec-pop"))) return;
      scheduleHide();
    });
    host.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var node = ev.target.closest && ev.target.closest("[data-flow]");
      if (!node || node !== ev.target) return;
      ev.preventDefault();
      node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape") return;
      flowPinned = false;
      activeFlow = "";
      hideFlowPop();
      markFlow();
    });
  }
  function flowNodes(compact) {
    var out = [];
    function add(spec) {
      var row = remember(spec);
      if (row) out.push(row);
    }
    add({ id: "rasuwagadhi_hpp", x: 54, y: 78, kind: "bolt", place: "below", card: "rasuwagadhi_hpp", needAsset: "rasuwagadhi_hpp", shortKey: "elec_flow_rasuwa", shortFb: en() ? "Rasuwagadhi" : "रसुवागढी", partAssets: ["rasuwagadhi_hpp"] });
    add({ id: "chilime_hpp", x: 54, y: 176, kind: "bolt", place: "below", card: "chilime_hpp", needAsset: "chilime_hpp", shortKey: "elec_flow_chilime", shortFb: en() ? "Chilime" : "चिलिमे", partAssets: ["chilime_hpp"] });
    add({ id: "chilime_220kv_hub", x: 292, y: 176, kind: "tower", place: "below", card: "chilime_220kv_hub", needAsset: "chilime_220kv_hub", shortKey: "elec_flow_chilime_hub", shortFb: en() ? "Chilime Hub" : "चिलिमे हब", partAssets: ["chilime_220kv_hub"] });
    add({ id: "upper_trishuli_3a", x: 54, y: 274, kind: "bolt", place: "below", card: "upper_trishuli_3a", needAsset: "upper_trishuli_3a", shortKey: "elec_flow_ut3a", shortFb: en() ? "Trishuli 3A" : "त्रिशूली ३ए", partAssets: ["upper_trishuli_3a"] });
    add({ id: "trishuli_3b_hub", x: 168, y: 372, kind: "tower", place: "below", card: "trishuli_3b_hub", needAsset: "trishuli_3b_hub", shortKey: "elec_flow_3b", shortFb: en() ? "3B Hub" : "३बी हब", partAssets: ["trishuli_3b_hub"] });
    add({
      id: "matatirtha", x: 292, y: 372, kind: "grid", tone: "end", place: "below", card: "line_chilime_3b_matatirtha_220",
      needAsset: "line_chilime_3b_matatirtha_220", shortKey: "elec_flow_matatirtha", shortFb: en() ? "Matatirtha" : "मातातीर्थ",
      partAssets: ["line_chilime_3b_matatirtha_220"],
      extra: [{ stmt: "nea-2026-09-17", text: function () { return t("elec_st_direct", en() ? "Direct Chilime Hub–Matatirtha line under study" : "चिलिमे हब–मातातीर्थ सीधा लाइन अध्ययनमा"); } }]
    });
    add({ id: "trishuli_hps", x: 54, y: 488, kind: "bolt", place: "below", card: "trishuli_hps", needAsset: "trishuli_hps", shortKey: "elec_flow_trishuli", shortFb: en() ? "Trishuli" : "त्रिशूली", partAssets: ["trishuli_hps"] });
    add({
      id: "samundratar", x: 292, y: 456, kind: "grid", tone: "ok", place: "below", card: "line_samundratar_trishuli_132",
      needAsset: "line_samundratar_trishuli_132", needStmt: "nea-2026-08-27",
      shortKey: "elec_flow_samundratar", shortFb: en() ? "Samundratar" : "समुन्द्रटार",
      partAssets: ["line_samundratar_trishuli_132"],
      extra: [{ stmt: "nea-2026-08-27", text: function () { return t("elec_st_samun", en() ? "Power restored through an alternative line from Sindhupalchok" : "सिन्धुपाल्चोकतर्फको वैकल्पिक लाइनबाट बिजुली सुचारु"); } }]
    });
    add({
      id: "balaju", x: 292, y: 548, kind: "grid", tone: "end", place: "below", card: "line_trishuli_balaju_66",
      needAsset: "line_trishuli_balaju_66", shortKey: "elec_flow_balaju", shortFb: en() ? "Balaju" : "बालाजु",
      partAssets: ["line_trishuli_balaju_66"],
      extra: [{ stmt: "nea-2026-08-27", text: function () { return t("elec_st_balaju11", en() ? "Balaju–Trishuli 66 kV line being charged at 11 kV" : "बालाजु–त्रिशूली ६६ केभी लाइन ११ केभीमा चार्ज गर्ने काम भइरहेको"); } }]
    });
    add({ id: "devighat_hps", x: 54, y: 646, kind: "bolt", place: "below", card: "devighat_hps", needAsset: "devighat_hps", shortKey: "elec_flow_devighat", shortFb: en() ? "Devighat" : "देवीघाट", partAssets: ["devighat_hps"] });
    add({ id: "devighat_substation", x: 168, y: 734, kind: "tower", place: "left", card: "devighat_substation", needAsset: "devighat_substation", shortKey: "elec_flow_dev_ss", shortFb: en() ? "Devighat SS" : "देवीघाट स.स्टे.", partAssets: ["devighat_substation"] });
    add({
      id: "chapali", x: 292, y: 734, kind: "plug", tone: "ok", place: "below", card: "",
      needStmt: "nea-2026-09-03", shortKey: "elec_flow_chapali", shortFb: en() ? "Chapali" : "चपली",
      extra: [{ stmt: "nea-2026-09-03", text: function () { return t("elec_st_chapali", en() ? "Chapali–Devighat circuits charged" : "चपली–देवीघाट सर्किट चार्ज"); } }, { stmt: "nea-2026-09-03", text: function () { var bits = nuwakotBits(); return bits[0] ? bits[0].text : ""; } }]
    });
    var nw = stmtById("nea-2026-09-03");
    var nwSub = "";
    if (nw && nw.figures && nw.figures.nuwakot_restored_pct_approx != null) {
      nwSub = (en() ? "~" : (t("elec_tile_about", "करिब") + " ")) + fmtNum(nw.figures.nuwakot_restored_pct_approx) + "%";
    }
    add({
      id: "nuwakot", x: 168, y: 824, kind: "plug", tone: "ok", place: "below", card: "", sub: nwSub,
      needStmt: "nea-2026-09-03", shortKey: "elec_flow_nuwakot", shortFb: en() ? "Nuwakot" : "नुवाकोट",
      extra: [{ stmt: "nea-2026-09-03", text: function () { var bits = nuwakotBits(); return bits[0] ? bits[0].text : ""; } }]
    });
    if (compact) {
      var C = {
        rasuwagadhi_hpp: [122, 42], chilime_hpp: [122, 96], chilime_220kv_hub: [238, 96],
        upper_trishuli_3a: [122, 150], trishuli_3b_hub: [180, 204], matatirtha: [238, 204],
        trishuli_hps: [122, 278], samundratar: [238, 278], balaju: [238, 332],
        devighat_hps: [122, 386], devighat_substation: [180, 440], chapali: [238, 440],
        nuwakot: [180, 508]
      };
      var left = { rasuwagadhi_hpp: 1, chilime_hpp: 1, upper_trishuli_3a: 1, trishuli_hps: 1, devighat_hps: 1 };
      var right = { chilime_220kv_hub: 1, matatirtha: 1, samundratar: 1, balaju: 1, chapali: 1 };
      out.forEach(function (nd) {
        if (!C[nd.id]) return;
        nd.x = C[nd.id][0];
        nd.y = C[nd.id][1];
        if (left[nd.id]) nd.place = "left";
        else if (right[nd.id]) nd.place = "right";
        else if (nd.id === "devighat_substation") nd.place = "above";
        else nd.place = "below";
      });
    }
    return out;
  }
  function flowLines(compact) {
    var out = [];
    function add(spec) {
      var row = remember(spec);
      if (row) out.push(row);
    }
    var kv66 = t("elec_flow_kv66", en() ? "66 kV" : "६६ केभी");
    add({
      id: "line_chilime_trishuli_66", card: "line_chilime_trishuli_66", needAsset: "line_chilime_trishuli_66",
      d: ["M118 200 L118 310", "M118 358 L118 470"], label: kv66, lx: 118, ly: 336,
      partAssets: ["line_chilime_trishuli_66"]
    });
    add({
      id: "line_chilime_3b_matatirtha_220", card: "line_chilime_3b_matatirtha_220", needAsset: "line_chilime_3b_matatirtha_220",
      d: ["M292 214 L248 236 L248 348 L168 360", "M186 372 L270 372"],
      label: t("elec_flow_kv220", en() ? "220 kV" : "२२० केभी"), lx: 200, ly: 292,
      partAssets: ["line_chilime_3b_matatirtha_220"]
    });
    add({
      id: "line_samundratar_trishuli_132", card: "line_samundratar_trishuli_132", needAsset: "line_samundratar_trishuli_132",
      d: ["M270 456 L190 468", "M140 478 L76 488"],
      label: t("elec_flow_kv132", en() ? "132 kV" : "१३२ केभी"), lx: 214, ly: 448,
      partAssets: ["line_samundratar_trishuli_132"]
    });
    add({
      id: "line_trishuli_balaju_66", card: "line_trishuli_balaju_66", needAsset: "line_trishuli_balaju_66",
      d: ["M270 548 L186 524", "M130 506 L76 494"],
      label: kv66, lx: 214, ly: 556,
      partAssets: ["line_trishuli_balaju_66"]
    });
    add({
      id: "line_chapali_devighat", card: "", tone: "ok", needStmt: "nea-2026-09-03",
      shortKey: "elec_flow_chapali_line", shortFb: en() ? "Chapali–Devighat" : "चपली–देवीघाट",
      d: ["M270 734 L190 734", "M168 756 L168 804"],
      label: t("elec_flow_chapali_line", en() ? "Chapali–Devighat" : "चपली–देवीघाट"), lx: 230, ly: 708,
      extra: [{ stmt: "nea-2026-09-03", text: function () { return t("elec_st_chapali", en() ? "Chapali–Devighat circuits charged" : "चपली–देवीघाट सर्किट चार्ज"); } }]
    });
    if (compact) {
      var geom = {
        line_chilime_trishuli_66: { d: ["M146 114 L146 168", "M146 198 L146 260"], lx: 172, ly: 124 },
        line_chilime_3b_matatirtha_220: { d: ["M238 114 L222 134 L222 180 L186 196", "M196 204 L220 204"], lx: 176, ly: 164 },
        line_samundratar_trishuli_132: { d: ["M216 278 L196 278", "M164 278 L144 278"], lx: 180, ly: 264 },
        line_trishuli_balaju_66: { d: ["M144 292 L178 308", "M206 322 L220 330"], lx: 152, ly: 348 },
        line_chapali_devighat: { d: ["M198 440 L220 440", "M180 458 L180 490"], lx: 248, ly: 472 }
      };
      out.forEach(function (ln) {
        var g = geom[ln.id];
        if (!g) return;
        ln.d = g.d;
        ln.lx = g.lx;
        ln.ly = g.ly;
      });
    }
    return out;
  }
  function paintKpis(hostId) {
    var host = document.getElementById(hostId || "elec-kpis");
    if (!host || !DATA) return;
    clear(host);
    var a = stmtById("nea-2026-08-26");
    var b = stmtById("nea-2026-09-17");
    var c = stmtById("nea-2026-09-03");
    var d = stmtById("nea-2026-09-22");
    var dev = assetById("devighat_substation");
    var mw = t("elec_tile_mw", en() ? "MW" : "मेगावाट");
    function card(icon, tone, num, sub, iso) {
      var node = el("article", "elec-kpi");
      var ico = el("span", "elec-kpi-ico is-" + tone);
      ico.innerHTML = htmlIcon(icon);
      node.appendChild(ico);
      var n = el("p", "elec-kpi-n");
      n.textContent = num;
      node.appendChild(n);
      var s = el("p", "elec-kpi-sub");
      s.textContent = sub;
      node.appendChild(s);
      var src = el("p", "elec-kpi-src");
      src.textContent = neaSrc(iso);
      node.appendChild(src);
      host.appendChild(node);
    }
    if (a && a.figures && a.figures.hydro_mw_disrupted != null) {
      var sub = fmtNum(a.figures.hydro_projects) + " " + t("elec_tile_projects", en() ? "projects" : "आयोजना");
      if (a.figures.solar_mw_disrupted != null) sub += " · " + fmtNum(a.figures.solar_mw_disrupted) + " " + mw + " " + t("elec_tile_solar", en() ? "solar" : "सौर्य");
      sub += " " + t("elec_tile_out", en() ? "disrupted" : "अवरुद्ध");
      card("bolt", "block", fmtNum(a.figures.hydro_mw_disrupted) + " " + mw, sub, a.date);
    }
    if (b && b.figures && b.figures.mw_cannot_be_evacuated != null) {
      card("tower", "bad", fmtNum(b.figures.mw_cannot_be_evacuated) + " " + mw, t("elec_tile_grid", en() ? "cannot reach the grid" : "ग्रिडमा पुग्न सकेन"), b.date);
    }
    if (c && c.figures && c.figures.nuwakot_restored_pct_approx != null) {
      var approx = en() ? "~" : (t("elec_tile_about", "करिब") + " ");
      card("plug", "ok", approx + fmtNum(c.figures.nuwakot_restored_pct_approx) + "%", t("elec_tile_nuwa", en() ? "of Nuwakot supply restored" : "नुवाकोट आपूर्ति सुचारु"), c.date);
    }
    if (d && dev) {
      card("tower", "bad", t("elec_flow_devighat", en() ? "Devighat" : "देवीघाट"), t("elec_tile_study", en() ? "substation under study" : "सबस्टेसन अध्ययनमा"), d.date);
    }
  }
  function paintFlow(hostId) {
    var host = document.getElementById(hostId || "elec-flow");
    if (!host || !DATA) return;
    clear(host);
    flowIndex = {};
    flowPinned = false;
    activeFlow = "";
    bindFlow(host);
    var compact = host.classList.contains("elec-flow-dash");
    var svg = svgEl("svg", { class: "elec-flow-svg", viewBox: compact ? "0 0 360 590" : "0 0 360 900" });
    svg.setAttribute("lang", en() ? "en" : "ne");
    var riverD = compact
      ? "M180 18 C194 90 164 150 180 230 C196 310 162 380 180 460 C192 520 166 560 180 578"
      : "M168 44 C180 120 154 180 168 250 C184 330 150 370 168 450 C186 530 148 600 168 680 C182 750 154 800 168 860";
    svg.appendChild(svgEl("path", { class: "elec-river-glow", d: riverD, fill: "none" }));
    svg.appendChild(svgEl("path", { class: "elec-river", d: riverD, fill: "none" }));
    var river = svgEl("text", { class: "elec-river-lab", x: 180, y: compact ? 22 : 24, "text-anchor": "middle" });
    river.textContent = t("elec_flow_river", en() ? "Bhotekoshi–Trishuli" : "भोटेकोशी–त्रिशूली");
    svg.appendChild(river);
    var linesG = svgEl("g", { class: "elec-lines" });
    flowLines(compact).forEach(function (ln) { linesG.appendChild(drawLine(ln)); });
    svg.appendChild(linesG);
    var nodesG = svgEl("g", { class: "elec-nodes" });
    flowNodes(compact).forEach(function (nd) { nodesG.appendChild(drawNode(nd)); });
    svg.appendChild(nodesG);
    host.appendChild(svg);
    var legend = el("ul", "elec-legend");
    [
      ["bad", "elec_leg_damaged", en() ? "Damaged" : "क्षति"],
      ["block", "elec_leg_blocked", en() ? "Line blocked" : "लाइन अवरुद्ध"],
      ["ok", "elec_leg_restored", en() ? "Restored route" : "वैकल्पिक मार्ग"]
    ].forEach(function (row) {
      var li = el("li");
      var sw = el("i", "is-" + row[0]);
      li.appendChild(sw);
      var s = el("span");
      s.textContent = t(row[1], row[2]);
      li.appendChild(s);
      legend.appendChild(li);
    });
    host.appendChild(legend);
    var pop = el("div", "elec-pop");
    pop.hidden = true;
    host.appendChild(pop);
    markFlow();
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
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 16,
      attribution: ""
    }).addTo(map);
    var bounds = [];
    points.forEach(function (item) {
      var ll = [item.lat, item.lon];
      bounds.push(ll);
      var icon = window.L.divIcon({
        className: "elec-mwrap",
        html: '<span class="elec-mico is-' + toneFor(item) + '">' + htmlIcon(iconKind(item.type)) + "</span>",
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      var marker = window.L.marker(ll, { icon: icon, keyboard: true, alt: "" });
      marker.__id = item.id;
      marker.on("add", function () {
        var node = marker.getElement();
        if (!node) return;
        node.setAttribute("role", "button");
        node.setAttribute("aria-label", tx(item.name_ne, item.name_en));
        node.removeAttribute("title");
      });
      marker.on("click", function () {
        activeFlow = "";
        flowPinned = false;
        hideFlowPop();
        highlight(item.id, false, true);
      });
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
    var items = assetItems();
    clear(host);
    items.forEach(function (item) {
      var mapped = item.lat != null && item.lon != null;
      var chip = chipFor(item);
      var btn = el("button", "elec-asset");
      btn.type = "button";
      btn.setAttribute("data-id", item.id || "");
      var ico = el("span", "elec-type-ico is-" + chip.tone);
      ico.innerHTML = htmlIcon(iconKind(item.type));
      btn.appendChild(ico);
      var body = el("span", "elec-asset-body");
      var head = el("span", "elec-asset-head");
      var name = el("strong");
      name.textContent = tx(item.name_ne, item.name_en);
      head.appendChild(name);
      var chipEl = el("span", "elec-chip is-" + chip.tone);
      chipEl.textContent = t(chip.key, chip.fb);
      head.appendChild(chipEl);
      body.appendChild(head);
      var status = el("span", "elec-asset-status");
      status.textContent = tx(item.status_ne, item.status_en);
      body.appendChild(status);
      var when = el("span", "elec-asset-date");
      when.textContent = neaSrc(item.statement_date);
      body.appendChild(when);
      btn.appendChild(body);
      btn.addEventListener("click", function () {
        activeFlow = "";
        flowPinned = false;
        hideFlowPop();
        highlight(item.id, mapped, false);
      });
      var row = el("div", "elec-asset-row");
      row.appendChild(btn);
      if (item.coord_source) {
        var osm = extLink(item.coord_source, "");
        osm.className = "elec-osm";
        osm.setAttribute("aria-label", "OpenStreetMap");
        osm.innerHTML = htmlIcon("link");
        row.appendChild(osm);
      }
      host.appendChild(row);
    });
    paintMap(items);
    if (activeId) highlight(activeId, false);
  }

  function helplineCard(item) {
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
    return card;
  }
  function paintHelplines() {
    var host = document.getElementById("elec-helplines");
    if (!host || !DATA) return;
    var items = (DATA.helplines && DATA.helplines.items) || [];
    clear(host);
    var alertOn = !!(DATA.alert && DATA.alert.active);
    var alertItems = [];
    var rest = [];
    items.forEach(function (item) {
      if (alertOn && item.scope === "alert") alertItems.push(item);
      else rest.push(item);
    });
    if (alertItems.length) {
      var byDist = [];
      var seen = {};
      alertItems.forEach(function (item) {
        var key = item.district || "";
        if (!seen[key]) {
          seen[key] = [];
          byDist.push(key);
        }
        seen[key].push(item);
      });
      byDist.forEach(function (key) {
        var sec = el("section", "elec-hl-group");
        var h = el("h3");
        h.textContent = key ? districtLabel(key) : tx(seen[key][0].label_ne, seen[key][0].label_en);
        sec.appendChild(h);
        var grid = el("div", "elec-hl-grid");
        seen[key].forEach(function (item) { grid.appendChild(helplineCard(item)); });
        sec.appendChild(grid);
        host.appendChild(sec);
      });
    }
    var groups = {};
    rest.forEach(function (item) {
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
      groups[key].forEach(function (item) { grid.appendChild(helplineCard(item)); });
      sec.appendChild(grid);
      host.appendChild(sec);
    });
  }

  var KIND_FB = {
    reservoir_watch: ["जलाशय निगरानी", "Reservoir watch"],
    safety_warning_system: ["सुरक्षा चेतावनी", "Safety warning"],
    preparedness: ["पूर्वतयारी", "Preparedness"],
    consumer_safety: ["उपभोक्ता सुरक्षा", "Consumer safety"],
    complaint_line: ["गुनासो", "Complaint line"]
  };
  var STATUS_FB = {
    disrupted: ["अवरुद्ध", "Disrupted"],
    partly_disrupted: ["आंशिक", "Partly disrupted"],
    restored: ["सुचारु", "Restored"],
    generation_only: ["उत्पादन", "Generation only"]
  };
  function kindLabel(kind) {
    var fb = KIND_FB[kind] || ["", ""];
    return t("elec_kind_" + kind, en() ? fb[1] : fb[0]);
  }
  function statusLabel(status) {
    var fb = STATUS_FB[status] || ["", ""];
    return t("elec_st_" + status, en() ? fb[1] : fb[0]);
  }
  function byId(list, id) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function resolveFeed(entry) {
    if (!entry || !DATA) return null;
    var list = entry.ref === "advisories" ? DATA.advisories : DATA.alert_outages;
    return byId(list, entry.id);
  }
  function feedWhen(entry) {
    if (!entry) return "";
    if (entry.time) return fmtDate(entry.time, true);
    return fmtDate(entry.date, false);
  }
  function shortAlertName() {
    var alert = DATA && DATA.alert;
    var name = alert && alert.name ? tx(alert.name.ne, alert.name.en) : "";
    var cut = name.indexOf(" · ");
    return cut >= 0 ? name.slice(0, cut) : name;
  }
  function hotlineItem() {
    var hot = null;
    ((DATA && DATA.helplines && DATA.helplines.items) || []).forEach(function (item) {
      if (!hot && item.category === "hotline" && item.numbers && item.numbers.length) hot = item;
    });
    return hot;
  }
  function applyHotline(node) {
    var hot = hotlineItem();
    if (!node || !hot) return;
    node.href = telHref(hot.numbers[0]);
    node.textContent = hot.numbers[0];
    node.setAttribute("aria-label", tx(hot.label_ne, hot.label_en) + " " + hot.numbers[0]);
  }
  function quoteBits(sources) {
    var out = [];
    (sources || []).forEach(function (src) {
      if (en()) {
        if (src.translation_en) out.push({ kind: "tr", text: src.translation_en, name: src.source_name || "" });
        else if (src.quote_en) out.push({ kind: "q", text: src.quote_en, name: src.source_name || "" });
      } else if (src.quote_ne) out.push({ kind: "q", text: src.quote_ne, name: src.source_name || "" });
      else if (src.quote_en) out.push({ kind: "q", text: src.quote_en, name: src.source_name || "" });
    });
    return out;
  }
  function appendQuotes(parent, sources) {
    var bits = quoteBits(sources);
    if (!bits.length) return;
    var groups = { tr: [], q: [] };
    bits.forEach(function (bit) { groups[bit.kind].push(bit); });
    ["q", "tr"].forEach(function (kind) {
      if (!groups[kind].length) return;
      var det = el("details", "elec-quote");
      var sum = el("summary");
      sum.textContent = kind === "tr" ? t("elec_translation", "Translation") : t("elec_quote", en() ? "Quote" : "उद्धरण");
      det.appendChild(sum);
      groups[kind].forEach(function (bit) {
        var p = el("p");
        if (bit.name) {
          var who = el("span", "elec-quote-who");
          who.textContent = bit.name;
          p.appendChild(who);
        }
        p.appendChild(document.createTextNode(bit.text));
        det.appendChild(p);
      });
      parent.appendChild(det);
    });
  }
  function appendSources(parent, sources) {
    var row = el("p", "elec-links elec-feed-src");
    (sources || []).forEach(function (src) {
      if (!src.source_url || !src.source_name) return;
      var a = extLink(src.source_url, src.source_name);
      a.className = "elec-src-link";
      row.appendChild(a);
    });
    if (row.childNodes.length) parent.appendChild(row);
  }
  function assetLine(asset) {
    var parts = [tx(asset.name_ne, asset.name_en)];
    if (asset.kv != null && asset.kv !== "") parts.push(fmtNum(asset.kv) + " kV");
    if (asset.mw != null && asset.mw !== "") parts.push(fmtNum(asset.mw) + " " + t("elec_tile_mw", en() ? "MW" : "मेगावाट"));
    var status = tx(asset.status_ne, asset.status_en);
    if (status) parts.push(status);
    return parts.filter(Boolean).join(" · ");
  }
  function highlightFeed(id, scroll) {
    activeFeed = id || "";
    document.querySelectorAll(".elec-dist, .elec-alert-ico").forEach(function (node) {
      var ids = (node.getAttribute("data-feed") || "").split(",");
      node.classList.toggle("is-on", !!(activeFeed && ids.indexOf(activeFeed) >= 0));
    });
    document.querySelectorAll(".elec-feed-card").forEach(function (node) {
      var on = node.getAttribute("data-id") === activeFeed;
      node.classList.toggle("is-on", on);
      if (on && scroll && node.scrollIntoView) {
        try { node.scrollIntoView({ block: "nearest", behavior: "auto" }); } catch (e) {}
      }
    });
  }
  function pathCentroid(path) {
    try {
      var len = path.getTotalLength();
      if (len) {
        var n = 32;
        var x = 0;
        var y = 0;
        var i;
        for (i = 0; i < n; i++) {
          var p = path.getPointAtLength(len * (i + 0.5) / n);
          x += p.x;
          y += p.y;
        }
        return { x: x / n, y: y / n };
      }
    } catch (e) {}
    try {
      var box = path.getBBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    } catch (e2) {}
    return null;
  }
  function applyAlertView(svg) {
    if (!svg || !alertView) return;
    svg.setAttribute("viewBox", [alertView.x, alertView.y, alertView.w, alertView.h].join(" "));
  }
  function zoomAlert(svg, dir) {
    if (!alertView) return;
    var cx = alertView.x + alertView.w / 2;
    var cy = alertView.y + alertView.h / 2;
    var next = dir > 0 ? 1.35 : 1 / 1.35;
    var w = alertView.w / next;
    var h = alertView.h / next;
    if (w >= alertView.bw) {
      alertView.x = alertView.bx;
      alertView.y = alertView.by;
      alertView.w = alertView.bw;
      alertView.h = alertView.bh;
    } else {
      var minW = alertView.bw / 8;
      if (w < minW) {
        h = h * (minW / w);
        w = minW;
      }
      alertView.w = w;
      alertView.h = h;
      alertView.x = cx - w / 2;
      alertView.y = cy - h / 2;
    }
    applyAlertView(svg);
  }
  function paintAlertMap(host) {
    if (!GEO || !GEO.districts) return;
    var panel = el("div", "elec-alert-map");
    var svg = svgEl("svg", { class: "elec-alert-svg" });
    var raw = String(GEO.viewBox || "-18 -12 880 548").trim().split(/\s+/).map(Number);
    alertView = { x: raw[0], y: raw[1], w: raw[2], h: raw[3], bx: raw[0], by: raw[1], bw: raw[2], bh: raw[3] };
    applyAlertView(svg);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("role", "group");
    var alertName = DATA.alert && DATA.alert.name ? tx(DATA.alert.name.ne, DATA.alert.name.en) : "";
    if (alertName) svg.setAttribute("aria-label", alertName);
    var byIdStatus = {};
    (DATA.alert_district_status || []).forEach(function (row) { byIdStatus[row.district_id] = row; });
    var shapes = GEO.districts.slice().sort(function (a, b) {
      return (byIdStatus[a.id] ? 1 : 0) - (byIdStatus[b.id] ? 1 : 0);
    });
    shapes.forEach(function (shape) {
      var row = byIdStatus[shape.id];
      var path = svgEl("path");
      path.setAttribute("d", shape.d);
      path.setAttribute("class", "elec-dist is-" + (row ? row.status : "quiet"));
      path.setAttribute("data-id", shape.id);
      path.setAttribute("vector-effect", "non-scaling-stroke");
      if (row) {
        path.setAttribute("data-feed", (row.item_ids || []).join(","));
        path.setAttribute("role", "button");
        path.setAttribute("tabindex", "0");
        path.setAttribute("aria-label", tx(row.name_ne, row.name_en));
      }
      svg.appendChild(path);
    });
    panel.appendChild(svg);
    host.appendChild(panel);
    var placed = {};
    (DATA.alert_outages || []).forEach(function (item) {
      if (!passes(item)) return;
      (item.assets || []).forEach(function (asset) {
        if (asset.lat == null || asset.lon == null) return;
        var districtId = "";
        (item.districts || []).forEach(function (d) {
          if (!districtId && d.district_id) districtId = d.district_id;
        });
        if (asset.district_en) {
          (DATA.alert_district_status || []).forEach(function (row) {
            if (row.name_en === asset.district_en) districtId = row.district_id;
          });
        }
        var path = districtId ? svg.querySelector('[data-id="' + districtId + '"]') : null;
        if (!path) return;
        var at = pathCentroid(path);
        if (!at) return;
        var n = placed[districtId] || 0;
        placed[districtId] = n + 1;
        var g = svgEl("g", {
          class: "elec-alert-ico",
          transform: "translate(" + (at.x + n * 16) + " " + (at.y + n * 16) + ")",
          role: "button",
          tabindex: "0",
          "data-feed": item.id
        });
        g.setAttribute("aria-label", tx(asset.name_ne, asset.name_en));
        g.appendChild(svgEl("circle", { cx: "0", cy: "0", r: "12", class: "elec-alert-ico-bg" }));
        var glyph = svgEl("g", { transform: "translate(-8 -8)", "aria-hidden": "true" });
        addGlyph(glyph, iconKind(asset.type), 8, 8);
        g.appendChild(glyph);
        svg.appendChild(g);
      });
    });
    var bar = el("div", "map-ctl");
    function zbtn(key, fb, icon, dir) {
      var b = el("button", "map-ctl-btn");
      b.type = "button";
      b.setAttribute("aria-label", t(key, fb));
      b.innerHTML = mapIcon(icon);
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        zoomAlert(svg, dir);
      });
      bar.appendChild(b);
    }
    zbtn("map_zoom_in", en() ? "Zoom in" : "ठूलो पार्नुहोस्", "plus", 1);
    zbtn("map_zoom_out", en() ? "Zoom out" : "सानो पार्नुहोस्", "minus", -1);
    bar.appendChild(bindFullscreen(panel, function () { applyAlertView(svg); }));
    panel.appendChild(bar);
    function fromMap(node) {
      if (!node) return;
      var ids = (node.getAttribute("data-feed") || "").split(",").filter(Boolean);
      if (!ids.length) return;
      highlightFeed(activeFeed === ids[0] ? "" : ids[0], true);
    }
    svg.addEventListener("click", function (ev) {
      var node = ev.target.closest && ev.target.closest(".elec-alert-ico, .elec-dist[data-feed]");
      if (!node) return;
      ev.stopPropagation();
      fromMap(node);
    });
    svg.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var node = ev.target.closest && ev.target.closest(".elec-alert-ico, .elec-dist[data-feed]");
      if (!node || node !== ev.target) return;
      ev.preventDefault();
      fromMap(node);
    });
    var legend = el("ul", "elec-dlegend");
    var seenStatus = {};
    (DATA.alert_district_status || []).forEach(function (row) {
      if (!row.status || seenStatus[row.status]) return;
      seenStatus[row.status] = 1;
      var li = el("li");
      var sw = el("i", "is-" + row.status);
      li.appendChild(sw);
      var s = el("span");
      s.textContent = statusLabel(row.status);
      li.appendChild(s);
      legend.appendChild(li);
    });
    host.appendChild(legend);
  }
  function paintFeed(host) {
    var feed = DATA.alert_feed || [];
    var wrap = el("div", "elec-feed");
    var h = el("h3");
    h.textContent = t("elec_feed_h", en() ? "Latest NEA updates" : "पछिल्ला अद्यावधिक");
    wrap.appendChild(h);
    feed.forEach(function (entry) {
      var item = resolveFeed(entry);
      if (!item || !passes(item)) return;
      var card = el("article", "card elec-feed-card");
      card.id = "feed-" + item.id;
      card.setAttribute("data-id", item.id);
      var top = el("div", "elec-feed-top");
      var time = el("time");
      time.dateTime = entry.time || entry.date || "";
      time.textContent = feedWhen(entry);
      top.appendChild(time);
      var chip = el("span", "elec-chip is-block");
      if (entry.ref === "advisories") chip.textContent = kindLabel(item.kind);
      else chip.textContent = tx(item.status_ne, item.status_en);
      top.appendChild(chip);
      card.appendChild(top);
      if (entry.ref === "advisories" && item.title) {
        var title = el("p", "elec-feed-title");
        title.textContent = tx(item.title.ne, item.title.en);
        card.appendChild(title);
      }
      var text = entry.ref === "advisories" ? tx(item.text_ne, item.text_en) : tx(item.summary_ne, item.summary_en);
      if (text) {
        var sum = el("p", "elec-sum");
        sum.textContent = text;
        card.appendChild(sum);
      }
      var speaker = tx(item.speaker_ne, item.speaker_en);
      if (speaker) {
        var who = el("p", "elec-speaker");
        who.textContent = speaker;
        card.appendChild(who);
      }
      var districts = item.districts || (item.district ? [item.district] : []);
      if (districts.length) {
        var chips = el("div", "elec-feed-dists");
        districts.forEach(function (d) {
          var name = tx(d.name_ne, d.name_en);
          if (!name) return;
          var c = el("span", "elec-muted");
          c.textContent = name;
          chips.appendChild(c);
        });
        if (chips.childNodes.length) card.appendChild(chips);
      }
      if (item.assets && item.assets.length) {
        var list = el("ul", "elec-feed-assets");
        item.assets.forEach(function (asset) {
          var li = el("li");
          li.textContent = assetLine(asset);
          list.appendChild(li);
        });
        card.appendChild(list);
      }
      if (item.restoration_eta && (item.restoration_eta.ne || item.restoration_eta.en)) {
        var eta = el("p", "elec-eta");
        eta.textContent = tx(item.restoration_eta.ne, item.restoration_eta.en);
        card.appendChild(eta);
      }
      var sources = visibleSources(item);
      appendSources(card, sources);
      appendQuotes(card, sources);
      card.addEventListener("click", function (ev) {
        if (ev.target.closest && ev.target.closest("a, button, summary, details")) return;
        highlightFeed(activeFeed === item.id ? "" : item.id, false);
      });
      wrap.appendChild(card);
    });
    host.appendChild(wrap);
  }
  function paintAlert() {
    var host = document.getElementById("elec-alert");
    var sec = document.getElementById("power-alert");
    if (!host || !DATA) return;
    clear(host);
    var alert = DATA.alert || {};
    if (!alert.active) {
      if (sec) sec.hidden = true;
      return;
    }
    if (sec) sec.hidden = false;
    var head = el("div", "elec-alert-head");
    var h = el("h3");
    h.textContent = tx(alert.name && alert.name.ne, alert.name && alert.name.en);
    head.appendChild(h);
    var range = alert.date_range || {};
    var bs = tx(range.start_bs_label && range.start_bs_label.ne, range.start_bs_label && range.start_bs_label.en);
    var be = tx(range.end_bs_label && range.end_bs_label.ne, range.end_bs_label && range.end_bs_label.en);
    var ad = [fmtDate(range.start, false), fmtDate(range.end, false)].filter(Boolean).join(" – ");
    var line = el("p", "elec-alert-range");
    line.textContent = [bs && be ? (bs + " – " + be) : (bs || be), ad].filter(Boolean).join(" · ");
    head.appendChild(line);
    var ids = (alert.dhm_warning_ids || []).join(" · ");
    var issuer = tx(alert.issuer && alert.issuer.ne, alert.issuer && alert.issuer.en);
    if (issuer || ids) {
      var muted = el("p", "elec-alert-ids");
      muted.textContent = [issuer, ids].filter(Boolean).join(" · ");
      head.appendChild(muted);
    }
    host.appendChild(head);
    var cover = DATA.coverage_line || {};
    if (cover.ne || cover.en) {
      var cov = el("p", "elec-cover");
      cov.textContent = tx(cover.ne, cover.en);
      host.appendChild(cov);
    }
    var summary = DATA.alert_summary || {};
    var tiles = el("div", "elec-kpis elec-alert-kpis");
    function tile(num, sub) {
      if (num == null || num === "") return;
      var node = el("article", "elec-kpi");
      var n = el("p", "elec-kpi-n");
      n.textContent = fmtNum(num);
      node.appendChild(n);
      var s = el("p", "elec-kpi-sub");
      s.textContent = sub;
      node.appendChild(s);
      tiles.appendChild(node);
    }
    tile(summary.outage_items, t("elec_tile_updates", en() ? "Outage updates" : "अद्यावधिक"));
    tile(summary.districts_supply_affected, t("elec_tile_districts", en() ? "Districts with supply affected" : "आपूर्ति प्रभावित जिल्ला"));
    tile(summary.assets_listed, t("elec_tile_assets", en() ? "Assets affected" : "प्रभावित संरचना"));
    tile(summary.assets_damaged, t("elec_tile_damaged_n", en() ? "Damaged" : "क्षति"));
    tile(summary.assets_restored, t("elec_tile_restored_n", en() ? "Restored" : "सुचारु"));
    if (summary.generation_mw_stopped_in_items != null) {
      tile(summary.generation_mw_stopped_in_items, t("elec_tile_mw_updates", en() ? "MW in NEA updates" : "मेगावाट · प्राधिकरणका अद्यावधिकमा"));
    }
    host.appendChild(tiles);
    paintAlertMap(host);
    paintFeed(host);
    if (activeFeed) highlightFeed(activeFeed, false);
  }
  function sourceLine(blockKey) {
    var p = el("p", "source elec-src");
    var ne = el("span", "elec-src-ne");
    ne.lang = "ne";
    ne.textContent = "स्रोत: नेपाल विद्युत प्राधिकरण (NEA)";
    var eng = el("span", "elec-src-en");
    eng.lang = "en";
    eng.textContent = "Source: Nepal Electricity Authority (NEA)";
    var chk = el("span", "elec-checked");
    chk.setAttribute("data-elec-block", blockKey);
    p.appendChild(ne);
    p.appendChild(eng);
    p.appendChild(chk);
    return p;
  }
  function mountSpecial(card) {
    var kpis = el("div", "elec-kpis");
    kpis.id = "elec-kpis";
    card.appendChild(kpis);
    var flow = el("div", "elec-flow");
    flow.id = "elec-flow";
    card.appendChild(flow);
    var layout = el("div", "elec-maplayout");
    layout.id = "assets";
    var wrap = el("div", "elec-mapwrap");
    wrap.id = "elec-mapwrap";
    var box = el("div", "elec-map");
    box.id = "elec-map";
    wrap.appendChild(box);
    layout.appendChild(wrap);
    var list = el("div", "elec-asset-list");
    list.id = "elec-assets";
    layout.appendChild(list);
    card.appendChild(layout);
    var attr = el("p", "elec-osm-attr");
    var osm = extLink("https://www.openstreetmap.org/copyright", "OpenStreetMap");
    var carto = extLink("https://carto.com/attributions", "CARTO");
    attr.appendChild(osm);
    attr.appendChild(document.createTextNode(" · "));
    attr.appendChild(carto);
    card.appendChild(attr);
    card.appendChild(sourceLine("damaged_assets"));
    var sh = el("div", "sec-head");
    sh.id = "statements";
    var dot = el("span", "dot");
    dot.style.background = "var(--crimson)";
    var hh = el("h3");
    hh.textContent = t("h_elec_statements", en() ? "NEA statements" : "प्राधिकरणका भनाइ");
    sh.appendChild(dot);
    sh.appendChild(hh);
    card.appendChild(sh);
    var st = el("div");
    st.id = "elec-statements";
    card.appendChild(st);
    card.appendChild(sourceLine("statements"));
  }
  function mountPlain(card, inc) {
    var figs = inc.headline_figures || {};
    var tiles = el("div", "elec-kpis");
    function tile(num, sub, iso) {
      if (num == null || num === "") return;
      var node = el("article", "elec-kpi");
      var n = el("p", "elec-kpi-n");
      n.textContent = fmtNum(num) + (String(sub).indexOf("MW") >= 0 || String(sub).indexOf("मेगावाट") >= 0 ? "" : "");
      node.appendChild(n);
      var s = el("p", "elec-kpi-sub");
      s.textContent = sub;
      node.appendChild(s);
      if (iso) {
        var src = el("p", "elec-kpi-src");
        src.textContent = neaSrc(iso);
        node.appendChild(src);
      }
      tiles.appendChild(node);
    }
    var mw = t("elec_tile_mw", en() ? "MW" : "मेगावाट");
    if (figs.hydro_mw_disrupted != null) tile(figs.hydro_mw_disrupted + " " + mw, t("elec_tile_out", en() ? "disrupted" : "अवरुद्ध"), "");
    if (figs.solar_mw_disrupted != null) tile(figs.solar_mw_disrupted + " " + mw, t("elec_tile_solar", en() ? "solar" : "सौर्य"), "");
    if (figs.hydro_projects != null) tile(figs.hydro_projects, t("elec_tile_projects", en() ? "projects" : "आयोजना"), "");
    if (figs.mw_cannot_be_evacuated != null) tile(figs.mw_cannot_be_evacuated + " " + mw, t("elec_tile_grid", en() ? "cannot reach the grid" : "ग्रिडमा पुग्न सकेन"), "");
    if (tiles.childNodes.length) card.appendChild(tiles);
    var items = (inc.statements && inc.statements.items) || [];
    if (items.length) {
      var list = el("div", "elec-timeline");
      items.slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }).forEach(function (item) {
        var art = el("article", "card elec-state");
        var time = el("time");
        time.dateTime = item.date || "";
        time.textContent = fmtDate(item.date, false);
        art.appendChild(time);
        var sum = el("p", "elec-sum");
        sum.textContent = tx(item.summary_ne, item.summary_en);
        art.appendChild(sum);
        list.appendChild(art);
      });
      card.appendChild(list);
    }
    var assets = (inc.damaged_assets && inc.damaged_assets.items) || [];
    if (assets.length) {
      var ul = el("ul", "elec-feed-assets");
      assets.forEach(function (asset) {
        var li = el("li");
        li.textContent = tx(asset.name_ne, asset.name_en);
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }
  }
  function paintIncidents() {
    var host = document.getElementById("elec-incidents");
    if (!host || !DATA) return;
    clear(host);
    (DATA.incidents || []).forEach(function (inc, index) {
      var card = el("article", "card elec-incident");
      card.id = "incident-" + (inc.id || index);
      var h = el("h3");
      var when = tx(inc.date_bs_label && inc.date_bs_label.ne, inc.date_bs_label && inc.date_bs_label.en);
      h.textContent = [tx(inc.name && inc.name.ne, inc.name && inc.name.en), when].filter(Boolean).join(" · ");
      card.appendChild(h);
      var cover = inc.coverage_line || {};
      if (cover.ne || cover.en) {
        var cov = el("p", "elec-cover");
        cov.textContent = tx(cover.ne, cover.en);
        card.appendChild(cov);
      }
      if (index === 0) {
        var gaps = (DATA.planned_shutdowns && DATA.planned_shutdowns.flood_districts_without_rows) || [];
        if (gaps.length) {
          var gk = el("p", "elec-gap-k");
          gk.textContent = t("elec_none_k", en() ? "No NEA-published shutdowns:" : "प्राधिकरणले प्रकाशित नगरेका जिल्ला:");
          card.appendChild(gk);
          var grow = el("div", "elec-gap");
          gaps.forEach(function (name) {
            var chip = el("span", "elec-muted");
            chip.textContent = districtLabel(name);
            grow.appendChild(chip);
          });
          card.appendChild(grow);
        }
        mountSpecial(card);
      } else mountPlain(card, inc);
      host.appendChild(card);
    });
  }
  function paintAdvisories() {
    var host = document.getElementById("elec-advisories");
    if (!host || !DATA) return;
    clear(host);
    var alertOn = !!(DATA.alert && DATA.alert.active);
    var items = (DATA.advisories || []).filter(function (item) {
      if (!passes(item)) return false;
      if (item.scope === "alert") return alertOn;
      return item.scope === "standing" || !item.scope;
    });
    items.sort(function (a, b) {
      var as = a.scope === "alert" ? 0 : 1;
      var bs = b.scope === "alert" ? 0 : 1;
      if (as !== bs) return as - bs;
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    items.forEach(function (item) {
      var card = el("article", "card elec-feed-card");
      card.id = "adv-" + item.id;
      var top = el("div", "elec-feed-top");
      var time = el("time");
      time.dateTime = item.date || "";
      time.textContent = fmtDate(item.date, false);
      top.appendChild(time);
      var chip = el("span", "elec-chip is-block");
      chip.textContent = kindLabel(item.kind);
      top.appendChild(chip);
      card.appendChild(top);
      if (item.title) {
        var title = el("p", "elec-feed-title");
        title.textContent = tx(item.title.ne, item.title.en);
        card.appendChild(title);
      }
      var text = tx(item.text_ne, item.text_en);
      if (text) {
        var sum = el("p", "elec-sum");
        sum.textContent = text;
        card.appendChild(sum);
      }
      var speaker = tx(item.speaker_ne, item.speaker_en);
      if (speaker) {
        var who = el("p", "elec-speaker");
        who.textContent = speaker;
        card.appendChild(who);
      }
      var sources = visibleSources(item);
      appendSources(card, sources);
      appendQuotes(card, sources);
      host.appendChild(card);
    });
  }
  function paintPage() {
    if (!document.getElementById("elec-shutdowns")) return;
    paintAlert();
    paintShutdowns();
    paintIncidents();
    if (document.getElementById("elec-kpis")) paintKpis("elec-kpis");
    if (document.getElementById("elec-flow")) paintFlow("elec-flow");
    if (document.getElementById("elec-assets")) paintAssets();
    paintStatements();
    paintAdvisories();
    if (document.getElementById("elec-helplines")) paintHelplines();
    paintCheckedOnly();
  }
  function fallbackHome(lead, sum) {
    var rows = (DATA.planned_shutdowns && DATA.planned_shutdowns.rows) || [];
    var n = rows.filter(live).length;
    var label = t("elec_home_count", en() ? "upcoming or ongoing" : "आगामी वा चलिरहेको");
    if (lead) lead.textContent = en() ? (n + " " + label) : (dig(n) + " " + label);
    var items = stmtItems().slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    if (sum && items[0]) sum.textContent = fmtDate(items[0].date, false) + " — " + tx(items[0].summary_ne, items[0].summary_en);
  }
  function newestVisibleFeed() {
    var feed = (DATA && DATA.alert_feed) || [];
    for (var i = 0; i < feed.length; i++) {
      var item = resolveFeed(feed[i]);
      if (item && passes(item)) return { entry: feed[i], item: item };
    }
    return null;
  }
  function paintHome() {
    if (!DATA) return;
    var name = document.getElementById("dash-elec-name");
    var figs = document.getElementById("dash-elec-figs");
    var dashSum = document.getElementById("dash-elec-sum");
    var dashTel = document.getElementById("dash-elec-tel");
    var lead = document.getElementById("elec-home-lead");
    var sum = document.getElementById("elec-home-sum");
    var tel = document.getElementById("elec-home-tel");
    var alert = DATA.alert || {};
    var summary = DATA.alert_summary || {};
    applyHotline(dashTel);
    applyHotline(tel);
    if (alert.active) {
      var shortName = shortAlertName();
      if (name) name.textContent = shortName;
      if (figs) {
        clear(figs);
        function fig(num, label) {
          if (num == null || num === "") return;
          var li = el("li");
          var b = el("b");
          b.textContent = fmtNum(num);
          var s = el("span");
          s.textContent = label;
          li.appendChild(b);
          li.appendChild(s);
          figs.appendChild(li);
        }
        fig(summary.districts_supply_affected, t("elec_tile_districts", en() ? "Districts with supply affected" : "आपूर्ति प्रभावित जिल्ला"));
        fig(summary.assets_listed, t("elec_tile_assets", en() ? "Assets affected" : "प्रभावित संरचना"));
        fig(summary.generation_mw_stopped_in_items, t("elec_tile_mw_updates", en() ? "MW in NEA updates" : "मेगावाट · प्राधिकरणका अद्यावधिकमा"));
      }
      var newest = newestVisibleFeed();
      var one = "";
      if (newest) {
        var body = newest.entry.ref === "advisories" ? tx(newest.item.text_ne, newest.item.text_en) : tx(newest.item.summary_ne, newest.item.summary_en);
        one = feedWhen(newest.entry) + " — " + body;
      }
      if (dashSum) dashSum.textContent = one;
      if (lead) {
        var districtN = summary.districts_supply_affected;
        lead.textContent = districtN == null ? shortName : (shortName + " · " + fmtNum(districtN) + " " + t("elec_tile_districts", en() ? "Districts with supply affected" : "आपूर्ति प्रभावित जिल्ला"));
      }
      if (sum) sum.textContent = one;
      return;
    }
    if (name) name.textContent = t("nav_electricity", en() ? "Electricity" : "बिजुली");
    if (figs) clear(figs);
    fallbackHome(lead, dashSum || sum);
    if (sum && sum !== dashSum) fallbackHome(null, sum);
  }
  function paint() {
    paintPage();
    paintHome();
  }
  function boot() {
    var url = window.ELEC_SRC || "data/nea_electricity.json";
    var bust = (url.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now();
    var jobs = [
      fetch(url + bust, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
    ];
    if (document.getElementById("elec-alert")) {
      jobs.push(fetch("data/nepal-districts-svg.json" + bust, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }));
    }
    Promise.all(jobs).then(function (parts) {
      if (!parts[0]) return;
      DATA = parts[0];
      GEO = parts[1] || null;
      paint();
    }).catch(function () {});
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
