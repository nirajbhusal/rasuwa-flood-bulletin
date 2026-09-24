/* Sitewide “new update” banner. Shows only when latest.json or a waiting
   service worker is newer than this page. Dismiss is remembered for that
   version in this tab session. */
(function () {
  "use strict";

  var PAGE = window.PAGE_VER || "";

  function storeGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function storeSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) {}
  }
  function dismissed(id) {
    return !!(id && storeGet("rasuwa-ver-dismiss") === id);
  }
  function hardReload() {
    try { sessionStorage.removeItem("rasuwa-hard-" + PAGE); } catch (e) {}
    var u = new URL(location.href);
    u.searchParams.set("v", PAGE || "1");
    u.searchParams.set("_", String(Date.now()));
    location.replace(u.href);
  }
  function reloadNow() {
    var go = function () { hardReload(); };
    if (!(navigator.serviceWorker && navigator.serviceWorker.getRegistration)) {
      go();
      return;
    }
    navigator.serviceWorker.getRegistration().then(function (reg) {
      var worker = reg && (reg.waiting || reg.installing);
      if (worker) {
        try { worker.postMessage({ type: "skip-waiting" }); } catch (e) {}
      }
      go();
    }).catch(go);
  }
  function banner(id) {
    if (!id || id === PAGE || dismissed(id)) return;
    var el = document.getElementById("ver-banner");
    if (!el) {
      el = document.createElement("div");
      el.id = "ver-banner";
      el.className = "ver-banner";
      el.setAttribute("role", "status");
      el.innerHTML =
        '<p class="ver-banner-txt"><strong>नयाँ अपडेट उपलब्ध छ।</strong> New update available — tap to refresh.</p>' +
        '<div class="ver-banner-acts">' +
          '<button type="button" class="ver-banner-go">रिफ्रेस · Refresh</button>' +
          '<button type="button" class="ver-banner-x">बन्द</button>' +
        "</div>";
      el.hidden = true;
      (document.body || document.documentElement).appendChild(el);
      el.querySelector(".ver-banner-go").addEventListener("click", reloadNow);
      el.querySelector(".ver-banner-x").addEventListener("click", function () {
        storeSet("rasuwa-ver-dismiss", el.getAttribute("data-ver") || id);
        el.hidden = true;
      });
    }
    el.setAttribute("data-ver", id);
    el.hidden = false;
  }
  function check() {
    fetch("latest.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.id) banner(d.id);
      })
      .catch(function () {});
  }
  function watchReg(reg) {
    if (!reg) return;
    if (reg.waiting && navigator.serviceWorker.controller) banner("sw-waiting");
    if (reg.__uxWatch) return;
    reg.__uxWatch = true;
    reg.addEventListener("updatefound", function () {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", function () {
        if (nw.state === "installed" && navigator.serviceWorker.controller) banner("sw-waiting");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", check);
  } else {
    check();
  }
  setInterval(check, 20000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) check();
  });
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) check();
  });

  if (!navigator.serviceWorker) return;
  try {
    navigator.serviceWorker.register("sw.js?v=" + PAGE, { updateViaCache: "none" }).then(function (reg) {
      try { reg.update(); } catch (e) {}
      watchReg(reg);
    });
  } catch (e) {}
  navigator.serviceWorker.addEventListener("message", function (ev) {
    if (!ev.data) return;
    if (ev.data.type === "page-refresh" || ev.data.type === "force-refresh") {
      if (ev.data.id) banner(ev.data.id);
    }
  });
  navigator.serviceWorker.ready.then(function (reg) {
    try { reg.update(); } catch (e) {}
    watchReg(reg);
  });
})();
