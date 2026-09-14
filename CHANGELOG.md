## 2026-09-14-2200 · MoF capital-market recovery plan

- New `markets.html`: Government of Nepal, Ministry of Finance **पुँजी बजार सुधार एवं पुनरुत्थान कार्ययोजना** dated **२०८३।०५।२९** (after 10 Bhadra Bhotekoshi flood). Full Nepali plan text in thematic cards (IPO / bonds-ETF-MF / NEPSE / benchmark / NRN / brokers-Act / institutional / tax-CDS-NRB) with deadline chips. EN gists via i18n. Citizen bulletin — not a government site. No invented figures.
- Homepage `#cat-markets` infographic (date · CGT ३.७५%/५% · ४५-दिन floor · theme + month chips) links to `markets.html`.
- Sitewide nav chip **पुँजी बजार पुनरुत्थान** / **Capital market recovery**; hash redirects `#markets` / `#cat-markets` / `#capital` → `markets.html`.
- Archive: `data/mof-capital-market-plan-2083-05-29.md` + `.docx`. SitRep #12 KPIs and cash channels unchanged.
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-14-2200`

## 2026-09-14-2015 · NDRRMA SitRep #12

- NDRRMA / MoHA SitRep #12 · 29 Bhadra 19:00 / 14 Sep: dead **1,395** · rescued **13,737** · treated **341** (19 hospitals) · discharged **278** · security-agency treatment **9,358** · missing ~**5,130** (do not re-sum). Army heli **1,531** (15 today) · APF **320**. Holding **33** centers (Nuwakot 1,499 · Rasuwa 825 · Dhading 94). Fuel 47k/16k/11k · LPG **502**. District deaths: Chitwan 364 · Nawal E 232 · West 222 · Nuwakot 202 · Rasuwa 186 · Gorkha 77 · Dhading 72 · Tanahun 38 · Kathmandu treatment 2. Missing labels this board: Army 25 · Police 73 · APF 45 · gov 12 · bank/FI 26. DNA relatives **1,853**. SAR equipment budget (million NPR): Army 90 · Police 60 · APF 60. Holding-exit cash: NPR 15,000 (≤4) · +2,000/extra member. Archive `img/today-2026-09-14-ndrrma-sitrep12-1900.jpg`.
- Previous SitRep #11 (1,388 / 13,728 / 339 / 1,516 / Nuwakot holding 1,613) moved to history. Cash channels (MoF / NCHL / Fonepay / named handover) unchanged and separately labeled.
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-14-2015`

## 2026-09-14-1700 · Named handover Excel through Bhadra 28

- `data/pmdrf-named-donors.json`: 492 donors · Rs. 2,737,630,633.82 (Bhadra 11–28); days/totals from Total sheet; MoF/NCHL/Fonepay unchanged and separately labeled.
- donate/index/i18n hero + directory kickers updated; Excel archived under `data/`.

## 2026-09-14-1330 · Merge damage + RDNA + map/timeline

- One `damage.html` page: existing EMS/damage/power, then `#rdna` (unchanged), then `#map` / `#path` moved from `map.html` (unchanged)
- Sitewide nav: single **क्षति मूल्यांकन** chip → `damage.html`; removed top-level `nav_rdna` and `nav_map`
- In-page jump on `damage.html` only: `#ems927` · `#rdna` · `#map`
- Hash redirects: `#map` / `#path` → `damage.html#map` / `#path`; `#rdna` / `#infographics` stay on `damage.html#rdna`
- Thin `map.html` shim → `damage.html#map` (keeps `#path`)
- Title/meta labels cover damage + RDNA + map/timeline; personal bulletin; figures untouched
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-14-1330`

## 2026-09-14-0915 · NDRRMA SitRep #11 + cash boards

- NDRRMA / MoHA SitRep #11 · 28 Bhadra 19:00 / 13 Sep: dead **1,388** · rescued **13,728** · treated **339** (19 hospitals) · discharged **271** · security-agency treatment **9,314** · missing ~**5,130** (do not re-sum). Army heli **1,516** (34 today) · APF **320**. Holding **33** centers (Nuwakot 1,613 · Rasuwa 825 · Dhading 94). Fuel 33k/18k/15k · LPG **502**. Archive `img/today-2026-09-13-ndrrma-sitrep11-1900.jpg`.
- OPMCM PMDRF 2083/05/28 17:00: 9-bank NPR **9,995,024,994** (~9.99bn) · USD **23,441,854** · equiv NPR **3,576,992,569** @152.59 · available **13,572,017,563** (~13.57bn). Not stacked with NCHL/Fonepay/named.
- NCHL 14 Sep 00:00: **263,267** / **5,521,433,368.22** (~5.52bn).
- Fonepay CORE till date: **925,407** / **2,507,249,462** (~2.51bn). Yesterday 13 Sep 1,512 / 8,942,981 (subtitle).
- Labeled NCHL+Fonepay **8,028,682,830.22** (~8.03bn) — not a mega-total with MoF.

## 2026-09-12-1515 · Nepal Police highway blockages

- `notices.html` `#roads`: prepend Nepal Police main-highway board as of BS 2083/05/27 06:40 (archive `img/today-2026-09-12-nepal-police-highway-0640.jpg`); history log + home roads chips; i18n EN roads/hist.

