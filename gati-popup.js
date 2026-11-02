/*! Gati notice: a calm, dismissible card saying updates now continue on Gati. No auto-redirect.
    Shown at most once per 7 days per browser (localStorage "gatiMovePopup:closedAt"). */
(function () {
  "use strict";
  var KEY = "gatiMovePopup:closedAt", PERIOD = 7 * 24 * 60 * 60 * 1000, URL = "https://nirajbhusal.github.io/gati-alerts/";
  function get() { try { return Number(localStorage.getItem(KEY) || 0); } catch (e) { return 0; } }
  function set() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  if (/[?&]gati=0\b/.test(location.search)) return;
  var force = /[?&]gati=1\b/.test(location.search);
  if (!force && Date.now() - get() < PERIOD) return;
  function busy() { var d = document.querySelectorAll('[role="dialog"],[aria-modal="true"]'); for (var i = 0; i < d.length; i++) { if (d[i].offsetParent !== null && !d[i].hidden && d[i].id !== "gati-move") return true; } return false; }
  function show() {
    if (document.getElementById("gati-move")) return;
    if (!force && busy()) { setTimeout(show, 8000); return; }
    var css = document.createElement("style");
    css.textContent = "#gati-move{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;width:min(440px,calc(100vw - 24px));background:#fff;color:#1a2230;border:1px solid #d6dbe3;border-radius:14px;box-shadow:0 10px 30px rgba(10,20,40,.18);padding:16px 16px 14px;font:15px/1.5 system-ui,-apple-system,'Mukta','Noto Sans Devanagari',sans-serif}" +
      "#gati-move h2{margin:0 28px 6px 0;font-size:17px}#gati-move p{margin:0 0 4px}#gati-move .gm-en{color:#4a5566;font-size:14px}" +
      "#gati-move .gm-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}#gati-move a.gm-go{background:#0b1424;color:#fff;text-decoration:none;border-radius:10px;padding:9px 14px;font-weight:600}" +
      "#gati-move button{font:inherit;cursor:pointer}#gati-move .gm-later{background:none;border:1px solid #d6dbe3;border-radius:10px;padding:8px 12px;color:#1a2230}" +
      "#gati-move .gm-x{position:absolute;top:8px;right:8px;width:32px;height:32px;border:0;background:none;font-size:18px;color:#4a5566;border-radius:8px}" +
      "@media (prefers-color-scheme:dark){#gati-move{background:#111a28;color:#e8edf4;border-color:#2a3546}#gati-move .gm-en,#gati-move .gm-x{color:#aab4c3}#gati-move .gm-later{color:#e8edf4;border-color:#2a3546}#gati-move a.gm-go{background:#e8edf4;color:#0b1424}}";
    document.head.appendChild(css);
    var el = document.createElement("div");
    el.id = "gati-move"; el.setAttribute("role", "dialog"); el.setAttribute("aria-labelledby", "gati-move-h"); el.setAttribute("lang", "ne");
    el.innerHTML = '<button type="button" class="gm-x" aria-label="बन्द गर्नुहोस् / Close">✕</button>' +
      '<h2 id="gati-move-h">अद्यावधिक अब गतिमा जारी छ</h2>' +
      '<p>रसुवा र देशभरका आधिकारिक सूचना अब गतिमा स्रोत र स्रोतको समयसहित हेर्न सक्नुहुन्छ। यो पृष्ठ पनि खुलै रहन्छ।</p>' +
      '<p class="gm-en" lang="en">Updates now continue on Gati, with official alerts for Rasuwa and all of Nepal, each with its source and source time. This page stays available.</p>' +
      '<div class="gm-row"><a class="gm-go" href="' + URL + '" rel="noopener">गतिमा जानुहोस् · Go to Gati</a><button type="button" class="gm-later">पछि · Later</button></div>';
    function close() { set(); el.remove(); document.removeEventListener("keydown", esc); }
    function esc(e) { if (e.key === "Escape") close(); }
    el.querySelector(".gm-x").onclick = close; el.querySelector(".gm-later").onclick = close; el.querySelector(".gm-go").addEventListener("click", set);
    document.addEventListener("keydown", esc);
    document.body.appendChild(el);
  }
  function start() { setTimeout(show, force ? 0 : 2500); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
