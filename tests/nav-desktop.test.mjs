import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const root = new URL("..", import.meta.url);
function read(name) {
  return readFileSync(new URL(name, root), "utf8");
}

const ORDER = [
  "index.html",
  "notices.html",
  "notices.html#roads",
  "electricity.html",
  "weather.html",
  "photos.html",
  "names.html",
  "contact.html",
  "gov.html",
  "markets.html",
  "donate.html",
  "response.html",
  "damage.html",
  "supply.html",
  "about.html"
];

function extractFn(src, name) {
  const start = src.indexOf("function " + name + "(");
  assert.ok(start >= 0, name + " missing");
  let i = src.indexOf("{", start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error("unclosed " + name);
}

const nav = read("nav-menu.js");
const css = read("bulletin.css");
const min = read("bulletin.min.css");

const GROUPS = [
  ["home", "गृह", "Home", false],
  ["alerts", "चेतावनी", "Alerts", true],
  ["people", "मानिस", "People", true],
  ["gov", "सरकार", "Government", true],
  ["relief", "राहत", "Relief", true],
  ["more", "थप", "More", false]
];

test("desktop tabs follow the existing menu order", () => {
  const groups = nav.slice(nav.indexOf("var GROUPS"), nav.indexOf("var ICONS"));
  const hrefs = [];
  for (const m of groups.matchAll(/hrefs:\s*\[([^\]]*)\]/g)) {
    for (const h of m[1].matchAll(/"([^"]+)"/g)) hrefs.push(h[1]);
  }
  assert.deepEqual(hrefs, ORDER);
  for (const href of ORDER) {
    assert.match(nav, new RegExp('"' + href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '":\\s*\\{\\s*ne:\\s*"[^"]+",\\s*en:\\s*"[^"]+"'));
  }
  assert.match(nav, /थप/);
  assert.match(nav, /"More"/);
});

