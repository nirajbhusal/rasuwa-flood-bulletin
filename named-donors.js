(function(){
  var body = document.getElementById("named-donors-body");
  if (!body) return;
  var all = [];
  var days = [];
  var totals = null;
  var pageSize = 40;
  var page = 0;
  var q = "";
  var typeFilter = "all";
  var chequeFilter = "all";

  function fmt(n){
    if (n == null || n === "") return "—";
    if (typeof n === "number") {
      var s = (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
      var parts = s.split(".");
      var x = parts[0];
      var last3 = x.slice(-3);
      var rest = x.slice(0, -3);
      var out = last3;
      while (rest.length > 2) { out = rest.slice(-2) + "," + out; rest = rest.slice(0, -2); }
      if (rest) out = rest + "," + out;
      return parts[1] ? out + "." + parts[1] : out;
    }
    return String(n);
  }

  function fmtShort(n){
    if (n == null) return "—";
    var v = Number(n);
    if (v >= 1e9) return (v / 1e9).toFixed(2).replace(/\.00$/, "") + " अर्ब";
    if (v >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, "") + " करोड";
    if (v >= 1e5) return (v / 1e5).toFixed(1).replace(/\.0$/, "") + " लाख";
    return fmt(v);
  }

  function isPersonal(t){
    var s = String(t || "").toLowerCase();
    return s.indexOf("person") >= 0;
  }
  function isCheque(c){
    var s = String(c || "").toLowerCase();
    return s.indexOf("non") < 0 && s.indexOf("cheque") >= 0;
  }
  function typeLabel(t){
    return isPersonal(t) ? "व्यक्तिगत" : "संस्था";
  }
  function typeClass(t){
    return isPersonal(t) ? "nd-type-p" : "nd-type-i";
  }

  function filtered(){
    return all.filter(function(d){
      if (typeFilter === "inst" && isPersonal(d.type)) return false;
      if (typeFilter === "pers" && !isPersonal(d.type)) return false;
      if (chequeFilter === "cheque" && !isCheque(d.cheque)) return false;
      if (chequeFilter === "non" && isCheque(d.cheque)) return false;
      if (!q) return true;
      var qq = q.toLowerCase();
      return (d.name || "").toLowerCase().indexOf(qq) >= 0
        || String(d.date || "").indexOf(qq) >= 0
        || String(d.sn || "").indexOf(qq) >= 0;
    });
  }

  function renderDayChart(){
    var el = document.getElementById("named-day-chart");
    if (!el || !days.length) return;
    var max = 0;
    days.forEach(function(d){ if (d.total > max) max = d.total; });
    if (!max) max = 1;
    el.innerHTML = days.map(function(d){
      var h = Math.max(6, Math.round((d.total / max) * 100));
      var label = String(d.date || "").replace(/^भदौ\s*/, "");
      return '<div class="vchart-col">'
        + '<span class="vchart-bar" style="--h:' + h + '%" title="' + (d.date || "") + ' · रु. ' + fmt(d.total) + '"></span>'
        + '<em class="num">' + fmtShort(d.total) + '</em>'
        + '<b>' + label + '</b>'
        + '</div>';
    }).join("");
  }

  function renderSplit(){
    var donut = document.getElementById("named-split-donut");
    var leg = document.getElementById("named-split-leg");
    if (!totals) return;
    var inst = Number(totals.institutional || 0);
    var pers = Number(totals.personal || 0);
    var sum = inst + pers || 1;
    var pctI = Math.round((inst / sum) * 1000) / 10;
    var pctP = Math.round((100 - pctI) * 10) / 10;
    if (donut) {
      donut.style.background = "conic-gradient(#0f766e 0 " + pctI + "%, #f59e0b " + pctI + "% 100%)";
      donut.setAttribute("aria-label", "संस्था " + pctI + "% · व्यक्तिगत " + pctP + "%");
    }
    if (leg) {
      leg.innerHTML =
        '<div class="nd-leg-row"><i class="nd-swatch nd-swatch-i"></i><span data-i18n="named_filter_inst">संस्था</span>'
        + '<strong class="num">रु. ' + fmtShort(inst) + '</strong><em>' + pctI + '%</em></div>'
        + '<div class="nd-leg-row"><i class="nd-swatch nd-swatch-p"></i><span data-i18n="named_filter_pers">व्यक्तिगत</span>'
        + '<strong class="num">रु. ' + fmtShort(pers) + '</strong><em>' + pctP + '%</em></div>'
        + '<div class="nd-leg-row nd-leg-total"><span data-i18n="named_split_total">नाम-हस्तान्तरण जम्मा</span>'
        + '<strong class="num">रु. ' + (totals.label_ne || fmtShort(totals.npr)) + '</strong>'
        + '<em>' + (totals.donors || all.length) + ' दाता</em></div>';
    }
  }

  function render(){
    var rows = filtered();
    var pages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (page >= pages) page = pages - 1;
    if (page < 0) page = 0;
    var slice = rows.slice(page * pageSize, page * pageSize + pageSize);
    body.innerHTML = slice.map(function(d){
      var amt = d.usd
        ? ("USD " + fmt(d.usd) + (d.npr ? " · रु. " + fmt(d.npr) : ""))
        : ("रु. " + fmt(d.npr));
      var cheque = isCheque(d.cheque) ? "चेक" : "गैर-चेक";
      return '<article class="nd-row">'
        + '<span class="nd-sn">' + (d.sn || "") + '</span>'
        + '<div class="nd-main">'
        +   '<span class="nd-name">' + (d.name || "") + '</span>'
        +   '<span class="nd-meta">'
        +     '<span class="nd-date">' + (d.date || "") + '</span>'
        +     '<span class="nd-type ' + typeClass(d.type) + '">' + typeLabel(d.type) + '</span>'
        +     '<span class="nd-cheque">' + cheque + '</span>'
        +   '</span>'
        + '</div>'
        + '<span class="nd-amt num">' + amt + '</span>'
        + '</article>';
    }).join("") || '<p class="nd-empty">—</p>';

    var cnt = document.getElementById("named-count");
    if (cnt) cnt.textContent = rows.length + " / " + all.length;

    var pager = document.querySelector('[data-pager="named"]');
    if (pager) {
      var boxes = pager.querySelector(".pager-pages");
      var pc = pager.querySelector(".pager-count");
      if (pc) pc.textContent = (page + 1) + " / " + pages;
      if (boxes) {
        boxes.innerHTML = "";
        var maxShow = Math.min(pages, 10);
        var start = Math.max(0, Math.min(page - 4, pages - maxShow));
        for (var i = start; i < start + maxShow; i++) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "pbox" + (i === page ? " on active" : "");
          b.textContent = String(i + 1);
          (function(ii){ b.addEventListener("click", function(){ page = ii; render(); }); })(i);
          boxes.appendChild(b);
        }
      }
      var prev = pager.querySelector(".pager-prev");
      var next = pager.querySelector(".pager-next");
      if (prev) prev.onclick = function(){ page--; render(); };
      if (next) next.onclick = function(){ page++; render(); };
    }
  }

  function setChip(group, value){
    var root = document.querySelector('[data-named-filter="' + group + '"]');
    if (!root) return;
    root.querySelectorAll("button").forEach(function(btn){
      var on = btn.getAttribute("data-val") === value;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  fetch("data/pmdrf-named-donors.json?v=" + (window.PAGE_VER || ""))
    .then(function(r){ return r.json(); })
    .then(function(data){
      all = data.donors || [];
      days = data.days || [];
      totals = data.totals || null;
      renderDayChart();
      renderSplit();
      render();
    })
    .catch(function(){
      body.innerHTML = '<p class="nd-empty">लोड असफल</p>';
    });

  var inp = document.getElementById("named-q");
  if (inp) inp.addEventListener("input", function(){ q = inp.value.trim(); page = 0; render(); });

  document.querySelectorAll("[data-named-filter]").forEach(function(group){
    group.addEventListener("click", function(ev){
      var btn = ev.target.closest("button[data-val]");
      if (!btn) return;
      var g = group.getAttribute("data-named-filter");
      var v = btn.getAttribute("data-val");
      if (g === "type") { typeFilter = v; setChip("type", v); }
      if (g === "cheque") { chequeFilter = v; setChip("cheque", v); }
      page = 0;
      render();
    });
  });

  var csvBtn = document.getElementById("named-csv");
  if (csvBtn) csvBtn.addEventListener("click", function(){
    var rows = filtered();
    var lines = ["sn,date,name,type,cheque,npr,usd"];
    rows.forEach(function(d){
      lines.push([d.sn, d.date, JSON.stringify(d.name||""), d.type||"", d.cheque||"", d.npr||"", d.usd||""].join(","));
    });
    var blob = new Blob([lines.join("\n")], {type:"text/csv"});
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pmdrf-named-donors.csv";
    a.click();
  });
})();
