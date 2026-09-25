/*! Rasuwa flood bulletin · DoR NAVIGATE road status · driven by data/roads-dor.json */
(function () {
  var mounts = document.querySelectorAll("[data-dor-mount]");
  if (!mounts.length) return;

  var data = null;
  var selectedId = null;
  var mapInstances = [];
  var mapGen = 0;
  var liveState = "idle";
  var VER = window.PAGE_VER || "2026-09-25-polish3";
  var showDistricts = true;
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
    return "<strong>" + esc(tx(hit.district)) + "</strong><span>" + esc(tx(hit.province)) + "</span><span>" + esc(tx(n.when || n.published)) + "</span><span>" + esc(tx(n.popup_source)) + "</span>";
  }
  var pendingDistrict = null;
  function markDistrictChips(id) {
    document.querySelectorAll(".dor-dao-chip").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-id") === id);
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
  function renderDao(board, mode) {
    var n = notice();
    var labels = n.labels || {};
    board.appendChild(el("h2", "dor-title dor-dao-title", tx(n.heading)));
    board.appendChild(el("p", "dor-asof dor-dao-date", tx(n.published)));
    var counts = n.counts || {};
    var row = el("ul", "dor-chips dor-dao-counts");
    [["districts", counts.districts, "dor-chip-closed"], ["provinces", counts.provinces, "dor-chip-total"]].forEach(function (item) {
      var li = el("li", "dor-chip " + item[2]);
      li.appendChild(el("span", "dor-chip-k", tx(labels[item[0]])));
      li.appendChild(el("strong", "dor-chip-n", num(item[1])));
      row.appendChild(li);
    });
    board.appendChild(row);
    var groups = el("div", "dor-dao-provs");
    (n.provinces || []).forEach(function (prov) {
      var block = el("section", "dor-dao-prov");
      var h = el("h3", "dor-dao-prov-h");
      h.appendChild(document.createTextNode(tx(prov)));
      h.appendChild(el("span", "dor-dao-prov-n", " · " + num((prov.districts || []).length)));
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
    board.appendChild(groups);
    if (mode === "section" && n.source && n.source.graphic) {
      var fig = el("figure", "dor-dao-fig");
      var a = document.createElement("a");
      a.href = n.source.graphic;
      a.target = "_blank";
      a.rel = "noopener";
      var img = document.createElement("img");
      img.src = n.source.graphic + "?v=" + encodeURIComponent(VER);
      img.alt = tx(n.source.graphic_alt || labels.credit);
      img.width = 960;
      img.height = 960;
      img.loading = "lazy";
      a.appendChild(img);
      fig.appendChild(a);
      fig.appendChild(el("figcaption", "dor-dao-credit", tx(labels.credit)));
      board.appendChild(fig);
    }
  }
  function fillRoadDetail(box, road) {
    if (!box) return;
    var ui = data.ui;
    box.replaceChildren();
    if (!road) {
      box.appendChild(el("p", "dor-map-empty", tx(ui.tap_road)));
      return;
    }
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
  function popupHtml(road) {
    var ui = data.ui;
    var status = tx(ui[road.status] || road.status);
    return "<strong>" + road.ref + (road.link ? " · " + road.link : "") + "</strong><span>" + status + "</span><span>" + tx(road.section) + "</span>";
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
    host.appendChild(el("p", "wxb-tap dor-tap", tx(notice() ? (ui.tap_dao || ui.tap_road) : ui.tap_road)));
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
      zoomControl: true,
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
    fetch("data/nepal-districts.geojson?v=" + encodeURIComponent(VER), { cache: "no-cache" })
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
            if (n) return { color: "#d7191c", weight: 1.25, opacity: 0.95, fillColor: "#d7191c", fillOpacity: 0.42 };
            return { color: "#1b7f3a", weight: 1, opacity: 0.45, fillColor: "#1b7f3a", fillOpacity: 0.04 };
          },
          onEachFeature: function (feat, layer) {
            var props = (feat && feat.properties) || {};
            if (n && closedIds[props.id]) {
              layer.bindPopup(districtPopupHtml(props.id), {
                closeButton: true,
                autoPan: true,
                autoClose: true,
                maxWidth: 260,
                className: "dor-dao-pop"
              });
              map._daoById[props.id] = layer;
            } else if (!n) {
              var name = lang() === "en" ? (props.en || "") : (props.ne || props.en || "");
              layer.bindPopup(esc(name), { closeButton: true, autoPan: true, autoClose: true });
            }
            layer.on("click", function (ev) {
              pendingDistrict = props.id || pendingDistrict;
              markDistrictChips(props.id);
              try { layer.openPopup(ev && ev.latlng); } catch (err) {}
              if (ev && ev.originalEvent) window.L.DomEvent.stopPropagation(ev);
            });
          }
        });
        map._districtLayer = districtLayer;
        applyDistricts(showDistricts);
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
      marker.bindPopup(popupHtml(road), { closeButton: true, autoPan: true, maxWidth: 260 });
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
    var corridorOpts = { cache: "no-cache" };
    var corridorSignal = liveSignal();
    if (corridorSignal) corridorOpts.signal = corridorSignal;
    fetch(corridor + "?v=" + encodeURIComponent(VER), corridorOpts)
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
    link.href = "vendor/leaflet/leaflet.css?v=" + encodeURIComponent(VER);
    document.head.appendChild(link);
  }
  function ensureLeaflet(cb) {
    ensureLeafletCss();
    if (window.L) { cb(); return; }
    leafletQueue.push(cb);
    if (leafletLoading) return;
    leafletLoading = true;
    var s = document.createElement("script");
    s.src = "vendor/leaflet/leaflet.js?v=" + encodeURIComponent(VER);
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
    board.appendChild(host);
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
  function renderMount(root) {
    var mode = root.getAttribute("data-dor-mode") || "home";
    var ui = data.ui;
    var n = notice();
    root.replaceChildren();
    var board = el("article", "dor" + (mode === "section" ? " dor-section" : " dor-home") + (n ? " dor-has-dao" : ""));
    if (n) {
      renderDao(board, mode);
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
    if (mode === "home") {
      board.appendChild(el("p", "dor-also", tx(ui.also)));
      links(board, true);
    } else {
      if (n) {
        board.appendChild(el("h3", "dor-gh", tx(ui.dor_layer || ui.kicker)));
        board.appendChild(el("p", "dor-asof dor-dor-asof", tx(ui.asof) + " " + tx(data.as_of)));
        chips(board);
        var dorLive = liveNote();
        if (dorLive) board.appendChild(dorLive);
      }
      board.appendChild(el("p", "dor-call", tx(ui.nh17)));
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
  function renderAll() {
    if (!data) return;
    if (!selectedId && !notice()) selectedId = data.priority_id;
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
    fetch("data/roads-dor.json?v=" + encodeURIComponent(VER), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("roads"); return r.json(); })
      .then(function (json) {
        data = json;
        renderAll();
        if (window.__addLangHook) window.__addLangHook(renderAll);
      })
      .catch(function () {
        mounts.forEach(function (m) { m.classList.add("dor-fallback"); });
      });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