## 2026-09-12-1400 · LPG hoarding transparency

- `supply.html`: `#lpg-scope` disclaimer (Customs totals ≠ hoarding); `#lpg-hoarding` cards for distribution framework + NOC sources, official-source ask, complaint pointers (100 / 1234 / contact helpline), and explicit won’t-do list.
- i18n NE/EN keys; CSS for scope/hoard cards; `latest.json` → `#lpg-hoarding`.

# Changelog — design / layout

## 2026-09-12 · PAGE_VER 1300 — LPG distribution official sources

### supply.html
- New `#lpg-sources` / `.lpg-info` card below customs table/archive
- Labeled channels: Customs import (this page) vs NOC distribution/bottling (separate)
- Links: NOC bottler directory · NOC storage (depot capacity ≠ LPG cylinder stock) · Onlinekhabar news citing NOC (~87,877 cylinders Bhadra 18–20) marked secondary
- Cylinder icon; search/tracker/MT figures unchanged; no auto-fetch; news numbers not merged into KPIs

### i18n
- NE default + EN keys for title, channel labels, and three source links

### CSS
- `.lpg-info` teal source card · dual channel chips · `.lpg-src-list` link list

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-1300`

## 2026-09-12 · PAGE_VER 1245 — LPG cylinder icon graphics

### supply.html
- KPI day cards: flat crimson LPG cylinder SVG (`.lpg-kpi-ico`) beside date chip
- Section head: forest dot → cylinder mark (`.lpg-sec-ico`)
- Source line: teal customs-gate icon before source text
- Office rows: map-pin icon before office name (sibling of `data-i18n` span)
- Tracker strip: offices / up / down / stop icons on status cards
- Archive PNG links unchanged; MT/cylinder figures and search/filter unchanged

### index.html
- Home LPG category mark + snap mini cylinder for consistency

### CSS
- `.lpg-ico` / `.lpg-kpi-ico` / `.lpg-off-ico` / `.lpg-track-ico` (~28–40px KPI, ~14–16px rows)
- Nepal crimson `#c41e3a` cylinder body; teal accents; light chip backgrounds only
- Inline SVG only (no new binary assets)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-1245`

## 2026-09-12 · PAGE_VER 1230 — LPG search + filter tracker

### supply.html
- Name-list-style search (`.ui-search`) above `.lpg-rows`: filter by Nepali/English office name
- Filter chips: All / Up ▲ / Down ▼ / No entry (Dhangadhi)
- Status tracker strip: कुल नाका ६ · बढेको ३ · घटेको २ · प्रवेश छैन १
- Highlight pills: biggest drop Birgunj ▼62.6% · biggest rise Mechi (existing figures only)
- Row `data-office` / `data-name-ne` / `data-name-en` / `data-trend` + empty state
- Inline filter script only — no Customs auto-fetch; MT/cylinder figures unchanged

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-1230`


## 2026-09-12 · PAGE_VER 1045 — chart layout · RDNA palette · donut hole

