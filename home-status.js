/*! Homepage status strip. Figures come from the JSON files at runtime. */
(function () {
  var host = document.getElementById("home-status");
  if (!host) return;

  var alertDoc = null;
  var neoc = null;
  var flood = null;
  var nowDoc = null;

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "ne";
  }
  function tx(node) {
    if (node == null) return "";
    if (typeof node === "string") return node;
    var l = lang();
    if (node[l] != null && node[l] !== "") return node[l];
    return node.ne || node.en || "";
  }
  function dev(n) {
    var s = String(n);
    if (lang() === "en") return s;
    return s.replace(/[0-9]/g, function (d) { return "०१२३४५६७८९"[d]; });
  }
  function kathmanduToday() {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (e) {
      return "";
    }
  }
  function daySpan(days) {
    if (!days || !days.length) return "";
    var a = tx(days[0]);
    var b = tx(days[days.length - 1]);
    if (!a) return b || "";
    if (!b || a === b) return a;
    var pa = a.split(" ");
    var pb = b.split(" ");
    if (pa.length > 1 && pb.length > 1 && pa.slice(0, -1).join(" ") === pb.slice(0, -1).join(" ")) {
      return pa.slice(0, -1).join(" ") + " " + pa[pa.length - 1] + "–" + pb[pb.length - 1];
    }
    return a + "–" + b;
  }
  function todayWeather() {
    var days = (alertDoc && alertDoc.warning_days) || [];
    var today = kathmanduToday();
    var day = null;
    for (var i = 0; i < days.length; i++) if (days[i].date === today) day = days[i];
    if (!day) day = days[0] || null;
    if (!day || !day.districts) return null;
    var rank = { green: 1, yellow: 2, orange: 3, red: 4 };
    var best = "green";
    var n = 0;
    var hot = 0;
    Object.keys(day.districts).forEach(function (id) {
      var lv = day.districts[id] && day.districts[id].level;
      if (!lv) return;
      n += 1;
      if ((rank[lv] || 0) > (rank[best] || 0)) best = lv;
      if (lv && lv !== "green") hot += 1;
    });
    var levels = (alertDoc && alertDoc.warn_levels) || {};
    var span = daySpan((alertDoc.timeline && alertDoc.timeline.days) || []);
    var color = (levels[best] && levels[best].color) || "#1b7f3a";
    var text;
    if (best === "green") {
      text = lang() === "en"
        ? "All " + n + " districts green (no alert)" + (span ? " · " + span : "")
        : "सबै " + dev(n) + " जिल्ला हरियो" + (span ? " · " + span : "");
    } else {
      var word = tx(levels[best]) || best;
      text = lang() === "en"
        ? hot + " districts · " + word + (span ? " · " + span : "")
        : dev(hot) + " जिल्ला · " + word + (span ? " · " + span : "");
    }
    return { text: text, color: color };
  }
  function rainNow() {
    var n = alertDoc && alertDoc.nowcast;
    if (!n) return null;
    var text = tx(n.max) || tx(n.when);
    if (!text) return null;
    return { text: text, color: "#1a4a80" };
  }
  function highways() {
    if (!neoc || !neoc.counts) return null;
    var n = neoc.counts.full_block;
    if (n == null) n = neoc.counts.total;
    var rasuwa = (neoc.rows || []).some(function (row) {
      return row && row.district && row.district.id === "rasuwa" && row.status_type === "full_block";
    });
    var text = lang() === "en"
      ? (rasuwa ? "Rasuwa blocked · " : "") + n + " highways"
      : (rasuwa ? "रसुवा अवरुद्ध · " : "") + dev(n) + " राजमार्ग";
    return { text: text, color: n ? "#c41e3a" : "#1b7f3a" };
  }
  function rivers() {
    var present = (flood && flood.present) || {};
    var above = present.above || [];
    var near = present.near || [];
    var gauges = (nowDoc && nowDoc.corridor && nowDoc.corridor.rivers) || [];
    var hot = gauges.filter(function (row) {
      return row && row.fresh && (row.level === "red" || row.level === "orange" || row.level === "yellow");
    });
    if (!above.length && !near.length && !hot.length) {
      return {
        text: lang() === "en" ? "All rivers below the alert level" : "सबै नदी सतर्कता तहभन्दा तल",
        color: "#1b7f3a"
      };
    }
    var names = above.concat(near).map(tx).concat(hot.map(tx)).filter(Boolean);
    return {
      text: names.join(", ") || (lang() === "en" ? "A river is at alert" : "नदी सतर्कतामा"),
      color: "#c41e3a"
    };
  }
  function pill(label, info, href) {
    if (!info || !info.text) return null;
    var a = document.createElement("a");
    a.href = href;
    a.style.borderLeftColor = info.color || "#1b7f3a";
    var k = document.createElement("span");
    k.textContent = label;
    var s = document.createElement("strong");
    s.textContent = info.text;
    a.appendChild(k);
    a.appendChild(s);
    return a;
  }
  function paint() {
    if (!alertDoc && !neoc && !flood) return;
    host.replaceChildren();
    host.className = "home-status";
    var en = lang() === "en";
    [
      pill(en ? "Weather" : "मौसम", todayWeather(), "#wx-home"),
      pill(en ? "Rain now" : "अहिले वर्षा", rainNow(), "#wxdb-home"),
      pill(en ? "Highways" : "राजमार्ग", highways(), "#dor-home"),
      pill(en ? "Rivers" : "नदी", rivers(), "#flood-home")
    ].forEach(function (node) { if (node) host.appendChild(node); });
  }
  function get(url) {
    return fetch(url + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(url);
      return r.json();
    }).catch(function () { return null; });
  }
  Promise.all([
    get("data/weather-alert.json"),
    get("data/neoc_roads_2083-06-19-0700.json"),
    get("data/flood-bulletin.json"),
    get("data/weather/now.json")
  ]).then(function (rows) {
    alertDoc = rows[0];
    neoc = rows[1];
    flood = rows[2];
    nowDoc = rows[3];
    paint();
  });
  if (typeof MutationObserver === "function") {
    var last = lang();
    new MutationObserver(function () {
      var now = lang();
      if (now === last) return;
      last = now;
      paint();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
})();
