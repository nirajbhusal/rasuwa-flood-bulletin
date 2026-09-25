# रसुवा बाढी बुलेटिन — २६ अगस्ट २०२६

Live compiled bulletin for the Bhotekoshi–Trishuli flood (Bhadra 10, 2083).

Public page: https://nirajbhusal.github.io/rasuwa-flood-bulletin/

## Public Overview API

Portals can read homepage `#overview` KPIs from:

- https://nirajbhusal.github.io/rasuwa-flood-bulletin/api/dashboard.json
- Docs / credit: https://nirajbhusal.github.io/rasuwa-flood-bulletin/api/

When the NDRRMA board updates, refresh `api/dashboard.json` alongside homepage KPIs.

## Deploys and cache

GitHub Pages publishes from `.github/workflows/pages.yml` on every push to `main` (including the hourly weather data commit). The workflow checks out that commit, writes one build id — the short commit SHA plus a UTC timestamp — into the deploy artifact only, and does not commit it back. That id replaces every `?v=` on HTML pages, `window.PAGE_VER`, the service worker version and cache names, and `version.json` (`build`, `built_at`).

Do not hand-edit `PAGE_VER`, `?v=`, `sw.js` version constants, or `version.json`. Any value left in the source is overwritten at deploy. A missed bump is how visitors were stuck on stale HTML: Pages sends `cache-control: max-age=600`, and a service worker or an empty `?v=` kept yesterday’s scripts.

`scripts/weather` commits stay limited to `data/weather/` so they cannot fight the stamper or loop the deploy. Open tabs load `version.json` with `cache: 'no-store'` and reload when the build changes. Live JSON (weather, roads, notices) is also fetched with `cache: 'no-store'`.

## Weather database

`data/weather/` is written by `scripts/weather/build.py` and refreshed by the `weather-db` GitHub Actions workflow: hourly at minute 17, plus 02:35, 04:35, and 12:35 UTC. A push to `main` that changes `.github/workflows/weather-db.yml` or `scripts/weather/**` also runs it once. The workflow commits only files under `data/weather/`, and skips the commit when those files are unchanged. GitHub turns a scheduled workflow off after 60 days without repository activity. A commit from the Actions bot counts as activity.

