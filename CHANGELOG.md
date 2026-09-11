# Changelog — design / layout

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
