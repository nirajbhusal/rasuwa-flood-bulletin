# रसुवा बाढी बुलेटिन — २६ अगस्ट २०२६

Live compiled bulletin for the Bhotekoshi–Trishuli flood (Bhadra 10, 2083).

Public page: https://nirajbhusal.github.io/rasuwa-flood-bulletin/

## Public Overview API

Portals can read homepage `#overview` KPIs from:

- https://nirajbhusal.github.io/rasuwa-flood-bulletin/api/dashboard.json
- Docs / credit: https://nirajbhusal.github.io/rasuwa-flood-bulletin/api/

When the NDRRMA board updates, refresh `api/dashboard.json` alongside homepage KPIs.

## Weather database

`data/weather/` is written by `scripts/weather/build.py` and refreshed by the `weather-db` GitHub Actions workflow: hourly at minute 17, plus 02:35, 04:35, and 12:35 UTC. The workflow commits only files under `data/weather/`. GitHub turns a scheduled workflow off after 60 days without repository activity. A commit from the Actions bot counts as activity.

