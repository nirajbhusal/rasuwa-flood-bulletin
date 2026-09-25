/*! Site rain overlay. Auto while today's DHM warning or a district alert is active. */
(function () {
  var VER = window.PAGE_VER || "2026-09-25-road-notice";
  var enabled = false;
  var canvas = null;
  var ctx = null;
  var parts = [];
  var raf = 0;
  var running = false;
  var last = 0;
  var w = 0;
  var h = 0;
  var reduce = false;

  function kathmanduToday() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kathmandu",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());
    } catch (e) {
      return "";
    }
  }
  function lowEnd() {
    var mobile = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
    var cores = navigator.hardwareConcurrency || 8;
    var saveData = navigator.connection && navigator.connection.saveData;
    return !!(mobile || cores <= 4 || saveData);
  }
  function particleCount() {
    if (reduce) return 48;
    return lowEnd() ? 64 : 108;
  }
  function frameGap() {
    if (reduce) return 80;
    return lowEnd() ? 50 : 33;
  }
  function readReduce() {
    reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function autoOn(json) {
    if (!json) return false;
    var today = kathmanduToday();
    var days = json.warning_days || [];
    for (var i = 0; i < days.length; i++) {
      var day = days[i];
      if (!day || day.date !== today) continue;
      var provs = day.provinces || {};
      var ids = Object.keys(provs);
      for (var j = 0; j < ids.length; j++) {
        var rec = provs[ids[j]] || {};
        if (rec.level === "orange" || rec.level === "red") return true;
        var also = rec.also || [];
        if (also.indexOf("orange") >= 0 || also.indexOf("red") >= 0) return true;
      }
    }
    var now = Date.now();
    function open(node) {
      if (!node || !node.window_end) return false;
      var end = Date.parse(node.window_end);
      return !isNaN(end) && now < end;
    }
    var warnings = json.district_warnings || [];
    for (var w = 0; w < warnings.length; w++) if (open(warnings[w])) return true;
    if (open(json.callout) && json.callout.districts && json.callout.districts.length) return true;
    return false;
  }
  function resize() {
    if (!canvas) return;
    w = window.innerWidth || 1;
    h = window.innerHeight || 1;
    canvas.width = w;
    canvas.height = h;
    seed();
  }
  function seed() {
    var n = particleCount();
    parts.length = 0;
    for (var i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        len: 14 + Math.random() * 18,
        v: 340 + Math.random() * 240,
        o: 0.34 + Math.random() * 0.22
      });
    }
  }
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.className = "rain-layer";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d", { alpha: true });
    resize();
    window.addEventListener("resize", resize);
  }
  function draw(dt) {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1.15;
    ctx.lineCap = "round";
    var drift = 0.28;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.y += p.v * dt;
      p.x += p.v * dt * drift;
      if (p.y - p.len > h) {
        p.y = -20;
        p.x = Math.random() * w;
      }
      if (p.x > w + 30) p.x = -20;
      ctx.strokeStyle = "rgba(176, 200, 218," + p.o.toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.len * drift, p.y + p.len);
      ctx.stroke();
    }
  }
  function loop(t) {
    if (!running) return;
    raf = window.requestAnimationFrame(loop);
    if (document.hidden) return;
    if (!last) last = t;
    var gap = t - last;
    if (gap < frameGap()) return;
    var dt = Math.min(0.05, gap / 1000);
    last = t;
    draw(dt);
  }
  function startLoop() {
    if (running || !enabled) return;
    ensureCanvas();
    if (canvas) canvas.hidden = false;
    running = true;
    last = 0;
    raf = window.requestAnimationFrame(loop);
  }
  function stopLoop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    if (ctx) ctx.clearRect(0, 0, w, h);
    if (canvas) canvas.hidden = true;
  }
  function applyState() {
    document.documentElement.classList.toggle("rain-on", enabled);
    if (enabled && !document.hidden) startLoop();
    else stopLoop();
  }
  function decide(json) {
    readReduce();
    enabled = !reduce && autoOn(json);
    applyState();
  }
  function boot() {
    readReduce();
    var url = "data/weather-alert.json?v=" + encodeURIComponent(VER);
    fetch(url, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("wx"); return r.json(); })
      .then(decide)
      .catch(function () { applyState(); });
  }
  document.addEventListener("visibilitychange", function () {
    if (!enabled) return;
    if (document.hidden) stopLoop();
    else startLoop();
  });
  function start() {
    function go() {
      var ric = window.requestIdleCallback;
      if (ric) ric(function () { boot(); }, { timeout: 1600 });
      else window.setTimeout(boot, 500);
    }
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go);
  }
  start();
})();
