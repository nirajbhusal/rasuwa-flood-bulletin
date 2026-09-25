/* Rasuwa bulletin · header update-alert On/Off */
(function () {
  var btn = document.getElementById("notify-btn");
  if (!btn) return;
  var hint = document.getElementById("notify-hint");
  var KEY = "rasuwa-notify";
  var pollTimer = null;
  var visBound = false;

  function wantedOn() {
    try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; }
  }
  function setWanted(on) {
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
  }
  function canApi() {
    return ("Notification" in window) && ("serviceWorker" in navigator);
  }
  function standalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }
  function showHint(text) {
    if (!hint) return;
    if (!text) {
      hint.textContent = "";
      hint.hidden = true;
      hint.classList.remove("show");
      return;
    }
    hint.hidden = false;
    hint.textContent = text;
    hint.classList.add("show");
  }
  function setUi(cls, aria, pressed) {
    btn.className = "notify-btn" + (cls ? " " + cls : "");
    btn.setAttribute("aria-label", aria);
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    btn.title = aria;
    btn.disabled = false;
  }
  var COPY = {
    ne: {
      notify_aria_on: "सूचना सक्रिय",
      notify_aria_off: "सूचना बन्द",
      notify_unsupported: "यो ब्राउजरमा सूचना उपलब्ध छैन",
      notify_denied: "ब्राउजरले सूचना ब्लक गरेको छ",
      notify_hint_ua: "यो ब्राउजरमा सूचना चल्दैन। Chrome वा Safari (Home Screen) मा खोल्नुहोस्।",
      notify_hint_denied: "ब्राउजर सेटिङबाट यो साइटको सूचना अनुमति दिनुहोस्।",
      notify_hint_blocked: "ब्राउजरले सूचना ब्लक गर्‍यो।",
      notify_hint_ios: "iPhone मा Share → Add to Home Screen गरेपछि सूचना आउँछ।",
      notify_hint_fail: "अनुमति माग्न सकिएन। Home Screen बाट खोलेर फेरि प्रयास गर्नुहोस्।"
    },
    en: {
      notify_aria_on: "Notifications on",
      notify_aria_off: "Notifications off",
      notify_unsupported: "Notifications are not available in this browser",
      notify_denied: "The browser has blocked notifications",
      notify_hint_ua: "Notifications do not work in this browser. Open in Chrome or Safari (Home Screen).",
      notify_hint_denied: "Allow notifications for this site in browser settings.",
      notify_hint_blocked: "The browser blocked notifications.",
      notify_hint_ios: "On iPhone, use Share → Add to Home Screen, then notifications can arrive.",
      notify_hint_fail: "Could not ask for permission. Open from the Home Screen and try again."
    }
  };
  function keyish(s) { return typeof s === "string" && /^[a-z][a-z0-9_]*$/.test(s); }
  function tt(k) {
    if (window.t) {
      var s = window.t(k);
      if (s && s !== k && !keyish(s)) return s;
    }
    var lang = document.documentElement.lang === "en" ? "en" : "ne";
    var pack = COPY[lang] || COPY.ne;
    return pack[k] || COPY.ne[k] || "";
  }
  function paint() {
    if (!canApi()) {
      setUi("off", tt("notify_unsupported"), false);
      return "unsupported";
    }
    var p = Notification.permission;
    if (p === "denied") {
      setUi("denied", tt("notify_denied"), false);
      return "denied";
    }
    if (p === "granted" && wantedOn()) {
      setUi("on", tt("notify_aria_on"), true);
      return "on";
    }
    if (p === "granted") {
      setUi("off", tt("notify_aria_off"), false);
      return "off";
    }
    setUi("off", tt("notify_aria_off"), false);
    return "default";
  }
  function toWorker(msg) {
    if (!navigator.serviceWorker) return;
    function send(w) { if (w) w.postMessage(msg); }
    if (navigator.serviceWorker.controller) send(navigator.serviceWorker.controller);
    navigator.serviceWorker.ready.then(function (reg) { send(reg.active); }).catch(function () {});
  }
  function ping(welcome) { toWorker({ type: "check", welcome: !!welcome }); }
  function startPoll() {
    if (pollTimer) return;
    pollTimer = setInterval(function () { ping(false); }, 60000);
    if (!visBound) {
      visBound = true;
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden && wantedOn() && Notification.permission === "granted") ping(false);
      });
    }
    navigator.serviceWorker && navigator.serviceWorker.ready.then(function (reg) {
      if (reg.periodicSync) {
        reg.periodicSync.register("rasuwa-updates", { minInterval: 5 * 60 * 1000 }).catch(function () {});
      }
    });
  }
  function stopPoll() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    navigator.serviceWorker && navigator.serviceWorker.ready.then(function (reg) {
      if (reg.periodicSync) {
        reg.periodicSync.unregister("rasuwa-updates").catch(function () {});
      }
    });
  }
  function turnOn() {
    setWanted(true);
    toWorker({ type: "unmute" });
    startPoll();
    ping(true);
    paint();
    showHint("");
  }
  function turnOff() {
    setWanted(false);
    toWorker({ type: "mute" });
    stopPoll();
    paint();
    showHint("");
  }

  if (navigator.serviceWorker) {
    navigator.serviceWorker.ready.then(function () {
      if (canApi() && Notification.permission === "granted" && wantedOn()) {
        toWorker({ type: "unmute" });
        startPoll();
      } else {
        toWorker({ type: "mute" });
      }
      paint();
    }).catch(function () { paint(); });
  }
  paint();

  btn.addEventListener("click", function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!canApi()) {
      showHint(tt("notify_hint_ua"));
      return;
    }
    var p = Notification.permission;
    if (p === "denied") {
      showHint(tt("notify_hint_denied"));
      return;
    }
    if (p === "granted") {
      if (wantedOn()) turnOff();
      else turnOn();
      return;
    }
    var req = Notification.requestPermission();
    Promise.resolve(req).then(function (res) {
      paint();
      if (res === "granted") turnOn();
      else if (res === "denied") showHint(tt("notify_hint_blocked"));
      else if (!standalone()) showHint(tt("notify_hint_ios"));
    }).catch(function () {
      showHint(tt("notify_hint_fail"));
    });
  }, { passive: false });
  if (window.__addLangHook) window.__addLangHook(paint);
})();
