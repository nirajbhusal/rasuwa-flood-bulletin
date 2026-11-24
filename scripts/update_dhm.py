#!/usr/bin/env python3
"""Refresh dhm-rivers.json from the DHM river-watch feed.

Replaces the manual "Update DHM gauges: Kali 6.878@23:20 rising" commits.

Design rules, in order of importance:
  1. Never overwrite good data with nothing. If DHM is unreachable or returns a
     malformed page, the committed file is left untouched.
  1b. Only wake a human for things a human must fix. A network blip is transient
     and self-heals on the next run, so it exits 0 and logs. A page whose shape
     changed will never self-heal, so it exits non-zero and fails the job.
  2. Never drop a station. A gauge that vanishes from the feed has usually been
     washed away, which is itself news -- it is marked, not deleted.
  3. Never touch human-written fields. name_np, district_np and note_np are
     editorial and are carried over verbatim.
  4. Say nothing when nothing changed, so the commit log stays readable.
"""

import json
import pathlib
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

FEED = "https://www.dhm.gov.np/hydrology/river-watch"


def _find_out() -> pathlib.Path:
    """Locate dhm-rivers.json from the script dir upward, so the script works
    whether it sits at the repo root or in scripts/."""
    here = pathlib.Path(__file__).resolve().parent
    for d in (here, *here.parents):
        p = d / "dhm-rivers.json"
        if p.is_file():
            return p
    raise SystemExit("dhm-rivers.json not found")


OUT = _find_out()
NPT = timezone(timedelta(hours=5, minutes=45))
SILENT_AFTER = timedelta(minutes=60)
DEVANAGARI = str.maketrans("0123456789", "०१२३४५६७८९")
UA = "rasuwa-flood-bulletin/1.0 (+https://nirajbhusal.github.io/rasuwa-flood-bulletin/)"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def json_arrays(s: str):
    """Yield every embedded JSON array of objects, by bracket matching."""
    for start in (m.start() for m in re.finditer(r"\[\s*\{", s)):
        depth = 0
        in_str = esc = False
        for i in range(start, len(s)):
            c = s[i]
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = not in_str
            elif in_str:
                pass
            elif c in "[{":
                depth += 1
            elif c in "]}":
                depth -= 1
                if depth == 0:
                    try:
                        arr = json.loads(s[start : i + 1])
                        if isinstance(arr, list) and arr:
                            yield arr
                    except ValueError:
                        pass
                    break


class FeedShapeError(Exception):
    """The page loaded but no longer contains the station array we parse."""


def scrape() -> dict:
    """series_id -> live record, from the largest embedded station array."""
    html = fetch(FEED)
    best: list = []
    for arr in json_arrays(html):
        if any(isinstance(o, dict) and "series_id" in o for o in arr) and len(arr) > len(best):
            best = arr
    if len(best) < 50:
        raise FeedShapeError(f"river-watch returned {len(best)} stations; refusing to trust it")
    return {o["series_id"]: o for o in best if isinstance(o, dict) and o.get("series_id")}


def num(v):
    try:
        return round(float(v), 3)
    except (TypeError, ValueError):
        return None


def main() -> int:
    doc = json.loads(OUT.read_text(encoding="utf-8"))
    try:
        live = scrape()
    except FeedShapeError as e:
        # The page parsed but is not what we expect. This will not fix itself.
        print(f"DHM feed structure changed, keeping committed data: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        # Timeout, DNS, 5xx, dropped connection. Next run in 10 minutes will
        # almost certainly succeed; failing the job here would only train the
        # maintainer to ignore red builds during a disaster.
        print(f"DHM unreachable, keeping committed data: {e}", file=sys.stderr)
        return 0

    now = datetime.now(timezone.utc)
    changed = []

    for st in doc["stations"]:
        # A gauge confirmed washed away does not come back; leave it frozen with
        # the last reading it ever reported.
        if st.get("washed"):
            continue

        rec = live.get(st.get("series_id"))
        if rec is None:
            if not st.get("silent"):
                st["silent"] = True
                changed.append(f"{st['name_np']} off feed")
            continue

        wl = rec.get("waterLevel") or {}
        level, seen_at = num(wl.get("value")), wl.get("datetime")
        if level is None or not seen_at:
            continue

        before = (st.get("level_m"), st.get("status"), st.get("steady"), st.get("observed_at"))

        st["level_m"] = level
        st["status"] = rec.get("status") or st.get("status")
        st["steady"] = rec.get("steady") or ""
        st["warning_m"] = num(rec.get("warning_level"))
        st["danger_m"] = num(rec.get("danger_level"))
        st["observed_at"] = seen_at

        obs = datetime.fromisoformat(seen_at.replace("Z", "+00:00"))
        st["observed_npt"] = obs.astimezone(NPT).strftime("%H:%M").translate(DEVANAGARI)
        st["silent"] = (now - obs) > SILENT_AFTER

        if (st["level_m"], st["status"], st["steady"], st["observed_at"]) != before:
            trend = {"RISING": "rising", "FALLING": "falling"}.get(st["steady"], "steady")
            flag = " ⚠ DANGER" if "DANGER" in (st["status"] or "") else ""
            changed.append(f"{st['name_np']} {level}@{st['observed_npt']} {trend}{flag}")

    if not changed:
        print("no change")
        return 0

    doc["updated_at"] = now.isoformat(timespec="seconds")
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("; ".join(changed))
    return 0


if __name__ == "__main__":
    sys.exit(main())