test("desktop groups mirror the mobile drawer", () => {
  const src = nav.slice(nav.indexOf("var GROUPS"), nav.indexOf("var ICONS"));
  const keys = [...src.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(keys, GROUPS.map((g) => g[0]));
  GROUPS.forEach((g) => {
    assert.match(src, new RegExp('key:\\s*"' + g[0] + '",\\s*ne:\\s*"' + g[1] + '",\\s*en:\\s*"' + g[2] + '"'));
  });
  const plan = new Function(extractFn(nav, "deskGroupPlan") + "\nreturn deskGroupPlan;")();
  const built = plan(GROUPS.map((g) => ({ key: g[0], hrefs: g[3] ? ["a.html", "b.html"] : ["a.html"] })));
  assert.deepEqual(built.map((g) => g.menu), GROUPS.map((g) => g[3]));
  assert.match(nav, /hnav-slot/);
  assert.match(nav, /hnav-parent/);
  assert.match(nav, /aria-haspopup/);
  assert.match(nav, /pointerenter/);
  assert.match(nav, /aria-expanded/);
  assert.match(css, /\.hnav-slot\{position:relative/);
  assert.match(min, /\.hnav-slot\{position:relative/);
});

const PAGES = {
  "notices.html": "सूचना",
  "notices.html#roads": "सडक",
  "electricity.html": "बिजुली",
  "weather.html": "मौसम",
  "photos.html": "ग्यालरी",
  "names.html": "नामावली",
  "contact.html": "हेल्पलाइन",
  "gov.html": "सरकार",
  "markets.html": "बजार",
  "donate.html": "राहत",
  "response.html": "प्रतिक्रिया",
  "damage.html": "क्षति",
  "supply.html": "एलपीजी",
  "about.html": "थप"
};

function elementStub() {
  return {
    className: "",
    style: {},
    attrs: {},
    children: [],
    href: "",
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener() {},
    querySelector() { return null; }
  };
}

test("homepage desktop menu items link to dedicated pages", () => {
  const index = read("index.html");
  const ids = new Set([...index.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const chipStart = index.indexOf('id="nav-chips"');
  const chipEnd = index.indexOf("</nav>", chipStart);
  assert.ok(chipStart >= 0 && chipEnd > chipStart);
  const chipHrefs = [...index.slice(chipStart, chipEnd).matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of chipHrefs) {
    assert.equal(href.startsWith("#"), false, "chip " + href);
  }
  const available = new Set(chipHrefs.concat(["notices.html#roads", "electricity.html", "markets.html"]));
  const groupsSrc = nav.slice(nav.indexOf("var GROUPS"), nav.indexOf("var ICONS"));
  const groups = [...groupsSrc.matchAll(/key:\s*"([^"]+)"[\s\S]*?hrefs:\s*\[([^\]]*)\]/g)].map((m) => ({
    key: m[1],
    hrefs: [...m[2].matchAll(/"([^"]+)"/g)].map((h) => h[1])
  }));
  const desktopHrefs = [];
  for (const g of groups) {
    if (g.key === "home") continue;
    for (const href of g.hrefs) if (available.has(href)) desktopHrefs.push(href);
  }
  assert.deepEqual(desktopHrefs, Object.keys(PAGES));

  const helpers = ["onHomePage", "deskSection"].filter((name) => nav.includes("function " + name + "(")).map((name) => extractFn(nav, name)).join("\n");
  const section = nav.includes("var SECTION =")
    ? nav.slice(nav.indexOf("var SECTION ="), nav.indexOf("var deskBar"))
    : "";
  const makeDeskLink = new Function("document", `
    var location = { pathname: "/index.html", search: "", hash: "" };
    function en() { return false; }
    function isDesk() { return true; }
    function shortText(href) { return href; }
    function deskIcon() { return document.createElement("svg"); }
    function onDeskTabClick() {}
    ${section}
    ${helpers}
    ${extractFn(nav, "makeDeskLink")}
    return makeDeskLink;
  `)({
    getElementById(id) { return ids.has(id) ? { id } : null; },
    createElement() { return elementStub(); },
    createElementNS() { return elementStub(); }
  });

  for (const href of desktopHrefs) {
    const tab = makeDeskLink(href);
    assert.equal(tab.className, "hnav-tab");
    assert.equal(tab.getAttribute("data-href"), href);
    assert.equal(String(tab.href).startsWith("#"), false, href + " -> " + tab.href);
    assert.equal(tab.href, href);
  }
  assert.doesNotMatch(extractFn(nav, "makeDeskLink"), /tab\.href\s*=\s*["']#/);
  assert.doesNotMatch(extractFn(nav, "onDeskTabClick"), /preventDefault/);
});

test("desktop bar is 900px-up and the mobile drawer is still there", () => {
  assert.match(css, /@media \(min-width:900px\)\{[^}]*\.head-stick #nav-toggle\{display:none !important\}/);
  assert.match(css, /\.hnav\{display:none\}/);
  assert.match(css, /#c41e3a/);
  assert.match(css, /\.hnav-menu/);
  assert.match(css, /\.hnav-parent\.is-current/);
  assert.match(css, /scroll-margin-top/);
  assert.match(min, /\.hnav\{\s*display:\s*block !important/);
  assert.match(min, /\.head-stick #nav-toggle\{\s*display:\s*none !important/);
  const mobile = css.slice(css.indexOf("@media (max-width:760px){"), css.indexOf(".page-body{display:block}"));
  assert.match(mobile, /\.nav-toggle\{/);
  assert.match(mobile, /nav-drawer-panel/);
  assert.doesNotMatch(mobile, /\.hnav/);
});

test("every header page loads the shared menu script", () => {
  const pages = readdirSync(new URL(".", root)).filter((name) => name.endsWith(".html"));
  const headerPages = pages.filter((name) => read(name).includes('id="nav-toggle"'));
  assert.ok(headerPages.includes("index.html"));
  assert.ok(headerPages.includes("weather.html"));
  assert.ok(headerPages.includes("electricity.html"));
  for (const name of headerPages) {
    const html = read(name);
    assert.match(html, /nav-menu\.js/);
    assert.match(html, /line-height:1\.3\}\}@media\(min-width:900px\)\{\.head-stick #nav-toggle\{display:none\}\}/);
    assert.match(html, /id="nav-chips"/);
  }
});

test("desktop bar hides the extra home tab and centers a larger label", () => {
  const build = nav.slice(nav.indexOf("function ensureDeskNav"));
  assert.match(build, /if \(g\.key === "home"\) return;/);
  assert.match(nav.slice(nav.indexOf("var GROUPS"), nav.indexOf("var ICONS")), /key:\s*"home"/);
  assert.match(css, /\.hnav-row\{[^}]*justify-content:center/);
  assert.match(css, /font-size:16px/);
  assert.match(css, /\.hnav-ico\{width:18px;height:18px/);
  assert.match(css, /@view-transition\{navigation:auto\}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(min, /justify-content:center/);
  assert.match(min, /font-size:16px/);
  assert.match(min, /@view-transition\{navigation:auto\}/);
  assert.match(nav, /history\.scrollRestoration = "auto"/);
  assert.match(nav, /history\.replaceState/);
  assert.match(nav, /rel = "prefetch"/);
  assert.match(nav, /placeDeskMenu/);
});

test("back-forward cache is not blocked by a no-store document", () => {
  const sw = read("sw.js");
  const refresh = read("refresh.js");
  assert.match(sw, /function networkFirst\(request, passthrough\)/);
  assert.match(sw, /isNavigation\(e\.request, url\)/);
  assert.match(sw, /networkFirst\(e\.request, true\)/);
  assert.doesNotMatch(sw.slice(sw.indexOf("if (passthrough)"), sw.indexOf("try {\n      const headers")), /no-store, no-cache, must-revalidate/);
  assert.match(refresh, /fromRestore/);
  assert.match(refresh, /site-resume/);
  assert.match(refresh, /if \(!ev\.persisted\) return;/);
});

test("overflow tabs move into More and a short row does not", () => {
  const fitTabs = new Function(extractFn(nav, "fitTabs") + "\nreturn fitTabs;")();
  const widths = [80, 80, 80, 80, 80];
  assert.equal(fitTabs(widths, 410, 70, 2), 5);
  assert.equal(fitTabs(widths, 300, 70, 2), 2);
  assert.equal(fitTabs(widths, 60, 70, 2), 0);
  assert.equal(fitTabs([40, 40], 200, 90, 2), 2);
});