### Design / layout
- Mobile (≤720px): all `.viz-pie-row` stack — donut centered above, legend full-width below
- Donut size: mobile ≥152px (RDNA ≥156px); desktop ~168–172px side-by-side
- `.viz-donut-hole` solid white disc + dark ink (`clamp` for long crore figures) — no transparent center over blue ring
- RDNA sectors: Social `#f59e0b` · Productive `#dc2626` · Infra `#1d4ed8` · Cross `#0f766e` (stops/figures unchanged)
- Legend swatches ≥10px; cash/ops/named donut hole contrast

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-1045`

## 2026-09-12 · PAGE_VER 0945 — RDNA/LPG separate pages · live header clock

### Pages / IA
- New `supply.html`: full LPG customs board moved off homepage
- `damage.html#rdna`: homepage `.rdna-board` (KPIs, donuts, HH, bullets) above summary table
- Homepage: compact snaps → `supply.html` / `damage.html#rdna`; catalog chips to real pages
- Sitewide nav: `nav_rdna` → `damage.html#rdna`, `nav_supply` → `supply.html` on all pages
- Hash redirects: `#cat-supply`/`#supply`/`#lpg` → supply; `#cat-infographics`/`#infographics` → `damage.html#rdna`

### Header / overview
- Brand stack: live Asia/Kathmandu `brand-now` + `brand_date` last board update (all pages)
- Overview KPI title above `.kpi-row` (`overview_h` / `overview_sub`)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-0945`

## 2026-09-12 · PAGE_VER 0930 — brand-date last update · remove sit-chip

- Removed muted sit-chip (`safety-reloc`) from overview + secondary pages; latest NDRRMA board time now in `.brand-date` (NE/EN). `PAGE_VER` → `2026-09-12-0930`.

## 2026-09-12 · PAGE_VER 0915 — color grading · semantic chart tones

### Design / layout
- Death pie + district column chart + progress bars now share the crimson family (no more forest-green death bars)
- `.vchart-bar` default is slate; tones inherit via `.vchart-dead` / `data-tone` / panel context
- Rescue/air teal · injured saffron · missing slate · cash/days teal→forest · relief forest
- Cat nav / menu chips: teal global active, inactive white/gray
- `--viz-dead-1..5` crimson ramp for death donut + legend (percentages unchanged)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-0915`

## 2026-09-12 · PAGE_VER 0900 — portal CTA cards + KPI type scale

### Design / layout
- Portal rescue + donate CTA cards: compact stack (kicker → headline → URL → pay logos → yellow CTA); `justify-content: flex-start`; drop equal-height void (`height:100%` / `space-between`)
- Solid saffron `#facc15` CTA chrome; pay logos single compact row; mobile bottom padding clears FAB / browser chrome
- Unified number type scale via `--fs-kpi` / `--fs-kpi-2` / `--fs-kpi-meta` (hero / secondary / meta); tabular-nums + weight 800
- Touch targets ≥44px on CTAs/chips; light hero/menu rhythm tighten (CSS only)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-0900`

## 2026-09-12 · PAGE_VER 0830 — LPG customs import day-compare

### Content
- Homepage `#cat-supply` / `#supply`: LPG import KPI cards (BS 2083/05/25 vs 05/26), entry-point compare bars, Dhangadhi zero-entry note
- Source: Department of Customs, Ministry of Finance — not merged into NDRRMA fuel stock or cash/PMDRF KPIs
- Catalog chip + optional nav chip «एलपीजी आयात»; i18n NE+EN
- Archived source graphics under `img/today-2026-09-12-lpg-*` (not live board embeds)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-0830`

## 2026-09-11 · PAGE_VER 2145 — RDNA infographics (NPC–NDRRMA)

### Content
- Homepage `#cat-infographics` / `#infographics`: RDNA KPI tiles, sector donuts (effects + recovery), impacted HH strip, labeled qualitative bullets
- `damage.html#rdna`: full summary table (4 sectors + sub-rows + total), HH strip, source line
- Figures as printed from RDNA summary table; not merged into NDRRMA casualty KPIs or cash/PMDRF channels
- Catalog chip + nav chip «इन्फोग्राफिक / RDNA»; i18n NE+EN
- Archived slides under `img/today-2026-09-11-rdna-*.jpg` (not live board graphics)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-11-2145`

## 2026-09-11 · PAGE_VER 1915 — light civic polish · safety strip relocated

### Chrome
- Removed crimson `.safety-banner` from sticky menu stack on all pages (header → chips)
- Relocated `data-i18n-html="safety"` wording unchanged:
  - `index.html`: muted `.sit-chip.safety-reloc` at top of `#overview`
  - secondary pages: muted sit-chip under `.brand-date` (not a full-width alert)
