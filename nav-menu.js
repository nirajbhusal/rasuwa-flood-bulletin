/*! Header menu — mobile drawer below 900px; grouped horizontal bar at 900px and up. */
(function () {
  var head = document.querySelector(".head-stick");
  if (head) {
    var syncArt = function () {
      head.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", syncArt, { passive: true });
    syncArt();
  }
  var homeBtn = document.querySelector(".head-home");
  if (homeBtn) {
    var path = location.pathname || "";
    var onHome = /\/$/.test(path) || /\/index\.html$/.test(path);
    if (onHome) {
      homeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      });
    }
  }
  var nav = document.querySelector("nav.chips");
  var btn = document.getElementById("nav-toggle");
  if (!nav || !btn) return;

  var root = document.documentElement;
  var body = document.body;
  var inner = document.getElementById("nav-chips") || nav.querySelector(".chips-inner");
  var mq = window.matchMedia("(max-width:760px)");
  var backdrop = document.querySelector(".nav-backdrop");
  var lastFocus = null;
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "nav-backdrop";
    backdrop.setAttribute("aria-label", "मेनु बन्द");
    backdrop.setAttribute("tabindex", "-1");
    body.appendChild(backdrop);
  }

  if (!btn.querySelector(".nav-toggle-label")) {
    var lab = document.createElement("span");
    lab.className = "nav-toggle-label";
    lab.setAttribute("data-i18n", "nav_menu");
    lab.textContent = "मेनु";
    btn.appendChild(lab);
  }

  var deskMq = window.matchMedia("(min-width:900px)");
  function isMobile() { return mq.matches; }
  function isDesk() { return !!(deskMq && deskMq.matches); }
  function en() { return document.documentElement.lang === "en"; }

  function placeToggle() {
    btn.classList.remove("is-floating");
    var find = document.querySelector(".top-find");
    var form = find && find.querySelector("form.top-search");
    if (find && form && btn.parentNode !== find) find.insertBefore(btn, form);
    else if (find && btn.parentNode !== find) find.insertBefore(btn, find.firstChild);
  }

  function floatToggle() {
    placeToggle();
  }

  function clearDeskPos() {
    if (!inner) return;
    inner.style.left = "";
    inner.style.right = "";
    inner.style.top = "";
    inner.style.width = "";
    inner.style.maxHeight = "";
    inner.style.position = "";
    inner.style.zIndex = "";
    inner.style.justifyContent = "";
    inner.style.transform = "";
  }
  function placePanel() {
    if (!inner) return;
    if (isMobile() || !nav.classList.contains("is-open")) {
      clearDeskPos();
      return;
    }
    var r = btn.getBoundingClientRect();
    var width = Math.min(420, Math.max(220, window.innerWidth - 16));
    var left = Math.round(r.left);
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    if (left < 8) left = 8;
    var top = Math.round(r.bottom + 8);
    var maxH = Math.max(180, Math.min(560, Math.round(window.innerHeight * 0.7), window.innerHeight - top - 12));
    inner.style.position = "fixed";
    inner.style.zIndex = "2000";
    inner.style.left = left + "px";
    inner.style.right = "auto";
    inner.style.top = top + "px";
    inner.style.width = width + "px";
    inner.style.maxHeight = maxH + "px";
    inner.style.justifyContent = "flex-start";
    inner.style.transform = "none";
  }

  function ensureDrawerHead() {
    if (!inner || inner.querySelector(".nav-drawer-head")) return;
    var head = document.createElement("div");
    head.className = "nav-drawer-head";
    var title = document.createElement("span");
    title.className = "nav-drawer-title";
    title.setAttribute("data-i18n", "nav_menu");
    title.textContent = en() ? "Menu" : "मेनु";
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "nav-drawer-close";
    closeBtn.setAttribute("aria-label", en() ? "Close menu" : "मेनु बन्द");
    closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/></svg>';
    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
    head.appendChild(title);
    head.appendChild(closeBtn);
    inner.insertBefore(head, inner.firstChild);
  }

  var GROUPS = [
    { key: "home", ne: "गृह", en: "Home", hrefs: ["index.html"] },
    { key: "alerts", ne: "चेतावनी", en: "Alerts", hrefs: ["notices.html", "notices.html#roads", "electricity.html", "weather.html", "photos.html"] },
    { key: "people", ne: "मानिस", en: "People", hrefs: ["names.html", "contact.html"] },
    { key: "gov", ne: "सरकार", en: "Government", hrefs: ["gov.html", "markets.html"] },
    { key: "relief", ne: "राहत", en: "Relief", hrefs: ["donate.html", "response.html", "damage.html", "supply.html"] },
    { key: "more", ne: "थप", en: "More", hrefs: ["about.html", "festival.html"] }
  ];
  var ICONS = {
    "index.html": "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z",
    "names.html": "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 19c.4-2.4 2.4-4 5-4s4.6 1.6 5 4H3zm10 .1c.3-1.6 1.4-2.9 3-3.6 1.6.4 2.8 1.5 3.2 3.5H13z",
    "donate.html": "M12 21s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z",
    "notices.html": "M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 1.5V9h4.5",
    "notices.html#roads": "M4 17h16M6 17V8l6-3 6 3v9",
    "weather.html": "M7 16h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.7 1.5A3 3 0 0 0 7 16z",
    "contact.html": "M7 3h3l1.5 4-2 1.2a12 12 0 0 0 6.3 6.3L17 13l4 1.5V18a2 2 0 0 1-2.2 2A16 16 0 0 1 4 6.2 2 2 0 0 1 6 4z",
    "gov.html": "M4 10h16M6 10V20M10 10V20M14 10V20M18 10V20M3 20h18M12 3 3 9h18z",
    "markets.html": "M4 18V6M4 18h16M8 18V10M12 18V8M16 18v-5",
    "response.html": "M12 3 4 7v5c0 4.5 3.2 7.4 8 9 4.8-1.6 8-4.5 8-9V7z",
    "photos.html": "M4 7h3l2-2h6l2 2h3v12H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "damage.html": "M12 3 2 20h20L12 3zm0 6v5m0 3h.01",
    "supply.html": "M8 7h8l1 3H7zm-2 3h12v9H6z",
    "electricity.html": "M13 2 4 14h7l-1 8 9-12h-7z",
    "about.html": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-10v6m0-8h.01",
    "festival.html": "M12 21c4 0 7-3 7-6 0-4-3-6-3-9 0 3-2 4-4 4s-4-1-4-4c0 3-3 5-3 9 0 3 3 6 7 6z"
  };

  function byHref(href) {
    if (!inner) return null;
    var found = null;
    inner.querySelectorAll("a[href]").forEach(function (a) {
      if (!found && a.getAttribute("href") === href) found = a;
    });
    return found;
  }
  function makeLink(href, key, text) {
    var a = document.createElement("a");
    a.href = href;
    a.setAttribute("data-i18n", key);
    a.textContent = text;
    return a;
  }
  function iconFor(a) {
    var href = a.getAttribute("href") || "";
    if (a.querySelector("svg.nav-ico, svg")) return;
    var d = ICONS[href] || ICONS[href.split("#")[0]] || "M6 12h12";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "nav-ico");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);
    a.insertBefore(svg, a.firstChild);
  }
  function splitLabel(a) {
    if (a.querySelector("[data-i18n]")) return;
    if (!a.hasAttribute("data-i18n")) return;
    var key = a.getAttribute("data-i18n");
    var span = document.createElement("span");
    span.setAttribute("data-i18n", key);
    span.textContent = (a.textContent || "").replace(/\s+/g, " ").trim();
    a.removeAttribute("data-i18n");
    Array.prototype.slice.call(a.childNodes).forEach(function (n) {
      if (n.nodeType === 3) a.removeChild(n);
    });
    a.appendChild(span);
  }
  function paintGroups() {
    if (!inner) return;
    inner.querySelectorAll(".nav-group").forEach(function (g) {
      g.textContent = en() ? g.getAttribute("data-en") : g.getAttribute("data-ne");
    });
    var title = inner.querySelector(".nav-drawer-title");
    if (title && !(window.I18N && window.t)) title.textContent = en() ? "Menu" : "मेनु";
    var x = inner.querySelector(".nav-drawer-close");
    if (x) x.setAttribute("aria-label", en() ? "Close menu" : "मेनु बन्द");
    backdrop.setAttribute("aria-label", en() ? "Close menu" : "मेनु बन्द");
  }
  function groupLinks() {
    if (!inner || inner.getAttribute("data-grouped") === "1") {
      paintGroups();
      return;
    }
    if (!byHref("notices.html#roads")) {
      var roads = makeLink("notices.html#roads", "nav_roads", "सडक");
      var notices = byHref("notices.html");
      if (notices && notices.nextSibling) inner.insertBefore(roads, notices.nextSibling);
      else inner.appendChild(roads);
    }
    if (!byHref("electricity.html")) {
      var elec = makeLink("electricity.html", "nav_electricity", "बिजुली");
      var afterRoads = byHref("notices.html#roads") || byHref("notices.html");
      if (afterRoads && afterRoads.nextSibling) inner.insertBefore(elec, afterRoads.nextSibling);
      else inner.appendChild(elec);
    }
    if (!byHref("markets.html")) {
      var markets = makeLink("markets.html", "nav_markets", "पुँजी बजार");
      var gov = byHref("gov.html");
      if (gov && gov.nextSibling) inner.insertBefore(markets, gov.nextSibling);
      else inner.appendChild(markets);
    }
    if (!byHref("festival.html")) {
      var fest = makeLink("festival.html", "nav_festival", "चाडपर्व");
      var about = byHref("about.html");
      if (about && about.nextSibling) inner.insertBefore(fest, about.nextSibling);
      else inner.appendChild(fest);
    }
    var head = inner.querySelector(".nav-drawer-head");
    GROUPS.forEach(function (g) {
      var label = document.createElement("p");
      label.className = "nav-group";
      label.setAttribute("data-ne", g.ne);
      label.setAttribute("data-en", g.en);
      label.textContent = g.ne;
      inner.appendChild(label);
      g.hrefs.forEach(function (href) {
        var a = byHref(href);
        if (!a) return;
        splitLabel(a);
        iconFor(a);
        inner.appendChild(a);
      });
    });
    if (head) inner.insertBefore(head, inner.firstChild);
    inner.querySelectorAll("a[href]").forEach(function (a) {
      if (a.parentNode === inner) {
        splitLabel(a);
        iconFor(a);
      }
    });
    inner.setAttribute("data-grouped", "1");
    paintGroups();
    markCurrent();
  }

  function portalOut() {
    if (!inner || inner.parentNode === body) return;
    ensureDrawerHead();
    groupLinks();
    inner.classList.add("nav-drawer-panel");
    clearDeskPos();
    body.appendChild(inner);
  }
  function portalIn() {
    if (!inner) return;
    inner.classList.remove("nav-drawer-panel");
    if (inner.parentNode !== nav) nav.appendChild(inner);
  }
  function syncStick() {
    var h = document.querySelector(".head-stick");
    if (!h) return;
    root.style.setProperty("--stick", h.offsetHeight + "px");
  }
  function focusEl(node) {
    if (!node || !node.focus) return;
    try { node.focus({ preventScroll: true }); } catch (e) { try { node.focus(); } catch (e2) {} }
  }
  function focusables() {
    var host = inner;
    var nodes = host ? host.querySelectorAll("a[href], button") : [];
    var list = [];
    Array.prototype.forEach.call(nodes, function (node) {
      if (node.disabled || node.getAttribute("aria-hidden") === "true") return;
      var rect = node.getBoundingClientRect();
      if (rect.width < 1 && rect.height < 1) return;
      list.push(node);
    });
    if (btn && list.indexOf(btn) < 0) list.unshift(btn);
    return list;
  }
  function setOpen(on) {
    if (isDesk()) on = false;
    on = !!on;
    var mobile = isMobile();
    nav.classList.toggle("is-open", on);
    root.classList.toggle("nav-drawer-open", on && mobile);
    body.classList.toggle("nav-drawer-open", on && mobile);
    btn.setAttribute("aria-expanded", on ? "true" : "false");
    if (on) {
      lastFocus = document.activeElement;
      groupLinks();
      if (mobile) {
        portalOut();
        body.style.overflow = "hidden";
        floatToggle(true);
      } else {
        portalIn();
        body.style.overflow = "";
        floatToggle(false);
        placePanel();
        if (inner) inner.scrollTop = 0;
      }
      var first = inner && inner.querySelector("a[href]");
      focusEl(first || btn);
    } else {
      portalIn();
      floatToggle(false);
      body.style.overflow = "";
      var back = lastFocus && lastFocus !== document.body ? lastFocus : btn;
      lastFocus = null;
      focusEl(back);
    }
  }
  function close() { setOpen(false); }
  function toggle() { setOpen(!nav.classList.contains("is-open")); }

  btn.addEventListener("click", function (e) {
    if (isDesk()) return;
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });
  backdrop.addEventListener("click", function (e) {
    e.preventDefault();
    close();
  });
  document.addEventListener("click", function (e) {
    if (!nav.classList.contains("is-open") || isMobile()) return;
    var t = e.target;
    if (!t) return;
    if (t === btn || btn.contains(t)) return;
    if (inner && inner.contains(t)) return;
    close();
  });
  if (inner) {
    inner.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a");
      if (!a) return;
      setTimeout(close, 50);
    });
  }
  window.addEventListener("pagehide", function () {
    if (nav.classList.contains("is-open")) close();
    closeDeskMenus();
    try {
      sessionStorage.setItem("rasuwa-scroll:" + location.pathname + location.search, String(window.scrollY));
    } catch (e) {}
  });
  document.addEventListener("keydown", function (e) {
    if (!nav.classList.contains("is-open")) return;
    if (e.key === "Escape" || e.key === "Esc") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    var list = focusables();
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      focusEl(last);
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      focusEl(first);
    }
  });

  function markCurrent() {
    try {
      var file = (location.pathname || "").split("/").pop() || "index.html";
      if (!file) file = "index.html";
      var hash = location.hash || "";
      var host = inner || nav;
      if (!host) return;
      host.querySelectorAll("a[href]").forEach(function (a) {
        a.classList.remove("is-current");
        a.removeAttribute("aria-current");
        var href = a.getAttribute("href") || "";
        var base = href.split("#")[0].split("/").pop();
        var frag = href.indexOf("#") >= 0 ? "#" + href.split("#")[1] : "";
        var same = base === file || (file === "index.html" && (base === "index.html" || base === ""));
        if (!same) return;
        if (file === "notices.html" && hash === "#roads") {
          if (frag !== "#roads") return;
        } else if (frag && frag !== hash) return;
        a.classList.add("is-current");
        a.setAttribute("aria-current", "page");
      });
    } catch (e) {}
  }

  function onViewportChange() {
    if (isDesk()) {
      if (nav.classList.contains("is-open")) close();
      ensureDeskNav();
      layoutDeskNav();
      syncStick();
      return;
    }
    if (nav.classList.contains("is-open")) {
      if (isMobile()) {
        portalOut();
        root.classList.add("nav-drawer-open");
        body.classList.add("nav-drawer-open");
        body.style.overflow = "hidden";
        floatToggle(true);
      } else {
        portalIn();
        root.classList.remove("nav-drawer-open");
        body.classList.remove("nav-drawer-open");
        body.style.overflow = "";
        floatToggle(false);
        placePanel();
      }
    } else placeToggle();
    syncStick();
  }
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", onViewportChange);
  else if (typeof mq.addListener === "function") mq.addListener(onViewportChange);
  if (typeof deskMq.addEventListener === "function") deskMq.addEventListener("change", onViewportChange);
  else if (typeof deskMq.addListener === "function") deskMq.addListener(onViewportChange);
  window.addEventListener("resize", function () {
    syncStick();
    if (isDesk()) {
      layoutDeskNav();
      if (deskOpen) placeDeskMenu(deskOpen, deskOpen.querySelector(":scope > .hnav-menu"));
      if (deskMenu && !deskMenu.hidden) placeDeskMenu(deskMore, deskMenu);
    } else placePanel();
  });
  window.addEventListener("scroll", function () {
    if (nav.classList.contains("is-open") && !isMobile()) placePanel();
  }, { passive: true });
  window.addEventListener("hashchange", function () {
    markCurrent();
    paintDeskCurrent();
  });

  /* Desktop tabs are the same groups as the mobile drawer. A one-page group
     is a direct link. Larger groups open a dropdown. Overflow groups go under थप / More. */
  var SHORT = {
    "index.html": { ne: "ड्यासबोर्ड", en: "Dashboard" },
    "notices.html": { ne: "सूचना", en: "Notices" },
    "notices.html#roads": { ne: "सडक", en: "Roads" },
    "electricity.html": { ne: "बिजुली", en: "Electricity" },
    "weather.html": { ne: "मौसम", en: "Weather" },
    "photos.html": { ne: "ग्यालरी", en: "Gallery" },
    "names.html": { ne: "नामावली", en: "Names" },
    "contact.html": { ne: "हेल्पलाइन", en: "Helpline" },
    "gov.html": { ne: "सरकार", en: "Government" },
    "markets.html": { ne: "बजार", en: "Markets" },
    "donate.html": { ne: "राहत कोष", en: "Relief fund" },
    "response.html": { ne: "प्रतिक्रिया", en: "Response" },
    "damage.html": { ne: "क्षति", en: "Damage" },
    "supply.html": { ne: "एलपीजी", en: "LPG" },
    "about.html": { ne: "बारेमा", en: "About" },
    "festival.html": { ne: "चाडपर्व", en: "Festival" }
  };
  var DESK_MORE_EXTRA = [
    { href: "festival.html", ne: "चाडपर्व", en: "Festival" }
  ];
  var GROUP_ICONS = {
    alerts: "M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9M10 21a2 2 0 0 0 4 0"
  };
  var MORE_DOTS = "M5 12h.01M12 12h.01M18 12h.01";
  var deskBar = null;
  var deskTabsHost = null;
  var deskMore = null;
  var deskMoreBtn = null;
  var deskMenu = null;
  var deskSlots = [];
  var deskOpen = null;
  var deskLaying = false;
  var deskFit = -1;
  var deskRemeasure = true;

  function fitTabs(widths, container, moreWidth, gap) {
    gap = gap || 0;
    var n = widths.length;
    function used(count, withMore) {
      var w = 0;
      var i;
      for (i = 0; i < count; i++) w += widths[i];
      if (count > 1) w += gap * (count - 1);
      if (withMore) w += moreWidth;
      return w;
    }
    if (used(n, false) <= container + 0.5) return n;
    var count = n;
    while (count > 0 && used(count, true) > container + 0.5) count -= 1;
    return count;
  }

  function tabIsCurrent(href) {
    var file = (location.pathname || "").split("/").pop() || "index.html";
    if (!file) file = "index.html";
    var hash = location.hash || "";
    href = href || "";
    var base = href.split("#")[0].split("/").pop();
    var frag = href.indexOf("#") >= 0 ? "#" + href.split("#")[1] : "";
    var same = base === file || ((file === "index.html" || file === "") && (base === "index.html" || base === ""));
    if (!same) return false;
    if (file === "notices.html" && hash === "#roads") return frag === "#roads";
    if (frag && frag !== hash) return false;
    return true;
  }
  function shortText(href) {
    var s = SHORT[href];
    if (!s) return "";
    return en() ? s.en : s.ne;
  }
  function cloneDeskIcon(a) {
    var svg = a.querySelector("svg");
    var node;
    if (svg) {
      node = svg.cloneNode(true);
    } else {
      var href = a.getAttribute("href") || "";
      var d = ICONS[href] || ICONS[href.split("#")[0]] || "M6 12h12";
      node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      node.setAttribute("viewBox", "0 0 24 24");
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.8");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("stroke-linecap", "round");
      node.appendChild(path);
    }
    node.setAttribute("class", "hnav-ico");
    node.setAttribute("width", "18");
    node.setAttribute("height", "18");
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("focusable", "false");
    return node;
  }
  function deskGroupPlan(groups) {
    return groups.map(function (g) {
      return { key: g.key, menu: g.hrefs.length > 1, hrefs: g.hrefs.slice() };
    });
  }
  function deskIcon(href) {
    var sample = byHref(href);
    if (sample && sample.querySelector("svg")) return cloneDeskIcon(sample);
    var d = ICONS[href] || ICONS[(href || "").split("#")[0]] || "M6 12h12";
    var node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    node.setAttribute("viewBox", "0 0 24 24");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");
    node.appendChild(path);
    node.setAttribute("class", "hnav-ico");
    node.setAttribute("width", "18");
    node.setAttribute("height", "18");
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("focusable", "false");
    return node;
  }
  function pathIcon(d, sw) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    node.setAttribute("viewBox", "0 0 24 24");
    node.setAttribute("class", "hnav-ico");
    node.setAttribute("width", "18");
    node.setAttribute("height", "18");
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("focusable", "false");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", sw || "1.8");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");
    node.appendChild(path);
    return node;
  }
  function deskCaret() {
    var caret = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    caret.setAttribute("class", "hnav-caret");
    caret.setAttribute("viewBox", "0 0 24 24");
    caret.setAttribute("width", "14");
    caret.setAttribute("height", "14");
    caret.setAttribute("aria-hidden", "true");
    caret.setAttribute("focusable", "false");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M6 9l6 6 6-6");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    caret.appendChild(path);
    return caret;
  }
  function makeDeskLink(href) {
    var tab = document.createElement("a");
    tab.className = "hnav-tab";
    tab.setAttribute("data-href", href);
    tab.href = href;
    tab.style.flex = "none";
    tab.style.whiteSpace = "nowrap";
    tab.appendChild(deskIcon(href));
    var lab = document.createElement("span");
    lab.className = "hnav-lab";
    lab.textContent = shortText(href) || href;
    tab.appendChild(lab);
    tab.addEventListener("click", onDeskTabClick);
    return tab;
  }
  function paintDeskLabels() {
    if (!deskBar) return;
    deskSlots.forEach(function (slot) {
      var headLab = slot.querySelector(":scope > .hnav-parent .hnav-lab, :scope > a.hnav-tab .hnav-lab");
      if (headLab) headLab.textContent = en() ? slot.getAttribute("data-en") : slot.getAttribute("data-ne");
      slot.querySelectorAll(":scope > .hnav-menu a.hnav-tab").forEach(function (tab) {
        var lab = tab.querySelector(".hnav-lab");
        var text = shortText(tab.getAttribute("data-href") || "");
        if (lab && text) lab.textContent = text;
      });
    });
    var moreLab = deskMoreBtn && deskMoreBtn.querySelector(".hnav-lab");
    if (moreLab) moreLab.textContent = en() ? "More" : "थप";
    if (deskMoreBtn) deskMoreBtn.setAttribute("aria-label", en() ? "More" : "थप");
    if (deskMore) deskMore._w = 0;
    deskSlots.forEach(function (slot) { slot._w = 0; });
    deskRemeasure = true;
    deskBar.setAttribute("aria-label", en() ? "Sections" : "खण्डहरू");
  }
  function deskLinks() {
    if (!deskBar) return [];
    return Array.prototype.slice.call(deskBar.querySelectorAll("a.hnav-tab"));
  }
  function paintDeskCurrent() {
    if (!deskBar) return;
    var current = null;
    var mode = "page";
    var links = deskLinks();
    var i;
    for (i = 0; i < links.length; i++) {
      if (tabIsCurrent(links[i].getAttribute("data-href") || "")) {
        current = links[i];
        break;
      }
    }
    deskLinks().forEach(function (tab) {
      var on = tab === current;
      tab.classList.toggle("is-current", on);
      if (on) tab.setAttribute("aria-current", mode);
      else tab.removeAttribute("aria-current");
    });
    deskSlots.forEach(function (slot) {
      var parent = slot.querySelector(":scope > .hnav-parent");
      if (!parent) return;
      var on = !!(current && slot.contains(current));
      parent.classList.toggle("is-current", on);
      if (on) parent.setAttribute("aria-current", mode);
      else parent.removeAttribute("aria-current");
    });
    var inMore = !!(current && deskMenu && deskMenu.contains(current));
    if (deskMoreBtn) {
      deskMoreBtn.classList.toggle("is-current", inMore);
      if (inMore) deskMoreBtn.setAttribute("aria-current", "true");
      else deskMoreBtn.removeAttribute("aria-current");
    }
  }
  function closeDeskSlot(slot) {
    if (!slot) return;
    if (slot._openT) { clearTimeout(slot._openT); slot._openT = 0; }
    if (slot._closeT) { clearTimeout(slot._closeT); slot._closeT = 0; }
    var menu = slot.querySelector(":scope > .hnav-menu");
    var btn = slot.querySelector(":scope > .hnav-parent");
    if (menu) menu.hidden = true;
    slot.classList.remove("is-open");
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (deskOpen === slot) deskOpen = null;
  }
  function closeOverflow() {
    if (!deskMenu) return;
    deskMenu.hidden = true;
    if (deskMore) deskMore.classList.remove("is-open");
    if (deskMoreBtn) deskMoreBtn.setAttribute("aria-expanded", "false");
  }
  function closeDeskMenus() {
    deskSlots.forEach(closeDeskSlot);
    closeOverflow();
  }
  function placeDeskMenu(anchor, menu) {
    if (!menu || !anchor) return;
    menu.style.left = "";
    menu.style.right = "";
    menu.classList.remove("is-flip");
    if (window.getComputedStyle(menu).position !== "absolute") return;
    var width = menu.offsetWidth || 240;
    var rect = anchor.getBoundingClientRect();
    var left = rect.left;
    if (left + width > window.innerWidth - 8) left = rect.right - width;
    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    menu.style.left = Math.round(left - rect.left) + "px";
    menu.style.right = "auto";
  }
  function openDeskSlot(slot, focusFirst) {
    if (!slot || !isDesk()) return;
    var menu = slot.querySelector(":scope > .hnav-menu");
    if (!menu) return;
    deskSlots.forEach(function (other) { if (other !== slot) closeDeskSlot(other); });
    if (deskMenu && !deskMenu.contains(slot)) closeOverflow();
    menu.hidden = false;
    slot.classList.add("is-open");
    var btn = slot.querySelector(":scope > .hnav-parent");
    if (btn) btn.setAttribute("aria-expanded", "true");
    deskOpen = slot;
    placeDeskMenu(slot, menu);
    if (focusFirst) {
      var first = menu.querySelector("a.hnav-tab");
      focusEl(first || btn);
    }
  }
  function openOverflow(focusFirst) {
    if (!deskMenu || !deskMenu.children.length) return;
    deskSlots.forEach(closeDeskSlot);
    deskMenu.hidden = false;
    if (deskMore) deskMore.classList.add("is-open");
    if (deskMoreBtn) deskMoreBtn.setAttribute("aria-expanded", "true");
    placeDeskMenu(deskMore, deskMenu);
    if (focusFirst) {
      var first = deskMenu.querySelector(".hnav-parent, a.hnav-tab");
      focusEl(first || deskMoreBtn);
    }
  }
  function armHover(node, openFn, closeFn) {
    node.addEventListener("pointerenter", function (e) {
      if (!isDesk() || (e.pointerType && e.pointerType !== "mouse")) return;
      if (node._closeT) { clearTimeout(node._closeT); node._closeT = 0; }
      if (node._openT) clearTimeout(node._openT);
      node._openT = setTimeout(function () {
        node._openT = 0;
        if (isDesk()) openFn();
      }, 160);
    });
    node.addEventListener("pointerleave", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      if (node._openT) { clearTimeout(node._openT); node._openT = 0; }
      if (node._closeT) clearTimeout(node._closeT);
      node._closeT = setTimeout(function () {
        node._closeT = 0;
        closeFn();
      }, 220);
    });
  }
  function onDeskTabClick(e) {
    var tab = e.currentTarget;
    if (!tab || !isDesk()) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    closeDeskMenus();
  }
  function layoutDeskNav() {
    if (deskLaying || !deskBar || !isDesk() || !deskTabsHost) return;
    if (deskTabsHost.clientWidth < 20) return;
    deskLaying = true;
    try {
      var moreSlot = null;
      var others = [];
      var i;
      for (i = 0; i < deskSlots.length; i++) {
        if (deskSlots[i].getAttribute("data-group") === "more") moreSlot = deskSlots[i];
        else others.push(deskSlots[i]);
      }
      others.forEach(function (slot) { slot.hidden = false; });
      if (moreSlot) {
        var menu = moreSlot.querySelector(":scope > .hnav-menu");
        if (menu) menu.querySelectorAll(".hnav-overflow, .hnav-sep.is-overflow").forEach(function (n) { n.remove(); });
      }
      if (deskRemeasure) {
        others.forEach(function (slot) { slot._w = 0; });
        if (moreSlot) moreSlot._w = 0;
        deskRemeasure = false;
      }
      var rowEl = deskBar.querySelector(".hnav-row");
      var full = rowEl ? rowEl.clientWidth : deskTabsHost.clientWidth;
      var widths = others.map(function (slot) {
        if (!slot._w) slot._w = slot.getBoundingClientRect().width;
        return slot._w;
      });
      var moreTaken = 0;
      if (moreSlot) {
        if (!moreSlot._w) moreSlot._w = moreSlot.getBoundingClientRect().width || 96;
        moreTaken = moreSlot._w + 4;
      }
      var count = fitTabs(widths, Math.max(0, full - moreTaken), 0, 4);
      var overflow = [];
      for (i = 0; i < others.length; i++) {
        others[i].hidden = i >= count;
        if (!others[i].hidden && others[i].parentNode !== deskTabsHost) deskTabsHost.appendChild(others[i]);
        if (others[i].hidden) {
          others[i].querySelectorAll("a.hnav-tab:not(.hnav-overflow)").forEach(function (a) {
            var href = a.getAttribute("data-href");
            if (href) overflow.push(href);
          });
        }
      }
      if (moreSlot && moreSlot.parentNode !== deskTabsHost) deskTabsHost.appendChild(moreSlot);
      if (moreSlot && overflow.length) {
        var panel = moreSlot.querySelector(":scope > .hnav-menu");
        if (panel) {
          var sep = document.createElement("div");
          sep.className = "hnav-sep is-overflow";
          sep.setAttribute("role", "separator");
          panel.appendChild(sep);
          overflow.forEach(function (href) {
            var item = makeDeskLink(href);
            item.classList.add("hnav-overflow");
            item.setAttribute("role", "menuitem");
            panel.appendChild(item);
          });
        }
      }
      deskFit = count;
      paintDeskCurrent();
    } finally {
      deskLaying = false;
    }
  }
  function ensureDeskNav() {
    if (deskBar || !inner) return;
    groupLinks();
    var bar = document.createElement("nav");
    bar.className = "hnav";
    bar.setAttribute("aria-label", "खण्डहरू");
    bar.setAttribute("data-i18n-aria", "nav_sections");
    bar.style.display = "none";
    var wrap = document.createElement("div");
    wrap.className = "hnav-inner";
    var row = document.createElement("div");
    row.className = "hnav-row";
    var host = document.createElement("div");
    host.className = "hnav-tabs";
    row.appendChild(host);
    wrap.appendChild(row);
    bar.appendChild(wrap);
    if (nav.parentNode) nav.parentNode.insertBefore(bar, nav);
    else document.body.appendChild(bar);

    GROUPS.forEach(function (g) {
      if (g.key === "home") return;
      var hrefs = [];
      g.hrefs.forEach(function (href) { if (byHref(href)) hrefs.push(href); });
      if (g.key === "more") {
        DESK_MORE_EXTRA.forEach(function (extra) {
          if (hrefs.indexOf(extra.href) < 0) hrefs.push(extra.href);
        });
      }
      if (!hrefs.length) return;
      var slot = document.createElement("div");
      slot.className = "hnav-slot";
      slot.setAttribute("data-group", g.key);
      slot.setAttribute("data-ne", g.ne);
      slot.setAttribute("data-en", g.en);
      if (g.key !== "more" && hrefs.length < 2) {
        var link = makeDeskLink(hrefs[0]);
        var direct = link.querySelector(".hnav-lab");
        if (direct) direct.textContent = g.ne;
        slot.appendChild(link);
      } else {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "hnav-tab hnav-parent";
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-haspopup", "menu");
        var mid = "hnav-menu-" + g.key;
        btn.setAttribute("aria-controls", mid);
        if (g.key === "more") btn.appendChild(pathIcon(MORE_DOTS, "2.6"));
        else if (GROUP_ICONS[g.key]) btn.appendChild(pathIcon(GROUP_ICONS[g.key], "1.8"));
        else btn.appendChild(deskIcon(hrefs[0]));
        var lab = document.createElement("span");
        lab.className = "hnav-lab";
        lab.textContent = g.ne;
        btn.appendChild(lab);
        btn.appendChild(deskCaret());
        var panel = document.createElement("div");
        panel.className = "hnav-menu";
        panel.id = mid;
        panel.setAttribute("role", "menu");
        panel.hidden = true;
        hrefs.forEach(function (href) {
          var item = makeDeskLink(href);
          item.setAttribute("role", "menuitem");
          panel.appendChild(item);
        });
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (slot.classList.contains("is-open")) closeDeskSlot(slot);
          else openDeskSlot(slot, false);
        });
        btn.addEventListener("keydown", function (e) {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDeskSlot(slot, true);
          }
        });
        slot.appendChild(btn);
        slot.appendChild(panel);
        slot.addEventListener("focusout", function (e) {
          var next = e.relatedTarget;
          if (next && slot.contains(next)) return;
          setTimeout(function () {
            if (!slot.contains(document.activeElement)) closeDeskSlot(slot);
          }, 10);
        });
        armHover(slot, function () { openDeskSlot(slot, false); }, function () { closeDeskSlot(slot); });
      }
      host.appendChild(slot);
      deskSlots.push(slot);
    });

    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t && bar.contains(t)) return;
      closeDeskMenus();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" && e.key !== "Esc") return;
      if (!isDesk()) return;
      if (deskOpen) {
        var back = deskOpen.querySelector(":scope > .hnav-parent");
        var restore = bar.contains(document.activeElement);
        closeDeskSlot(deskOpen);
        if (restore) focusEl(back);
        e.preventDefault();
      } else if (deskMenu && !deskMenu.hidden) {
        closeOverflow();
        focusEl(deskMoreBtn);
        e.preventDefault();
      }
    });
    bar.addEventListener("keydown", function (e) {
      var key = e.key;
      var inMenu = deskOpen && deskOpen.contains(e.target) && e.target !== deskOpen.querySelector(":scope > .hnav-parent");
      if (inMenu && (key === "ArrowDown" || key === "ArrowUp" || key === "Home" || key === "End")) {
        var items = deskOpen.querySelectorAll(":scope > .hnav-menu a.hnav-tab");
        if (!items.length) return;
        e.preventDefault();
        var i = Array.prototype.indexOf.call(items, document.activeElement);
        if (key === "Home") i = 0;
        else if (key === "End") i = items.length - 1;
        else if (key === "ArrowDown") i = i < 0 ? 0 : Math.min(items.length - 1, i + 1);
        else i = i < 0 ? items.length - 1 : Math.max(0, i - 1);
        focusEl(items[i]);
        return;
      }
      if (key !== "ArrowRight" && key !== "ArrowLeft") return;
      var tops = [];
      host.querySelectorAll(":scope > .hnav-slot").forEach(function (slot) {
        var c = slot.querySelector(":scope > .hnav-parent, :scope > a.hnav-tab");
        if (c) tops.push(c);
      });
      if (deskMoreBtn && deskMore && !deskMore.hidden) tops.push(deskMoreBtn);
      var idx = tops.indexOf(document.activeElement);
      if (idx < 0) return;
      e.preventDefault();
      var n = key === "ArrowRight" ? Math.min(tops.length - 1, idx + 1) : Math.max(0, idx - 1);
      closeDeskMenus();
      focusEl(tops[n]);
    });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        if (isDesk()) layoutDeskNav();
      });
      ro.observe(row);
    }

    deskBar = bar;
    deskTabsHost = host;
    deskMore = null;
    deskMoreBtn = null;
    deskMenu = null;
    paintDeskLabels();
    layoutDeskNav();
    paintDeskCurrent();
  }
  placeToggle();
  groupLinks();
  markCurrent();
  ensureDeskNav();
  layoutDeskNav();
  syncStick();
  window.addEventListener("load", function () {
    syncStick();
    if (isDesk()) {
      deskRemeasure = true;
      layoutDeskNav();
    }
    settleHash();
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (isDesk()) {
        deskRemeasure = true;
        layoutDeskNav();
        syncStick();
      }
    });
  }
  if (window.__addLangHook) {
    window.__addLangHook(function () {
      paintGroups();
      paintDeskLabels();
      window.requestAnimationFrame(function () {
        layoutDeskNav();
        syncStick();
      });
    });
  }

  try { history.scrollRestoration = "auto"; } catch (e) {}
  if (!document.getElementById("nav-vt")) {
    var vt = document.createElement("style");
    vt.id = "nav-vt";
    vt.textContent = "@view-transition{navigation:auto}@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}::view-transition-old(root){animation-duration:160ms}::view-transition-new(root){animation-duration:160ms}";
    document.head.appendChild(vt);
  }
  try {
    if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
      var spec = document.createElement("script");
      spec.type = "speculationrules";
      spec.text = JSON.stringify({
        prefetch: [{
          source: "document",
          where: { href_matches: "/*" },
          eagerness: "moderate"
        }]
      });
      document.head.appendChild(spec);
    }
  } catch (e) {}

  function backForward() {
    try {
      var n = performance.getEntriesByType("navigation")[0];
      return !!(n && n.type === "back_forward");
    } catch (e) { return false; }
  }
  function scrollToId(id, smooth) {
    var el = document.getElementById(id);
    if (!el) return;
    var stick = head ? head.offsetHeight : 0;
    var top = el.getBoundingClientRect().top + window.scrollY - stick - 8;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, top), behavior: (smooth && !reduce) ? "smooth" : "auto" });
  }
  function settleHash() {
    if (backForward()) return;
    var raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return;
    var id = raw;
    try { id = decodeURIComponent(raw); } catch (e) {}
    var el = document.getElementById(id);
    if (!el || !head) return;
    if (el.getBoundingClientRect().top < head.offsetHeight - 1) scrollToId(id, false);
  }
  window.addEventListener("pageshow", function (ev) {
    window.__bfPersisted = !!ev.persisted;
    closeDeskMenus();
    if (nav.classList.contains("is-open")) close();
    if (ev.persisted) return;
    if (!backForward()) {
      settleHash();
      return;
    }
    var y = NaN;
    try { y = Number(sessionStorage.getItem("rasuwa-scroll:" + location.pathname + location.search)); } catch (e) {}
    if (!isFinite(y) || y < 0) return;
    var frames = 0;
    var touched = false;
    function stop() { touched = true; }
    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchstart", stop, { passive: true, once: true });
    window.addEventListener("keydown", stop, { once: true });
    function keep() {
      if (!touched && Math.abs(window.scrollY - y) > 48) window.scrollTo(0, y);
      if (++frames < 6) window.requestAnimationFrame(keep);
    }
    keep();
    window.setTimeout(function () {
      if (!touched && Math.abs(window.scrollY - y) > 48) window.scrollTo(0, y);
    }, 350);
  });
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a || a.hasAttribute("download")) return;
    if (a.target && a.target !== "_self") return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    var id = url.hash.slice(1);
    try { id = decodeURIComponent(id); } catch (err2) { return; }
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    closeDeskMenus();
    if (nav.classList.contains("is-open")) close();
    scrollToId(id, true);
    try {
      var next = url.pathname + url.search + "#" + id;
      if (location.pathname + location.search + location.hash !== next) {
        history.replaceState(null, "", next);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    } catch (err3) {}
    paintDeskCurrent();
  });
  var warmed = Object.create(null);
  function prefetchDoc(href) {
    var url;
    try { url = new URL(href, location.href); } catch (e) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return;
    if (!/\.html$/i.test(url.pathname) && !/\/$/.test(url.pathname)) return;
    var key = url.pathname + url.search;
    if (warmed[key]) return;
    warmed[key] = 1;
    var link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "document";
    link.href = key;
    document.head.appendChild(link);
  }
  if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules"))) {
    document.addEventListener("pointerover", function (e) {
      var a = e.target && e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank") return;
      prefetchDoc(a.href);
    }, true);
    document.addEventListener("focusin", function (e) {
      var a = e.target && e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank") return;
      prefetchDoc(a.href);
    });
  }

  function festKite(cls) {
    return '<span class="fest-kite ' + cls + '"><img alt="" src="assets/festival/kite-changa.svg"><i class="fest-string"></i></span>';
  }
  function festBird(cls) {
    return '<svg class="fest-bird ' + cls + '" viewBox="0 0 36 16" aria-hidden="true"><path d="M2 12 Q10 2 18 9 Q26 2 34 12" fill="none" stroke="#fff8ea" stroke-width="1.6" stroke-linecap="round"/></svg>';
  }
  function festFootSvg(tihar) {
    if (tihar) {
      return '<svg viewBox="0 0 1200 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><linearGradient id="tfSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1038"/><stop offset="1" stop-color="#c46a1a"/></linearGradient></defs>' +
        '<rect width="1200" height="150" fill="url(#tfSky)"/>' +
        '<path d="M40 8 q40 28 80 0 q40 28 80 0 q40 28 80 0" fill="none" stroke="#e07a2f" stroke-width="4"/><circle cx="60" cy="22" r="5" fill="#f4c430"/><circle cx="100" cy="18" r="4" fill="#c41e3a"/><circle cx="150" cy="24" r="5" fill="#f4c430"/>' +
        '<path d="M860 8 q40 28 80 0 q40 28 80 0 q40 28 80 0" fill="none" stroke="#e07a2f" stroke-width="4"/><circle cx="900" cy="22" r="5" fill="#f4c430"/><circle cx="980" cy="16" r="4" fill="#c41e3a"/>' +
        '<path d="M0 118 C200 96 320 130 520 110 C760 92 900 128 1200 104 V150 H0Z" fill="#241434"/>' +
        '<g fill="#f4c430"><circle cx="180" cy="96" r="7"/><circle cx="400" cy="88" r="6"/><circle cx="640" cy="98" r="7"/><circle cx="900" cy="86" r="6"/><circle cx="1080" cy="100" r="7"/></g>' +
        '<g><path d="M176 96 v18 M184 96 v18" stroke="#f6d56a" stroke-width="2"/><path d="M168 114 h24 l-4 10 h-16z" fill="#b5541c"/>' +
        '<path d="M396 88 v16 M404 88 v16" stroke="#f6d56a" stroke-width="2"/><path d="M388 104 h24 l-4 10 h-16z" fill="#b5541c"/>' +
        '<path d="M636 98 v16 M644 98 v16" stroke="#f6d56a" stroke-width="2"/><path d="M628 114 h24 l-4 10 h-16z" fill="#b5541c"/>' +
        '<path d="M896 86 v16 M904 86 v16" stroke="#f6d56a" stroke-width="2"/><path d="M888 102 h24 l-4 10 h-16z" fill="#b5541c"/>' +
        '<path d="M1076 100 v14 M1084 100 v14" stroke="#f6d56a" stroke-width="2"/><path d="M1068 114 h24 l-4 8 h-16z" fill="#b5541c"/></g>' +
        '<g transform="translate(560 118)"><circle r="16" fill="none" stroke="#f4c430" stroke-width="2"/><circle r="8" fill="none" stroke="#c41e3a" stroke-width="2"/><circle r="3" fill="#fff"/></g></svg>';
    }
    return '<svg viewBox="0 0 1200 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><linearGradient id="dfSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7eb8e0"/><stop offset=".7" stop-color="#f3d7a4"/><stop offset="1" stop-color="#e7b15a"/></linearGradient></defs>' +
      '<rect width="1200" height="160" fill="url(#dfSky)"/>' +
      '<ellipse cx="160" cy="28" rx="40" ry="12" fill="#fff" opacity=".9"/><ellipse cx="980" cy="24" rx="36" ry="11" fill="#fff" opacity=".85"/>' +
      '<path d="M0 100 L90 62 L150 88 L230 48 L310 86 L400 40 L490 84 L580 52 L680 90 L780 46 L880 86 L980 58 L1200 96 V160 H0Z" fill="#8eafc4"/>' +
      '<path d="M400 40 l22 36 h-44z" fill="#fff"/><path d="M780 46 l24 38 h-48z" fill="#fff"/>' +
      '<path d="M0 128 C180 112 340 146 600 124 C860 104 1000 140 1200 118 V160 H0Z" fill="#2f6a3a"/>' +
      '<g fill="#c41e3a"><path d="M120 36 l14 22 h-28z"/><path d="M300 22 l12 18 h-24z"/><path d="M860 30 l14 22 h-28z"/><path d="M1040 18 l12 18 h-24z"/></g>' +
      '<g stroke="#6b3a1a" fill="none" stroke-width="1"><path d="M120 58 C100 90 90 110 80 130"/><path d="M300 40 C320 80 330 110 340 132"/><path d="M860 52 C840 90 830 112 820 134"/><path d="M1040 36 C1060 80 1070 110 1080 130"/></g>' +
      '<g><rect x="70" y="124" width="28" height="16" rx="2" fill="#8c3b12"/><path d="M84 124 C82 110 76 102 70 96 M84 124 C84 110 90 100 96 94" stroke="#e6d36a" fill="none" stroke-width="1.6"/><circle cx="84" cy="132" r="2.4" fill="#e63946"/></g>' +
      '<g><rect x="1088" y="118" width="30" height="18" rx="2" fill="#8c3b12"/><path d="M1103 118 C1100 104 1094 96 1086 88 M1103 118 C1106 104 1114 96 1122 90" stroke="#e6d36a" fill="none" stroke-width="1.6"/><circle cx="1103" cy="128" r="2.4" fill="#e63946"/></g>' +
      '<g stroke="#6b3a1a" stroke-width="2.4" fill="none"><path d="M560 146 V96 H680 V146"/><path d="M590 96 V136"/><path d="M650 96 V136"/><path d="M582 136 h16"/><path d="M642 136 h16"/></g></svg>';
  }
  function festRuleSvg() {
    return '<svg viewBox="0 0 220 22" width="180" height="18" aria-hidden="true"><path d="M8 18 C10 10 8 4 2 1 M16 18 C16 8 22 4 30 1" fill="none" stroke="#d4c25a" stroke-width="1.6" stroke-linecap="round"/><circle cx="110" cy="11" r="3.5" fill="#c41e3a"/><path d="M150 16 l10-14 4 6-8 10z" fill="#c41e3a"/><path d="M168 4 C160 14 156 18 154 20" stroke="#6b3a1a" fill="none"/></svg>';
  }
  function festTheme() {
    var q = "";
    try { q = new URLSearchParams(location.search).get("theme") || ""; } catch (e) {}
    var name = q;
    if (name !== "dashain" && name !== "tihar" && name !== "off") {
      var parts = {};
      try {
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit"
        }).formatToParts(new Date()).forEach(function (p) {
          if (p.type !== "literal") parts[p.type] = p.value;
        });
      } catch (err) { parts = {}; }
      var key = (parts.year || "2026") + "-" + (parts.month || "10") + "-" + (parts.day || "06");
      if (key >= "2026-11-12") name = "off";
      else if (key >= "2026-10-26") name = "tihar";
      else name = "dashain";
    }
    document.documentElement.classList.remove("theme-dashain", "theme-tihar");
    document.querySelectorAll(".fest-sky,.fest-hem,.fest-foot,.fest-margin,.fest-rule,.fest-corner").forEach(function (n) { n.remove(); });
    if (name === "dashain" || name === "tihar") document.documentElement.classList.add("theme-" + name);
    if (name !== "dashain" && name !== "tihar") return;
    var bar = document.querySelector(".head-stick .topbar");
    if (bar) {
      var sky = document.createElement("div");
      sky.className = "fest-sky";
      sky.setAttribute("aria-hidden", "true");
      if (name === "tihar") {
        sky.innerHTML = '<span class="fest-swag"><img alt="" src="assets/festival/marigold-garland.svg"><img alt="" src="assets/festival/marigold-garland.svg"></span>';
      } else {
        sky.innerHTML = '<span class="fest-cloud c1"></span><span class="fest-cloud c2"></span><span class="fest-cloud c3"></span>' +
          festKite("k1") + festKite("k2") + festKite("k3") + festKite("k4") + festKite("k5");
      }
      var hem = document.createElement("div");
      hem.className = "fest-hem" + (name === "tihar" ? " is-diyo" : "");
      hem.setAttribute("aria-hidden", "true");
      if (name === "tihar") {
        var lamps = "";
        var i;
        for (i = 0; i < 12; i++) lamps += '<img alt="" src="assets/festival/diyo.svg">';
        hem.innerHTML = lamps;
      }
      bar.appendChild(sky);
      bar.appendChild(hem);
    }
    var foot = document.querySelector("footer");
    if (foot) {
      var band = document.createElement("div");
      band.className = "fest-foot";
      band.setAttribute("aria-hidden", "true");
      band.innerHTML = festFootSvg(name === "tihar");
      foot.insertBefore(band, foot.firstChild);
    }
    function corner(el, file) {
      if (!el) return;
      var c = document.createElement("div");
      c.className = "fest-corner";
      c.setAttribute("aria-hidden", "true");
      c.innerHTML = '<img alt="" src="assets/festival/' + file + '">';
      el.insertBefore(c, el.firstChild);
    }
    corner(document.querySelector("#donate"), name === "tihar" ? "diyo.svg" : "jamara.svg");
    corner(document.querySelector(".about-prose"), name === "tihar" ? "marigold-garland.svg" : "jamara.svg");
  }
  festTheme();
})();
