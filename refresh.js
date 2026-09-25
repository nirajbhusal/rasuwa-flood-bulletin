/* Picks up a new deploy. Polls version.json and reloads once when the
   build changed, unless the reader is in the middle of something — then a
   small toast waits for a tap. Also registers the service worker. */
(function () {
  "use strict";

  var POLL_MS = 3 * 60 * 1000;
  var SW_MS = 5 * 60 * 1000;
  var RELOAD_KEY = "rasuwa-reload-build";
  var lastType = 0;
  var going = false;
  var regPromise = null;
  var toastBuild = "";

  function storeGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function storeSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) {}
  }
  function pageVer() {
    return window.PAGE_VER || "";
  }
  function sitePath(name) {
    var path = location.pathname || "/";
    var mark = "/rasuwa-flood-bulletin/";
    var at = path.indexOf(mark);
    if (at >= 0) return path.slice(0, at + mark.length) + name;
    var nested = path.match(/^(.*)\/(?:api|embed)\//);
    if (nested) return (nested[1] || "") + "/" + name;
    return name;
  }
  function withV(name) {
    return sitePath(name) + ["?v", pageVer() || "0"].join("=");
  }
  function tried(build) {
    if (build && storeGet(RELOAD_KEY) === build) return true;
    try {
      if (new URL(location.href).searchParams.get("_r") === "1" && !storeGet(RELOAD_KEY)) return true;
    } catch (e) {}
    return false;
  }
  function busy() {
    if (Date.now() - lastType < 5000) return true;
    var el = document.activeElement;
    if (el && el !== document.body && el !== document.documentElement) {
      var tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) return true;
    }
    var root = document.documentElement;
    var body = document.body;
    if (root && (root.classList.contains("ask-lock") || root.classList.contains("nav-drawer-open"))) return true;
    if (body && (body.classList.contains("nav-drawer-open") || body.classList.contains("ask-lock") || body.classList.contains("names-ov-lock"))) return true;
    var nav = document.getElementById("nav-chips");
    if (nav && nav.classList.contains("is-open")) return true;
    var lb = document.getElementById("lightbox");
    if (lb && !lb.hidden) return true;
    var nodes = document.querySelectorAll(".ask-sheet.is-open, dialog[open], [aria-modal='true']");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.hidden) continue;
      if (node.getAttribute("aria-hidden") === "true") continue;
      if (node.tagName === "DIALOG" && !node.open) continue;
      return true;
    }
    return false;
  }
  function cleanUrl() {
    try {
      var u = new URL(location.href);
      if (!u.searchParams.has("_r") && !u.searchParams.has("_")) return;
      u.searchParams.delete("_r");
      u.searchParams.delete("_");
      var next = u.pathname + (u.search || "") + (u.hash || "");
      history.replaceState(null, "", next);
    } catch (e) {}
  }
  function ensureStyle() {
    if (document.getElementById("site-refresh-css")) return;
    var style = document.createElement("style");
    style.id = "site-refresh-css";
    style.textContent = "#site-refresh{position:fixed;z-index:400;left:50%;bottom:max(12px,env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:min(18rem,calc(100% - 24px));margin:0;padding:8px 14px;border:0;border-radius:999px;background:#166534;color:#fff;font:700 13px/1.35 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.22);cursor:pointer;text-align:center}#site-refresh[hidden]{display:none}#site-refresh:focus-visible{outline:3px solid #86efac;outline-offset:2px}";
    (document.head || document.documentElement).appendChild(style);
  }
  function hideToast() {
    var el = document.getElementById("site-refresh");
    if (el) el.hidden = true;
    toastBuild = "";
  }
  function showToast(build) {
    ensureStyle();
    var el = document.getElementById("site-refresh");
    if (!el) {
      el = document.createElement("button");
      el.id = "site-refresh";
      el.type = "button";
      el.setAttribute("role", "status");
      el.textContent = "अपडेट भयो · Updated, tap to refresh";
      el.hidden = true;
      (document.body || document.documentElement).appendChild(el);
      el.addEventListener("click", function () {
        hardReload(el.getAttribute("data-build") || "");
      });
    }
    el.setAttribute("data-build", build || "");
    el.hidden = false;
    toastBuild = build || "";
  }
  function hardReload(build) {
    if (going) return;
    going = true;
    if (build) storeSet(RELOAD_KEY, build);
    var finish = function () {
      var u = new URL(location.href);
      u.searchParams.set("_r", "1");
      u.searchParams.set("_", String(Date.now()));
      location.replace(u.href);
    };
    if (!(navigator.serviceWorker && navigator.serviceWorker.getRegistration)) {
      finish();
      return;
    }
    navigator.serviceWorker.getRegistration().then(function (reg) {
      var worker = reg && (reg.waiting || reg.installing);
      if (worker) {
        try { worker.postMessage({ type: "skip-waiting" }); } catch (e) {}
      }
      finish();
    }).catch(finish);
  }
  function offer(build) {
    if (!build || build === pageVer()) {
      cleanUrl();
      if (storeGet(RELOAD_KEY) === build) {
        try { sessionStorage.removeItem(RELOAD_KEY); } catch (e) {}
      }
      hideToast();
      return;
    }
    if (tried(build) || busy()) {
      showToast(build);
      return;
    }
    hardReload(build);
  }
  function check() {
    var url = sitePath("version.json") + ["?t", String(Date.now())].join("=");
    fetch(url, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.build) offer(String(data.build));
      })
      .catch(function () {});
  }
  function poke() {
    var pending = regPromise;
    if (!pending && navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      pending = navigator.serviceWorker.getRegistration();
    }
    if (!pending || !pending.then) return;
    pending.then(function (reg) {
      if (reg && reg.update) {
        try { reg.update(); } catch (e) {}
      }
    }).catch(function () {});
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Shift" || e.key === "Meta" || e.key === "Control" || e.key === "Alt") return;
    lastType = Date.now();
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", check);
  } else {
    check();
  }
  setInterval(check, POLL_MS);
  setInterval(poke, SW_MS);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    check();
    poke();
  });
  window.addEventListener("focus", function () {
    check();
    poke();
  });
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) check();
  });

  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    check();
  });
  navigator.serviceWorker.addEventListener("message", function (ev) {
    if (!ev.data) return;
    if (ev.data.type === "page-refresh" || ev.data.type === "force-refresh") check();
  });
  try {
    regPromise = navigator.serviceWorker.register(withV("sw.js"), { updateViaCache: "none" }).then(function (reg) {
      try { reg.update(); } catch (e) {}
      return reg;
    }).catch(function () { return null; });
  } catch (e) {}
})();
