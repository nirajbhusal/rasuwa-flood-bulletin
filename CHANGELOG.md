# Changelog — design / layout

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
