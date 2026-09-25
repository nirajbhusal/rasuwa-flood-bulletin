(function () {
  "use strict";
  var VER = window.PAGE_VER || "2026-09-25-weather-db";
  var home = null;
  var full = null;
  var geo = null;
  var provinces = null;
  var popEl = null;

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "ne";
  }
  function tx(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    var key = lang();
    return value[key] || value.ne || value.en || "";
  }
  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }
  function dev(value) {
    return String(value).replace(/\d/g, function (d) { return "०१२३४५६७८९"[d]; });
  }
  function fmt(value, digits) {
    if (value == null || value === "") return "—";
    var n = Number(value);
    if (!isFinite(n)) return "—";
    var text = digits == null ? String(Math.round(n * 10) / 10) : n.toFixed(digits);
    return lang() === "en" ? text : dev(text);
  }
  function freshSource(src) {
    if (!src) return false;
    if (src.status === "ok" || src.status === "fallback") return true;
    if (src.status !== "retained" || !src.fetched_at) return false;
    var t = Date.parse(src.fetched_at);
    return isFinite(t) && (Date.now() - t) < 48 * 3600 * 1000;
  }
  function sourceOk(data, key) {
    return freshSource(data && data.sources && data.sources[key]);
  }

  var BS_MONTHS = {
    2083: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30]
  };
  var BS_NE = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"];
  var BS_EN = ["Baisakh", "Jestha", "Asar", "Saun", "Bhadra", "Asoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
  var G_NE = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
  var G_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function nptParts(iso) {
    var date = new Date(iso);
    if (!isFinite(date.getTime())) return null;
    var fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kathmandu",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    var map = {};
    fmt.formatToParts(date).forEach(function (part) { map[part.type] = part.value; });
    return {
      y: Number(map.year), m: Number(map.month), d: Number(map.day),
      hh: Number(map.hour), mm: Number(map.minute)
    };
  }
  function bsFromGregorian(y, m, d) {
    var cursor = Date.UTC(2026, 7, 17);
    var target = Date.UTC(y, m - 1, d);
    var day = Math.round((target - cursor) / 86400000);
    var year = 2083;
    var month = 4;
    var lengths = BS_MONTHS[2083];
    if (!lengths) return null;
    if (day < 0) return null;
    while (day >= lengths[month]) {
      day -= lengths[month];
      month += 1;
      if (month > 11) return null;
    }
    return { year: year, month: month, day: day + 1 };
  }
  function dayPart(hh) {
    if (lang() === "en") {
      if (hh < 12) return "morning";
      if (hh < 17) return "afternoon";
      if (hh < 20) return "evening";
      return "night";
    }
    if (hh < 12) return "बिहान";
    if (hh < 17) return "दिउँसो";
    if (hh < 20) return "साँझ";
    return "राति";
  }
  function formatWhen(iso, withTime) {
    var parts = nptParts(iso);
    if (!parts) return "";
    var bs = bsFromGregorian(parts.y, parts.m, parts.d);
    var dateText;
    if (lang() === "en") {
      dateText = (bs ? (BS_EN[bs.month] + " " + bs.day) : (parts.d + " " + G_EN[parts.m - 1]));
    } else if (bs) {
      dateText = BS_NE[bs.month] + " " + dev(bs.day);
    } else {
      dateText = dev(parts.d) + " " + G_NE[parts.m - 1];
    }
    if (!withTime) return dateText;
    var hm = (parts.hh < 10 ? "0" : "") + parts.hh + ":" + (parts.mm < 10 ? "0" : "") + parts.mm;
    if (lang() !== "en") hm = dev(hm);
    return dateText + ", " + dayPart(parts.hh) + " " + hm;
  }
  function clock(iso) {
    var parts = nptParts(iso);
    if (!parts) return "";
    var hm = (parts.hh < 10 ? "0" : "") + parts.hh + ":" + (parts.mm < 10 ? "0" : "") + parts.mm;
    return lang() === "en" ? hm : dev(hm);
  }

  function iconSvg(name) {
    var common = "viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" aria-hidden=\"true\"";
    var stroke = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
    if (name === "sun") {
      return "<svg " + common + "><circle cx=\"12\" cy=\"12\" r=\"3.2\" fill=\"currentColor\" stroke=\"none\"/><path " + stroke + " d=\"M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18\"/></svg>";
    }
    if (name === "partly") {
      return "<svg " + common + "><path fill=\"currentColor\" d=\"M8 16h8.2a3.2 3.2 0 0 0 .4-6.4 4.6 4.6 0 0 0-8.8 1.2A2.8 2.8 0 0 0 8 16z\"/><circle cx=\"16.2\" cy=\"7.2\" r=\"1.6\" fill=\"currentColor\"/></svg>";
    }
    if (name === "rain" || name === "heavy-rain" || name === "thunder-rain") {
      var drops = name === "heavy-rain" ? "M8 17.2 7 20M12 17.2 11 20M16 17.2 15 20" : "M10 17.2 9 20M14 17.2 13 20";
      var bolt = name === "thunder-rain" ? "<path fill=\"currentColor\" stroke=\"none\" d=\"M13 15.2h-2.2l1-2.4H9.6L13.4 8l-.6 3.2H15z\"/>" : "";
      return "<svg " + common + "><path fill=\"currentColor\" d=\"M7.2 15.2h9.2a3.4 3.4 0 0 0 .3-6.8 5 5 0 0 0-9.6 1.3 3 3 0 0 0 .1 5.5z\"/>" + bolt + "<path " + stroke + " d=\"" + drops + "\"/></svg>";
    }
    if (name === "snow") {
      return "<svg " + common + "><path " + stroke + " d=\"M12 4v16M6 7.5l12 9M18 7.5l-12 9\"/></svg>";
    }
    if (name === "fog") {
      return "<svg " + common + "><path " + stroke + " d=\"M5 9h14M4 12.5h16M6 16h12\"/></svg>";
    }
    if (name === "wind") {
      return "<svg " + common + "><path " + stroke + " d=\"M4 9h10a2 2 0 1 0-2-2M4 13h14a2 2 0 1 1-2 2M4 17h8\"/></svg>";
    }
    if (name === "cold") {
      return "<svg " + common + "><path " + stroke + " d=\"M12 4v16M8 7l4 3 4-3M8 17l4-3 4 3\"/></svg>";
    }
    if (name === "heat") {
      return "<svg " + common + "><path " + stroke + " d=\"M8 18c0-4 8-4 8-8s-8-4-8-8\"/><path " + stroke + " d=\"M14 18c0-3 4-3 4-6\"/></svg>";
    }
    return "<svg " + common + "><path fill=\"currentColor\" d=\"M6.5 16h10.4a3.6 3.6 0 0 0 .2-7.2 5.2 5.2 0 0 0-10 1.4A3.1 3.1 0 0 0 6.5 16z\"/></svg>";
  }
  function iconNode(name) {
    var wrap = el("span", "wxdb-ico");
    wrap.innerHTML = iconSvg(name || "cloud");
    return wrap;
  }

  function rainColor(mm) {
    if (mm == null) return "#cbd5e1";
    if (mm >= 100) return "#1a4a80";
    if (mm >= 50) return "#2f6cb3";
    if (mm >= 25) return "#5b95d6";
    if (mm >= 10) return "#9ec5ea";
    if (mm >= 1) return "#d6e4f5";
    return "#e8eef5";
  }
  function riverWord(level) {
    if (level === "red") return lang() === "en" ? "Danger" : "खतरा";
    if (level === "orange") return lang() === "en" ? "Warning" : "चेतावनी";
    if (level === "green") return lang() === "en" ? "Below warning" : "चेतावनीभन्दा तल";
    return lang() === "en" ? "No fresh reading" : "ताजा रिडिङ छैन";
  }
  function deltaText(row) {
    if (!row || !row.fresh || row.below_warning_m == null) {
      var last = row && row.obs_at ? formatWhen(row.obs_at, true) : "";
      var base = lang() === "en" ? "No fresh reading" : "हालको रिडिङ छैन";
      return last ? base + " · " + last : base;
    }
    var n = fmt(Math.abs(row.below_warning_m), 2);
    if (row.below_warning_m >= 0) {
      return lang() === "en" ? n + " m below warning" : "चेतावनीभन्दा " + n + " मि. तल";
    }
    return lang() === "en" ? n + " m above warning" : "चेतावनीभन्दा " + n + " मि. माथि";
  }
  function trendMark(trend) {
    if (trend === "rising") return "▲";
    if (trend === "falling") return "▼";
    if (trend === "steady") return "▬";
    return "";
  }
  function badgeInfo(state) {
    if (state === "ok") return { cls: "is-ok", ne: "DHM पुष्टि", en: "DHM-verified" };
    if (state === "differs") return { cls: "is-diff", ne: "DHM भिन्न", en: "differs from DHM" };
    return { cls: "is-model", ne: "मोडेल", en: "Model" };
  }
  function badgeNode(state, title) {
    var info = badgeInfo(state || "no_ref");
    var node = el("span", "wxdb-badge " + info.cls);
    node.textContent = lang() === "en" ? info.en : info.ne;
    if (title) node.title = title;
    return node;
  }
  function flagLine(flag) {
    if (!flag) return "";
    var dhm = flag.dhm != null ? flag.dhm : (flag.dhm_from != null ? (flag.dhm_from + "–" + (flag.dhm_to != null ? flag.dhm_to : flag.dhm_from)) : "");
    var model = flag.model != null ? flag.model : "";
    if (lang() === "en") return "DHM " + dhm + " · model " + model;
    return "DHM " + dhm + " · मोडेल " + model;
  }

  function closePop() {
    if (popEl) popEl.hidden = true;
  }
  function openPop(anchor, title, lines) {
    if (!popEl) {
      popEl = el("div", "wxdb-pop");
      popEl.tabIndex = -1;
      popEl.setAttribute("role", "dialog");
      document.body.appendChild(popEl);
    }
    popEl.replaceChildren();
    var head = el("div", "wxdb-pop-h");
    head.appendChild(el("strong", null));
    head.lastChild.textContent = title || "";
    var x = document.createElement("button");
    x.type = "button";
    x.className = "wxdb-pop-x";
    x.textContent = "×";
    x.setAttribute("aria-label", lang() === "en" ? "Close" : "बन्द");
    x.addEventListener("click", closePop);
    head.appendChild(x);
    popEl.appendChild(head);
    (lines || []).forEach(function (line) {
      if (!line) return;
      popEl.appendChild(el("p", null)).textContent = line;
    });
    popEl.hidden = false;
    var rect = anchor.getBoundingClientRect();
    popEl.style.top = Math.max(8, rect.bottom + window.scrollY + 6) + "px";
    popEl.style.left = Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 280)) + "px";
    popEl.focus();
  }

  function h2(ne, en) {
    var node = el("h2", "wxdb-h");
    node.textContent = lang() === "en" ? en : ne;
    return node;
  }

  function renderHome(root) {
    root.replaceChildren();
    if (!home) return;
    var board = el("section", "wxdb wxdb-home");
    board.appendChild(h2("नेपाल अहिले", "Nepal now"));
    var strip = el("div", "wxdb-strip");
    strip.setAttribute("role", "list");
    (home.nepal_now || []).forEach(function (city) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wxdb-city";
      btn.setAttribute("role", "listitem");
      btn.appendChild(iconNode(city.next && city.next.icon));
      var name = el("span", "wxdb-city-name");
      name.textContent = tx(city);
      btn.appendChild(name);
      var obs = city.obs || {};
      var temps = el("span", "wxdb-city-t");
      temps.textContent = fmt(obs.max, 1) + "° / " + fmt(obs.min, 1) + "°";
      btn.appendChild(temps);
      if (obs.rain24 != null || obs.trace) {
        var rain = el("span", "wxdb-rainchip");
        var dot = el("i", "wxdb-rdot");
        dot.style.background = rainColor(obs.trace ? 0 : obs.rain24);
        rain.appendChild(dot);
        rain.appendChild(document.createTextNode(obs.trace ? (lang() === "en" ? "T" : "ट्रेस") : (fmt(obs.rain24, 1) + (lang() === "en" ? " mm" : " मि.मि."))));
        btn.appendChild(rain);
      }
      if (city.next) {
        var next = el("span", "wxdb-city-next");
        next.textContent = fmt(city.next.t_from, 0) + "–" + fmt(city.next.t_to, 0) + "°";
        btn.appendChild(next);
      }
      btn.addEventListener("click", function () {
        var lines = [];
        if (city.next) lines.push(tx(city.next));
        if (city.next) lines.push((lang() === "en" ? "DHM " : "DHM ") + fmt(city.next.t_from, 0) + "–" + fmt(city.next.t_to, 0) + "°");
        if (city.model_now && city.model_now.t != null) {
          lines.push((lang() === "en" ? "Model " : "मोडेल ") + fmt(city.model_now.t, 1) + "°");
        }
        openPop(btn, tx(city), lines);
      });
      strip.appendChild(btn);
    });
    board.appendChild(strip);

    var corridor = home.corridor || {};
    var panel = el("section", "wxdb-corridor");
    panel.appendChild(h2("रसुवा करिडोर", "Rasuwa corridor"));
    var rivers = el("ul", "wxdb-rivers");
    (corridor.rivers || []).forEach(function (row) {
      var li = el("li", "wxdb-river");
      var dot = el("i", "wxdb-rdot wxdb-lv-" + (row.fresh ? row.level : "none"));
      li.appendChild(dot);
      var label = el("span", "wxdb-river-name");
      label.textContent = tx(row);
      li.appendChild(label);
      var state = el("span", "wxdb-river-state");
      state.textContent = riverWord(row.fresh ? row.level : "none");
      li.appendChild(state);
      var meta = el("span", "wxdb-river-meta");
      var trend = trendMark(row.trend);
      meta.textContent = deltaText(row) + (trend ? " " + trend : "") + (row.fresh && row.obs_at ? " · " + clock(row.obs_at) : "");
      li.appendChild(meta);
      rivers.appendChild(li);
    });
    panel.appendChild(rivers);
    var rains = el("div", "wxdb-rainrow");
    (corridor.rain || []).forEach(function (row) {
      if (!row.fresh && row.rain_24h == null) return;
      var chip = el("span", "wxdb-rainchip");
      var dot = el("i", "wxdb-rdot");
      dot.style.background = row.fresh ? rainColor(row.rain_24h) : "#9aa3ad";
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(tx(row) + " " + (row.fresh ? fmt(row.rain_24h, 1) : "—")));
      rains.appendChild(chip);
    });
    if (rains.childNodes.length) panel.appendChild(rains);
    if (home.bulletin && home.bulletin.url) {
      var a = document.createElement("a");
      a.className = "wxdb-bull";
      a.href = home.bulletin.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = home.bulletin.title || (lang() === "en" ? "DHM bulletin" : "DHM बुलेटिन");
      panel.appendChild(a);
    }
    if (home.generated_at) {
      panel.appendChild(el("p", "wxdb-updated")).textContent = (lang() === "en" ? "Updated " : "अद्यावधिक ") + formatWhen(home.generated_at, true);
    }
    var more = document.createElement("a");
    more.className = "wxdb-more";
    more.href = "weather.html";
    more.textContent = lang() === "en" ? "Full weather" : "पूरा मौसम";
    panel.appendChild(more);
    board.appendChild(panel);
    root.appendChild(board);
  }

  function project(lat, lon) {
    return {
      x: 93.02012472627688 * lon - 7398.0924066901325,
      y: -104.84920536223119 * lat + 3241.0532041239735
    };
  }
  function rowsOf(block) {
    var cols = (block && block.cols) || [];
    return ((block && block.rows) || []).map(function (row) {
      var obj = {};
      cols.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
  }

  function renderSection(root) {
    root.replaceChildren();
    if (!full) return;
    var wrap = el("div", "wxdb wxdb-section");
    wrap.appendChild(renderGeneral());
    wrap.appendChild(renderBulletins());
    wrap.appendChild(renderCities());
    wrap.appendChild(renderRainMap());
    wrap.appendChild(renderRivers());
    wrap.appendChild(renderOutlook());
    wrap.appendChild(renderMountain());
    wrap.appendChild(renderModel());
    wrap.appendChild(renderSources());
    root.appendChild(wrap);
  }

  function renderGeneral() {
    var sec = el("section", "wxdb-block");
    sec.id = "wxdb-general";
    sec.appendChild(h2("सामान्य पूर्वानुमान", "General forecast"));
    var data = full.general_forecast;
    if (!sourceOk(full, "dhm_country") || !data) return el("section");
    var src = full.sources.dhm_country || {};
    if (src.issued_at) sec.appendChild(el("p", "wxdb-issued")).textContent = (lang() === "en" ? "Issued " : "जारी ") + formatWhen(src.issued_at, true);
    if (tx(data.analysis)) sec.appendChild(el("p", "wxdb-copy")).textContent = tx(data.analysis);
    (data.parts || []).forEach(function (part) {
      sec.appendChild(el("h3", "wxdb-subh")).textContent = tx(part.label);
      sec.appendChild(el("p", "wxdb-copy")).textContent = tx(part.text);
    });
    return sec;
  }

  function renderBulletins() {
    var sec = el("section", "wxdb-block");
    sec.id = "wxdb-bulletins";
    sec.appendChild(h2("विशेष बुलेटिन", "Special bulletins"));
    if (!sourceOk(full, "dhm_pages")) return el("section");
    var rows = (full.bulletins || []).filter(function (row) { return !row.expired && row.tag === 5; });
    rows.sort(function (a, b) { return (b.corridor - a.corridor); });
    if (!rows.length) return el("section");
    var list = el("ul", "wxdb-bullist");
    rows.forEach(function (row) {
      var li = el("li");
      var a = document.createElement("a");
      a.href = row.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = row.title;
      li.appendChild(a);
      if (row.issued_at) li.appendChild(el("span", "wxdb-quiet")).textContent = " · " + formatWhen(row.issued_at, true);
      list.appendChild(li);
    });
    sec.appendChild(list);
    return sec;
  }

  function renderCities() {
    var sec = el("section", "wxdb-block");
    sec.id = "wxdb-cities";
    sec.appendChild(h2("शहर पूर्वानुमान", "City forecast"));
    if (!sourceOk(full, "dhm_city")) return el("section");
    var table = document.createElement("table");
    table.className = "wxdb-table";
    var cap = document.createElement("caption");
    cap.textContent = lang() === "en" ? "DHM city forecast and observed temperature" : "DHM शहर पूर्वानुमान र अवलोकन तापक्रम";
    table.appendChild(cap);
    var head = document.createElement("thead");
    var hr = document.createElement("tr");
    var labels = lang() === "en"
      ? ["City", "Tonight", "Tomorrow", "Observed", "Check"]
      : ["शहर", "आज राति", "भोलि", "अवलोकन", "जाँच"];
    labels.forEach(function (label) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      hr.appendChild(th);
    });
    head.appendChild(hr);
    table.appendChild(head);
    var body = document.createElement("tbody");
    (full.cities || []).forEach(function (city) {
      var tr = document.createElement("tr");
      function td(node) {
        var cell = document.createElement("td");
        if (typeof node === "string") cell.textContent = node;
        else if (node) cell.appendChild(node);
        tr.appendChild(cell);
        return cell;
      }
      td(tx(city));
      var periods = ((city.dhm_forecast || {}).periods) || [];
      function periodCell(name) {
        var row = periods.filter(function (item) { return item.period === name; })[0];
        var box = el("div", "wxdb-pcell");
        if (!row) {
          box.textContent = "—";
          return box;
        }
        box.appendChild(iconNode(row.icon));
        var text = el("span");
        text.textContent = fmt(row.t_from, 0) + "–" + fmt(row.t_to, 0) + "°";
        if (row.rain_prob != null) text.textContent += " · " + fmt(row.rain_prob, 0) + "%";
        box.appendChild(text);
        return box;
      }
      td(periodCell("tonight"));
      td(periodCell("tomorrow"));
      var obs = city.dhm_observed || {};
      var obsBox = el("div", "wxdb-pcell");
      var rainBit = obs.trace ? (lang() === "en" ? "T" : "ट्रेस") : (obs.rain_24h_mm == null ? "" : fmt(obs.rain_24h_mm, 1));
      obsBox.textContent = fmt(obs.max_c, 1) + "° / " + fmt(obs.min_c, 1) + "°" + (rainBit ? " · " + rainBit : "");
      td(obsBox);
      var state = (city.verify || {}).state;
      var b = badgeNode(state);
      if (state === "differs") {
        b.tabIndex = 0;
        b.setAttribute("role", "button");
        var lines = ((city.verify || {}).flags || []).map(flagLine);
        b.addEventListener("click", function () { openPop(b, tx(city), lines); });
        b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPop(b, tx(city), lines); } });
      }
      td(b);
      body.appendChild(tr);
    });
    table.appendChild(body);
    sec.appendChild(table);
    return sec;
  }

  function renderRainMap() {
    var sec = el("section", "wxdb-block");
    sec.id = "wxdb-rain";
    sec.appendChild(h2("२४ घण्टा वर्षा", "Observed 24 h rain"));
    if (!sourceOk(full, "hyd_rain") || !geo) return el("section");
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", geo.viewBox || "-18 -12 880 548");
    svg.setAttribute("class", "wxdb-map");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", lang() === "en" ? "24 hour rain gauges" : "२४ घण्टा वर्षा मापन");
    (geo.provinces || []).forEach(function (prov) {
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", prov.d);
      path.setAttribute("class", "wxdb-prov");
      svg.appendChild(path);
    });
    rowsOf(full.rain_stations).forEach(function (row) {
      if (row.lat == null || row.lon == null || row.r24 == null) return;
      var xy = project(row.lat, row.lon);
      var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", xy.x);
      dot.setAttribute("cy", xy.y);
      dot.setAttribute("r", row.r24 >= 50 ? 7 : 5);
      dot.setAttribute("fill", rainColor(row.r24));
      dot.setAttribute("class", "wxdb-gauge");
      dot.setAttribute("tabindex", "0");
      dot.setAttribute("role", "button");
      var label = (row.name || "") + " " + (row.r24 != null ? row.r24 : "");
      dot.setAttribute("aria-label", label);
      function show() {
        openPop(svg, row.name || "", [
          (lang() === "en" ? "1 h " : "१ घण्टा ") + fmt(row.r1, 1),
          (lang() === "en" ? "3 h " : "३ घण्टा ") + fmt(row.r3, 1),
          (lang() === "en" ? "6 h " : "६ घण्टा ") + fmt(row.r6, 1),
          (lang() === "en" ? "12 h " : "१२ घण्टा ") + fmt(row.r12, 1),
          (lang() === "en" ? "24 h " : "२४ घण्टा ") + fmt(row.r24, 1),
          row.obs_at ? formatWhen(row.obs_at, true) : ""
        ]);
      }
      dot.addEventListener("click", function (e) { e.stopPropagation(); show(); });
      dot.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(); } });
      svg.appendChild(dot);
    });
    var frame = el("div", "wxdb-mapframe");
    frame.appendChild(svg);
    sec.appendChild(frame);
    var scale = el("ul", "wxdb-scale");
    [[0, "0"], [1, "1"], [10, "10"], [25, "25"], [50, "50"], [100, "100+"]].forEach(function (pair) {
      var li = el("li");
      var sw = el("i", "wxdb-rdot");
      sw.style.background = rainColor(pair[0] === 0 ? 0 : pair[0]);
      li.appendChild(sw);
      li.appendChild(document.createTextNode(lang() === "en" ? pair[1] : dev(pair[1])));
      scale.appendChild(li);
    });
    sec.appendChild(scale);
    return sec;
  }

  function renderRivers() {
    var sec = el("section", "wxdb-block");
    sec.id = "wxdb-rivers";
    sec.appendChild(h2("नदी निगरानी", "River watch"));
    if (!sourceOk(full, "hyd_river")) return el("section");
    var corridorIds = {};
    ((full.corridor && full.corridor.rivers) || []).forEach(function (row) { corridorIds[row.id] = row; });
    var rows = rowsOf(full.rivers).map(function (row) {
      var extra = corridorIds[row.id];
      if (extra) {
        row.ne = extra.ne;
        row.en = extra.en;
        row.fresh = extra.fresh;
        row.below_warning_m = extra.below_warning_m;
      } else {
        row.fresh = row.level && row.level !== "none";
        var label = String(row.name || "").replace(/^\s+/, "");
        row.ne = label;
        row.en = label;
        if (row.warning_m != null && row.level_m != null && row.fresh) row.below_warning_m = Math.round((row.warning_m - row.level_m) * 100) / 100;
      }
      return row;
    });
    var basins = [];
    rows.forEach(function (row) {
      var name = row.basin || (lang() === "en" ? "Other" : "अन्य");
      if (basins.indexOf(name) < 0) basins.push(name);
    });
    var filters = el("div", "wxdb-filters");
    var host = el("div", "wxdb-riverhost");
    function rank(row) {
      if (row.level === "red") return 0;
      if (row.level === "orange") return 1;
      if (corridorIds[row.id]) return 2;
      return 3;
    }
    function paint(basin) {
      host.replaceChildren();
      var list = rows.filter(function (row) { return !basin || (row.basin || "") === basin; });
      list.sort(function (a, b) {
        var d = rank(a) - rank(b);
        if (d) return d;
        return String(a.basin || "").localeCompare(String(b.basin || "")) || String(a.name || "").localeCompare(String(b.name || ""));
      });
      var alertRows = list.filter(function (row) { return rank(row) < 3; });
      var rest = list.filter(function (row) { return rank(row) >= 3; });
      host.appendChild(riverTable(alertRows, lang() === "en" ? "Rivers at warning, danger, or on the corridor" : "चेतावनी, खतरा वा करिडोरका नदी"));
      if (rest.length) {
        var details = document.createElement("details");
        details.className = "wxdb-morebasins";
        var sum = document.createElement("summary");
        sum.textContent = lang() === "en" ? "All stations" : "सबै स्टेशन";
        details.appendChild(sum);
        details.appendChild(riverTable(rest, lang() === "en" ? "Other river stations" : "अन्य नदी स्टेशन"));
        host.appendChild(details);
      }
    }
    function addChip(label, basin, on) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wxdb-chip" + (on ? " is-on" : "");
      b.textContent = label;
      b.addEventListener("click", function () {
        filters.querySelectorAll("button").forEach(function (n) { n.classList.remove("is-on"); });
        b.classList.add("is-on");
        paint(basin);
      });
      filters.appendChild(b);
    }
    addChip(lang() === "en" ? "All" : "सबै", "", true);
    basins.sort().forEach(function (name) { addChip(name, name, false); });
    sec.appendChild(filters);
    sec.appendChild(host);
    paint("");
    return sec;
  }

  function riverTable(rows, caption) {
    var table = document.createElement("table");
    table.className = "wxdb-table wxdb-rivertable";
    var cap = document.createElement("caption");
    cap.textContent = caption;
    table.appendChild(cap);
    var body = document.createElement("tbody");
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      var dot = el("i", "wxdb-rdot wxdb-lv-" + (row.fresh ? (row.level || "none") : "none"));
      td.appendChild(dot);
      td.appendChild(document.createTextNode(" " + riverWord(row.fresh ? row.level : "none") + " · " + (tx(row) || row.name || "")));
      tr.appendChild(td);
      var td2 = document.createElement("td");
      var level = row.level_m == null ? "—" : fmt(row.level_m, 2);
      var warn = row.warning_m == null ? "—" : fmt(row.warning_m, 2);
      td2.textContent = level + " / " + warn + " · " + deltaText(row) + (trendMark(row.trend) ? " " + trendMark(row.trend) : "");
      tr.appendChild(td2);
      body.appendChild(tr);
    });
    table.appendChild(body);
    return table;
  }

  function provinceName(pid) {
    var list = provinces || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === pid) return lang() === "en" ? (list[i].en || pid) : (list[i].ne || pid);
    }
    return pid;
  }
  function renderOutlook() {
    var sec = el("section", "wxdb-block");
    sec.id = "wxdb-outlook";
    sec.appendChild(h2("तीन दिने प्रदेश पूर्वानुमान", "Three-day province outlook"));
    var data = full.province_outlook;
    if (!sourceOk(full, "dhm_3day") || !data) return el("section");
    var grid = el("div", "wxdb-ogrid");
    (data.days || []).forEach(function (day) {
      var col = el("section", "wxdb-oday");
      col.appendChild(el("h3", "wxdb-subh")).textContent = day.date ? formatWhen(day.date + "T06:00:00+05:45", false) : "";
      Object.keys(day.provinces || {}).forEach(function (pid) {
        var cell = day.provinces[pid];
        var card = el("article", "wxdb-ocard");
        card.appendChild(iconNode(cell.icon));
        var name = el("strong");
        name.textContent = provinceName(pid);
        card.appendChild(name);
        if (tx(cell.summary)) card.appendChild(el("p")).textContent = tx(cell.summary);
        var regions = cell.regions || {};
        var swatches = el("div", "wxdb-regions");
        Object.keys(regions).forEach(function (code) {
          var sw = el("span", "wxdb-region");
          var dot = el("i", "wxdb-rdot");
          dot.style.background = regions[code];
          sw.appendChild(dot);
          var labels = (data.region_labels || {})[code] || {};
          sw.appendChild(document.createTextNode(tx(labels) || code));
          swatches.appendChild(sw);
        });
        if (swatches.childNodes.length) card.appendChild(swatches);
        col.appendChild(card);
      });
      grid.appendChild(col);
    });
    sec.appendChild(grid);
    return sec;
  }

  function renderMountain() {
    var sec = el("section", "wxdb-block");
    sec.id = "wxdb-mountain";
    if (!sourceOk(full, "dhm_mountain") || !full.mountain) return el("section");
    var details = document.createElement("details");
    details.className = "wxdb-fold";
    var sum = document.createElement("summary");
    sum.textContent = lang() === "en" ? "Mountain forecast" : "हिमाली पूर्वानुमान";
    details.appendChild(sum);
    var table = document.createElement("table");
    table.className = "wxdb-table";
    var cap = document.createElement("caption");
    cap.textContent = lang() === "en" ? "Mountain wind and temperature by altitude" : "उचाईअनुसार हिमाली हावा र तापक्रम";
    table.appendChild(cap);
    var body = document.createElement("tbody");
    var provinces = (full.mountain && full.mountain.provinces) || {};
    Object.keys(provinces).forEach(function (pid) {
      var slot = provinces[pid];
      (slot.levels || []).forEach(function (level) {
        var tr = document.createElement("tr");
        [pid, fmt(level.alt, 0), fmt(level.wind_dir, 0) + "°", fmt(level.wind_kt, 0), fmt(level.temp_c, 1) + "°"].forEach(function (text) {
          var td = document.createElement("td");
          td.textContent = text;
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      if (tx(slot.text)) {
        var tr2 = document.createElement("tr");
        var td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = tx(slot.text);
        tr2.appendChild(td);
        body.appendChild(tr2);
      }
    });
    table.appendChild(body);
    details.appendChild(table);
    sec.appendChild(details);
    return sec;
  }

  function renderModel() {
    var sec = el("section", "wxdb-block");
    sec.id = "wxdb-model";
    sec.appendChild(h2("७ दिने मोडेल दृष्टिकोण", "7-day model outlook"));
    var note = el("p", "wxdb-kicker");
    note.textContent = lang() === "en" ? "Model · ECMWF" : "मोडेल · ECMWF";
    sec.appendChild(note);
    if (!sourceOk(full, "model")) return el("section");
    var points = (full.cities || []).concat((full.corridor && full.corridor.points) || []);
    points.forEach(function (point) {
      if (!point.model_daily || !point.model_daily.length) return;
      var row = el("article", "wxdb-mrow");
      var head = el("div", "wxdb-mhead");
      head.appendChild(el("strong", null)).textContent = tx(point);
      var state = (point.verify || {}).state || "no_ref";
      var b = badgeNode(state);
      if (state === "differs") {
        var lines = ((point.verify || {}).flags || []).map(flagLine);
        b.tabIndex = 0;
        b.setAttribute("role", "button");
        b.addEventListener("click", function () { openPop(b, tx(point), lines); });
      }
      head.appendChild(b);
      row.appendChild(head);
      var days = el("div", "wxdb-days");
      point.model_daily.forEach(function (day) {
        var cell = el("div", "wxdb-day" + (day.dhm_level ? " is-dim" : ""));
        cell.appendChild(iconNode(day.icon));
        cell.appendChild(el("span", "wxdb-day-d")).textContent = formatWhen(day.date + "T06:00:00+05:45", false);
        cell.appendChild(el("span")).textContent = fmt(day.tmax, 0) + "° / " + fmt(day.tmin, 0) + "°";
        cell.appendChild(el("span")).textContent = fmt(day.rain_mm, 1) + (lang() === "en" ? " mm" : " मि.मि.");
        if (day.pop != null) cell.appendChild(el("span", "wxdb-quiet")).textContent = fmt(day.pop, 0) + "%";
        if (day.dhm_level === "red" || day.dhm_level === "orange") {
          var chip = el("span", "wxdb-warnchip is-" + day.dhm_level);
          chip.textContent = day.dhm_level === "red" ? (lang() === "en" ? "DHM red" : "DHM रातो") : (lang() === "en" ? "DHM orange" : "DHM सुन्तला");
          cell.appendChild(chip);
        }
        days.appendChild(cell);
      });
      row.appendChild(days);
      sec.appendChild(row);
    });
    var attr = el("p", "wxdb-attr");
    attr.innerHTML = (lang() === "en" ? "ECMWF IFS · " : "ECMWF IFS · ") + '<a href="https://open-meteo.com/">Weather data by Open-Meteo.com</a>';
    sec.appendChild(attr);
    return sec;
  }

  function renderSources() {
    var sec = el("section", "wxdb-block");
    sec.id = "wxdb-sources";
    sec.appendChild(h2("स्रोत", "Data sources"));
    var list = el("ul", "wxdb-sources");
    var sources = full.sources || {};
    Object.keys(sources).forEach(function (key) {
      var src = sources[key];
      if (!freshSource(src)) return;
      var li = el("li");
      var name = tx(src.name) || key;
      if (src.link) {
        var a = document.createElement("a");
        a.href = src.link;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = name;
        li.appendChild(a);
      } else {
        li.appendChild(document.createTextNode(name));
      }
      var bits = [];
      if (src.issued_at) bits.push((lang() === "en" ? "Issued " : "जारी ") + formatWhen(src.issued_at, true));
      if (src.fetched_at) bits.push((lang() === "en" ? "Fetched " : "झिकिएको ") + formatWhen(src.fetched_at, true));
      var word = src.status === "retained" ? (lang() === "en" ? "Last available" : "पछिल्लो उपलब्ध") : (lang() === "en" ? "Updated" : "अद्यावधिक");
      bits.push(word);
      li.appendChild(el("span", "wxdb-quiet")).textContent = " · " + bits.join(" · ");
      list.appendChild(li);
    });
    sec.appendChild(list);
    sec.appendChild(el("p", "wxdb-copy")).textContent = "DHM data: Department of Hydrology and Meteorology, Government of Nepal.";
    var model = sources.model || {};
    if (freshSource(model)) {
      var lic = el("p", "wxdb-copy");
      lic.innerHTML = 'Open-Meteo CC BY 4.0 · <a href="https://open-meteo.com/">Weather data by Open-Meteo.com</a>';
      sec.appendChild(lic);
    }
    return sec;
  }

  function renderAll() {
    document.querySelectorAll("[data-wxdb-mount]").forEach(function (root) {
      var mode = root.getAttribute("data-wxdb-mode") || "home";
      if (mode === "home") renderHome(root);
      else renderSection(root);
    });
  }

  function boot() {
    var mounts = document.querySelectorAll("[data-wxdb-mount]");
    if (!mounts.length) return;
    var wantsHome = false;
    var wantsFull = false;
    mounts.forEach(function (root) {
      if ((root.getAttribute("data-wxdb-mode") || "home") === "home") wantsHome = true;
      else wantsFull = true;
    });
    var jobs = [];
    function get(url) {
      return fetch(url + "?v=" + encodeURIComponent(VER), { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error(url);
        return r.json();
      });
    }
    if (wantsHome) jobs.push(get("data/weather/now.json").then(function (json) { home = json; }).catch(function () {}));
    if (wantsFull) {
      jobs.push(get("data/weather/current.json").then(function (json) { full = json; }).catch(function () {}));
      jobs.push(get("data/weather-alert.json").then(function (json) {
        geo = json.geo || null;
        provinces = json.provinces || null;
      }).catch(function () {}));
    }
    Promise.all(jobs).then(renderAll);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePop();
  });
  document.addEventListener("pointerdown", function (e) {
    if (!popEl || popEl.hidden) return;
    if (e.target.closest && e.target.closest(".wxdb-pop, .wxdb-city, .wxdb-badge, .wxdb-gauge")) return;
    closePop();
  });
  if (window.__addLangHook) window.__addLangHook(renderAll);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
