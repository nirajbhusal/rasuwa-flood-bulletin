/* Gallery path · data/gallery-path.json · Nepali first, English via the lang hook */
(function () {
  if (!document.querySelector('link[href*="leaflet.css"]')) {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "vendor/leaflet/leaflet.css?v=" + encodeURIComponent(window.PAGE_VER || "2026-09-25-maps-live");
    document.head.appendChild(css);
  }
  var root = document.getElementById("gallery-path");
  if (!root) return;

  var DIG = "०१२३४५६७८९";
  var MONTHS_NE = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
  var MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DATA = null;
  var stageId = "";
  var sliderPct = {};
  var loadedYt = {};

  function isEn() {
    return document.documentElement.lang === "en";
  }
  function pick(obj, enKey, neKey) {
    if (!obj) return "";
    return isEn() ? (obj[enKey] || obj[neKey] || "") : (obj[neKey] || obj[enKey] || "");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function dig(s) {
    s = String(s);
    if (isEn()) return s.replace(/[०-९]/g, function (d) { return "0123456789"["०१२३४५६७८९".indexOf(d)]; });
    return s.replace(/[0-9]/g, function (d) { return DIG[d]; });
  }
  function fmtDate(raw) {
    if (!raw) return "";
    var m = String(raw).match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
    if (!m) return dig(raw);
    var year = m[1];
    var month = parseInt(m[2], 10) - 1;
    var name = isEn() ? MONTHS_EN[month] : MONTHS_NE[month];
    if (!name) return dig(raw);
    if (!m[3]) return isEn() ? (name + " " + year) : (name + " " + dig(year));
    var day = parseInt(m[3], 10);
    if (isEn()) return day + " " + name + " " + year;
    return dig(day) + " " + name + " " + dig(year);
  }
  function stageById(id) {
    var stages = (DATA && DATA.meta && DATA.meta.stages) || [];
    for (var i = 0; i < stages.length; i++) if (stages[i].id === id) return stages[i];
    return null;
  }
  function stageLabel(id) {
    var st = stageById(id);
    if (!st) return "";
    return isEn() ? (st.en || st.ne || "") : (st.ne || st.en || "");
  }
  function stepLabel(st) {
    var full = isEn() ? (st.en || st.ne || "") : (st.ne || st.en || "");
    var shortNe = { origin: "उद्गम", path: "बाढीको बाटो", affected: "प्रभावित क्षेत्र", rescue: "उद्धार", beforeafter: "पहिले / पछि" };
    var shortEn = { origin: "Source", path: "Flood path", affected: "Affected areas", rescue: "Rescue", beforeafter: "Before / After" };
    var map = isEn() ? shortEn : shortNe;
    return { text: map[st.id] || full, title: full };
  }
  function sourceHostLabel(url) {
    try {
      var h = new URL(url).hostname.replace(/^www\./, "");
      if (h.indexOf("usgs.gov") >= 0) return "USGS";
      if (h.indexOf("icimod.org") >= 0) return "ICIMOD";
      if (h.indexOf("hirisk.org") >= 0) return "HI-RISK";
      if (h.indexOf("esa.int") >= 0) return "ESA";
      return h;
    } catch (e) {
      return "";
    }
  }
  function showStage(id) {
    if (!stageId) return true;
    return id === stageId;
  }

  function metaLine(place, date) {
    var bits = [];
    if (place) bits.push(esc(place));
    if (date) bits.push(esc(fmtDate(date)));
    return bits.length ? '<p class="gpath-meta">' + bits.join(" · ") + "</p>" : "";
  }
  function sourceLink(item) {
    if (!item.source_url || !item.source_name) return "";
    return '<a class="gpath-src" href="' + esc(item.source_url) + '" target="_blank" rel="noopener">' + esc(item.source_name) + "</a>";
  }
  function creditLine(item) {
    if (!item.credit) return "";
    return '<p class="gpath-credit">' + esc(item.credit) + "</p>";
  }
  function acqLine(text) {
    if (!text) return "";
    return '<p class="gpath-acq">' + esc(text) + "</p>";
  }

  function ytFacade(id, title) {
    if (loadedYt[id]) {
      return '<div class="gpath-yt"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(id) + '?rel=0" title="' + esc(title) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';
    }
    var thumb = "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";
    return '<button type="button" class="gpath-yt gpath-yt-facade" data-yt="' + esc(id) + '" aria-label="' + esc(title) + '">' +
      '<img loading="lazy" src="' + esc(thumb) + '" alt="">' +
      '<span class="gpath-play" aria-hidden="true"></span>' +
      "</button>";
  }

  function linkCard(item) {
    var title = pick(item, "title_en", "title_ne");
    var place = pick(item, "place_en", "place_ne");
    var href = item.source_url || item.x_url || "#";
    return '<a class="gpath-link" data-stage="' + esc(item.stage || "") + '" href="' + esc(href) + '" target="_blank" rel="noopener">' +
      '<span class="gpath-link-src">' + esc(item.source_name || "") + "</span>" +
      "<strong>" + esc(title) + "</strong>" +
      metaLine(place, item.date) +
      "</a>";
  }

  function imageCard(item) {
    var title = pick(item, "title_en", "title_ne");
    var place = pick(item, "place_en", "place_ne");
    return '<figure class="gpath-card gpath-card-img" data-stage="' + esc(item.stage || "") + '">' +
      '<a href="' + esc(item.file) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(item.file) + '" alt="' + esc(title) + '"></a>' +
      "<figcaption><strong>" + esc(title) + "</strong>" +
      metaLine(place, item.date) +
      sourceLink(item) +
      acqLine(item.acq) +
      creditLine(item) +
      "</figcaption></figure>";
  }

  function mediaCard(item) {
    var title = pick(item, "title_en", "title_ne");
    var place = pick(item, "place_en", "place_ne");
    if (item.type === "image" && item.file) return imageCard(item);
    if (item.type === "youtube" && item.youtube_id) {
      return '<article class="gpath-card gpath-card-yt" data-stage="' + esc(item.stage || "") + '">' +
        ytFacade(item.youtube_id, title) +
        '<div class="gpath-card-body"><strong>' + esc(title) + "</strong>" +
        metaLine(place, item.date) +
        sourceLink(item) +
        "</div></article>";
    }
    if (item.type === "x" || item.type === "link") return linkCard(item);
    return "";
  }

  function renderIntro() {
    var h = document.getElementById("gpath-h");
    var intro = document.getElementById("gpath-intro");
    var meta = DATA.meta || {};
    if (h) h.textContent = pick(meta, "title_en", "title_ne");
    if (!intro) return;
    var text = pick(meta, "origin_summary_en", "origin_summary_ne");
    var links = (meta.origin_sources || []).map(function (url) {
      var label = sourceHostLabel(url);
      if (!label) return "";
      return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + "</a>";
    }).filter(Boolean);
    intro.innerHTML = esc(text) + (links.length ? ' <span class="gpath-origin-links">' + links.join(" · ") + "</span>" : "");
  }

  function renderSteps() {
    var nav = document.getElementById("gpath-steps");
    if (!nav) return;
    var stages = (DATA.meta && DATA.meta.stages) || [];
    nav.setAttribute("aria-label", pick(DATA.meta, "title_en", "title_ne"));
    nav.innerHTML = stages.map(function (st) {
      var label = stepLabel(st);
      var on = stageId === st.id ? "true" : "false";
      return '<button type="button" class="gpath-step" data-stage="' + esc(st.id) + '" aria-pressed="' + on + '" title="' + esc(label.title) + '">' + esc(label.text) + "</button>";
    }).join("");
  }

  function renderItems() {
    var box = document.getElementById("gpath-items");
    if (!box) return;
    var items = (DATA.path_items || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    if (stageId === "beforeafter") {
      box.innerHTML = "";
      box.hidden = true;
      return;
    }
    var html = "";
    var current = "";
    items.forEach(function (item) {
      if (!showStage(item.stage)) return;
      if (!stageId && item.stage !== current) {
        current = item.stage;
        html += '<h3 class="gpath-stage" id="gpath-stage-' + esc(current) + '">' + esc(stageLabel(current)) + "</h3>";
      }
      html += mediaCard(item);
    });
    box.hidden = !html;
    box.innerHTML = html;
  }

  function baCard(item) {
    var title = pick(item, "title_en", "title_ne");
    var place = pick(item, "place_en", "place_ne");
    var note = pick(item, "note_en", "note_ne");
    var beforeDate = fmtDate(item.before_date);
    var afterDate = fmtDate(item.after_date);
    var pct = sliderPct[item.id];
    if (pct == null) pct = 50;
    var label = title;
    var acq = [item.acq_before, item.acq_after].filter(Boolean).join(" · ");
    return '<article class="gpath-ba-item" data-stage="' + esc(item.stage || "") + '" data-ba="' + esc(item.id) + '">' +
      '<h3 class="gpath-ba-title">' + esc(title) + "</h3>" +
      metaLine(place, "") +
      '<div class="ba-frame" data-ba-frame="' + esc(item.id) + '">' +
      '<img class="ba-after" loading="lazy" draggable="false" src="' + esc(item.after) + '" alt="' + esc(title + " · " + afterDate) + '">' +
      '<div class="ba-clip" style="width:' + pct + '%"><img class="ba-before" loading="lazy" draggable="false" src="' + esc(item.before) + '" alt="' + esc(title + " · " + beforeDate) + '"></div>' +
      '<span class="ba-tag ba-tag-before">' + esc(beforeDate) + "</span>" +
      '<span class="ba-tag ba-tag-after">' + esc(afterDate) + "</span>" +
      '<div class="ba-handle" role="slider" tabindex="0" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="' + esc(label) + '" style="left:' + pct + '%"></div>' +
      "</div>" +
      (note ? '<p class="gpath-note">' + esc(note) + "</p>" : "") +
      acqLine(acq) +
      sourceLink(item) +
      creditLine(item) +
      "</article>";
  }

  function renderBeforeAfter() {
    var box = document.getElementById("gpath-ba");
    if (!box) return;
    var rows = (DATA.before_after || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var visible = rows.filter(function (item) {
      if (!stageId || stageId === "beforeafter") return true;
      return item.stage === stageId;
    });
    var html = visible.map(baCard).join("");
    var vid = (DATA.before_after_video || [])[0];
    if (vid && vid.type === "youtube" && (!stageId || stageId === "beforeafter")) {
      var title = pick(vid, "title_en", "title_ne");
      html += '<article class="gpath-card gpath-card-yt gpath-ba-vid">' +
        ytFacade(vid.youtube_id, title) +
        '<div class="gpath-card-body"><strong>' + esc(title) + "</strong>" +
        metaLine("", vid.date) +
        sourceLink(vid) +
        "</div></article>";
    }
    box.hidden = !html;
    box.innerHTML = html;
    box.querySelectorAll("[data-ba-frame]").forEach(bindSlider);
  }

  function renderRefs() {
    var box = document.getElementById("gpath-refs");
    if (!box) return;
    if (stageId) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    var links = DATA.reference_links || [];
    box.hidden = !links.length;
    box.innerHTML = links.map(function (item) {
      return linkCard(item);
    }).join("");
  }

  function layoutClip(frame) {
    var img = frame.querySelector(".ba-before");
    if (!img) return;
    img.style.width = frame.clientWidth + "px";
    img.style.height = frame.clientHeight + "px";
  }

  function setSlider(frame, pct) {
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    var id = frame.getAttribute("data-ba-frame");
    sliderPct[id] = pct;
    var clip = frame.querySelector(".ba-clip");
    var handle = frame.querySelector(".ba-handle");
    if (clip) clip.style.width = pct + "%";
    if (handle) {
      handle.style.left = pct + "%";
      handle.setAttribute("aria-valuenow", String(pct));
    }
    layoutClip(frame);
  }

  function pctFromEvent(frame, ev) {
    var rect = frame.getBoundingClientRect();
    if (!rect.width) return 50;
    return ((ev.clientX - rect.left) / rect.width) * 100;
  }

  function bindSlider(frame) {
    var handle = frame.querySelector(".ba-handle");
    if (!handle || frame.__ba) return;
    frame.__ba = true;
    layoutClip(frame);
    var drag = false;
    function move(ev) {
      setSlider(frame, pctFromEvent(frame, ev));
    }
    frame.addEventListener("pointerdown", function (ev) {
      if (ev.button != null && ev.button !== 0) return;
      drag = true;
      if (handle) handle.focus();
      frame.setPointerCapture(ev.pointerId);
      move(ev);
      ev.preventDefault();
    });
    frame.addEventListener("pointermove", function (ev) {
      if (!drag) return;
      move(ev);
    });
    function end() { drag = false; }
    frame.addEventListener("pointerup", end);
    frame.addEventListener("pointercancel", end);
    handle.addEventListener("keydown", function (ev) {
      var now = parseInt(handle.getAttribute("aria-valuenow") || "50", 10);
      var next = now;
      if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") next = now - 5;
      else if (ev.key === "ArrowRight" || ev.key === "ArrowUp") next = now + 5;
      else if (ev.key === "Home") next = 0;
      else if (ev.key === "End") next = 100;
      else return;
      setSlider(frame, next);
      ev.preventDefault();
    });
    if (typeof ResizeObserver !== "undefined") {
      var ro = new ResizeObserver(function () { layoutClip(frame); });
      ro.observe(frame);
    }
  }

  function bindClicks() {
    if (root.__clicks) return;
    root.__clicks = true;
    root.addEventListener("click", function (ev) {
      var step = ev.target.closest(".gpath-step");
      if (step && root.contains(step)) {
        var id = step.getAttribute("data-stage") || "";
        stageId = stageId === id ? "" : id;
        render();
        var target = null;
        if (stageId === "beforeafter") target = document.getElementById("gpath-ba");
        else if (stageId) target = document.getElementById("gpath-stage-" + stageId) || document.getElementById("gpath-items");
        else target = root;
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      var yt = ev.target.closest(".gpath-yt-facade");
      if (yt && root.contains(yt)) {
        var yid = yt.getAttribute("data-yt");
        var title = yt.getAttribute("aria-label") || "";
        if (!yid) return;
        loadedYt[yid] = true;
        var frame = document.createElement("div");
        frame.className = "gpath-yt";
        frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + esc(yid) + '?autoplay=1&rel=0" title="' + esc(title) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
        yt.replaceWith(frame);
      }
    });
  }

  var mapObj = null;
  function renderMap() {
    var el = document.getElementById("gpath-map");
    if (!el || typeof L === "undefined") return;
    var points = (DATA.map_points || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    if (!points.length) return;
    el.hidden = false;
    if (!mapObj) {
      mapObj = L.map(el, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 16,
        attribution: "&copy; <a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener'>OpenStreetMap</a>"
      }).addTo(mapObj);
      mapObj.__layer = L.layerGroup().addTo(mapObj);
    }
    mapObj.__layer.clearLayers();
    var latlngs = [];
    points.forEach(function (p) {
      var ll = [p.lat, p.lon];
      latlngs.push(ll);
      var marker = L.circleMarker(ll, {
        radius: p.approx ? 7 : 6,
        color: p.approx ? "#0e7490" : "#0f172a",
        weight: p.approx ? 2 : 2,
        fillColor: p.approx ? "#ffffff" : "#0e7490",
        fillOpacity: p.approx ? 0.95 : 0.9
      });
      var name = isEn() ? (p.en || p.ne || "") : (p.ne || p.en || "");
      var flag = p.approx ? '<span class="gpath-approx">' + (isEn() ? "approx." : "अनुमानित") + "</span>" : "";
      marker.bindPopup("<b>" + esc(name) + "</b>" + flag);
      marker.addTo(mapObj.__layer);
    });
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: "#0e7490", weight: 3, opacity: 0.85 }).addTo(mapObj.__layer);
    }
    mapObj.fitBounds(latlngs, { padding: [24, 24] });
    setTimeout(function () { mapObj.invalidateSize(); }, 60);
  }

  function render() {
    if (!DATA) return;
    renderIntro();
    renderSteps();
    renderMap();
    renderItems();
    renderBeforeAfter();
    renderRefs();
  }

  bindClicks();
  window.addEventListener("resize", function () {
    root.querySelectorAll("[data-ba-frame]").forEach(layoutClip);
  });

  var ver = window.PAGE_VER || "";
  fetch("data/gallery-path.json" + (ver ? "?v=" + encodeURIComponent(ver) : ""), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      DATA = data;
      render();
    })
    .catch(function () {});

  if (window.__addLangHook) window.__addLangHook(function () { render(); });
})();