- `@media (prefers-color-scheme: dark)` neutralized — body/paper/card stay light (no charcoal)
- Light civic polish: soft paper, white cards, hairline borders, calm chip/nav shadows; helpline useful not screaming
- KPI figures / cash channels / MoF mega-total stacking: untouched

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-11-1915`


## 2026-09-11 · PAGE_VER 1900 — Phase 2 names + secondary landmarks

Content freeze: no reader-visible text, figures, labels, caveats, sources, or i18n string bodies changed. DIFF vs `/workspace/rasuwa-ui-audit/before/` = CLEAN.

### names.html
- Name-card / `.ns-hit` status accents via `--sem-miss` / `--sem-relief` / `--sem-rescue` / `--sem-inj` / `--sem-dead` (badge text unchanged)
- Tables (`.treat-wrap`): sticky thead, zebra rows, horizontal scroll on mobile; search/filter behaviour untouched
- Shared `.ui-search` look for header / body / overlay / fam search inputs
- Empty-state polish on existing `.ns-empty` / `.fam-empty` hooks only (no invented copy)
- Skip-to-content + `<main id="main">`; focus/touch targets on names controls

### Secondary pages (donate, map, notices, contact, gov, response, photos, damage, about)
- Skip-to-content + `<main id="main" class="page-main">` landmarks
- Nav `is-current`: fixed erroneous about highlight on `response.html` (nav-menu.js still marks the real page)
- `.sec-head` polish using existing headings only
- Footer `href` escapes: confirmed clean in HTML footers (i18n.js JS-string escapes left as-is)
- Overflow / shared tokens only

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-11-1900`

### Deferred
- Duplicate-board accordion (needs confirmed 1:1 duplicates)
- Do not invent loading/empty i18n keys beyond existing hooks
- family.json content untouched

## 2026-09-11 · PAGE_VER 1815 — Phase 1 UI system

Content freeze: no reader-visible text, figures, labels, caveats, sources, or i18n string bodies changed (footer `href` escape bug fixed only).

### Design tokens (`bulletin.css` `:root`)
- Brand: `--crimson` kept
- Semantic: `--sem-dead`, `--sem-miss`, `--sem-inj`, `--sem-rescue`, `--sem-relief`, `--sem-aid`, `--sem-roads`, `--sem-gov`, `--sem-human` (+ soft pairs)
- Spacing: `--space-0`…`--space-6` → 4 / 8 / 12 / 16 / 24 / 32 / 48
- Radius / border / shadow: `--radius*`, `--border`, `--shadow*` , `--shadow-focus`, `--touch` (44px)
- Type scale: `--fs-h1`…`--fs-footnote` with Devanagari-friendly `--lh-*`
- Dark: `@media (prefers-color-scheme: dark)` variable overlays (light remains default)

### Components / chrome
- Skip-to-content (CSS + `aria-label`; `#main` landmark on index)
- Sticky category sub-nav (`.home-cat-nav`) + scroll-spy active state (`#cat-*`)
- Main nav: mid-width horizontal scroll; `is-current` / `aria-current` via `nav-menu.js`
- Helpline strip touch target / sticky feel on mobile
- Focus-visible + 44px touch targets
- `.caveat` / `.info-note` / `.nig-note` muted callouts (CSS icon only)
- Hero: primary KPI band, equal-height cards, label-left / number-right tabular nums
- CTA pair equal-width cards; payment logo chips aligned
- Chart legend / bar polish (numbers & labels untouched)
- Overflow guard 320–400px

### Markup fixes
- `index.html` footer: unescaped `href="tel:+9779851175115"` / `mailto:neerajbhusal@gmail.com` (was broken `href=\"…\"`)
- `i18n.js` `foot_contact` NE+EN: `\"` is correct JS string escaping → left unchanged (runtime HTML is valid)

### Deferred
- Duplicate-board accordion (needs confirmed 1:1 duplicates)
- Phase 2 names.html deep search/table work (light token consistency only if landed)
- Skip/main landmark rollout to every secondary page
