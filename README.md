# रसुवा बाढी बुलेटिन — २६ अगस्ट २०२६
# rasuwa-flood-bulletin

Live compiled bulletin for the Bhotekoshi–Trishuli flood (Bhadra 10, 2083).
Emergency public bulletin website for the Rasuwa–Bhotekoshi–Trishuli flood response.  
This repository hosts a fully static, bilingual (Nepali/English) web app used to publish rapid updates, rescue references, official links, and community-reported missing/found information.

Public page: https://nirajbhusal.github.io/rasuwa-flood-bulletin/
## Live site

- Current published URL: https://nirajbhusal.github.io/rasuwa-flood-bulletin/
- Fork/repository name: `rasuwa-flood-bulletin`

## What this project includes

- Single-page, mobile-first bulletin UI (`index.html`)
- Nepali + English interface copy (`i18n.js`)
- Live-ish JSON-driven updates without backend
- Water-level monitoring cards from DHM data (`dhm-rivers.json`, `dhm-betrawati.json`)
- Community missing/found records (`family.json`)
- Web app manifest + service worker for installability and update alerts
- Photo/media evidence archive under `img/`

## Tech stack

- Plain HTML, CSS, and vanilla JavaScript (no framework)
- Leaflet map (CDN)
- JSON files as content/data source
- Progressive Web App (PWA) components:
  - `manifest.webmanifest`
  - `sw.js`

## Repository structure

```text
rasuwa-flood-bulletin/
├── index.html                # Main app (markup, styles, and app logic)
├── i18n.js                   # Translation dictionaries and localized content
├── latest.json               # Latest bulletin ID/title/body for refresh + notifications
├── dhm-rivers.json           # Multi-station DHM river levels and status
├── dhm-betrawati.json        # Single-station Betrawati fallback/detail payload
├── family.json               # Missing/found/community report dataset + form links
├── sw.js                     # Service worker (live fetch, notification checks)
├── manifest.webmanifest      # PWA metadata
├── icon-192.png              # PWA icon
├── icon-512.png              # PWA icon
├── img/                      # Incident/response images used by the bulletin
├── docs/
│   └── dhm-bhadra10-sitrep.pdf
└── .nojekyll
```

## Data files and expected shape

### `latest.json`
Used by page polling and service worker notification logic.

Required keys:
- `id` (string, unique per publish; version-like)
- `title` (string)
- `body` (string)
- `url` (string, usually `"./"`)
- `updated_at` (ISO datetime string)

### `dhm-rivers.json`
Contains DHM station snapshots.

Top-level keys typically include:
- `updated_at`
- `note_np`
- `hydrology`
- `river_watch`
- `stations` (array)

Each station item generally includes:
- `station_id`, `series_id`
- `name`, `name_np`, `district_np`
- `warning_m`, `danger_m`, `level_m`
- `status`, `steady`
- `washed` (boolean), `silent` (boolean)
- `observed_at`, `observed_npt`
- `source`

### `family.json`
Community reporting + curated lists.

Top-level keys typically include:
- `updated_at`
- `sheet`, `responses_sheet`
- `forms` (with `missing` and `found` Google Form URLs)
- `missing` (array)
- `found` (array, where present)
- additional categorized lists used in the UI

## Local development

Because this is a static project, run any local static server:

```bash
cd /home/runner/work/rasuwa-flood-bulletin/rasuwa-flood-bulletin
python3 -m http.server 8080
```

Open:
- http://localhost:8080

> Note: `index.html` contains a `<base href="https://nirajbhusal.github.io/rasuwa-flood-bulletin/">`.  
> For strict local-asset testing, temporarily adjust/remove `<base href>` and restore it before publishing.
## Publishing workflow (content updates)

1. Update data/content sources:
   - `latest.json` for headline update metadata
   - `dhm-rivers.json` / `dhm-betrawati.json` for gauge updates
   - `family.json` for missing/found updates
   - `i18n.js` if text content or language keys changed
2. Add or replace referenced media in `img/` as needed.
3. Bump version markers to force clients to refresh:
   - `window.PAGE_VER` in `index.html`
   - `SW_VER` in `sw.js`
4. Verify key sections in browser (language toggle, map, family search, water-level cards, notification toggle).
5. Commit and deploy through GitHub Pages.

## Deployment

This repo is designed for GitHub Pages static hosting.

- Keep `index.html` at repository root.
- Keep `.nojekyll` so static assets are served without Jekyll processing.
- Ensure the deployment branch/pages settings point to this repository content.

## Operational notes

- No backend/API server is required.
- Data freshness relies on JSON updates.
- Service worker checks `latest.json` and can show local notifications when a new `id` appears.
- Keep emergency phone numbers and links in the page content current and verified.

## Safety and responsibility

This bulletin is for rapid public information sharing during a disaster context.  
Always prioritize official emergency channels and on-ground authority instructions when conflicts occur.

## Contributing

If contributing via a fork:
- Keep edits focused and factual.
- Preserve existing section structure unless intentionally redesigning.
- Validate all external links and numbers before merge.

## License

No license file is currently present in this repository.  
If open-source reuse is intended, add an explicit `LICENSE` file.
