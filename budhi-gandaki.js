(function () {
  var DIG = "०१२३४५६७८९";
  var pack = null;

  function isEn() {
    return (document.documentElement.lang || "ne").slice(0, 2) === "en";
  }
  function t(ne, en) {
    return isEn() ? en : ne;
  }
  function digits(s) {
    s = String(s);
    if (isEn()) return s.replace(/[०-९]/g, function (d) { return "0123456789"["०१२३४५६७८९".indexOf(d)]; });
    return s.replace(/[0-9]/g, function (d) { return DIG[d]; });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function lvl(n) { return Number(n).toFixed(2); }
  function thr(n) { return n == null || n === "" ? "—" : Number(n).toFixed(1); }
  function arrow(trend) {
    if (trend === "RISING") return "↑";
    if (trend === "FALLING") return "↓";
    return "→";
  }
  function trendWord(trend) {
    if (trend === "RISING") return t("बढ्दो", "rising");
    if (trend === "FALLING") return t("घट्दो", "falling");
    return t("स्थिर", "steady");
  }
  function chip(status) {
    if (status === "DANGER") return '<span class="bg-chip danger">' + esc(t("खतरा", "Danger")) + "</span>";
    if (status === "WARN") return '<span class="bg-chip warn">' + esc(t("सतर्कता", "Alert level")) + "</span>";
    return '<span class="bg-chip ok">' + esc(t("सतर्कताभन्दा तल", "Below alert level")) + "</span>";
  }
  function phones(list) {
    return '<div class="bg-phones">' + list.map(function (c) {
      var name = t(c.ne, c.en);
      return '<a href="' + esc(c.tel) + '"><span>' + esc(name) + "</span><strong>" + esc(c.num) + "</strong></a>";
    }).join("") + "</div>";
  }
  function bar(level, danger, max) {
    var fill = Math.max(0, Math.min(100, level / max * 100));
    var mark = Math.max(0, Math.min(100, danger / max * 100));
    return '<div class="bg-bar" role="img" aria-label="' + esc(lvl(level) + " m, danger " + thr(danger) + " m") + '">' +
      '<div class="bg-bar-track"><span class="bg-bar-zone" style="left:' + mark + '%"></span>' +
      '<span class="bg-bar-fill" style="width:' + fill + '%"></span>' +
      '<i class="bg-bar-mark" style="left:' + mark + '%"></i></div></div>';
  }
  function gaugeSvg(a, max) {
    var latest = a.latest.level_m;
    var y = function (m) { return 300 - (m / max) * 272; };
    var top = y(latest);
    var hist = a.history || [];
    var x1 = 48;
    var x2 = 300;
    var sy = function (m) { return 110 - ((m - 4) / 6) * 80; };
    var p1 = hist[0] || { level_m: latest, time_ne: "", time_en: "" };
    var p2 = hist[hist.length - 1] || p1;
    var y1 = sy(p1.level_m);
    var y2 = sy(p2.level_m);
    return '<svg class="bg-gauge" viewBox="0 0 280 320" role="img" aria-label="' + esc(lvl(latest) + " m") + '">' +
      '<defs><clipPath id="bg-tube"><rect x="78" y="24" width="48" height="272" rx="10"/></clipPath></defs>' +
      '<rect x="78" y="24" width="48" height="272" rx="10" fill="#f8fafc" stroke="#e7e5e4"/>' +
      '<g clip-path="url(#bg-tube)">' +
      '<rect x="78" y="24" width="48" height="' + (y(a.danger_m) - 24).toFixed(1) + '" fill="#fee2e2"/>' +
      '<rect x="78" y="' + top.toFixed(1) + '" width="48" height="' + (296 - top).toFixed(1) + '" fill="#c41e3a"/>' +
      "</g>" +
      '<line x1="66" y1="' + y(a.danger_m).toFixed(1) + '" x2="138" y2="' + y(a.danger_m).toFixed(1) + '" stroke="#c41e3a" stroke-width="2"/>' +
      '<line x1="66" y1="' + y(a.warning_m).toFixed(1) + '" x2="138" y2="' + y(a.warning_m).toFixed(1) + '" stroke="#d97706" stroke-width="2" stroke-dasharray="4 3"/>' +
      '<text x="148" y="' + (top + 6).toFixed(1) + '" fill="#9f1239" font-size="15" font-weight="700">' + esc(digits(lvl(latest))) + "</text>" +
      '<text x="58" y="' + (y(a.danger_m) - 2).toFixed(1) + '" text-anchor="end" fill="#9f1239" font-size="13">' + esc(digits(thr(a.danger_m))) + "</text>" +
      '<text x="58" y="' + (y(a.warning_m) + 16).toFixed(1) + '" text-anchor="end" fill="#9a3412" font-size="13">' + esc(digits(thr(a.warning_m))) + "</text>" +
      "</svg>" +
      '<svg class="bg-spark" viewBox="0 0 360 150" role="img" aria-label="readings">' +
      '<line x1="' + x1 + '" y1="' + y1.toFixed(1) + '" x2="' + x2 + '" y2="' + y2.toFixed(1) + '" stroke="#c41e3a" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="' + x1 + '" cy="' + y1.toFixed(1) + '" r="6" fill="#c41e3a"/>' +
      '<circle cx="' + x2 + '" cy="' + y2.toFixed(1) + '" r="7" fill="#c41e3a"/>' +
      '<text x="' + x1 + '" y="140" text-anchor="middle" fill="#0f172a" font-size="14" font-weight="700">' + esc(digits(t(p1.time_ne, p1.time_en))) + "</text>" +
      '<text x="' + x2 + '" y="140" text-anchor="middle" fill="#0f172a" font-size="14" font-weight="700">' + esc(digits(t(p2.time_ne, p2.time_en))) + "</text>" +
      "</svg>";
  }
  function ico(d) {
    return '<svg class="bg-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function head(icon, ne, en) {
    return '<p class="bg-card-k">' + ico(icon) + esc(t(ne, en)) + "</p>";
  }
  function unit(ne, en) {
    var word = t(ne, en);
    return word ? " <span>" + esc(word) + "</span>" : "";
  }
  function rescueTotal(list) {
    return list.reduce(function (sum, item) { return sum + Number(item.count || 0); }, 0);
  }
  function rescueSources(item) {
    var links = [];
    if (item.source_url) {
      links.push('<a href="' + esc(item.source_url) + '" target="_blank" rel="noopener">' + esc(t(item.source_name_ne || item.source_name, item.source_name_en || item.source_name)) + "</a>");
    }
    (item.sources || []).forEach(function (s) {
      links.push('<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(t(s.name_ne, s.name_en)) + "</a>");
    });
    return links.join(" · ");
  }
  function agencyLines(list) {
    var order = [];
    var map = {};
    list.forEach(function (item) {
      var key = (item.agency_ne || "") + "\n" + (item.agency_en || "");
      if (!map[key]) {
        map[key] = 0;
        order.push(key);
      }
      map[key] += Number(item.count || 0);
    });
    return order.map(function (key) {
      var parts = key.split("\n");
      return "<li>" + esc(t(parts[0], parts[1])) + ": <strong>" + esc(digits(String(map[key]))) + "</strong></li>";
    }).join("");
  }
  function rescueUpdateHtml(d) {
    var list = d.rescue_update || [];
    var missing = d.missing || { count: 0, label_en: "out of contact" };
    var rows = list.map(function (item) {
      return "<li><strong>" + esc(digits(t(item.time_ne, item.time_en))) + "</strong> · " +
        esc(t(item.place_ne, item.place_en)) + " · " +
        esc(t(item.method_ne, item.method_en)) + " · " +
        esc(digits(String(item.count))) +
        " · " + rescueSources(item) + "</li>";
    }).join("");
    return '<div class="bg-glance">' +
      '<div class="bg-glance-ok"><p class="bg-glance-k">' + esc(t("हालसम्म उद्धार", "Rescued so far")) + "</p>" +
      '<p class="bg-glance-n"><strong>' + esc(digits(String(rescueTotal(list)))) + "</strong>" + unit("जना", "") + "</p></div>" +
      '<div class="bg-glance-miss"><p class="bg-glance-k">' + esc(t("सम्पर्कविहीन", "Missing")) + "</p>" +
      '<p class="bg-glance-n"><strong>' + esc(digits(String(missing.count))) + "</strong>" + unit("जना", missing.label_en || "out of contact") + "</p></div>" +
      "</div>" +
      '<ul class="bg-agency">' + agencyLines(list) + "</ul>" +
      '<ul class="bg-rescue-log">' + rows + "</ul>";
  }
  function impactLi(item) {
    var text = esc(t(item.ne, item.en));
    if (item.prominent) text = "<strong>" + text + "</strong>";
    return "<li>" + text + ' <span class="bg-tag">' + esc(t(item.by_ne, item.by_en)) + "</span></li>";
  }
  function staleNote(latest) {
    if (!latest || (!latest.note_ne && !latest.note_en)) return "";
    return '<p class="bg-note">' + esc(t(latest.note_ne, latest.note_en)) + "</p>";
  }
  function firstVideo(d) {
    var list = d.media || [];
    for (var i = 0; i < list.length; i++) if (list[i].type === "video") return list[i];
    return null;
  }
  function videoBlock(item) {
    return '<video class="bg-video" controls playsinline preload="metadata" poster="' + esc(item.poster) + '" width="' + item.w + '" height="' + item.h + '" src="' + esc(item.src) + '"></video>' +
      '<p class="bg-cap">' + esc(t(item.caption_ne, item.caption_en)) + "</p>" +
      '<p class="bg-src-line"><a href="' + esc(item.source_url) + '" target="_blank" rel="noopener">' + esc(item.source_url) + "</a></p>";
  }
  function homeHtml(d) {
    var a = d.aarughat;
    var latest = a.latest;
    var impact = (d.impact || []).map(impactLi).join("");
    var rescue = (d.rescue || []).map(function (item) {
      return "<li>" + esc(t(item.ne, item.en)) + ' <span class="bg-tag">' + esc(t(item.by_ne, item.by_en)) + "</span></li>";
    }).join("");
    var times = (d.timeline || []).slice(-4).map(function (item) {
      return '<div class="bg-tl"><time>' + esc(digits(t(item.time_ne, item.time_en))) + "</time><p>" + esc(t(item.ne, item.en)) + "</p></div>";
    }).join("");
    var clip = firstVideo(d);
    var homeMedia = clip
      ? videoBlock(clip) + '<a class="bg-see-all" href="budhi-gandaki.html#photos">' + esc(t("थप तस्विर →", "More photos →")) + "</a>"
      : '<div class="bg-home-thumbs">' + (d.photos || []).slice(0, 3).map(function (p) {
        return '<a href="budhi-gandaki.html#photos"><img src="' + esc(p.src) + '" width="' + p.w + '" height="' + p.h + '" alt="' + esc(t(p.alt_ne, p.alt_en)) + '" loading="lazy" decoding="async"></a>';
      }).join("") + "</div>";
    var calls = phones((d.contacts || []).filter(function (c) { return c.home; }));
    return '<div class="bg-grid bg-home-grid">' +
      '<article class="bg-card">' + head("M12 3v18M8 7h8M7 12h10M8 17h8", "अहिलेको अवस्था", "Current status") +
      '<p class="bg-pill">' + esc(t(d.status_ne, d.status_en)) + "</p>" +
      '<p class="bg-big"><strong>' + esc(digits(lvl(latest.level_m))) + "</strong> <span>" + esc(t("मि.", "m")) + "</span></p>" +
      "<p>" + esc(t("खतरा", "danger")) + " <strong>" + esc(digits(thr(a.danger_m))) + "</strong> " + esc(t("मि.", "m")) +
      " · " + arrow(latest.trend) + " " + esc(trendWord(latest.trend)) +
      " · " + esc(digits(t(latest.time_ne, latest.time_en))) + "</p>" +
      staleNote(latest) +
      bar(latest.level_m, a.danger_m, d.scale_max_m || 10) + "</article>" +
      '<article class="bg-card">' + head("M3 8c2 2 4 2 6 0s4-2 6 0 4 2 6 0M3 14c2 2 4 2 6 0s4-2 6 0 4 2 6 0", "तल्लोतटीय नदी", "Downstream rivers") +
      downRows(d) + "</article>" +
      '<article class="bg-card">' + head("M4 20V10l8-6 8 6v10M9 20v-6h6v6", "क्षति (प्रारम्भिक)", "Impact (reported)") +
      "<ul>" + impact + "</ul></article>" +
      '<article class="bg-card bg-rescue">' + head("M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 11v4M12 8h.01", "उद्धार अपडेट", "Rescue update") +
      rescueUpdateHtml(d) +
      '<a class="bg-see-all" href="budhi-gandaki.html#rescue-update">' + esc(t("सबै हेर्नुहोस् →", "See all →")) + "</a></article>" +
      '<article class="bg-card">' + head("M12 3v6M8 9h8l2 4H6l2-4zM7 13v6M17 13v6M5 19h14", "उद्धार र राहत", "Rescue & relief") +
      "<ul>" + rescue + "</ul></article>" +
      '<article class="bg-card">' + head("M12 19V5M6 11l6-6 6 6", "सुरक्षित स्थानमा जानुहोस्", "Who should move") +
      "<p>" + esc(t(d.evacuate_ne, d.evacuate_en)) + "</p>" +
      '<p class="bg-tag">' + esc(t(d.evacuate_by_ne, d.evacuate_by_en)) + "</p>" +
      "<p>" + esc(t(d.districts_ne, d.districts_en)) + "</p></article>" +
      '<article class="bg-card">' + head("M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "समयरेखा", "Timeline") +
      times +
      '<a class="bg-see-all" href="budhi-gandaki.html#today">' + esc(t("सबै हेर्नुहोस् →", "See all →")) + "</a></article>" +
      '<article class="bg-card">' + head("M4 6h16v12H4zM8 18l3-3 2 2 3-4 4 5", "भिडियो", "Video") +
      homeMedia + "</article>" +
      '<article class="bg-card">' + head("M7 3h4l1 3h5v14H7zM10 11h4M12 9v4", "सम्पर्क", "Contacts") +
      calls + "</article></div>" +
      '<a class="bg-home-more" href="budhi-gandaki.html">' + esc(t("पूरा विवरण →", "Full details →")) + "</a>";
  }
  function downRows(d) {
    return (d.downstream || []).map(function (s) {
      var pct = Math.max(4, Math.min(100, s.level_m / s.warning_m * 100));
      var danger = s.danger_m == null ? "—" : digits(thr(s.danger_m));
      return '<article class="bg-mini-row"><div class="bg-row-top"><h3>' + esc(t(s.name_ne, s.name_en)) + "</h3>" + chip(s.status) + "</div>" +
        "<p><strong>" + esc(digits(lvl(s.level_m))) + "</strong> " + esc(t("मि.", "m")) +
        " · " + esc(digits(t(s.time_ne, s.time_en))) + " · " + arrow(s.trend) + " " + esc(trendWord(s.trend)) + "</p>" +
        '<div class="bg-mini" aria-hidden="true"><span style="width:' + pct.toFixed(0) + '%"></span></div>' +
        "<p>" + esc(t("सतर्कता", "Alert level")) + " " + esc(digits(thr(s.warning_m))) +
        " · " + esc(t("खतरा", "danger")) + " " + esc(danger) + "</p></article>";
    }).join("");
  }
  function pageHtml(d) {
    var a = d.aarughat;
    var latest = a.latest;
    var impact = (d.impact || []).map(impactLi).join("");
    var rescue = (d.rescue || []).map(function (item) {
      return "<li>" + esc(t(item.ne, item.en)) + ' <span class="bg-tag">' + esc(t(item.by_ne, item.by_en)) + "</span></li>";
    }).join("");
    var dos = (d.dos || []).map(function (item) { return "<li>" + esc(t(item.ne, item.en)) + "</li>"; }).join("");
    var times = (d.timeline || []).map(function (item) {
      var link = item.href ? ' <a href="' + esc(item.href) + '" target="_blank" rel="noopener">' + esc(t(item.by_ne, item.by_en)) + "</a>" : ' <span class="bg-tag">' + esc(t(item.by_ne, item.by_en)) + "</span>";
      return '<div class="bg-tl"><time>' + esc(digits(t(item.time_ne, item.time_en))) + "</time><p>" + esc(t(item.ne, item.en)) + link + "</p></div>";
    }).join("");
    var pics = (d.photos || []).map(function (p) {
      return '<figure><a href="' + esc(p.src) + '"><img src="' + esc(p.src) + '" width="' + p.w + '" height="' + p.h + '" alt="' + esc(t(p.alt_ne, p.alt_en)) + '" loading="lazy" decoding="async"></a>' +
        '<figcaption>' + esc(t(d.photo_caption_ne, d.photo_caption_en)) + ' · <a href="' + esc(d.photo_credit) + '" target="_blank" rel="noopener">' + esc(d.photo_credit_label) + "</a></figcaption></figure>";
    }).join("");
    var sources = (d.sources || []).map(function (s) {
      return '<li><a href="' + esc(s.href) + '" target="_blank" rel="noopener">' + esc(t(s.ne, s.en)) + "</a></li>";
    }).join("");
    var reads = (a.history || []).map(function (h) {
      return "<li><strong>" + esc(digits(t(h.time_ne, h.time_en))) + "</strong> " + esc(digits(lvl(h.level_m))) + " " + esc(t("मि.", "m")) +
        " · " + arrow(h.trend) + " " + esc(trendWord(h.trend)) + " · " + esc(t(h.note_ne, h.note_en)) + "</li>";
    }).join("");
    return '<div class="bg-grid">' +
      '<article class="bg-card"><p class="bg-card-k">' + esc(t("स्थिति", "Status")) + "</p>" +
      '<p class="bg-pill">' + esc(t(d.status_ne, d.status_en)) + "</p>" +
      '<p class="bg-big"><strong>' + esc(digits(lvl(latest.level_m))) + "</strong> <span>" + esc(t("मि.", "m")) + "</span></p>" +
      "<p>" + esc(t("खतरा", "danger")) + " <strong>" + esc(digits(thr(a.danger_m))) + "</strong> " + esc(t("मि.", "m")) +
      " · " + arrow(latest.trend) + " " + esc(trendWord(latest.trend)) + "</p>" +
      "<p>" + esc(t(a.name_ne, a.name_en)) + " · " + esc(t("स्टेसन", "station")) + " " + esc(digits(a.station_index)) +
      " · " + esc(digits(t(latest.time_ne, latest.time_en))) + "</p>" +
      staleNote(latest) +
      "<p>" + esc(t(d.guidance_ne, d.guidance_en)) + "</p></article>" +
      '<article class="bg-card" id="level"><p class="bg-card-k">' + esc(t("नदीको सतह", "River level")) + "</p>" +
      gaugeSvg(a, d.scale_max_m || 10) +
      "<ul class=\"bg-reads\">" + reads + "</ul>" +
      "<p>" + esc(t("रातो क्षेत्र खतरा तहभन्दा माथि। पहेँलो धर्को सतर्कता तह।", "Red is above the danger level. The amber line is the alert level.")) + "</p></article>" +
      '<article class="bg-card" id="downstream"><p class="bg-card-k">' + esc(t("तल्लो तटीय निगरानी", "Downstream watch")) + "</p>" +
      "<p class=\"bg-feed\">" + esc(t(d.feed_label_ne, d.feed_label_en)) + "</p>" +
      downRows(d) + "</article>" +
      '<article class="bg-card" id="impact"><p class="bg-card-k">' + esc(t("प्रारम्भिक विवरण", "Reported so far")) + "</p>" +
      "<p>" + esc(t(d.impact_note_ne, d.impact_note_en)) + "</p><ul>" + impact + "</ul></article>" +
      '<article class="bg-card bg-rescue" id="rescue-update"><p class="bg-card-k">' + esc(t("उद्धार अपडेट", "Rescue update")) + "</p>" +
      rescueUpdateHtml(d) + "</article>" +
      '<article class="bg-card" id="rescue"><p class="bg-card-k">' + esc(t("उद्धार र राहत", "Rescue and relief")) + "</p>" +
      "<ul>" + rescue + "</ul></article>" +
      '<article class="bg-card" id="act"><p class="bg-card-k">' + esc(t("अहिले कसले के गर्ने", "Who should act now")) + "</p>" +
      "<h3>" + esc(t("सुरक्षित ठाउँमा सर्नुहोस्", "Move to a safe place")) + "</h3><p>" + esc(t(d.evacuate_ne, d.evacuate_en)) + "</p>" +
      '<p class="bg-tag">' + esc(t(d.evacuate_by_ne, d.evacuate_by_en)) + "</p>" +
      "<h3>" + esc(t("नदी किनार सतर्क", "Stay alert downstream")) + "</h3><p>" + esc(t(d.districts_ne, d.districts_en)) + "</p>" +
      "<ul>" + dos + "</ul></article>" +
      '<article class="bg-card bg-span" id="contacts"><p class="bg-card-k">' + esc(t("आपत्कालीन सम्पर्क", "Emergency contacts")) + "</p>" +
      phones(d.contacts || []) +
      '<p class="bg-src-line"><a href="' + esc(d.contact_source) + '">' + esc(d.contact_source) + "</a></p></article>" +
      (function () {
        var clip = firstVideo(d);
        return clip
          ? '<article class="bg-card bg-span" id="video"><p class="bg-card-k">' + esc(t("भिडियो", "Video")) + "</p>" + videoBlock(clip) + "</article>"
          : "";
      })() +
      '<article class="bg-card bg-span" id="photos"><p class="bg-card-k">' + esc(t("तस्विर", "Photos")) + "</p>" +
      '<div class="bg-gallery">' + pics + "</div></article>" +
      '<article class="bg-card bg-span" id="today"><p class="bg-card-k">' + esc(t("आजको क्रम", "Today")) + "</p>" +
      '<div class="bg-timeline">' + times + "</div></article>" +
      '<article class="bg-card bg-span" id="sources"><p class="bg-card-k">' + esc(t("स्रोत", "Sources")) + "</p>" +
      "<ul class=\"bg-sources\">" + sources + "</ul></article></div>";
  }
  function paint() {
    if (!pack) return;
    document.querySelectorAll("[data-budhi-home]").forEach(function (root) {
      var slot = root.querySelector("[data-budhi-slot]");
      if (slot) slot.innerHTML = homeHtml(pack);
    });
    document.querySelectorAll("[data-budhi-page]").forEach(function (root) {
      root.innerHTML = pageHtml(pack);
    });
    document.querySelectorAll("[data-budhi-updated]").forEach(function (el) {
      el.textContent = t(pack.updated_ne, pack.updated_en);
    });
    document.querySelectorAll("[data-budhi-guide]").forEach(function (el) {
      el.textContent = t(pack.guidance_ne, pack.guidance_en);
    });
  }
  function boot() {
    fetch("data/budhi-gandaki.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) { pack = json; paint(); })
      .catch(function () {});
  }
  if (window.__addLangHook) window.__addLangHook(paint);
  else {
    window.__langHookQ = window.__langHookQ || [];
    window.__langHookQ.push(paint);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
