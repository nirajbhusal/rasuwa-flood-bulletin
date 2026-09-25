/*! Rasuwa flood bulletin · DoR NAVIGATE road status · driven by data/roads-dor.json */
(function () {
  var mounts = document.querySelectorAll("[data-dor-mount]");
  if (!mounts.length) return;

  var data = null;
  var selectedId = null;
  var mapInstances = [];
  var mapGen = 0;
  var liveState = "idle";
  var VER = window.PAGE_VER || "2026-09-25-dhm-12310";
  var showDistricts = true;
  var police = null;
  var policeFilter = "";
  var policeNowTimer = 0;
  var vehicle = null;
  var vehicleGeo = null;
  var vehicleLevel = "";
  var vehiclePick = "rasuwa";
  var LIVE_MS = 4000;
  var DIGITS = { "0": "०", "1": "१", "2": "२", "3": "३", "4": "४", "5": "५", "6": "६", "7": "७", "8": "८", "9": "९" };

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "ne";
  }
  function tx(node) {
    if (node == null) return "";
    if (typeof node === "string") return node;
    var l = lang();
    if (node[l] != null) return node[l];
    return node.ne || node.en || "";
  }
  function num(n) {
    var s = String(n);
    if (lang() !== "ne") return s;
    return s.replace(/[0-9]/g, function (d) { return DIGITS[d]; });
  }
  var REFRESH_MS = 10 * 60 * 1000;
  function label(key, fb) {
    if (typeof window.t === "function") {
      var s = window.t(key);
      if (s) return s;
    }
    return fb || "";
  }
  function dorStamp() {
    if (!data) return "";
    var n = notice();
    var pub = n && n.published;
    return data.generated_at || (n && n.generated_at) || (pub && (pub.posted_iso || pub.iso)) || (data.as_of && data.as_of.iso) || "";
  }
  function nptClock(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var h = "";
    var m = "";
    try {
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kathmandu",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }).formatToParts(d).forEach(function (p) {
        if (p.type === "hour") h = p.value;
        if (p.type === "minute") m = p.value;
      });
    } catch (e) {}
    if (!h || !m) return "";
    return lang() === "ne" ? num(h + ":" + m) : (h + ":" + m);
  }
  function updatedLabel(iso) {
    var clock = nptClock(iso);
    if (!clock) return "";
    var fb = lang() === "en" ? "Updated {time} NPT" : "अपडेट {time} NPT";
    return label("map_updated", fb).replace("{time}", clock);
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
  function prefersStill() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }
  function markEntered(node) {
    if (!node || node.classList.contains("is-entered") || prefersStill()) return;
    node.classList.add("is-entered");
  }
  function nativeFs() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  function bindFullscreen(host, onRefit) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "map-ctl-btn map-ctl-fs";
    function cssOn() { return host.classList.contains("is-map-fs"); }
    function active() { return nativeFs() === host || cssOn(); }
    function sync() {
      var on = active();
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on
        ? label("map_full_exit", lang() === "en" ? "Exit full screen" : "पूरा स्क्रिन बन्द गर्नुहोस्")
        : label("map_full", lang() === "en" ? "Full screen" : "पूरा स्क्रिन"));
      btn.innerHTML = mapIcon(on ? "compress" : "expand");
    }
    function refit() {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { if (onRefit) onRefit(); });
      });
    }
    function lockPage(on) {
      if (on) document.documentElement.classList.add("map-fs-lock");
      else if (!document.querySelector(".is-map-fs") && !nativeFs()) document.documentElement.classList.remove("map-fs-lock");
    }
    function enterCss() {
      host._fsActive = true;
      host.classList.add("is-map-fs");
      lockPage(true);
      sync();
      refit();
    }
    function exitCss() {
      host.classList.remove("is-map-fs");
      host._fsActive = false;
      lockPage(false);
      sync();
      refit();
    }
    function enter() {
      host._fsActive = true;
      var req = host.requestFullscreen || host.webkitRequestFullscreen;
      var enabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
      if (!req || !enabled) { enterCss(); return; }
      var done;
      try { done = req.call(host); } catch (e) { enterCss(); return; }
      if (done && typeof done.then === "function") done.then(function () { sync(); refit(); }).catch(enterCss);
      else window.setTimeout(function () { if (nativeFs() === host) { sync(); refit(); } else enterCss(); }, 350);
    }
    function exit() {
      var cur = nativeFs();
      if (cur) {
        var ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (ex) { try { ex.call(document); } catch (e2) {} }
      }
      if (cssOn()) exitCss();
      else { sync(); refit(); }
    }
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (active()) exit();
      else enter();
    });
    function onFsEvent() {
      if (!host.isConnected) return;
      var cur = nativeFs();
      if (cur && cur !== host) return;
      // A failed Fullscreen API request must not tear down the CSS fallback.
      if (cssOn() && cur !== host) {
        sync();
        return;
      }
      if (!host._fsActive && cur !== host) return;
      if (!cur) host._fsActive = false;
      lockPage(!!nativeFs() || !!document.querySelector(".is-map-fs"));
      sync();
      refit();
    }
    document.addEventListener("fullscreenchange", onFsEvent);
    document.addEventListener("webkitfullscreenchange", onFsEvent);
    host._exitFs = exit;
    sync();
    return btn;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function roadById(id) {
    var list = (data && data.roads) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function inList(road, name) {
    return road.lists && road.lists.indexOf(name) !== -1;
  }
  function when(field) {
    if (!field) return "";
    return tx(field);
  }
  function telify(parent, text) {
    var re = /(\+?\d[\d\-]{6,}\d)/g;
    var last = 0;
    var m;
    var found = false;
    while ((m = re.exec(text))) {
      found = true;
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement("a");
      a.href = "tel:" + m[1].replace(/[^\d+]/g, "");
      a.textContent = lang() === "ne" ? num(m[1]) : m[1];
      parent.appendChild(a);
      last = m.index + m[1].length;
    }
    if (!found) parent.appendChild(document.createTextNode(text));
    else if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function chips(host) {
    var c = data.counts || {};
    var ui = data.ui;
    var row = el("ul", "dor-chips");
    [["total", c.total, "dor-chip-total"], ["closed", c.closed, "dor-chip-closed"], ["opened", c.opened, "dor-chip-open"], ["partial", c.partial, "dor-chip-part"]].forEach(function (item) {
      var li = el("li", "dor-chip " + item[2]);
      li.appendChild(el("span", "dor-chip-k", tx(ui[item[0]])));
      li.appendChild(el("strong", "dor-chip-n", num(item[1])));
      row.appendChild(li);
    });
    host.appendChild(row);
  }
  function notice() {
    return data && data.dao_notice;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function daoHit(id) {
    var n = notice();
    var hit = null;
    if (!n) return null;
    (n.provinces || []).forEach(function (p) {
      (p.districts || []).forEach(function (d) {
        if (d.id === id) hit = { province: p, district: d };
      });
    });
    return hit;
  }
  function districtPopupHtml(id) {
    var n = notice();
    var hit = daoHit(id);
    if (!n || !hit) return "";
    var closed = tx((data.ui && data.ui.closed) || { ne: "बन्द", en: "Closed" });
    return '<div class="map-pop"><strong class="map-pop-name">' + esc(tx(hit.district)) + '</strong><span class="map-lv map-lv-red">' + esc(closed) + '</span><span class="map-pop-fig">' + esc(tx(hit.province)) + '</span></div>';
  }
  var pendingDistrict = null;
  var daoFilter = "";
  function markDistrictChips(id) {
    document.querySelectorAll(".dor-dao-chip").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-id") === id);
    });
  }
  function setDaoFilter(id) {
    daoFilter = id || "";
    document.querySelectorAll(".dor-dao-tile").forEach(function (b) {
      var on = (b.getAttribute("data-prov") || "") === daoFilter;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll(".dor-dao-prov").forEach(function (el) {
      el.hidden = !!(daoFilter && el.getAttribute("data-prov") !== daoFilter);
    });
    mapInstances.forEach(function (map) {
      if (typeof map._applyDaoFilter === "function") map._applyDaoFilter(daoFilter);
    });
  }
  function focusDistrict(id) {
    pendingDistrict = id;
    markDistrictChips(id);
    if (!showDistricts) {
      showDistricts = true;
      document.querySelectorAll(".dor-dist-toggle").forEach(function (b) {
        b.classList.add("is-on");
        b.setAttribute("aria-pressed", "true");
      });
      mapInstances.forEach(function (m) {
        if (m._districtLayer && !m.hasLayer(m._districtLayer)) m._districtLayer.addTo(m);
      });
    }
    mapInstances.forEach(function (map) {
      var layer = map._daoById && map._daoById[id];
      if (!layer) return;
      try {
        var b = layer.getBounds();
        if (b && b.isValid()) map.fitBounds(b, { padding: [28, 28], maxZoom: 9, animate: true });
      } catch (e) {}
      try { layer.openPopup(); } catch (e2) {}
    });
  }
  function renderDao(board) {
    var n = notice();
    var labels = n.labels || {};
    var shell = el("div", "dor-dao");
    shell.appendChild(el("h2", "dor-title dor-dao-title", lang() === "en" ? "Main highways closed" : "मुख्य सडक बन्द"));
    var counts = n.counts || {};
    var sum = el("div", "dor-dao-sum");
    [["districts", counts.districts], ["provinces", counts.provinces]].forEach(function (item) {
      var stat = el("p", "dor-dao-stat");
      stat.appendChild(el("strong", "dor-dao-num", num(item[1])));
      stat.appendChild(el("span", "dor-dao-lab", tx(labels[item[0]])));
      sum.appendChild(stat);
    });
    shell.appendChild(sum);
    var maxN = 1;
    (n.provinces || []).forEach(function (p) { maxN = Math.max(maxN, (p.districts || []).length); });
    var tiles = el("div", "dor-dao-tiles");
    tiles.setAttribute("role", "group");
    tiles.setAttribute("aria-label", tx(labels.provinces) || (lang() === "en" ? "Provinces" : "प्रदेश"));
    function tile(id, count, label) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "dor-dao-tile" + ((daoFilter || "") === id ? " is-on" : "");
      b.setAttribute("data-prov", id);
      b.setAttribute("aria-pressed", (daoFilter || "") === id ? "true" : "false");
      b.appendChild(el("span", "dor-dao-tile-n", num(count)));
      b.appendChild(el("span", "dor-dao-tile-k", label));
      if (id) {
        var bar = el("i", "dor-dao-bar");
        bar.style.width = Math.max(8, Math.round((count / maxN) * 100)) + "%";
        b.appendChild(bar);
      }
      b.addEventListener("click", function () { setDaoFilter(id); });
      tiles.appendChild(b);
    }
    tile("", counts.districts || 0, lang() === "en" ? "All" : "सबै");
    (n.provinces || []).forEach(function (prov) {
      tile(prov.id, (prov.districts || []).length, tx(prov));
    });
    shell.appendChild(tiles);
    var grid = el("div", "dor-dao-grid");
    var slot = el("div", "dor-dao-mapslot");
    grid.appendChild(slot);
    var side = el("div", "dor-dao-side");
    var groups = el("div", "dor-dao-provs");
    (n.provinces || []).forEach(function (prov) {
      var block = el("section", "dor-dao-prov");
      block.setAttribute("data-prov", prov.id);
      block.hidden = !!(daoFilter && daoFilter !== prov.id);
      var h = el("h3", "dor-dao-prov-h");
      h.appendChild(document.createTextNode(tx(prov)));
      h.appendChild(el("span", "dor-dao-prov-n", " " + num((prov.districts || []).length)));
      block.appendChild(h);
      var ul = el("ul", "dor-dao-chips");
      (prov.districts || []).forEach(function (d) {
        var li = el("li");
        var b = document.createElement("button");
        b.type = "button";
        b.className = "dor-dao-chip" + (pendingDistrict === d.id ? " is-on" : "");
        b.setAttribute("data-id", d.id);
        b.textContent = tx(d);
        b.addEventListener("click", function () { focusDistrict(d.id); });
        li.appendChild(b);
        ul.appendChild(li);
      });
      block.appendChild(ul);
      groups.appendChild(block);
    });
    side.appendChild(groups);
    grid.appendChild(side);
    shell.appendChild(grid);
    var src = el("p", "dor-dao-src");
    if (n.source && n.source.url) {
      var a = document.createElement("a");
      a.href = n.source.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "NDRRMA";
      src.appendChild(a);
      src.appendChild(document.createTextNode(" · " + tx(n.when || n.published)));
    } else {
      src.textContent = tx(labels.credit);
    }
    shell.appendChild(src);
    board.appendChild(shell);
    board._mapSlot = slot;
  }
  function fillRoadDetail(box, road) {
    if (!box) return;
    var ui = data.ui;
    box.replaceChildren();
    if (!road) {
      box.classList.remove("is-open");
      return;
    }
    box.classList.add("is-open");
    var top = el("p", "dor-pri-top");
    top.appendChild(el("span", "dor-pill dor-pill-" + road.status, tx(ui[road.status] || road.status)));
    top.appendChild(el("strong", null, road.ref + (road.link ? " · " + road.link : "")));
    box.appendChild(top);
    box.appendChild(el("p", "dor-pri-name", tx(road.name)));
    box.appendChild(el("p", "dor-pri-why", tx(road.reason)));
    var times = [];
    if (road.closed) times.push(tx(ui.closed_on) + " " + when(road.closed));
    if (road.opened) times.push(tx(ui.opened_on) + " " + when(road.opened));
    if (road.estimate && road.status !== "opened") times.push(tx(ui.estimate) + " " + when(road.estimate));
    if (times.length) box.appendChild(el("p", "dor-pri-meta", times.join(" · ")));
    box.appendChild(el("p", "dor-row-sec", tx(ui.section_h) + ": " + tx(road.section)));
    box.appendChild(el("p", "dor-row-place", tx(ui.place) + ": " + tx(road.place) + " · " + tx(road.district)));
    if (road.contact) {
      var cp = el("p", "dor-row-contact");
      cp.appendChild(document.createTextNode(tx(ui.contact) + ": "));
      telify(cp, road.contact);
      box.appendChild(cp);
    }
    if (!road.point) box.appendChild(el("p", "dor-row-note", tx(ui.no_point)));
    if (road.note) box.appendChild(el("p", "dor-row-note", tx(road.note)));
    if (road.id === data.priority_id) box.appendChild(el("p", "dor-pri-meta", tx(ui.corridor)));
  }
  function selectRoad(id, pan) {
    var road = roadById(id);
    if (!road) return;
    selectedId = id;
    document.querySelectorAll("[data-dor-mount]").forEach(function (root) {
      fillRoadDetail(root.querySelector(".dor-map-detail"), road);
      root.querySelectorAll(".dor-row").forEach(function (li) {
        li.classList.toggle("is-on", li.getAttribute("data-id") === id);
      });
      root.querySelectorAll(".dor-marker").forEach(function (m) {
        m.classList.toggle("is-on", m.getAttribute("data-id") === id);
      });
    });
    openRoadPopup(id);
    if (pan) {
      mapInstances.forEach(function (map) {
        try {
          if (road.point && window.L) map.flyTo([road.point.lat, road.point.lng], Math.max(map.getZoom(), 11), { duration: 0.6 });
        } catch (e) {}
      });
    }
  }
  function statusTone(status) {
    if (status === "closed") return "red";
    if (status === "partial") return "orange";
    return "green";
  }
  function popupHtml(road) {
    var ui = data.ui;
    var status = tx(ui[road.status] || road.status);
    var name = road.ref + (road.link ? " · " + road.link : "");
    var fig = tx(road.section) || tx(road.place) || "";
    return '<div class="map-pop"><strong class="map-pop-name">' + esc(name) + '</strong><span class="map-lv map-lv-' + statusTone(road.status) + '">' + esc(status) + '</span><span class="map-pop-fig">' + esc(fig) + '</span></div>';
  }
  function openRoadPopup(id) {
    mapInstances.forEach(function (map) {
      map.eachLayer(function (layer) {
        if (layer._roadId === id && layer.getPopup && layer.getPopup()) {
          try { layer.openPopup(); } catch (e) {}
        }
      });
    });
  }
  function markerIcon(road) {
    var cls = "dor-marker dor-marker-" + road.status + (road.id === selectedId ? " is-on" : "") + (road.id === data.priority_id ? " is-nh42" : "");
    return window.L.divIcon({
      className: "leaflet-div-icon " + cls,
      html: "<span></span>",
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
  }
  function mountMap(host, mode) {
    var ui = data.ui;
    var tools = el("div", "dor-map-tools");
    var focus = document.createElement("button");
    focus.type = "button";
    focus.className = "dor-focus";
    focus.textContent = tx(ui.focus_nh42);
    focus.addEventListener("click", function () { selectRoad(data.priority_id, true); });
    tools.appendChild(focus);
    var distBtn = document.createElement("button");
    distBtn.type = "button";
    distBtn.className = "dor-dist-toggle" + (showDistricts ? " is-on" : "");
    distBtn.setAttribute("aria-pressed", showDistricts ? "true" : "false");
    distBtn.textContent = tx(ui.districts || { ne: "जिल्ला", en: "Districts" });
    tools.appendChild(distBtn);
    host.appendChild(tools);
    var box = el("div", "dor-map" + (mode === "section" ? " is-tall" : ""));
    if (mode === "section") box.id = "dor-map";
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", tx(ui.map_h));
    host.appendChild(box);
    var legend = el("ul", "dor-map-legend");
    if (notice() && notice().legend) {
      var daoLeg = el("li", "dor-leg dor-leg-dao");
      var daoLab = notice().legend;
      daoLeg.appendChild(el("i"));
      daoLeg.appendChild(document.createTextNode((daoLab.ne || "") + " / " + (daoLab.en || "")));
      legend.appendChild(daoLeg);
    }
    [["closed", "map_closed"], ["partial", "map_partial"], ["opened", "map_opened"]].forEach(function (item) {
      var li = el("li", "dor-leg dor-leg-" + item[0]);
      var lab = ui[item[1]] || {};
      li.appendChild(el("i"));
      li.appendChild(document.createTextNode((lab.ne || "") + " / " + (lab.en || "")));
      legend.appendChild(li);
    });
    host.appendChild(legend);
    var detail = el("div", "dor-map-detail dor-priority");
    detail.setAttribute("role", "region");
    detail.setAttribute("aria-live", "polite");
    host.appendChild(detail);
    fillRoadDetail(detail, roadById(selectedId));
    if (!window.L) {
      box.appendChild(el("p", "dor-map-miss", tx(ui.map_miss)));
      return;
    }
    var token = mapGen;
    var nationalBounds = window.L.latLngBounds([[26.35, 80.05], [30.45, 88.2]]);
    var nepalMax = window.L.latLngBounds([[25.5, 79.2], [31.05, 88.95]]);
    var map = window.L.map(box, {
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
      tap: true,
      zoomControl: false,
      attributionControl: true,
      maxBounds: nepalMax,
      maxBoundsViscosity: 0.85,
      minZoom: 6,
      zoomSnap: 0.25,
      zoomDelta: 0.5
    });
    mapInstances.push(map);
    map._daoById = {};
    map.setView([28.25, 84.12], 7);
    var userMoved = false;
    map.on("dragstart", function () { userMoved = true; });
    map.on("zoomstart", function (ev) {
      if (ev && ev.originalEvent) userMoved = true;
    });
    box.tabIndex = 0;
    function armWheel() { try { map.scrollWheelZoom.enable(); } catch (e) {} }
    function disarmWheel() { try { map.scrollWheelZoom.disable(); } catch (e) {} }
    box.addEventListener("focusin", armWheel);
    box.addEventListener("pointerdown", function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest(".map-ctl")) return;
      armWheel();
    });
    box.addEventListener("focusout", function (ev) {
      if (!box.contains(ev.relatedTarget)) disarmWheel();
    });
    var blankTile = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    var tileErrors = 0;
    var tilesDead = false;
    var tiles = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: "abc",
      maxZoom: 19,
      errorTileUrl: blankTile
    });
    function plainBasemap() {
      if (tilesDead) return;
      tilesDead = true;
      try { map.removeLayer(tiles); } catch (e) {}
      box.classList.add("is-plain");
      if (!box.querySelector(".dor-map-plain")) box.appendChild(el("p", "dor-map-plain", tx(ui.map_plain)));
    }
    tiles.on("tileerror", function () {
      tileErrors += 1;
      if (tileErrors >= 4) plainBasemap();
    });
    tiles.addTo(map);
    var bounds = [];
    var corridorBounds = null;
    var districtBounds = null;
    var districtLayer = null;
    function applyDistricts(on) {
      if (!districtLayer) return;
      if (on) {
        if (!map.hasLayer(districtLayer)) districtLayer.addTo(map);
      } else if (map.hasLayer(districtLayer)) {
        map.removeLayer(districtLayer);
      }
    }
    distBtn.addEventListener("click", function () {
      showDistricts = !showDistricts;
      distBtn.classList.toggle("is-on", showDistricts);
      distBtn.setAttribute("aria-pressed", showDistricts ? "true" : "false");
      document.querySelectorAll(".dor-dist-toggle").forEach(function (b) {
        b.classList.toggle("is-on", showDistricts);
        b.setAttribute("aria-pressed", showDistricts ? "true" : "false");
      });
      mapInstances.forEach(function (m) {
        if (m._districtLayer) {
          if (showDistricts) { if (!m.hasLayer(m._districtLayer)) m._districtLayer.addTo(m); }
          else if (m.hasLayer(m._districtLayer)) m.removeLayer(m._districtLayer);
        }
      });
    });
    fetch("data/nepal-districts.geojson?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("districts"); return r.json(); })
      .then(function (geo) {
        if (token !== mapGen || !window.L) return;
        if (!map.getPane("districts")) {
          map.createPane("districts");
          map.getPane("districts").style.zIndex = 350;
        }
        var closedIds = {};
        var n = notice();
        if (n) {
          (n.provinces || []).forEach(function (p) {
            (p.districts || []).forEach(function (d) { closedIds[d.id] = true; });
          });
        }
        var features = (geo && geo.features) || [];
        var collection = n
          ? { type: "FeatureCollection", features: features.filter(function (f) { return f.properties && closedIds[f.properties.id]; }) }
          : geo;
        map._daoById = {};
        districtLayer = window.L.geoJSON(collection, {
          pane: "districts",
          interactive: true,
          bubblingMouseEvents: true,
          style: function () {
            if (n) return { color: "#d7191c", weight: 1.25, opacity: 0.95, fillColor: "#d7191c", fillOpacity: 0.42, className: "dor-dao-shape" };
            return { color: "#1b7f3a", weight: 1, opacity: 0.45, fillColor: "#1b7f3a", fillOpacity: 0.04, className: "dor-dist-shape" };
          },
          onEachFeature: function (feat, layer) {
            var props = (feat && feat.properties) || {};
            layer._provId = "";
            if (n) {
              (n.provinces || []).forEach(function (p) {
                (p.districts || []).forEach(function (d) {
                  if (d.id === props.id) layer._provId = p.id;
                });
              });
            }
            if (n && closedIds[props.id]) {
              layer.bindPopup(districtPopupHtml(props.id), {
                closeButton: true,
                autoPan: true,
                autoClose: true,
                maxWidth: 280,
                className: "dor-dao-pop map-card-pop"
              });
              map._daoById[props.id] = layer;
            } else if (!n) {
              var name = lang() === "en" ? (props.en || "") : (props.ne || props.en || "");
              layer.bindPopup(esc(name), { closeButton: true, autoPan: true, autoClose: true });
            }
            layer.on("mouseover", function () {
              layer.setStyle({ weight: 2.8, color: "#0c2340" });
            });
            layer.on("mouseout", function () {
              if (districtLayer && districtLayer.resetStyle) districtLayer.resetStyle(layer);
            });
            layer.on("click", function (ev) {
              if (layer._provId && daoFilter && daoFilter !== layer._provId) setDaoFilter(layer._provId);
              focusDistrict(props.id);
              if (ev && ev.originalEvent) window.L.DomEvent.stopPropagation(ev);
            });
          }
        });
        map._districtLayer = districtLayer;
        map._applyDaoFilter = function (provId) {
          var bounds = null;
          Object.keys(map._daoById || {}).forEach(function (id) {
            var layer = map._daoById[id];
            var on = !provId || layer._provId === provId;
            var hot = pendingDistrict && pendingDistrict === id && on;
            layer.setStyle({
              color: hot ? "#0c2340" : "#d7191c",
              weight: hot ? 2.6 : 1.25,
              opacity: on ? 0.95 : 0.28,
              fillColor: "#d7191c",
              fillOpacity: on ? (hot ? 0.72 : 0.5) : 0.05
            });
            if (on && provId) {
              try {
                var b = layer.getBounds();
                if (b && b.isValid()) bounds = bounds ? bounds.extend(b) : b;
              } catch (err) {}
            }
          });
          userMoved = !!provId;
          lastFrame = "";
          try { map.invalidateSize(false); } catch (err2) {}
          if (provId && bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [22, 22], maxZoom: 8, animate: true });
          else if (!provId) kickFrame();
        };
        applyDistricts(showDistricts);
        if (daoFilter && map._applyDaoFilter) map._applyDaoFilter(daoFilter);
        try {
          var db = districtLayer.getBounds();
          if (db && db.isValid()) districtBounds = db;
        } catch (e) {}
        kickFrame();
        if (pendingDistrict) focusDistrict(pendingDistrict);
      })
      .catch(function () {});
    var lastFrame = "";
    function frame(target) {
      if (token !== mapGen) return;
      var rect = box.getBoundingClientRect();
      if (rect.width < 48 || rect.height < 48) return;
      try { map.invalidateSize(false); } catch (e) {}
      if (userMoved) {
        if (selectedId) openRoadPopup(selectedId);
        return;
      }
      var b = target;
      if (notice()) b = nationalBounds;
      if (!b) b = corridorBounds || nationalBounds;
      if (!(b && b.isValid && b.isValid())) return;
      var tag = notice() ? "nepal" : (corridorBounds ? "corridor" : "nepal");
      var key = Math.round(rect.width) + "x" + Math.round(rect.height) + ":" + tag;
      if (key !== lastFrame) {
        map.fitBounds(b, { padding: [16, 16], maxZoom: 10, animate: false });
        lastFrame = key;
      }
      if (selectedId) openRoadPopup(selectedId);
    }
    function kickFrame() {
      frame(notice() ? nationalBounds : corridorBounds);
    }
    var frameClean = [];
    function listenFrame(targetNode, type, fn) {
      targetNode.addEventListener(type, fn);
      frameClean.push(function () { targetNode.removeEventListener(type, fn); });
    }
    listenFrame(window, "resize", kickFrame);
    listenFrame(window, "orientationchange", kickFrame);
    if (typeof ResizeObserver === "function") {
      var frameRo = new ResizeObserver(function () { kickFrame(); });
      frameRo.observe(box);
      frameClean.push(function () { frameRo.disconnect(); });
    }
    if (typeof IntersectionObserver === "function") {
      var frameIo = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) kickFrame();
        }
      }, { threshold: [0.05, 0.4] });
      frameIo.observe(box);
      frameClean.push(function () { frameIo.disconnect(); });
    }
    map._unframe = function () {
      frameClean.forEach(function (fn) { try { fn(); } catch (e) {} });
    };
    window.requestAnimationFrame(kickFrame);
    window.setTimeout(kickFrame, 80);
    window.setTimeout(kickFrame, 400);
    map._fitNepal = function () {
      userMoved = false;
      lastFrame = "";
      try { map.invalidateSize(false); } catch (e) {}
      kickFrame();
    };
    if (window.L.control) {
      var chrome = window.L.control({ position: "topright" });
      chrome.onAdd = function () {
        var bar = window.L.DomUtil.create("div", "map-ctl");
        function zbtn(key, fb, icon, delta) {
          var b = window.L.DomUtil.create("button", "map-ctl-btn", bar);
          b.type = "button";
          b.setAttribute("aria-label", label(key, fb));
          b.innerHTML = mapIcon(icon);
          window.L.DomEvent.on(b, "click", function (ev) {
            window.L.DomEvent.stop(ev);
            userMoved = true;
            map.setZoom(map.getZoom() + delta);
          });
        }
        zbtn("map_zoom_in", lang() === "en" ? "Zoom in" : "ठूलो पार्नुहोस्", "plus", 1);
        zbtn("map_zoom_out", lang() === "en" ? "Zoom out" : "सानो पार्नुहोस्", "minus", -1);
        bar.appendChild(bindFullscreen(box, function () {
          if (map._fitNepal) map._fitNepal();
        }));
        window.L.DomEvent.disableClickPropagation(bar);
        window.L.DomEvent.disableScrollPropagation(bar);
        return bar;
      };
      chrome.addTo(map);
      var liveCtl = window.L.control({ position: "topleft" });
      liveCtl.onAdd = function () {
        var chip = window.L.DomUtil.create("div", "map-live");
        chip.innerHTML = '<i class="map-live-dot" aria-hidden="true"></i><span class="map-live-t"></span>';
        var stamp = chip.querySelector(".map-live-t");
        if (stamp) stamp.textContent = updatedLabel(dorStamp());
        window.L.DomEvent.disableClickPropagation(chip);
        return chip;
      };
      liveCtl.addTo(map);
    }
    markEntered(box);
    function addMarker(road) {
      if (!road.point) return;
      var ll = [road.point.lat, road.point.lng];
      bounds.push(ll);
      var marker = window.L.marker(ll, {
        icon: markerIcon(road),
        keyboard: true,
        alt: road.ref + " " + tx(road.section),
        zIndexOffset: road.id === data.priority_id ? 400 : 0
      });
      marker._roadId = road.id;
      marker.bindPopup(popupHtml(road), { closeButton: true, autoPan: true, maxWidth: 280, className: "map-card-pop" });
      marker.on("mouseover", function () {
        var node = marker.getElement();
        if (node) node.classList.add("is-hot");
      });
      marker.on("mouseout", function () {
        var node = marker.getElement();
        if (node) node.classList.remove("is-hot");
      });
      marker.on("click", function () { selectRoad(road.id, false); });
      marker.on("add", function () {
        var node = marker.getElement();
        if (!node) return;
        node.setAttribute("data-id", road.id);
      });
      marker.addTo(map);
    }
    (data.roads || []).forEach(addMarker);
    var corridor = (data.map && data.map.corridor) || "data/nh42-corridor.geojson";
    var corridorOpts = { cache: "no-store" };
    var corridorSignal = liveSignal();
    if (corridorSignal) corridorOpts.signal = corridorSignal;
    fetch(corridor + "?t=" + Date.now(), corridorOpts)
      .then(function (r) { if (!r.ok) throw new Error("nh42"); return r.json(); })
      .then(function (geo) {
        if (token !== mapGen) return;
        var layer = window.L.geoJSON(geo, {
          style: function (feat) {
            var closed = feat && feat.properties && feat.properties.closed_section;
            return closed
              ? { color: "#d7191c", weight: 6, opacity: 0.95 }
              : { color: "#1b7f3a", weight: 4, opacity: 0.9 };
          },
          onEachFeature: function (feat, layer) {
            layer.on("click", function () { selectRoad(data.priority_id, false); });
          }
        }).addTo(map);
        try {
          var b = layer.getBounds();
          if (b && b.isValid()) corridorBounds = b.pad(0.45);
        } catch (e) {}
        try { layer.bringToFront(); } catch (e2) {}
        kickFrame();
        window.setTimeout(kickFrame, 120);
      })
      .catch(function () {
        if (token !== mapGen) return;
        kickFrame();
      });
  }
  function links(host, withSection) {
    var ui = data.ui;
    var p = el("p", "dor-links");
    if (withSection) {
      var more = document.createElement("a");
      more.href = data.source.section;
      more.textContent = tx(ui.more);
      p.appendChild(more);
      p.appendChild(document.createTextNode(" · "));
    }
    p.appendChild(document.createTextNode(tx(ui.sources_label) + ": "));
    var n = notice();
    if (n && n.source && n.source.url) {
      var post = document.createElement("a");
      post.href = n.source.url;
      post.target = "_blank";
      post.rel = "noopener";
      post.textContent = tx((n.labels && n.labels.x) || { ne: "NDRRMA", en: "NDRRMA" });
      p.appendChild(post);
      p.appendChild(document.createTextNode(" · "));
    }
    var ext = document.createElement("a");
    ext.href = data.source.url;
    ext.target = "_blank";
    ext.rel = "noopener";
    ext.textContent = tx(ui.dor);
    p.appendChild(ext);
    host.appendChild(p);
  }
  function row(road) {
    var ui = data.ui;
    var li = el("li", "dor-row dor-row-" + road.status + (road.id === selectedId ? " is-on" : ""));
    li.setAttribute("data-id", road.id);
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.addEventListener("click", function () { selectRoad(road.id, true); });
    li.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRoad(road.id, true); }
    });
    var head = el("p", "dor-row-h");
    head.appendChild(el("span", "dor-pill dor-pill-" + road.status, tx(ui[road.status] || road.status)));
    head.appendChild(el("strong", null, road.ref + (road.link ? " · " + road.link : "")));
    li.appendChild(head);
    li.appendChild(el("p", "dor-row-name", tx(road.name)));
    li.appendChild(el("p", "dor-row-sec", tx(ui.section_h) + ": " + tx(road.section)));
    li.appendChild(el("p", "dor-row-why", tx(road.reason)));
    var times = [];
    if (road.closed) times.push(tx(ui.closed_on) + " " + when(road.closed));
    if (road.opened) times.push(tx(ui.opened_on) + " " + when(road.opened));
    if (road.estimate && road.status !== "opened") times.push(tx(ui.estimate) + " " + when(road.estimate));
    if (times.length) li.appendChild(el("p", "dor-row-time", times.join(" · ")));
    var place = el("p", "dor-row-place", tx(ui.place) + ": " + tx(road.place) + " · " + tx(road.district));
    li.appendChild(place);
    if (road.contact) {
      var cp = el("p", "dor-row-contact");
      cp.appendChild(document.createTextNode(tx(ui.contact) + ": "));
      telify(cp, road.contact);
      li.appendChild(cp);
    }
    if (road.note) li.appendChild(el("p", "dor-row-note", tx(road.note)));
    return li;
  }
  function group(host, key, heading) {
    var items = (data.roads || []).filter(function (r) { return inList(r, key); });
    if (!items.length) return;
    host.appendChild(el("h3", "dor-gh", tx(heading)));
    var ul = el("ul", "dor-list");
    items.forEach(function (r) { ul.appendChild(row(r)); });
    host.appendChild(ul);
  }
  var leafletLoading = false;
  var leafletQueue = [];
  function ensureLeafletCss() {
    if (document.querySelector('link[href*="leaflet.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = ["vendor/leaflet/leaflet.css?v", encodeURIComponent(VER)].join("=");
    document.head.appendChild(link);
  }
  function ensureLeaflet(cb) {
    ensureLeafletCss();
    if (window.L) { cb(); return; }
    leafletQueue.push(cb);
    if (leafletLoading) return;
    leafletLoading = true;
    var s = document.createElement("script");
    s.src = ["vendor/leaflet/leaflet.js?v", encodeURIComponent(VER)].join("=");
    s.async = true;
    function flush() {
      var q = leafletQueue.splice(0);
      leafletLoading = false;
      q.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    s.onload = flush;
    s.onerror = flush;
    document.head.appendChild(s);
  }
  function scheduleDorMap(board, mode) {
    var host = el("div", "dor-map-host");
    if (board._mapSlot) board._mapSlot.appendChild(host);
    else board.appendChild(host);
    function start() {
      if (!host.isConnected || host._mounted) return;
      host._mounted = true;
      ensureLeaflet(function () {
        if (!host.isConnected) return;
        mountMap(host, mode);
      });
    }
    if (typeof IntersectionObserver !== "function") {
      afterPaint(start);
      return;
    }
    var hash = "";
    try { hash = location.hash || ""; } catch (e) {}
    if (hash === "#roads" || hash === "#dor-home" || hash === "#dor-map") {
      afterPaint(start);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        io.disconnect();
        start();
        return;
      }
    }, { rootMargin: "480px 0px", threshold: 0.01 });
    io.observe(host);
  }
  function liveNote() {
    if (!data.live || data.live.same) return null;
    var liveKey = data.live.failed ? "live_fail" : "live_diff";
    return el("p", "dor-live", tx(data.ui[liveKey]));
  }
  var PR_TONE = { full_block: "#c41e3a", night_ban: "#312e81", one_way: "#d97706", restricted: "#ca8a04" };
  var PR_RANK = { full_block: 4, night_ban: 3, restricted: 2, one_way: 1 };
  function prShort(type) {
    var map = {
      full_block: { ne: "पूर्ण अवरोध", en: "Full block" },
      night_ban: { ne: "रात्रिकालीन रोक", en: "Night ban" },
      one_way: { ne: "एकतर्फी", en: "One way" },
      restricted: { ne: "सीमित", en: "Restricted" }
    };
    return tx(map[type] || { ne: type, en: type });
  }
  function prNowWord(state) {
    var map = {
      closed: { ne: "अहिले बन्द", en: "Closed now" },
      open: { ne: "अहिले खुला", en: "Open now" },
      one_way: { ne: "अहिले एकतर्फी", en: "One way now" },
      restricted: { ne: "अहिले सीमित", en: "Restricted now" }
    };
    return state && map[state] ? tx(map[state]) : "";
  }
  function prMinutes(hhmm) {
    var m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  function nptParts(date) {
    var d = date || new Date();
    var bag = { year: "", month: "", day: "", hour: "", minute: "" };
    try {
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kathmandu",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      }).formatToParts(d).forEach(function (p) {
        if (bag[p.type] != null) bag[p.type] = p.value;
      });
    } catch (e) {}
    var minutes = (parseInt(bag.hour, 10) || 0) * 60 + (parseInt(bag.minute, 10) || 0);
    return { minutes: minutes, iso: d.toISOString() };
  }
  function prInWindow(row, minutes) {
    var s = prMinutes(row.night_start);
    var e = prMinutes(row.night_end);
    if (s == null || e == null) return false;
    if (s === e) return false;
    if (s < e) return minutes >= s && minutes < e;
    return minutes >= s || minutes < e;
  }
  function prExpired(row, now) {
    if (!row.valid_until_iso) return false;
    var end = new Date(row.valid_until_iso);
    if (isNaN(end.getTime())) return false;
    return now.getTime() > end.getTime();
  }
  function prState(row, now) {
    now = now || new Date();
    if (prExpired(row, now)) return "";
    if (row.closed_iso) {
      var start = new Date(row.closed_iso);
      if (!isNaN(start.getTime()) && now.getTime() < start.getTime()) return "";
    }
    if (row.status_type === "full_block") return "closed";
    if (row.status_type === "one_way") return "one_way";
    if (row.status_type === "restricted") return "restricted";
    if (row.status_type === "night_ban") {
      var parts = nptParts(now);
      return prInWindow(row, parts.minutes) ? "closed" : "open";
    }
    return "";
  }
  function prCauseIcon(kind) {
    var paths = {
      flood: '<path d="M4 14c1.5-2 2.2-2 3.5 0s2 2 3.5 0 2-2 3.5 0 2 2 3.5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 18c1.5-2 2.2-2 3.5 0s2 2 3.5 0 2-2 3.5 0 2 2 3.5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      landslide: '<path d="M3 18h18L14 8l-3.2 4.2L8 10z" fill="currentColor"/><path d="M16 6.2 17.4 4l1.6 2.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      rain: '<path d="M7 15c0-2.5 2-4 5-4s5 1.5 5 4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 17.5v2.2M12 17.5v2.2M15 17.5v2.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      risk: '<path d="M12 4.2 20 19H4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 10v4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="16.4" r=".8" fill="currentColor"/>',
      flood_landslide: '<path d="M3 16.5h10L9.2 9.5 7 12.2 5.2 10.6z" fill="currentColor"/><path d="M13 15.5c1.2-1.6 1.8-1.6 3 0s1.6 1.6 3 0 1.6-1.6 3 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
    };
    var d = paths[kind] || paths.risk;
    return '<svg class="pr-cause-ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' + d + '</svg>';
  }
  function prMoon() {
    return '<svg class="pr-moon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M15.2 3.2a8.2 8.2 0 1 0 5.6 12.6A7 7 0 0 1 15.2 3.2z"/></svg>';
  }
  function prRow(id) {
    var list = (police && police.rows) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function prRowsFor(districtId) {
    return ((police && police.rows) || []).filter(function (r) { return r.district && r.district.id === districtId; });
  }
  function prWorst(list) {
    var best = list[0];
    list.forEach(function (r) {
      if ((PR_RANK[r.status_type] || 0) > (PR_RANK[best.status_type] || 0)) best = r;
    });
    return best;
  }
  function prGroupOn(groupId) {
    return !policeFilter || policeFilter === groupId;
  }
  function paintPoliceNow(scope) {
    var roots = scope ? [scope] : Array.prototype.slice.call(document.querySelectorAll(".pr-board"));
    roots.forEach(function (root) {
      root.querySelectorAll("[data-pr-now]").forEach(function (node) {
        var row = prRow(node.getAttribute("data-pr-now"));
        if (!row) return;
        var state = prState(row);
        node.className = "pr-now" + (state ? " is-" + state : "");
        node.textContent = prNowWord(state);
        node.hidden = !state;
      });
    });
  }
  function prHourBar(row) {
    if (row.status_type !== "night_ban") return null;
    var s = prMinutes(row.night_start);
    var e = prMinutes(row.night_end);
    if (s == null || e == null) return null;
    var bar = el("div", "pr-hours");
    bar.setAttribute("aria-hidden", "true");
    function seg(left, width) {
      var i = document.createElement("i");
      i.style.left = left + "%";
      i.style.width = Math.max(0, width) + "%";
      bar.appendChild(i);
    }
    var sp = (s / 1440) * 100;
    var ep = (e / 1440) * 100;
    if (s < e) seg(sp, ep - sp);
    else { seg(sp, 100 - sp); seg(0, ep); }
    return bar;
  }
  function prCard(row, extra) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "pr-card pr-st-" + row.status_type + (row.prominent ? " is-rasuwa" : "") + (extra || "");
    b.setAttribute("data-pr-id", row.id);
    b.setAttribute("data-district", row.district.id);
    var top = el("span", "pr-card-top");
    var hwy = el("strong", "pr-hwy", lang() === "en" ? row.highway_en : row.highway_ne);
    top.appendChild(hwy);
    var badge = el("span", "pr-badge pr-badge-" + row.status_type, prShort(row.status_type));
    if (row.status_type === "night_ban") badge.insertAdjacentHTML("afterbegin", prMoon());
    top.appendChild(badge);
    b.appendChild(top);
    var now = el("span", "pr-now");
    now.setAttribute("data-pr-now", row.id);
    b.appendChild(now);
    var place = el("span", "pr-loc");
    var dname = lang() === "en" ? row.district.en : row.district.ne;
    var loc = lang() === "en" ? row.location_en : row.location_ne;
    place.textContent = dname + " · " + loc;
    b.appendChild(place);
    var cause = el("span", "pr-cause");
    cause.insertAdjacentHTML("beforeend", prCauseIcon(row.cause_kind));
    cause.appendChild(document.createTextNode(lang() === "en" ? row.cause_en : row.cause_ne));
    b.appendChild(cause);
    var since = el("span", "pr-since");
    var when = (row.closed_date || "") + (row.closed_time ? " " + row.closed_time : "");
    since.textContent = lang() === "en" ? ("Since " + when) : (when + " देखि");
    b.appendChild(since);
    var until = row[lang() === "en" ? "valid_until_en" : "valid_until_ne"];
    if (until) b.appendChild(el("span", "pr-until", until));
    var hours = prHourBar(row);
    if (hours) b.appendChild(hours);
    b.addEventListener("click", function () { focusPolice(row.district.id, row.id); });
    return b;
  }
  function prPopupHtml(rows) {
    var bits = rows.map(function (r) {
      var name = lang() === "en" ? r.highway_en : r.highway_ne;
      var place = lang() === "en" ? r.location_en : r.location_ne;
      return '<div class="map-pop pr-pop"><strong class="map-pop-name">' + esc(name) + '</strong><span class="map-lv pr-lv-' + r.status_type + '">' + esc(prShort(r.status_type)) + '</span><span class="map-pop-fig">' + esc(place) + '</span></div>';
    });
    return bits.join("");
  }
  function focusPolice(districtId, rowId) {
    mapInstances.forEach(function (map) {
      if (!map._prById) return;
      var layer = map._prById[districtId];
      if (layer) {
        try {
          var b = layer.getBounds();
          if (b && b.isValid()) map.fitBounds(b, { padding: [28, 28], maxZoom: 9, animate: true });
        } catch (e) {}
        try { layer.openPopup(); } catch (e2) {}
      }
      (map._prMarkers || []).forEach(function (m) {
        if (rowId && m._rowId === rowId) {
          try { m.openPopup(); } catch (e3) {}
        }
      });
    });
    document.querySelectorAll(".pr-card").forEach(function (c) {
      c.classList.toggle("is-on", c.getAttribute("data-pr-id") === rowId);
    });
  }
  function setPoliceFilter(id) {
    policeFilter = id || "";
    document.querySelectorAll(".pr-tile").forEach(function (b) {
      var on = (b.getAttribute("data-group") || "") === policeFilter;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll(".pr-group").forEach(function (g) {
      g.hidden = !prGroupOn(g.getAttribute("data-group"));
    });
    document.querySelectorAll(".pr-pin").forEach(function (pin) {
      var row = prRow(pin.getAttribute("data-pr-id"));
      pin.hidden = !(row && prGroupOn(row.group));
    });
    mapInstances.forEach(function (map) {
      if (typeof map._applyPoliceFilter === "function") map._applyPoliceFilter(policeFilter);
    });
  }
  function renderPolice(board, mode) {
    var shell = el("section", "pr-board");
    shell.id = mode === "home" ? "pr-home" : "pr-roads";
    var kick = el("p", "pr-kicker");
    kick.textContent = lang() === "en" ? "Nepal Police" : "नेपाल प्रहरी";
    shell.appendChild(kick);
    shell.appendChild(el("h2", "pr-title", lang() === "en" ? police.title.en : police.title.ne));
    shell.appendChild(el("p", "pr-asof", lang() === "en" ? police.as_of.en : police.as_of.ne));
    var counts = police.counts || {};
    var sum = el("ul", "pr-sum");
    [
      ["total", { ne: "अवरोध", en: "Obstructions" }, "pr-sum-all"],
      ["full_block", { ne: "पूर्ण अवरोध", en: "Full blocks" }, "pr-sum-full"],
      ["night_ban", { ne: "रात्रिकालीन", en: "Night bans" }, "pr-sum-night"],
      ["one_way", { ne: "एकतर्फी", en: "One way" }, "pr-sum-one"],
      ["restricted", { ne: "सीमित", en: "Restricted" }, "pr-sum-rest"],
      ["districts", { ne: "जिल्ला", en: "Districts" }, "pr-sum-dist"],
      ["provinces", { ne: "प्रदेश", en: "Provinces" }, "pr-sum-prov"]
    ].forEach(function (item) {
      var li = el("li", "pr-stat " + item[2]);
      li.appendChild(el("strong", "pr-stat-n", num(counts[item[0]] || 0)));
      li.appendChild(el("span", "pr-stat-k", tx(item[1])));
      sum.appendChild(li);
    });
    shell.appendChild(sum);
    var pinHost = el("div", "pr-pin");
    var ras = prRow("rasuwa-highways");
    if (ras) {
      pinHost.appendChild(prCard(ras, ""));
      pinHost.setAttribute("data-pr-id", ras.id);
      pinHost.id = "pr-rasuwa";
      pinHost.hidden = !prGroupOn(ras.group);
    }
    shell.appendChild(pinHost);
    var legend = el("ul", "pr-legend");
    [
      ["full_block", false],
      ["night_ban", true],
      ["one_way", false],
      ["restricted", false]
    ].forEach(function (item) {
      var li = el("li", "pr-leg pr-leg-" + item[0]);
      var sw = el("i");
      if (item[1]) sw.insertAdjacentHTML("beforeend", prMoon());
      li.appendChild(sw);
      li.appendChild(document.createTextNode(prShort(item[0])));
      legend.appendChild(li);
    });
    shell.appendChild(legend);
    var tiles = el("div", "pr-tiles");
    tiles.setAttribute("role", "group");
    tiles.setAttribute("aria-label", lang() === "en" ? "Provinces" : "प्रदेश");
    function tile(id, count, label) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pr-tile" + (policeFilter === id ? " is-on" : "");
      b.setAttribute("data-group", id);
      b.setAttribute("aria-pressed", policeFilter === id ? "true" : "false");
      b.appendChild(el("span", "pr-tile-n", num(count)));
      b.appendChild(el("span", "pr-tile-k", label));
      b.addEventListener("click", function () { setPoliceFilter(id); });
      tiles.appendChild(b);
    }
    tile("", counts.total || 0, lang() === "en" ? "All" : "सबै");
    (police.groups || []).forEach(function (g) {
      var n = (police.rows || []).filter(function (r) { return r.group === g.id; }).length;
      tile(g.id, n, lang() === "en" ? g.en : g.ne);
    });
    shell.appendChild(tiles);
    var grid = el("div", "pr-grid");
    var slot = el("div", "pr-mapslot");
    grid.appendChild(slot);
    var side = el("div", "pr-side");
    (police.groups || []).forEach(function (g) {
      var block = el("section", "pr-group");
      block.setAttribute("data-group", g.id);
      block.hidden = !prGroupOn(g.id);
      var items = (police.rows || []).filter(function (r) { return r.group === g.id; });
      var h = el("h3", "pr-gh");
      h.appendChild(document.createTextNode(lang() === "en" ? g.en : g.ne));
      h.appendChild(el("span", "pr-gn", " " + num(items.length)));
      block.appendChild(h);
      items.forEach(function (r) { block.appendChild(prCard(r)); });
      side.appendChild(block);
    });
    grid.appendChild(side);
    shell.appendChild(grid);
    var src = el("p", "pr-src");
    if (police.source && police.source.url) {
      var a = document.createElement("a");
      a.href = police.source.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = lang() === "en" ? police.source.name.en : police.source.name.ne;
      src.appendChild(a);
    }
    shell.appendChild(src);
    board.appendChild(shell);
    board._policeSlot = slot;
    paintPoliceNow(shell);
    if (!policeNowTimer) policeNowTimer = window.setInterval(paintPoliceNow, 30000);
  }
  function schedulePoliceMap(board, mode) {
    var host = el("div", "pr-map-host");
    if (board._policeSlot) board._policeSlot.appendChild(host);
    else return;
    function start() {
      if (!host.isConnected || host._mounted) return;
      host._mounted = true;
      ensureLeaflet(function () {
        if (!host.isConnected || !window.L) return;
        mountPoliceMap(host, mode);
      });
    }
    if (typeof IntersectionObserver !== "function") { afterPaint(start); return; }
    var hash = "";
    try { hash = location.hash || ""; } catch (e) {}
    if (hash === "#roads" || hash === "#pr-home" || hash === "#pr-roads" || hash === "#pr-rasuwa") {
      afterPaint(start);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        io.disconnect();
        start();
        return;
      }
    }, { rootMargin: "480px 0px", threshold: 0.01 });
    io.observe(host);
  }
  function mountPoliceMap(host, mode) {
    var box = el("div", "dor-map pr-map" + (mode === "section" ? " is-tall" : ""));
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", lang() === "en" ? police.title.en : police.title.ne);
    host.appendChild(box);
    var token = mapGen;
    var nationalBounds = window.L.latLngBounds([[26.35, 80.05], [30.45, 88.2]]);
    var nepalMax = window.L.latLngBounds([[25.5, 79.2], [31.05, 88.95]]);
    var map = window.L.map(box, {
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
      tap: true,
      zoomControl: false,
      attributionControl: true,
      maxBounds: nepalMax,
      maxBoundsViscosity: 0.85,
      minZoom: 6,
      zoomSnap: 0.25,
      zoomDelta: 0.5
    });
    mapInstances.push(map);
    map._prById = {};
    map._prMarkers = [];
    map.setView([28.25, 84.12], 7);
    var userMoved = false;
    map.on("dragstart", function () { userMoved = true; });
    map.on("zoomstart", function (ev) { if (ev && ev.originalEvent) userMoved = true; });
    box.tabIndex = 0;
    function armWheel() { try { map.scrollWheelZoom.enable(); } catch (e) {} }
    function disarmWheel() { try { map.scrollWheelZoom.disable(); } catch (e) {} }
    box.addEventListener("focusin", armWheel);
    box.addEventListener("pointerdown", function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest(".map-ctl")) return;
      armWheel();
    });
    box.addEventListener("focusout", function (ev) {
      if (!box.contains(ev.relatedTarget)) disarmWheel();
    });
    var blankTile = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    var tileErrors = 0;
    var tiles = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: "abc",
      maxZoom: 19,
      errorTileUrl: blankTile
    });
    tiles.on("tileerror", function () {
      tileErrors += 1;
      if (tileErrors >= 4) {
        try { map.removeLayer(tiles); } catch (e) {}
        box.classList.add("is-plain");
      }
    });
    tiles.addTo(map);
    if (window.L.control) {
      var chrome = window.L.control({ position: "topright" });
      chrome.onAdd = function () {
        var bar = window.L.DomUtil.create("div", "map-ctl");
        function zbtn(key, fb, icon, delta) {
          var b = window.L.DomUtil.create("button", "map-ctl-btn", bar);
          b.type = "button";
          b.setAttribute("aria-label", label(key, fb));
          b.innerHTML = mapIcon(icon);
          window.L.DomEvent.on(b, "click", function (ev) {
            window.L.DomEvent.stop(ev);
            userMoved = true;
            map.setZoom(map.getZoom() + delta);
          });
        }
        zbtn("map_zoom_in", lang() === "en" ? "Zoom in" : "ठूलो पार्नुहोस्", "plus", 1);
        zbtn("map_zoom_out", lang() === "en" ? "Zoom out" : "सानो पार्नुहोस्", "minus", -1);
        bar.appendChild(bindFullscreen(box, function () {
          userMoved = false;
          if (map._applyPoliceFilter) map._applyPoliceFilter(policeFilter);
        }));
        window.L.DomEvent.disableClickPropagation(bar);
        window.L.DomEvent.disableScrollPropagation(bar);
        return bar;
      };
      chrome.addTo(map);
    }
    function tone(type) { return PR_TONE[type] || "#c41e3a"; }
    function addPoint(row) {
      if (!row.point || !row.point.certain) return;
      var marker = window.L.marker([row.point.lat, row.point.lng], {
        icon: window.L.divIcon({
          className: "leaflet-div-icon pr-dot pr-dot-" + row.status_type + (row.prominent ? " is-rasuwa" : ""),
          html: "<span></span>",
          iconSize: row.prominent ? [18, 18] : [14, 14],
          iconAnchor: row.prominent ? [9, 9] : [7, 7]
        }),
        keyboard: true,
        zIndexOffset: row.prominent ? 500 : 200
      });
      marker._rowId = row.id;
      marker._group = row.group;
      marker._district = row.district.id;
      marker.bindPopup(prPopupHtml([row]), { closeButton: true, autoPan: true, maxWidth: 280, className: "map-card-pop" });
      marker.on("click", function () {
        document.querySelectorAll(".pr-card").forEach(function (c) {
          c.classList.toggle("is-on", c.getAttribute("data-pr-id") === row.id);
        });
      });
      marker.addTo(map);
      map._prMarkers.push(marker);
    }
    (police.rows || []).forEach(addPoint);
    var lastFrame = "";
    function fitNational() {
      if (token !== mapGen || userMoved) return;
      var rect = box.getBoundingClientRect();
      if (rect.width < 48 || rect.height < 48) return;
      try { map.invalidateSize(false); } catch (e) {}
      var key = Math.round(rect.width) + "x" + Math.round(rect.height);
      if (key === lastFrame) return;
      map.fitBounds(nationalBounds, { padding: [16, 16], maxZoom: 10, animate: false });
      lastFrame = key;
    }
    map._applyPoliceFilter = function (gid) {
      var bounds = null;
      Object.keys(map._prById || {}).forEach(function (id) {
        var layer = map._prById[id];
        var on = !gid || layer._group === gid;
        var worst = layer._worst;
        var color = tone(worst);
        layer.setStyle({
          color: color,
          weight: on ? 1.4 : 1,
          opacity: on ? 0.95 : 0.25,
          fillColor: color,
          fillOpacity: on ? 0.5 : 0.06
        });
        if (on && gid) {
          try {
            var b = layer.getBounds();
            if (b && b.isValid()) bounds = bounds ? bounds.extend(b) : b;
          } catch (err) {}
        }
      });
      (map._prMarkers || []).forEach(function (m) {
        var on = !gid || m._group === gid;
        if (on && !map.hasLayer(m)) m.addTo(map);
        if (!on && map.hasLayer(m)) map.removeLayer(m);
      });
      try { map.invalidateSize(false); } catch (e2) {}
      if (gid && bounds && bounds.isValid()) {
        userMoved = true;
        map.fitBounds(bounds, { padding: [22, 22], maxZoom: 8, animate: true });
      } else if (!gid) {
        userMoved = false;
        lastFrame = "";
        fitNational();
      }
    };
    fetch("data/nepal-districts.geojson?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("districts"); return r.json(); })
      .then(function (geo) {
        if (token !== mapGen || !window.L) return;
        var byId = {};
        (police.rows || []).forEach(function (r) {
          var id = r.district.id;
          if (!byId[id]) byId[id] = [];
          byId[id].push(r);
        });
        var features = ((geo && geo.features) || []).filter(function (f) {
          return f.properties && byId[f.properties.id];
        });
        if (!map.getPane("districts")) {
          map.createPane("districts");
          map.getPane("districts").style.zIndex = 350;
        }
        var layer = window.L.geoJSON({ type: "FeatureCollection", features: features }, {
          pane: "districts",
          style: function (feat) {
            var id = feat.properties.id;
            var worst = prWorst(byId[id]).status_type;
            var color = tone(worst);
            return { color: color, weight: 1.4, opacity: 0.95, fillColor: color, fillOpacity: 0.48 };
          },
          onEachFeature: function (feat, poly) {
            var id = feat.properties.id;
            var rows = byId[id] || [];
            poly._group = rows[0] ? rows[0].group : "";
            poly._worst = prWorst(rows).status_type;
            poly.bindPopup(prPopupHtml(rows), {
              closeButton: true, autoPan: true, maxWidth: 280, className: "map-card-pop"
            });
            map._prById[id] = poly;
            poly.on("click", function () {
              document.querySelectorAll(".pr-card").forEach(function (c) {
                c.classList.toggle("is-on", c.getAttribute("data-district") === id);
              });
            });
          }
        }).addTo(map);
        map._prLayer = layer;
        if (policeFilter && map._applyPoliceFilter) map._applyPoliceFilter(policeFilter);
        else fitNational();
      })
      .catch(function () {});
    var frameClean = [];
    function listen(node, type, fn) {
      node.addEventListener(type, fn);
      frameClean.push(function () { node.removeEventListener(type, fn); });
    }
    function kick() { if (!policeFilter) fitNational(); }
    listen(window, "resize", kick);
    listen(window, "orientationchange", kick);
    if (typeof ResizeObserver === "function") {
      var ro = new ResizeObserver(function () { kick(); });
      ro.observe(box);
      frameClean.push(function () { ro.disconnect(); });
    }
    map._unframe = function () {
      frameClean.forEach(function (fn) { try { fn(); } catch (e) {} });
    };
    window.requestAnimationFrame(kick);
    window.setTimeout(kick, 80);
    markEntered(box);
  }

  var VV_LEVELS = ["red", "orange", "yellow"];
  function vvDoc() { return vehicle && vehicle.districts && vehicle.districts.length ? vehicle : null; }
  function vvById(id) {
    var rows = (vehicle && vehicle.districts) || [];
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
    return null;
  }
  function vvLevelName(level) {
    var map = {
      red: { ne: "रातो", en: "Red" },
      orange: { ne: "सुन्तला", en: "Orange" },
      yellow: { ne: "पहेंलो", en: "Yellow" }
    };
    return tx(map[level] || { ne: level, en: level });
  }
  function vvMeaning(level) {
    var row = vehicle && vehicle.levels && vehicle.levels[level];
    return row ? tx(row) : "";
  }
  function vvProvince(id) {
    var list = (vehicle && vehicle.provinces) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return { id: id, ne: id, en: id };
  }
  function vvPoliceNote(row) {
    if (!row || row.id !== "rasuwa" || !police || !police.rows) return "";
    var hit = null;
    for (var i = 0; i < police.rows.length; i++) {
      if (police.rows[i].id === "rasuwa-highways") hit = police.rows[i];
    }
    if (!hit) return "";
    return lang() === "en"
      ? "Nepal Police: Rasuwa's main highways are fully blocked until further notice."
      : "नेपाल प्रहरी: रसुवाका मुख्य राजमार्ग अर्को सूचना नभएसम्म पूर्ण अवरोध छन्।";
  }
  function vvDetail(row) {
    if (!row) return "";
    var name = lang() === "en" ? row.en : row.ne;
    var bits = name + " · " + vvLevelName(row.level) + ". " + vvMeaning(row.level);
    var note = vvPoliceNote(row);
    return note ? bits + " " + note : bits;
  }
  function vvRings(geom) {
    if (!geom) return [];
    if (geom.type === "Polygon") return geom.coordinates;
    if (geom.type === "MultiPolygon") {
      var out = [];
      geom.coordinates.forEach(function (poly) { poly.forEach(function (ring) { out.push(ring); }); });
      return out;
    }
    return [];
  }
  function renderVehicle(board) {
    var doc = vvDoc();
    if (!doc) return;
    var shell = el("section", "vv-board");
    shell.id = board.classList.contains("dor-home") ? "vv-home" : "vv-roads";
    var kick = el("p", "vv-kicker", "NDRRMA");
    shell.appendChild(kick);
    shell.appendChild(el("h2", "vv-title", tx(doc.title)));
    shell.appendChild(el("p", "vv-asof", (lang() === "en" ? "NDRRMA, " : "NDRRMA, ") + tx(doc.as_of) + " · " + tx(doc.valid)));
    var counts = doc.counts || {};
    var sum = el("ul", "vv-sum");
    VV_LEVELS.forEach(function (level) {
      var li = el("li", "vv-stat vv-stat-" + level);
      li.appendChild(el("strong", "vv-stat-n", num(counts[level] || 0)));
      li.appendChild(el("span", "vv-stat-k", vvLevelName(level)));
      sum.appendChild(li);
    });
    shell.appendChild(sum);
    var ras = vvById("rasuwa");
    if (ras) {
      var pin = el("button", "vv-pin");
      pin.type = "button";
      pin.id = "vv-rasuwa";
      pin.appendChild(el("strong", "vv-pin-name", (lang() === "en" ? ras.en : ras.ne) + " · " + vvLevelName(ras.level)));
      pin.appendChild(el("span", "vv-pin-mean", vvMeaning(ras.level)));
      var note = vvPoliceNote(ras);
      if (note) pin.appendChild(el("span", "vv-pin-note", note));
      pin.addEventListener("click", function () { vvSelect("rasuwa"); });
      shell.appendChild(pin);
    }
    var legend = el("ul", "vv-legend");
    VV_LEVELS.forEach(function (level) {
      var li = el("li", "vv-leg vv-leg-" + level);
      li.appendChild(el("i"));
      var text = el("span");
      text.appendChild(el("strong", "", vvLevelName(level)));
      text.appendChild(document.createTextNode(" — " + vvMeaning(level)));
      li.appendChild(text);
      legend.appendChild(li);
    });
    shell.appendChild(legend);
    var filters = el("div", "vv-filters");
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", lang() === "en" ? "Level" : "स्तर");
    function chip(id, labelText) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "vv-chip" + (vehicleLevel === id ? " is-on" : "");
      b.setAttribute("aria-pressed", vehicleLevel === id ? "true" : "false");
      b.textContent = labelText;
      b.addEventListener("click", function () {
        vehicleLevel = id;
        renderAll();
      });
      filters.appendChild(b);
    }
    chip("", lang() === "en" ? "All" : "सबै");
    VV_LEVELS.forEach(function (level) { chip(level, vvLevelName(level)); });
    shell.appendChild(filters);
    var grid = el("div", "vv-grid");
    var slot = el("div", "vv-mapslot");
    var detail = el("p", "vv-detail");
    detail.id = shell.id + "-detail";
    var picked = vvById(vehiclePick);
    if (picked && (!vehicleLevel || picked.level === vehicleLevel)) detail.textContent = vvDetail(picked);
    slot.appendChild(detail);
    grid.appendChild(slot);
    var side = el("div", "vv-side");
    VV_LEVELS.forEach(function (level) {
      if (vehicleLevel && vehicleLevel !== level) return;
      var block = el("section", "vv-group");
      block.setAttribute("data-level", level);
      var items = doc.districts.filter(function (d) { return d.level === level; });
      var h = el("h3", "vv-gh");
      h.appendChild(document.createTextNode(vvLevelName(level)));
      h.appendChild(el("span", "vv-gn", " " + num(items.length)));
      block.appendChild(h);
      (doc.provinces || []).forEach(function (prov) {
        var subset = items.filter(function (d) { return d.province === prov.id; });
        if (!subset.length) return;
        var g = el("div", "vv-prov");
        g.appendChild(el("h4", "vv-ph", lang() === "en" ? prov.en : prov.ne));
        var ul = el("ul", "vv-dists");
        subset.forEach(function (d) {
          var li = document.createElement("li");
          var b = document.createElement("button");
          b.type = "button";
          b.className = "vv-dist" + (d.id === "rasuwa" ? " is-rasuwa" : "") + (d.id === vehiclePick ? " is-on" : "");
          b.setAttribute("data-vv", d.id);
          b.textContent = lang() === "en" ? d.en : d.ne;
          b.addEventListener("click", function () { vvSelect(d.id); });
          li.appendChild(b);
          ul.appendChild(li);
        });
        g.appendChild(ul);
        block.appendChild(g);
      });
      side.appendChild(block);
    });
    grid.appendChild(side);
    shell.appendChild(grid);
    var src = el("p", "vv-src");
    if (doc.source && doc.source.url) {
      var a = document.createElement("a");
      a.href = doc.source.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = tx(doc.source.name);
      src.appendChild(a);
      src.appendChild(document.createTextNode(" · " + tx(doc.as_of)));
    }
    shell.appendChild(src);
    board.appendChild(shell);
    board._vehicleSlot = slot;
  }
  function vvSelect(id) {
    vehiclePick = id;
    document.querySelectorAll(".vv-dist").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-vv") === id);
    });
    document.querySelectorAll(".vv-d").forEach(function (p) {
      p.classList.toggle("is-on", p.getAttribute("data-id") === id);
    });
    var row = vvById(id);
    document.querySelectorAll(".vv-detail").forEach(function (n) { n.textContent = vvDetail(row); });
  }
  function mountVehicleMap(host) {
    if (!vehicleGeo || !vvDoc()) return;
    var byId = {};
    vehicle.districts.forEach(function (d) { byId[d.id] = d; });
    var lon0 = 80.05, lon1 = 88.21, lat0 = 26.34, lat1 = 30.45;
    var W = 1000, H = 560;
    function xy(lon, lat) {
      return [(lon - lon0) / (lon1 - lon0) * W, (lat1 - lat) / (lat1 - lat0) * H];
    }
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", tx(vehicle.title));
    var vb = { x: 0, y: 0, w: W, h: H };
    function applyVb() {
      svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h);
    }
    function zoom(factor) {
      var nw = vb.w * factor;
      var nh = vb.h * factor;
      if (nw > W * 1.05 || nh > H * 1.05) { vb = { x: 0, y: 0, w: W, h: H }; applyVb(); return; }
      if (nw < W / 8) return;
      vb.x += (vb.w - nw) / 2;
      vb.y += (vb.h - nh) / 2;
      vb.w = nw;
      vb.h = nh;
      applyVb();
    }
    (vehicleGeo.features || []).forEach(function (f) {
      var id = f.properties && f.properties.id;
      var row = byId[id];
      if (!row) return;
      var d = "";
      vvRings(f.geometry).forEach(function (ring) {
        ring.forEach(function (pt, i) {
          var p = xy(pt[0], pt[1]);
          d += (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
        });
        d += "Z";
      });
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("fill-rule", "evenodd");
      path.setAttribute("data-id", id);
      path.setAttribute("data-level", row.level);
      var cls = "vv-d";
      if (row.id === "rasuwa") cls += " is-rasuwa";
      if (row.id === vehiclePick) cls += " is-on";
      if (vehicleLevel && row.level !== vehicleLevel) cls += " is-dim";
      path.setAttribute("class", cls);
      path.addEventListener("click", function () { vvSelect(id); });
      svg.appendChild(path);
    });
    var wrap = el("div", "vv-map");
    wrap.appendChild(svg);
    var bar = el("div", "map-ctl");
    function zbtn(kind, delta) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "map-ctl-btn";
      b.setAttribute("aria-label", kind === "plus"
        ? label("map_zoom_in", lang() === "en" ? "Zoom in" : "जुम इन")
        : label("map_zoom_out", lang() === "en" ? "Zoom out" : "जुम आउट"));
      b.innerHTML = mapIcon(kind);
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        zoom(delta);
      });
      bar.appendChild(b);
    }
    zbtn("plus", 0.75);
    zbtn("minus", 1.33);
    bar.appendChild(bindFullscreen(wrap, function () { applyVb(); }));
    wrap.appendChild(bar);
    var drag = null;
    svg.addEventListener("pointerdown", function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest(".map-ctl")) return;
      drag = { x: ev.clientX, y: ev.clientY, vb: { x: vb.x, y: vb.y }, moved: false };
      try { svg.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    svg.addEventListener("pointermove", function (ev) {
      if (!drag) return;
      var rect = svg.getBoundingClientRect();
      var dx = (ev.clientX - drag.x) / rect.width * vb.w;
      var dy = (ev.clientY - drag.y) / rect.height * vb.h;
      if (Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 4) drag.moved = true;
      vb.x = drag.vb.x - dx;
      vb.y = drag.vb.y - dy;
      applyVb();
    });
    function endDrag() { drag = null; }
    svg.addEventListener("pointerup", endDrag);
    svg.addEventListener("pointercancel", endDrag);
    host.appendChild(wrap);
  }
  function renderMount(root) {
    var mode = root.getAttribute("data-dor-mode") || "home";
    var ui = data.ui;
    var n = notice();
    root.replaceChildren();
    var board = el("article", "dor" + (mode === "section" ? " dor-section" : " dor-home") + (n ? " dor-has-dao" : "") + (police && police.rows ? " dor-has-police" : "") + (vvDoc() ? " dor-has-vehicle" : ""));
    if (vvDoc()) renderVehicle(board);
    if (police && police.rows) renderPolice(board, mode);
    if (n) {
      renderDao(board);
    } else {
      var head = el("header", "dor-head");
      head.appendChild(el("p", "dor-kicker", tx(ui.kicker)));
      head.appendChild(el("p", "dor-asof", tx(ui.asof) + " " + tx(data.as_of)));
      board.appendChild(head);
      board.appendChild(el("h2", "dor-title", tx(ui.title)));
      chips(board);
      var earlyLive = liveNote();
      if (earlyLive) board.appendChild(earlyLive);
    }
    scheduleDorMap(board, mode);
    if (police && police.rows) schedulePoliceMap(board, mode);
    if (vvDoc() && board._vehicleSlot && vehicleGeo) {
      var mapHost = el("div", "vv-map-host");
      board._vehicleSlot.insertBefore(mapHost, board._vehicleSlot.firstChild);
      mountVehicleMap(mapHost);
    }
    if (mode === "home") {
      if (!n) board.appendChild(el("p", "dor-also", tx(ui.also)));
      links(board, true);
    } else {
      if (n) {
        board.appendChild(el("h3", "dor-gh", tx(ui.dor_layer || ui.kicker)));
        board.appendChild(el("p", "dor-asof dor-dor-asof", tx(ui.asof) + " " + tx(data.as_of)));
        chips(board);
        var dorLive = liveNote();
        if (dorLive) board.appendChild(dorLive);
      }
      if (!n) board.appendChild(el("p", "dor-call", tx(ui.nh17)));
      links(board, false);
      group(board, "closed", ui.g_closed);
      group(board, "partial", ui.g_partial);
      group(board, "opened", ui.g_opened);
      group(board, "ticker", ui.g_ticker);
    }
    root.appendChild(board);
  }
  function clearMaps() {
    mapGen += 1;
    mapInstances.forEach(function (m) {
      if (typeof m._unframe === "function") m._unframe();
      try { m.stop(); } catch (e) {}
      try { m.off(); m.remove(); } catch (e2) {}
    });
    mapInstances = [];
  }
  function samePoint(a, b) {
    return a && b && Math.abs(a.lat - b.lat) < 0.0002 && Math.abs(a.lng - b.lng) < 0.0002 && a.link === b.link;
  }
  function statusOf(type) {
    if (type === "CLOSED") return "closed";
    if (type === "PARTIAL_OPEN") return "partial";
    return "opened";
  }
  function applyPoint(p, listName) {
    if (!p || p.latitude == null || p.longitude == null) return;
    var lat = Number(p.latitude);
    var lng = Number(p.longitude);
    if (!isFinite(lat) || !isFinite(lng)) return;
    var road = roadById(String(p.id));
    if (road) {
      if (road.point && road.point.lock) return;
      road.point = { lat: lat, lng: lng, source: "DoR Map_data_api" };
      return;
    }
    var link = p.link_code || "";
    var dup = (data.roads || []).some(function (r) {
      return samePoint({ lat: lat, lng: lng, link: link }, r.point && { lat: r.point.lat, lng: r.point.lng, link: r.link });
    });
    if (dup) return;
    var st = statusOf(p.closure_type);
    data.roads.push({
      id: String(p.id),
      ref: p.road_refno || "",
      link: link,
      status: st,
      lists: [listName],
      priority: false,
      live_only: true,
      name: { en: p.road_name || "", ne: p.road_name || "" },
      section: { en: p.location || p.road_name || "", ne: p.location || p.road_name || "" },
      reason: { en: p.closure_reason || "", ne: p.closure_reason || "" },
      district: { en: p.district || "", ne: p.district || "" },
      place: { en: p.location || "", ne: p.location || "" },
      contact: p.contact_person || "",
      closed: p.date_roadblock_start ? { en: p.date_roadblock_start, ne: p.date_roadblock_start } : null,
      opened: p.date_roadblock_end ? { en: p.date_roadblock_end, ne: p.date_roadblock_end } : null,
      estimate: p.date_roadblock_end_estimated ? { en: p.date_roadblock_end_estimated, ne: p.date_roadblock_end_estimated } : null,
      note: null,
      point: { lat: lat, lng: lng, source: "DoR Map_data_api" }
    });
  }
  function numEq(a, b) { return Number(a) === Number(b); }
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
    var live = data.map && data.map.live;
    if (!live) return;
    if (liveState === "done" || liveState === "busy") return;
    liveState = "busy";
    var signal = liveSignal();
    function pull(url) {
      var opts = { cache: "no-store" };
      if (signal) opts.signal = signal;
      return fetch(url, opts).then(function (r) { if (!r.ok) throw new Error("dor"); return r.json(); });
    }
    Promise.all([
      pull(live.aggregate),
      pull(live.closed),
      pull(live.opened)
    ]).then(function (parts) {
      var agg = (parts[0] && parts[0].data) || {};
      var closed = (parts[1] && parts[1].data) || [];
      var opened = (parts[2] && parts[2].data) || [];
      closed.forEach(function (p) { applyPoint(p, "closed"); });
      opened.forEach(function (p) { applyPoint(p, "opened"); });
      var same = numEq(agg.total, data.counts.total) && numEq(agg.closed_roads, data.counts.closed) && numEq(agg.recently_opened_roads, data.counts.opened) && numEq(agg.partially_opened_roads, data.counts.partial);
      data.live = { same: same, failed: false };
      if (!same) {
        data.counts = {
          total: Number(agg.total),
          closed: Number(agg.closed_roads),
          opened: Number(agg.recently_opened_roads),
          partial: Number(agg.partially_opened_roads)
        };
      }
      liveState = "done";
      renderAll();
    }).catch(function () {
      data.live = { same: true, failed: true };
      liveState = "done";
    });
  }
  function paintDorStamps() {
    var text = updatedLabel(dorStamp());
    document.querySelectorAll(".dor-map .map-live-t").forEach(function (n) { n.textContent = text; });
  }
  function recolorRoads() {
    mapInstances.forEach(function (map) {
      map.eachLayer(function (layer) {
        if (!layer._roadId || !layer.setIcon) return;
        var road = roadById(layer._roadId);
        if (!road) return;
        try { layer.setIcon(markerIcon(road)); } catch (e) {}
        if (layer.setPopupContent) layer.setPopupContent(popupHtml(road));
      });
      if (map._districtLayer && map._districtLayer.setStyle) {
        var n = notice();
        map._districtLayer.setStyle(function () {
          if (n) return { color: "#d7191c", weight: 1.25, opacity: 0.95, fillColor: "#d7191c", fillOpacity: 0.42, className: "dor-dao-shape" };
          return { color: "#1b7f3a", weight: 1, opacity: 0.45, fillColor: "#1b7f3a", fillOpacity: 0.04, className: "dor-dist-shape" };
        });
      }
    });
    if (selectedId) {
      document.querySelectorAll("[data-dor-mount] .dor-map-detail").forEach(function (box) {
        fillRoadDetail(box, roadById(selectedId));
      });
    }
    paintDorStamps();
  }
  var refreshTimer = 0;
  function refreshRoads() {
    fetch("data/roads-dor.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("roads"); return r.json(); })
      .then(function (json) {
        if (!json || !json.roads) return;
        var keep = selectedId;
        data = json;
        selectedId = keep;
        recolorRoads();
      })
      .catch(function () {});
  }
  function renderAll() {
    if (!data) return;
    clearMaps();
    mounts.forEach(renderMount);
    if ((location.hash || "") === "#dor-map") {
      var mapEl = document.getElementById("dor-map");
      if (mapEl) {
        try { mapEl.scrollIntoView({ block: "start" }); } catch (e) {}
      }
    }
    afterPaint(checkLive);
  }
  function boot() {
    var roadsP = fetch("data/roads-dor.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("roads"); return r.json(); });
    var policeP = fetch("data/police_roads_2083-06-09.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("police"); return r.json(); })
      .catch(function () { return null; });
    var vehicleP = fetch("data/ndrrma_vehicle_2083-06-09.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("vehicle"); return r.json(); })
      .catch(function () { return null; });
    var geoP = fetch("data/nepal-districts.geojson?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("geo"); return r.json(); })
      .catch(function () { return null; });
    Promise.all([roadsP, policeP, vehicleP, geoP])
      .then(function (pair) {
        data = pair[0];
        police = pair[1];
        vehicle = pair[2];
        vehicleGeo = pair[3];
        renderAll();
        if (!refreshTimer) refreshTimer = window.setInterval(refreshRoads, REFRESH_MS);
        if (window.__addLangHook) window.__addLangHook(renderAll);
      })
      .catch(function () {
        mounts.forEach(function (m) { m.classList.add("dor-fallback"); });
      });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
