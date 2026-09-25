#!/usr/bin/env python3
"""Build data/weather/*.json from DHM MFD, hydrology.gov.np, and Open-Meteo ECMWF IFS.

Stdlib only. On a source failure, keep the last good block (status retained) and
never invent a number. Personal DHM fields are stripped before anything is written.
"""
import argparse
import copy
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

import hydrology

UA = "rasuwa-flood-bulletin-weather/1.0 (+https://nirajbhusal.github.io/rasuwa-flood-bulletin/)"
HEADERS = {"User-Agent": UA, "Accept": "application/json"}
NPT = timezone(timedelta(hours=5, minutes=45))
UTC = timezone.utc
FRESH = timedelta(hours=3)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DHM = "https://dhm.gov.np/mfd/api/"
PROVINCES = {
    1: "koshi", 2: "madhesh", 3: "bagmati", 4: "gandaki",
    5: "lumbini", 6: "karnali", 7: "sudurpaschim",
}
HOME_CITIES = ["kathmandu", "pokhara", "biratnagar", "nepalgunj", "dhangadhi", "janakpur"]
HOME_RIVERS = [4657, 52, 4913, 191, 66, 265, 113, 243]
CORRIDOR_RIVERS = {
    4657: ("धुन्चे · त्रिशूली खोला", "Trishuli Khola at Dhunche"),
    52: ("बेत्रावती · त्रिशूली", "Trishuli at Betrawati"),
    4913: ("रसुवागढी · भोटेकोशी", "Bhotekoshi at Rasuwagadhi"),
    191: ("स्याफ्रुबेसी · भोटेकोशी", "Bhote Koshi at Syaphrubesi"),
    190: ("स्याफ्रुबेसी · लाङटाङ खोला", "Langtang Khola at Syaphrubesi"),
    4658: ("बेत्रावती · फलाखु खोला", "Phalakhu Khola at Betrawati"),
    66: ("बेलकोट · तादी", "Tadi at Belkot"),
    4659: ("रौटार · तादी खोला", "Tadi Khola at Rautar"),
    5705: ("गल्छी · त्रिशूली", "Trishuli at Galchi"),
    4661: ("भोर्ले · त्रिशूली", "Trishuli River at Bhorle"),
    4781: ("काली खोला · त्रिशूली", "Trishuli River at Kali Khola"),
    265: ("देवघाट · नारायणी", "Narayani at Devghat"),
    113: ("बाह्रबिसे · भोटेकोशी", "Bhote Koshi at Bahrabise"),
    11: ("जालबिरे · बलेफी", "Balefi at Jalbire"),
    104: ("पचुवारघाट · सुनकोशी", "Sunkoshi at Pachuwarghat"),
    199: ("दोलालघाट · सुनकोशी", "Sunkoshi at Dolalghat"),
    243: ("खुर्कोट · सुनकोशी", "Sunkoshi at Khurkot"),
}
CORRIDOR_RAIN = {
    5556: ("क्याङजिन", "Kyangjing"),
    390: ("थामाचिट", "Thamachit"),
    365: ("बाह्रबिसे", "Bahrabise"),
    4938: ("चन्दरकु", "Chandarku"),
    3: ("चौतारा", "Chautara"),
    5603: ("नोस्याम्पाटी", "Noshyampati"),
}
HOME_RAIN = [5556, 390, 365, 3, 4938]
ICON_BY_WEATHER = {
    55: "sun", 62: "sun", 91: "sun",
    54: "partly",
    63: "cloud", 89: "cloud",
    56: "rain", 78: "rain", 79: "rain",
    84: "heavy-rain", 85: "heavy-rain", 86: "heavy-rain",
    57: "thunder-rain", 58: "thunder-rain", 59: "thunder-rain",
    70: "snow", 88: "snow", 90: "snow",
    68: "fog", 69: "fog", 71: "fog", 72: "fog", 73: "fog",
    76: "wind", 74: "cold", 75: "heat",
}
HEAVY_IDS = {59, 84, 85, 86}
FAIR_IDS = {54, 55, 62, 91}
TAG_URL = {
    "8": "weather-warning",
    "5": "special-weather",
    "11": "impact-based-forecasting",
    "6": "weekly-weather-outlook",
    "7": "monsoon-monitoring",
    "13": "heat-wave",
    "10": "fog",
}
DROP_KEYS = {
    "user", "update_by", "user_id", "signature", "forecaster",
    "updated_by", "created_by", "signature_image", "signature_path",
    "forecaster_name", "prepared_by", "duty_officer", "meteorologist",
}
PERSONAL_KEY = re.compile(
    r"forecaster|signature|meteorologist|duty_officer|prepared_by|user_id|update_by|^user$",
    re.I,
)
SECRET_IN_URL = re.compile(
    r"(?:api[_-]?key|access[_-]?token|secret|password|authorization)=",
    re.I,
)
REGION_LABEL = {
    "100": {"ne": "क्षेत्र १००", "en": "Region 100"},
    "010": {"ne": "क्षेत्र ०१०", "en": "Region 010"},
    "001": {"ne": "क्षेत्र ००१", "en": "Region 001"},
}


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def parse_dt(value):
    if not value or not isinstance(value, str):
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def npt_iso(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(NPT).isoformat(timespec="seconds")


def local_npt(value):
    """Open-Meteo Asia/Kathmandu timestamps have no offset."""
    dt = parse_dt(value)
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=NPT)
    return dt.astimezone(NPT).isoformat(timespec="seconds")


def r1(value):
    if value is None:
        return None
    try:
        return round(float(value) + 0.0, 1)
    except (TypeError, ValueError):
        return None


def r2(value):
    if value is None:
        return None
    try:
        return round(float(value) + 0.0, 2)
    except (TypeError, ValueError):
        return None


def num(value):
    if value is None or value == "" or value == "N/A":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def personal_key(key):
    text = str(key)
    return text in DROP_KEYS or bool(PERSONAL_KEY.search(text))


def scrub(obj):
    if isinstance(obj, dict):
        out = {}
        for key, val in obj.items():
            if personal_key(key):
                continue
            out[key] = scrub(val)
        return out
    if isinstance(obj, list):
        return [scrub(item) for item in obj]
    return obj


def personal_keys(obj, found=None):
    found = found if found is not None else []
    if isinstance(obj, dict):
        for key, val in obj.items():
            if personal_key(key):
                found.append(str(key))
            else:
                personal_keys(val, found)
    elif isinstance(obj, list):
        for item in obj:
            personal_keys(item, found)
    return found


def guard_url(url):
    """DHM's public site JS embeds a key. Never fetch that JS and never send a key."""
    if not isinstance(url, str) or not url:
        raise ValueError("empty url")
    lowered = url.lower()
    if "dhm.gov.np" in lowered and re.search(r"\.js(?:$|\?)", lowered):
        raise RuntimeError("refusing DHM public javascript")
    if SECRET_IN_URL.search(url):
        raise RuntimeError("refusing credential in request")
    return url


def strip_html(text):
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", str(text))
    return re.sub(r"\s+", " ", text).strip()


def hav_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def fetch_json(url, method="GET", data=None, timeout=12, attempts=2, deadline=22):
    """One source, one deadline. A dead host must not consume the whole job."""
    url = guard_url(url)
    delays = (0, 2, 4)
    last = None
    body = data if data is None or isinstance(data, bytes) else data.encode("utf-8")
    started = time.monotonic()
    logged = url.split("?", 1)[0]
    for attempt in range(attempts):
        delay = delays[attempt] if attempt < len(delays) else 2
        if delay:
            time.sleep(min(delay, max(0, deadline - (time.monotonic() - started))))
        remaining = deadline - (time.monotonic() - started)
        if remaining <= 1:
            break
        try:
            req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
            with urllib.request.urlopen(req, timeout=min(timeout, remaining)) as resp:
                raw = resp.read().decode("utf-8", "replace")
            return json.loads(raw)
        except Exception as exc:
            last = exc
            log(f"fetch fail {attempt + 1}/{attempts} {logged} {type(exc).__name__}: {exc}")
    if last is None:
        last = TimeoutError(logged)
    raise last


def load_json(path):
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None


def dump(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def strip_times(obj):
    if isinstance(obj, dict):
        return {k: strip_times(v) for k, v in obj.items() if k not in ("generated_at", "fetched_at")}
    if isinstance(obj, list):
        return [strip_times(item) for item in obj]
    return obj


def icon_for_weather(weather_id):
    try:
        return ICON_BY_WEATHER.get(int(weather_id), "cloud")
    except (TypeError, ValueError):
        return "cloud"


def icon_for_wmo(code):
    try:
        code = int(code)
    except (TypeError, ValueError):
        return "cloud"
    if code in (0, 1):
        return "sun"
    if code == 2:
        return "partly"
    if code == 3:
        return "cloud"
    if code in (45, 48):
        return "fog"
    if code in (56, 57, 71, 73, 75, 77, 85, 86):
        return "snow"
    if code in (95, 96, 99):
        return "thunder-rain"
    if code in (65, 82):
        return "heavy-rain"
    if code in (51, 53, 55, 61, 63, 80, 81):
        return "rain"
    return "cloud"


def issue_kind(iso_utc):
    dt = parse_dt(iso_utc)
    if dt is None:
        return "evening"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return "morning" if dt.astimezone(NPT).hour < 14 else "evening"


def is_morning_obs(iso_utc):
    dt = parse_dt(iso_utc)
    if dt is None:
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(NPT).hour < 12


def as_list(body):
    if isinstance(body, list):
        return body
    if isinstance(body, dict):
        for key in ("data", "stations", "rows"):
            if isinstance(body.get(key), list):
                return body[key]
    return []


def age_ok(iso_value, now, limit=FRESH):
    dt = parse_dt(iso_value)
    if dt is None:
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return timedelta(0) <= (now - dt.astimezone(UTC)) <= limit


def river_color(status, level, warning, danger, fresh):
    if not fresh:
        return "none"
    text = (status or "").upper()
    if "DANGER" in text and "BELOW" not in text:
        return "red"
    if "WARNING" in text and "BELOW" not in text:
        return "orange"
    if "BELOW" in text:
        return "green"
    if level is not None and danger is not None and level >= danger:
        return "red"
    if level is not None and warning is not None and level >= warning:
        return "orange"
    if level is not None and warning is not None and level < warning:
        return "green"
    return "none"


def trend_of(steady):
    text = (steady or "").strip().upper()
    if text == "RISING":
        return "rising"
    if text == "FALLING":
        return "falling"
    if text == "STEADY":
        return "steady"
    return None


def period_from(row, period, kind):
    weather = row.get("weather") or {}
    return {
        "period": period,
        "kind": kind,
        "t_from": r1(row.get("from_temperature")),
        "t_to": r1(row.get("to_temperature")),
        "rain_prob": r1(row.get("rain_probability")),
        "weather_id": weather.get("id"),
        "ne": weather.get("nepali_name") or "",
        "en": weather.get("name") or "",
        "icon": icon_for_weather(weather.get("id")),
    }


def city_periods(station, kind):
    rows = station.get("manual_forecast") or station.get("model_forecast") or []
    by_day = {}
    for row in rows:
        try:
            by_day[int(row.get("day"))] = row
        except (TypeError, ValueError):
            continue
    out = []
    if kind == "morning":
        if 1 in by_day:
            out.append(period_from(by_day[1], "today", "max"))
        if 2 in by_day:
            out.append(period_from(by_day[2], "tonight", "min"))
    else:
        if 2 in by_day:
            out.append(period_from(by_day[2], "tonight", "min"))
        if 3 in by_day:
            out.append(period_from(by_day[3], "tomorrow", "max"))
    return out


def source_meta(name_ne, name_en, url, link, issued, fetched, status, extra=None):
    meta = {
        "url": url,
        "fetched_at": fetched,
        "status": status,
    }
    if name_ne:
        meta["name"] = {"ne": name_ne, "en": name_en}
    if link:
        meta["link"] = link
    if issued:
        meta["issued_at"] = issued
    if extra:
        meta.update(extra)
    return meta


def rain_intervals(station):
    out = {}
    flags = {"warn": False, "danger": False}
    for item in station.get("averages") or []:
        try:
            interval = int(item.get("interval"))
        except (TypeError, ValueError):
            continue
        out[interval] = r1(num(item.get("value")))
        status = item.get("status") or {}
        if status.get("warning"):
            flags["warn"] = True
        if status.get("danger"):
            flags["danger"] = True
    return out, flags


def normalize_river(raw, now):
    level = None
    obs = None
    water = raw.get("waterLevel")
    if isinstance(water, dict):
        level = r2(num(water.get("value")))
        obs = npt_iso(parse_dt(water.get("datetime")))
    warning = r2(num(raw.get("warning_level")))
    danger = r2(num(raw.get("danger_level")))
    fresh = bool(level is not None and obs and age_ok(obs, now))
    names = CORRIDOR_RIVERS.get(raw.get("id"))
    return {
        "id": raw.get("id"),
        "name": raw.get("name") or "",
        "ne": names[0] if names else (raw.get("name") or ""),
        "en": names[1] if names else (raw.get("name") or ""),
        "basin": raw.get("basin") or "",
        "district": raw.get("district") or "",
        "lat": r2(num(raw.get("latitude"))),
        "lon": r2(num(raw.get("longitude"))),
        "series_id": raw.get("series_id"),
        "elev": r1(num(raw.get("elevation"))),
        "level_m": level if fresh or level is not None else None,
        "warning_m": warning,
        "danger_m": danger,
        "below_warning_m": r2(warning - level) if (fresh and warning is not None and level is not None) else None,
        "level": river_color(raw.get("status"), level, warning, danger, fresh),
        "trend": trend_of(raw.get("steady")) if fresh else None,
        "obs_at": obs,
        "fresh": fresh,
    }


def normalize_rain(raw, now):
    intervals, flags = rain_intervals(raw)
    latest = raw.get("latest_observation") or {}
    obs = npt_iso(parse_dt(latest.get("datetime"))) if isinstance(latest, dict) else None
    fresh = bool(obs and age_ok(obs, now) and any(intervals.get(k) is not None for k in (1, 3, 6, 12, 24)))
    names = CORRIDOR_RAIN.get(raw.get("id"))
    return {
        "id": raw.get("id"),
        "name": raw.get("name") or "",
        "ne": names[0] if names else (raw.get("name") or ""),
        "en": names[1] if names else (raw.get("name") or ""),
        "district": raw.get("district") or "",
        "basin": raw.get("basin") or "",
        "lat": r2(num(raw.get("latitude"))),
        "lon": r2(num(raw.get("longitude"))),
        "elev": r1(num(raw.get("elevation"))),
        "series_id": raw.get("series_id"),
        "r1": intervals.get(1),
        "r3": intervals.get(3),
        "r6": intervals.get(6),
        "r12": intervals.get(12),
        "r24": intervals.get(24),
        "warn": flags["warn"],
        "danger": flags["danger"],
        "obs_at": obs,
        "fresh": fresh,
        "flag": "danger" if flags["danger"] else ("warning" if flags["warn"] else None),
    }


def model_sum_24h(hourly, end_iso):
    times = (hourly or {}).get("time") or []
    prec = (hourly or {}).get("precipitation") or []
    end = parse_dt(end_iso)
    if end is None:
        return None
    if end.tzinfo is None:
        end = end.replace(tzinfo=NPT)
    start = end - timedelta(hours=24)
    total = 0.0
    seen = False
    for stamp, amount in zip(times, prec):
        dt = parse_dt(stamp)
        if dt is None:
            continue
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=NPT)
        if start < dt <= end and amount is not None:
            try:
                total += float(amount)
                seen = True
            except (TypeError, ValueError):
                continue
    return r1(total) if seen else None


def nearest_gauge(point, gauges, corridor):
    limit = 15 if corridor else 10
    best = None
    best_d = None
    for gauge in gauges:
        if not gauge.get("fresh"):
            continue
        if gauge.get("lat") is None or gauge.get("lon") is None or gauge.get("r24") is None:
            continue
        dist = hav_km(point["lat"], point["lon"], gauge["lat"], gauge["lon"])
        if dist > limit:
            continue
        if point.get("elevation") is not None and gauge.get("elev") is not None:
            if abs(point["elevation"] - gauge["elev"]) > 400:
                continue
        if best is None or dist < best_d:
            best, best_d = gauge, dist
    return best, (r1(best_d) if best_d is not None else None)


def warning_level(alert, date, province):
    if not alert or not province or not date:
        return None
    for day in alert.get("warning_days") or []:
        if day.get("date") == date:
            cell = (day.get("provinces") or {}).get(province) or {}
            return cell.get("level")
    return None


def build_outlook(icon_doc):
    if not isinstance(icon_doc, dict):
        return None
    issue = icon_doc.get("issue_date") or ""
    try:
        issue_day = datetime.fromisoformat(issue[:10])
    except ValueError:
        issue_day = None
    colors = icon_doc.get("colorSchemeList") or {}
    days = []
    for block in icon_doc.get("forecast_list") or []:
        try:
            day_no = int(block.get("day"))
        except (TypeError, ValueError):
            continue
        date = None
        if issue_day:
            date = (issue_day + timedelta(days=day_no - 1)).date().isoformat()
        provinces = {}
        for group in block.get("data_list") or []:
            for item in group.get("dayStatusList") or []:
                try:
                    pid = PROVINCES.get(int(item.get("province_no")))
                except (TypeError, ValueError):
                    pid = None
                if not pid:
                    continue
                slot = provinces.setdefault(pid, {
                    "summary": {"ne": "", "en": ""},
                    "icon": "cloud",
                    "templates": {},
                    "regions": {},
                })
                codes = []
                for piece in item.get("data") or []:
                    code = piece.get("template_code") or ""
                    if not code:
                        continue
                    codes.append(code)
                    slot["templates"][code] = {
                        "ne": piece.get("nepali_name") or "",
                        "en": (piece.get("name") or "").strip(),
                    }
                text = item.get("text") or {}
                if text.get("np"):
                    slot["summary"]["ne"] = strip_html(text.get("np"))
                if text.get("en"):
                    slot["summary"]["en"] = strip_html(text.get("en"))
                for prefer in ("HEAVY_RAIN", "RAIN", "SNOW", "CLOUD"):
                    if prefer in codes:
                        slot["icon"] = {
                            "HEAVY_RAIN": "heavy-rain",
                            "RAIN": "thunder-rain" if "HEAVY_RAIN" in codes else "rain",
                            "SNOW": "snow",
                            "CLOUD": "cloud",
                        }[prefer]
                        break
        scheme = colors.get(f"day_{day_no}") or {}
        rain_scheme = scheme.get("2") or scheme.get(2) or {}
        if not rain_scheme:
            for value in scheme.values():
                if isinstance(value, dict):
                    rain_scheme = value
                    break
        for prov_no, pid in PROVINCES.items():
            cell = rain_scheme.get(str(prov_no)) or rain_scheme.get(prov_no) or {}
            if not isinstance(cell, dict):
                continue
            regions = {}
            for code in ("100", "010", "001"):
                if cell.get(code):
                    regions[code] = cell.get(code)
            if pid in provinces:
                provinces[pid]["regions"] = regions
            elif regions:
                provinces[pid] = {
                    "summary": {"ne": "", "en": ""},
                    "icon": "cloud",
                    "templates": {},
                    "regions": regions,
                }
        days.append({"date": date, "day": day_no, "provinces": provinces})
    return {
        "src": "dhm_3day",
        "region_names": "generic",
        "region_labels": REGION_LABEL,
        "days": days,
    }


def build_mountain(doc, info):
    if not isinstance(doc, dict):
        return None
    altitudes = []
    alt_names = {}
    for item in (info or {}).get("altitudes") or []:
        try:
            alt_names[str(item.get("id"))] = int(item.get("value") or item.get("name"))
        except (TypeError, ValueError):
            continue
        altitudes.append(alt_names[str(item.get("id"))])
    div_names = {}
    for item in (info or {}).get("divisions") or []:
        try:
            div_names[str(item.get("id"))] = PROVINCES.get(int(item.get("province_no")))
        except (TypeError, ValueError):
            continue
    provinces = {}
    forecast = doc.get("forecast_data") or {}
    for alt_key, divisions in forecast.items():
        alt_id = str(alt_key).replace("altitude_", "")
        alt = alt_names.get(alt_id)
        if alt is None:
            try:
                alt = int(alt_id) * 1
            except ValueError:
                continue
        if not isinstance(divisions, dict):
            continue
        for div_key, params in divisions.items():
            div_id = str(div_key).replace("division_", "")
            pid = div_names.get(div_id) or PROVINCES.get(int(div_id)) if div_id.isdigit() else None
            if not pid or not isinstance(params, dict):
                continue
            slot = provinces.setdefault(pid, {"text": {"ne": "", "en": ""}, "levels": []})
            slot["levels"].append({
                "alt": alt,
                "wind_dir": r1(num(params.get("parameter_1"))),
                "wind_kt": r1(num(params.get("parameter_2"))),
                "temp_c": r1(num(params.get("parameter_3"))),
            })
    for item in doc.get("forecast_text") or []:
        div_id = str(item.get("division_id"))
        pid = div_names.get(div_id) or (PROVINCES.get(int(div_id)) if div_id.isdigit() else None)
        texts = item.get("text") or []
        if pid and texts:
            joined = " ".join(strip_html(part) for part in texts if part)
            provinces.setdefault(pid, {"text": {"ne": "", "en": ""}, "levels": []})
            provinces[pid]["text"]["en"] = joined
    for slot in provinces.values():
        slot["levels"].sort(key=lambda row: row.get("alt") or 0)
    return {
        "src": "dhm_mountain",
        "issued_at": npt_iso(parse_dt(doc.get("issue_date"))),
        "altitudes_m": sorted(set(altitudes)) or [3000, 5500, 7000, 9000],
        "provinces": provinces,
    }


def page_url(tag, page_id):
    kind = TAG_URL.get(str(tag), "special-weather")
    return f"https://dhm.gov.np/mfd/#/weather/pages/{kind}/{page_id}"


def build_bulletins(page_doc, now):
    rows = page_doc.get("data") if isinstance(page_doc, dict) else []
    out = []
    for row in rows or []:
        tags = [str(tag) for tag in (row.get("tags") or [])]
        if not any(tag in ("5", "6", "8", "11") for tag in tags):
            continue
        title = row.get("title") or ""
        expires = npt_iso(parse_dt(row.get("expired_at")))
        expired = False
        exp_dt = parse_dt(row.get("expired_at"))
        if exp_dt is not None:
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=UTC)
            expired = exp_dt < now
        tag = "5" if "5" in tags else ("8" if "8" in tags else ("6" if "6" in tags else tags[0]))
        corridor = bool(re.search(r"भोटेकोशी|bhotekoshi|bhote\s*koshi", title, re.I))
        if tag not in ("5", "6", "8"):
            continue
        if expired and not corridor:
            continue
        out.append({
            "page_id": int(row["id"]) if str(row.get("id", "")).isdigit() else row.get("id"),
            "tag": int(tag),
            "title": title,
            "issued_at": npt_iso(parse_dt(row.get("create_at"))),
            "expires_at": expires,
            "url": page_url(tag, row.get("id")),
            "corridor": corridor,
            "expired": expired,
        })
    out.sort(key=lambda row: (not row["corridor"], row["expired"], row.get("issued_at") or ""))
    return out


def open_meteo(points):
    lats = ",".join(str(p["lat"]) for p in points)
    lons = ",".join(str(p["lon"]) for p in points)
    elevs = ",".join(str(p["elevation"]) for p in points)
    query = (
        "latitude=" + lats + "&longitude=" + lons + "&elevation=" + elevs
        + "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day"
        + "&hourly=precipitation,temperature_2m"
        + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max"
        + "&past_days=1&forecast_days=7&timezone=Asia%2FKathmandu&models=ecmwf_ifs"
    )
    url = "https://api.open-meteo.com/v1/forecast?" + query
    doc = fetch_json(url, timeout=20, attempts=2, deadline=35)
    if isinstance(doc, dict):
        return [doc]
    return doc


def daily_rows(block, today):
    daily = (block or {}).get("daily") or {}
    rows = []
    for idx, date in enumerate(daily.get("time") or []):
        if date < today:
            continue
        def at(key):
            values = daily.get(key) or []
            return values[idx] if idx < len(values) else None
        rows.append({
            "date": date,
            "tmax": r1(at("temperature_2m_max")),
            "tmin": r1(at("temperature_2m_min")),
            "rain_mm": r1(at("precipitation_sum")),
            "pop": r1(at("precipitation_probability_max")),
            "wmo": at("weather_code"),
            "wind_kmh": r1(at("wind_speed_10m_max")),
            "gust_kmh": r1(at("wind_gusts_10m_max")),
            "icon": icon_for_wmo(at("weather_code")),
        })
        if len(rows) >= 7:
            break
    return rows


def current_of(block):
    """Open-Meteo fills gaps only. Callers must not copy these numbers into DHM fields."""
    cur = (block or {}).get("current") or {}
    if not cur:
        return None
    return {
        "src": "model",
        "role": "gap-fill",
        "t": r1(cur.get("temperature_2m")),
        "rain_mm": r1(cur.get("precipitation")),
        "wmo": cur.get("weather_code"),
        "wind_kmh": r1(cur.get("wind_speed_10m")),
        "rh": r1(cur.get("relative_humidity_2m")),
        "at": local_npt(cur.get("time")),
        "icon": icon_for_wmo(cur.get("weather_code")),
    }


def retain_meta(prev_meta, fresh_meta):
    """Last successful source record, marked stale. Does not invent a fetch time."""
    retained = dict(prev_meta or {})
    fresh_meta = fresh_meta or {}
    retained["status"] = "retained"
    retained["stale"] = True
    for key in ("url", "name", "link", "model", "licence", "attribution_html", "issued_at", "role"):
        if retained.get(key) in (None, "") and fresh_meta.get(key) not in (None, ""):
            retained[key] = fresh_meta[key]
    if "fetched_at" not in retained:
        retained["fetched_at"] = None
    return retained


def restore_city_gaps(city, old, obs_ok, rain_ok):
    """A failed DHM or gauge source keeps that city's last good block."""
    old = old or {}
    if not obs_ok:
        city["dhm_observed"] = old.get("dhm_observed")
    if not rain_ok:
        city["gauge_now"] = old.get("gauge_now")
    return city


def verify_point(point, periods, observed, gauge, model_block, model_daily, alert, today):
    flags = []
    obs_checked = False
    forecast_checked = False
    hourly = (model_block or {}).get("hourly")
    if gauge and gauge.get("r24") is not None:
        model_rain = model_sum_24h(hourly, gauge.get("obs_at"))
        obs_rain = gauge["r24"]
        if model_rain is not None:
            peak = max(obs_rain, model_rain)
            if peak >= 10 and abs(obs_rain - model_rain) >= max(15, 0.5 * peak):
                flags.append({"kind": "rain_24h", "dhm": obs_rain, "model": model_rain, "ref": "hyd_rain"})
            obs_checked = True
    morning = (observed or {}).get("morning")
    evening = (observed or {}).get("evening")
    if morning and morning.get("rain_24h_mm") is not None:
        model_rain = model_sum_24h(hourly, morning.get("obs_at"))
        obs_rain = 0.0 if morning.get("trace") else morning.get("rain_24h_mm")
        if model_rain is not None and obs_rain is not None:
            peak = max(obs_rain, model_rain)
            if peak >= 10 and abs(obs_rain - model_rain) >= max(15, 0.5 * peak):
                flags.append({"kind": "rain_24h", "dhm": obs_rain, "model": model_rain, "ref": "dhm_obs"})
            obs_checked = True
        if morning.get("min_c") is not None:
            tmin = None
            for row in model_daily or []:
                if row.get("date") == (morning.get("obs_at") or "")[:10]:
                    tmin = row.get("tmin")
            if tmin is not None and abs(tmin - morning["min_c"]) > 3:
                flags.append({"kind": "tmin", "dhm": morning["min_c"], "model": tmin, "ref": "dhm_obs"})
            if tmin is not None:
                obs_checked = True
    if evening and evening.get("max_c") is not None:
        tmax = None
        for row in model_daily or []:
            if row.get("date") == (evening.get("obs_at") or "")[:10]:
                tmax = row.get("tmax")
        if tmax is not None and abs(tmax - evening["max_c"]) > 3:
            flags.append({"kind": "tmax", "dhm": evening["max_c"], "model": tmax, "ref": "dhm_obs"})
        if tmax is not None:
            obs_checked = True
    by_period = {row.get("period"): row for row in periods or []}
    tonight = by_period.get("tonight")
    tomorrow = by_period.get("tomorrow")
    if tonight and tonight.get("t_from") is not None:
        model_min = None
        for row in model_daily or []:
            if row.get("date") == today or row.get("date") > today:
                model_min = row.get("tmin")
                break
        if model_min is not None:
            forecast_checked = True
            lo = tonight["t_from"] - 2
            hi = (tonight.get("t_to") if tonight.get("t_to") is not None else tonight["t_from"]) + 2
            if model_min < lo or model_min > hi:
                flags.append({"kind": "forecast_tmin", "dhm_from": tonight["t_from"], "dhm_to": tonight.get("t_to"), "model": model_min, "ref": "dhm_city"})
    if tomorrow and tomorrow.get("t_from") is not None:
        model_max = None
        dates = [row for row in (model_daily or []) if row.get("date") and row["date"] > today]
        if dates:
            model_max = dates[0].get("tmax")
        if model_max is not None:
            forecast_checked = True
            lo = tomorrow["t_from"] - 2
            hi = (tomorrow.get("t_to") if tomorrow.get("t_to") is not None else tomorrow["t_from"]) + 2
            if model_max < lo or model_max > hi:
                flags.append({"kind": "forecast_tmax", "dhm_from": tomorrow["t_from"], "dhm_to": tomorrow.get("t_to"), "model": model_max, "ref": "dhm_city"})
    for row in (periods or []):
        wid = row.get("weather_id")
        try:
            wid = int(wid) if wid is not None else None
        except (TypeError, ValueError):
            wid = None
        prob = row.get("rain_prob") or 0
        target = None
        for day in model_daily or []:
            if row.get("period") == "tomorrow" and day.get("date") and day["date"] > today:
                target = day
                break
            if row.get("period") in ("today", "tonight") and day.get("date") == today:
                target = day
                break
        if not target or target.get("rain_mm") is None:
            continue
        rain = target["rain_mm"]
        heavy = wid in HEAVY_IDS or (prob is not None and prob >= 70)
        fair = wid in FAIR_IDS
        if heavy and rain < 1:
            flags.append({"kind": "forecast_rain", "dhm": wid, "model": rain, "ref": "dhm_city"})
            forecast_checked = True
        elif fair and rain >= 25:
            flags.append({"kind": "forecast_rain", "dhm": wid, "model": rain, "ref": "dhm_city"})
            forecast_checked = True
    province = point.get("province")
    for day in model_daily or []:
        level = warning_level(alert, day.get("date"), province)
        if level in ("red", "orange"):
            day["dhm_level"] = level
            if day.get("rain_mm") is not None and day["rain_mm"] < 20:
                flags.append({"kind": "warning", "dhm": level, "model": day["rain_mm"], "date": day["date"], "ref": "dhm_warning"})
        else:
            day["dhm_level"] = None
    has_city = bool(periods)
    if flags:
        state = "differs"
    elif obs_checked and (forecast_checked or not has_city):
        state = "ok"
    elif forecast_checked and not flags and has_city:
        state = "ok"
    elif not obs_checked and not has_city:
        state = "no_ref"
    else:
        state = "no_ref"
    return {"state": state, "flags": flags}


def obs_is_newer(new_iso, old_iso):
    new_dt = parse_dt(new_iso)
    old_dt = parse_dt(old_iso)
    if new_dt is None:
        return False
    if old_dt is None:
        return True
    if new_dt.tzinfo is None:
        new_dt = new_dt.replace(tzinfo=UTC)
    if old_dt.tzinfo is None:
        old_dt = old_dt.replace(tzinfo=UTC)
    return new_dt > old_dt


def merge_obs_doc(obs_packs, doc):
    """Keep the newest DHM issue for each station. An older report must not replace it."""
    if not isinstance(doc, dict):
        return
    issued = npt_iso(parse_dt(doc.get("issue_date")))
    key = "morning" if is_morning_obs(doc.get("issue_date")) else "evening"
    for station in doc.get("stations") or []:
        slot = obs_packs.setdefault(station.get("id"), {})
        existing = slot.get(key)
        if existing and not obs_is_newer(issued, existing.get("obs_at")):
            continue
        slot[key] = station_obs(station, issued)


def obs_public(pack):
    morning = (pack or {}).get("morning")
    evening = (pack or {}).get("evening")
    slots = [row for row in (morning, evening) if row]
    if not slots:
        return None
    newest = max(slots, key=lambda row: row.get("obs_at") or "")
    # The newest issue is authoritative, including an explicit null (render as a dash, never 0).
    return {
        "src": "dhm_obs",
        "max_c": newest.get("max_c"),
        "min_c": newest.get("min_c"),
        "rain_24h_mm": newest.get("rain_24h_mm"),
        "trace": bool(newest.get("trace")),
        "obs_at": newest.get("obs_at"),
        "max_at": newest.get("obs_at") if newest.get("max_c") is not None else None,
    }


def station_obs(raw, issued):
    rain = num(raw.get("rainfall"))
    trace = rain == 0.01
    return {
        "max_c": r1(raw.get("max_temperature")),
        "min_c": r1(raw.get("min_temperature")),
        "rain_24h_mm": 0.0 if trace else r1(rain),
        "trace": trace,
        "obs_at": issued,
    }


def try_source(label, fn):
    try:
        return fn(), None
    except Exception as exc:
        log(f"source {label} failed: {type(exc).__name__}: {exc}")
        return None, str(type(exc).__name__)


def river_fallback():
    url = "https://dhm.gov.np/site/riverWatchTableViewData"
    doc = fetch_json(url, method="POST", data=b"", timeout=12, attempts=2, deadline=18)
    if isinstance(doc, dict) and isinstance(doc.get("data"), list):
        return doc["data"]
    return as_list(doc)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=os.path.join(ROOT, "data", "weather"))
    args = parser.parse_args()
    out_dir = args.out
    os.makedirs(os.path.join(out_dir, "history"), exist_ok=True)
    now = datetime.now(UTC)
    fetched = npt_iso(now)
    today = now.astimezone(NPT).date().isoformat()
    prev = load_json(os.path.join(out_dir, "current.json")) or {}
    prev_sources = prev.get("sources") or {}
    points = load_json(os.path.join(out_dir, "points.json")) or load_json(os.path.join(ROOT, "data", "weather", "points.json")) or []
    alert = load_json(os.path.join(ROOT, "data", "weather-alert.json")) or {}

    dhm_city = try_source("dhm_city", lambda: fetch_json(DHM + "weather"))
    dhm_country = try_source("dhm_country", lambda: fetch_json(DHM + "country-forecast"))
    dhm_obs = try_source("dhm_obs", lambda: fetch_json(DHM + "manual-observation"))
    report_dates = [today, (now.astimezone(NPT).date() - timedelta(days=1)).isoformat()]
    reports = []
    for date in report_dates:
        doc, err = try_source("dhm_report_" + date, lambda date=date: fetch_json(DHM + "report?date=" + date))
        if doc:
            reports.append(doc)
    latest, latest_err = try_source("dhm_3day_latest", lambda: fetch_json(DHM + "three-days-forecast-latest"))
    if isinstance(latest, list):
        latest = latest[0] if latest else None
    icon_doc = None
    icon_url = None
    if isinstance(latest, dict) and latest.get("id"):
        icon_url = DHM + "three-days-forecast-icon/" + str(latest["id"])
        icon_doc, _ = try_source("dhm_3day", lambda: fetch_json(icon_url))
    mountain, _ = try_source("dhm_mountain", lambda: fetch_json(DHM + "mountain"))
    mountain_info, _ = try_source("dhm_mountain_info", lambda: fetch_json(DHM + "mountain/all-info"))
    pages, _ = try_source("dhm_pages", lambda: fetch_json(DHM + "page"))
    hydro, hydro_err = try_source("hydrology", lambda: hydrology.fetch(deadline_s=40, request_timeout=12))
    rivers_raw = as_list((hydro or {}).get("river_test"))
    rain_raw = as_list((hydro or {}).get("rainfall_watch"))
    hydro_status = "ok" if rivers_raw else "retained"
    if not rivers_raw:
        fallback, _ = try_source("river_fallback", river_fallback)
        if fallback:
            rivers_raw = fallback
            hydro_status = "fallback"
    model_doc, model_err = try_source("model", lambda: open_meteo(points))

    sources = {}
    failures = []

    def keep(name, ok, meta_ok, payload_new, payload_old):
        if ok and payload_new is not None:
            sources[name] = meta_ok
            return payload_new
        failures.append(name)
        sources[name] = retain_meta(prev_sources.get(name), meta_ok)
        return payload_old

    city_doc = dhm_city[0]
    city_issued = npt_iso(parse_dt((city_doc or {}).get("datetime")))
    kind = issue_kind((city_doc or {}).get("datetime"))
    city_by_id = {}
    if isinstance(city_doc, dict):
        for station in city_doc.get("stations") or []:
            city_by_id[station.get("id")] = station
    obs_doc = dhm_obs[0]
    obs_issued = npt_iso(parse_dt((obs_doc or {}).get("issue_date")))
    obs_packs = {}
    merge_obs_doc(obs_packs, obs_doc)
    for report in reports:
        for doc in report.get("manual_observation") or []:
            merge_obs_doc(obs_packs, doc)

    country = dhm_country[0] if isinstance(dhm_country[0], dict) else None
    general = None
    if country:
        c_kind = issue_kind(country.get("issue_date"))
        if c_kind == "morning":
            labels = (("आज", "Today"), ("आज राति", "Tonight"))
        else:
            labels = (("आज राति", "Tonight"), ("भोलि", "Tomorrow"))
        general = {
            "src": "dhm_country",
            "issue": c_kind,
            "analysis": {"ne": country.get("analysis_np") or "", "en": country.get("analysis_en") or ""},
            "parts": [
                {"label": {"ne": labels[0][0], "en": labels[0][1]}, "text": {"ne": country.get("np_text_1") or "", "en": country.get("en_text_1") or ""}},
                {"label": {"ne": labels[1][0], "en": labels[1][1]}, "text": {"ne": country.get("np_text_2") or "", "en": country.get("en_text_2") or ""}},
            ],
            "special": {"ne": country.get("special") or "", "en": ""},
        }
    general = keep(
        "dhm_country",
        country is not None,
        source_meta("जल तथा मौसम विज्ञान विभाग · सामान्य पूर्वानुमान", "DHM general forecast", DHM + "country-forecast", "https://dhm.gov.np/mfd/", npt_iso(parse_dt((country or {}).get("issue_date"))), fetched, "ok"),
        general,
        prev.get("general_forecast"),
    )
    keep(
        "dhm_city",
        bool(city_by_id),
        source_meta("जल तथा मौसम विज्ञान विभाग · शहर पूर्वानुमान", "DHM city forecast", DHM + "weather", "https://dhm.gov.np/mfd/", city_issued, fetched, "ok", {"record_id": str((city_doc or {}).get("id") or "")} if city_doc else None),
        city_by_id or None,
        prev.get("cities"),
    )
    city_ok = sources["dhm_city"]["status"] == "ok"
    keep(
        "dhm_obs",
        obs_doc is not None,
        source_meta("जल तथा मौसम विज्ञान विभाग · मौसमी अवलोकन", "DHM manual observation", DHM + "manual-observation", "https://dhm.gov.np/mfd/", obs_issued, fetched, "ok"),
        obs_packs or None,
        True,
    )
    obs_ok = sources["dhm_obs"]["status"] == "ok"

    outlook = build_outlook(icon_doc) if icon_doc else None
    outlook = keep(
        "dhm_3day",
        outlook is not None,
        source_meta("जल तथा मौसम विज्ञान विभाग · तीन दिने पूर्वानुमान", "DHM three-day outlook", icon_url or DHM + "three-days-forecast-latest", "https://dhm.gov.np/mfd/", npt_iso(parse_dt((icon_doc or {}).get("datetime") or (latest or {}).get("issue_date"))), fetched, "ok"),
        outlook,
        prev.get("province_outlook"),
    )
    mountain_block = build_mountain(mountain, mountain_info) if mountain else None
    mountain_block = keep(
        "dhm_mountain",
        mountain_block is not None,
        source_meta("जल तथा मौसम विज्ञान विभाग · हिमाली पूर्वानुमान", "DHM mountain forecast", DHM + "mountain", "https://dhm.gov.np/mfd/", (mountain_block or {}).get("issued_at") if mountain_block else None, fetched, "ok"),
        mountain_block,
        prev.get("mountain"),
    )
    bulletins = build_bulletins(pages, now) if isinstance(pages, dict) else None
    bulletins = keep(
        "dhm_pages",
        bulletins is not None,
        source_meta("जल तथा मौसम विज्ञान विभाग · बुलेटिन", "DHM bulletins", DHM + "page", "https://dhm.gov.np/mfd/", None, fetched, "ok"),
        bulletins,
        prev.get("bulletins"),
    )

    rivers = [normalize_river(row, now) for row in rivers_raw if isinstance(row, dict) and row.get("id") is not None]
    rains = []
    for row in rain_raw:
        if not isinstance(row, dict) or row.get("id") is None:
            continue
        item = normalize_rain(row, now)
        if item["obs_at"] or item["r24"] is not None or item["id"] in CORRIDOR_RAIN:
            rains.append(item)
    hyd_river_meta = source_meta(
        "जल तथा मौसम विज्ञान विभाग · नदी",
        "DHM river watch",
        "https://hydrology.gov.np/ (Socket.IO river_test)" if hydro_status != "fallback" else "https://dhm.gov.np/site/riverWatchTableViewData",
        "https://hydrology.gov.np/",
        None,
        fetched,
        hydro_status if rivers else "retained",
    )
    if hydro_status == "fallback":
        hyd_river_meta["status"] = "fallback"
    rivers_ok = bool(rivers)
    if not rivers_ok:
        failures.append("hyd_river")
        sources["hyd_river"] = retain_meta(prev_sources.get("hyd_river"), hyd_river_meta)
        rivers = []
    else:
        sources["hyd_river"] = hyd_river_meta
    rain_ok = bool(rain_raw)
    rain_meta = source_meta(
        "जल तथा मौसम विज्ञान विभाग · वर्षा",
        "DHM rainfall watch",
        "https://hydrology.gov.np/ (Socket.IO rainfall_watch)",
        "https://hydrology.gov.np/",
        None, fetched, "ok",
    )
    if rain_ok:
        sources["hyd_rain"] = rain_meta
    else:
        failures.append("hyd_rain")
        sources["hyd_rain"] = retain_meta(prev_sources.get("hyd_rain"), rain_meta)

    model_by_index = {}
    if isinstance(model_doc, list) and len(model_doc) == len(points):
        model_by_index = {idx: block for idx, block in enumerate(model_doc)}
        sources["model"] = source_meta(
            "मोडेल · ECMWF IFS (Open-Meteo)",
            "Model · ECMWF IFS (Open-Meteo)",
            "https://api.open-meteo.com/v1/forecast",
            "https://open-meteo.com/",
            None, fetched, "ok",
            {
                "model": "ecmwf_ifs",
                "role": "gap-fill",
                "licence": "CC BY 4.0",
                "attribution_html": '<a href="https://open-meteo.com/">Weather data by Open-Meteo.com</a>',
            },
        )
    else:
        failures.append("model")
        sources["model"] = retain_meta(prev_sources.get("model"), {
            "model": "ecmwf_ifs",
            "role": "gap-fill",
            "licence": "CC BY 4.0",
            "attribution_html": '<a href="https://open-meteo.com/">Weather data by Open-Meteo.com</a>',
            "url": "https://api.open-meteo.com/v1/forecast",
            "link": "https://open-meteo.com/",
        })

    prev_cities = {row.get("id"): row for row in (prev.get("cities") or []) if isinstance(row, dict)}
    cities = []
    if city_ok:
        for point in points:
            if not point.get("dhm_city_id") and point.get("id") != "hetauda":
                continue
            if point.get("group") == "corridor":
                continue
            station = city_by_id.get(point.get("dhm_city_id")) if point.get("dhm_city_id") else None
            periods = city_periods(station, kind) if station else []
            obs_pack = obs_packs.get(point.get("dhm_obs_id")) if obs_ok else None
            if not obs_ok:
                obs_pack = None
            idx = points.index(point)
            block = model_by_index.get(idx)
            daily = daily_rows(block, today) if block else []
            now_m = current_of(block) if block else None
            gauge, dist = nearest_gauge(point, rains, point.get("group") == "corridor") if rain_ok else (None, None)
            if not block:
                old = prev_cities.get(point["id"]) or {}
                daily = old.get("model_daily") or []
                now_m = old.get("model_now")
            city = {
                "id": point["id"],
                "ne": point.get("ne"),
                "en": point.get("en"),
                "province": point.get("province"),
                "lat": point.get("lat"),
                "lon": point.get("lon"),
                "elev": point.get("elevation"),
                "dhm_forecast": {"src": "dhm_city", "periods": periods} if periods else None,
                "dhm_observed": obs_public(obs_pack) if obs_pack else None,
                "gauge_now": None if not gauge else {
                    "src": "hyd_rain",
                    "station_id": gauge["id"],
                    "name": gauge["name"],
                    "dist_km": dist,
                    "rain_1h": gauge.get("r1"),
                    "rain_24h": gauge.get("r24"),
                    "obs_at": gauge.get("obs_at"),
                },
                "model_now": now_m,
                "model_daily": daily,
            }
            city["verify"] = verify_point(point, periods, obs_pack, gauge if rain_ok else None, block, daily, alert, today)
            restore_city_gaps(city, prev_cities.get(point["id"]), obs_ok, rain_ok)
            cities.append(city)
    else:
        # DHM city forecast is primary. Do not rebuild the city list from Open-Meteo.
        cities = prev.get("cities") or []

    corridor_points = []
    for point in points:
        if point.get("group") != "corridor":
            continue
        idx = points.index(point)
        block = model_by_index.get(idx)
        daily = daily_rows(block, today) if block else []
        gauge, dist = nearest_gauge(point, rains, True) if rain_ok else (None, None)
        past = model_sum_24h((block or {}).get("hourly"), fetched) if block else None
        item = {
            "id": point["id"],
            "ne": point.get("ne"),
            "en": point.get("en"),
            "province": point.get("province"),
            "elev": point.get("elevation"),
            "lat": point.get("lat"),
            "lon": point.get("lon"),
            "model_now": current_of(block) if block else None,
            "model_daily": daily,
            "model_24h_past_mm": past,
            "gauge_ref": None if not gauge else {"station_id": gauge["id"], "name": gauge["name"], "dist_km": dist, "rain_24h": gauge.get("r24")},
        }
        item["verify"] = verify_point(point, [], None, gauge if rain_ok else None, block, daily, alert, today)
        if not block:
            old_points = {row.get("id"): row for row in ((prev.get("corridor") or {}).get("points") or [])}
            old = old_points.get(point["id"]) or {}
            item["model_now"] = old.get("model_now")
            item["model_daily"] = old.get("model_daily") or []
            item["model_24h_past_mm"] = old.get("model_24h_past_mm")
            item["verify"] = old.get("verify") or {"state": "no_ref", "flags": []}
        corridor_points.append(item)

    prev_corridor = prev.get("corridor") or {}
    if rivers_ok:
        river_index = {row["id"]: row for row in rivers}
        corridor_rivers = []
        for rid, names in CORRIDOR_RIVERS.items():
            row = river_index.get(rid)
            if not row:
                continue
            corridor_rivers.append({
                "id": row["id"],
                "ne": names[0],
                "en": names[1],
                "basin": row["basin"],
                "level_m": row["level_m"],
                "warning_m": row["warning_m"],
                "danger_m": row["danger_m"],
                "below_warning_m": row["below_warning_m"],
                "level": row["level"],
                "trend": row["trend"],
                "obs_at": row["obs_at"],
                "fresh": row["fresh"],
            })
    else:
        corridor_rivers = prev_corridor.get("rivers") or []
    if rain_ok:
        corridor_rain = []
        rain_index = {row["id"]: row for row in rains}
        for rid, names in CORRIDOR_RAIN.items():
            row = rain_index.get(rid)
            if not row:
                continue
            corridor_rain.append({
                "id": row["id"],
                "ne": names[0],
                "en": names[1],
                "elev": row["elev"],
                "rain_1h": row["r1"],
                "rain_3h": row["r3"],
                "rain_24h": row["r24"],
                "obs_at": row["obs_at"],
                "fresh": row["fresh"],
                "flag": row["flag"],
            })
    else:
        corridor_rain = prev_corridor.get("rain") or []

    river_cols = ["id", "name", "basin", "district", "lat", "lon", "level_m", "warning_m", "danger_m", "level", "trend", "obs_at"]
    if rivers_ok:
        river_rows = [[row.get(col) for col in river_cols] for row in rivers]
    else:
        river_rows = (prev.get("rivers") or {}).get("rows") or []
        river_cols = (prev.get("rivers") or {}).get("cols") or river_cols
    rain_cols = ["id", "name", "district", "lat", "lon", "elev", "r1", "r3", "r6", "r12", "r24", "warn", "danger", "obs_at"]
    if rain_ok:
        rain_rows = [[row.get(col) for col in rain_cols] for row in rains]
    else:
        rain_rows = (prev.get("rain_stations") or {}).get("rows") or []
        rain_cols = (prev.get("rain_stations") or {}).get("cols") or rain_cols

    checked = 0
    flagged = 0
    items = []
    for row in list(cities) + corridor_points:
        verify = row.get("verify") or {}
        if verify.get("state") in ("ok", "differs"):
            checked += 1
        if verify.get("flags"):
            flagged += 1
            items.append({"id": row.get("id"), "flags": verify.get("flags")})
    verification = {
        "thresholds": {"rain_abs_mm": 15, "rain_rel": 0.5, "rain_min_mm": 10, "temp_c": 3, "forecast_temp_margin_c": 2},
        "summary": {"checked": checked, "flagged": flagged},
        "items": items[:40],
    }

    current = {
        "schema": "rfb-weather/1",
        "generated_at": fetched,
        "sources": sources,
        "general_forecast": general,
        "bulletins": bulletins or [],
        "cities": cities,
        "corridor": {"rivers": corridor_rivers, "rain": corridor_rain, "points": corridor_points},
        "rivers": {"cols": river_cols, "rows": river_rows},
        "rain_stations": {"cols": rain_cols, "rows": rain_rows},
        "province_outlook": outlook,
        "mountain": mountain_block,
        "verification": verification,
    }
    current = scrub(current)
    leaked = personal_keys(current)
    if leaked:
        raise RuntimeError("refusing to write personal fields: " + ",".join(sorted(set(leaked))))

    home_rivers = []
    by_id = {row.get("id"): row for row in corridor_rivers}
    for rid in HOME_RIVERS:
        if rid in by_id:
            home_rivers.append(by_id[rid])
    home_rain = []
    by_rain = {row.get("id"): row for row in corridor_rain}
    for rid in HOME_RAIN:
        row = by_rain.get(rid)
        if not row:
            continue
        if rid == 390 and not row.get("fresh"):
            continue
        home_rain.append(row)
    nepal_now = []
    by_city = {row.get("id"): row for row in cities}
    for cid in HOME_CITIES:
        city = by_city.get(cid)
        if not city:
            continue
        periods = ((city.get("dhm_forecast") or {}).get("periods")) or []
        nxt = None
        for prefer in ("tonight", "tomorrow", "today"):
            nxt = next((row for row in periods if row.get("period") == prefer), None)
            if nxt:
                break
        obs = city.get("dhm_observed") or {}
        model_now = city.get("model_now") or {}
        nepal_now.append({
            "id": cid,
            "ne": city.get("ne"),
            "en": city.get("en"),
            "obs": {
                "max": obs.get("max_c"),
                "min": obs.get("min_c"),
                "rain24": obs.get("rain_24h_mm"),
                "trace": obs.get("trace") or False,
                "obs_at": obs.get("obs_at"),
            },
            "next": None if not nxt else {
                "period": nxt.get("period"),
                "icon": nxt.get("icon"),
                "ne": nxt.get("ne"),
                "en": nxt.get("en"),
                "t_from": nxt.get("t_from"),
                "t_to": nxt.get("t_to"),
                "rain_prob": nxt.get("rain_prob"),
            },
            "model_now": {"t": model_now.get("t")} if model_now.get("t") is not None else None,
            "verify": (city.get("verify") or {}).get("state"),
        })
    bulletin = None
    for row in bulletins or []:
        if row.get("corridor"):
            bulletin = {"title": row.get("title"), "url": row.get("url"), "issued_at": row.get("issued_at"), "page_id": row.get("page_id")}
            break
    forecast = None
    if isinstance(general, dict) and (general.get("parts") or general.get("analysis")):
        part = (general.get("parts") or [{}])[0]
        forecast = {
            "src": "dhm_country",
            "issued_at": (sources.get("dhm_country") or {}).get("issued_at"),
            "label": part.get("label") or {"ne": "आज", "en": "Today"},
            "analysis": general.get("analysis"),
            "text": part.get("text") or {"ne": "", "en": ""},
        }
    short_sources = {}
    for key, meta in sources.items():
        short = {
            "issued_at": meta.get("issued_at"),
            "fetched_at": meta.get("fetched_at"),
            "status": meta.get("status"),
        }
        if meta.get("stale"):
            short["stale"] = True
        short_sources[key] = short
    now_doc = {
        "schema": "rfb-weather-now/1",
        "generated_at": fetched,
        "nepal_now": nepal_now,
        "corridor": {"rivers": home_rivers[:8], "rain": home_rain[:6]},
        "bulletin": bulletin,
        "forecast": forecast,
        "sources": short_sources,
    }
    now_doc = scrub(now_doc)
    leaked = personal_keys(now_doc)
    if leaked:
        raise RuntimeError("refusing to write personal fields: " + ",".join(sorted(set(leaked))))

    station_doc = {
        "schema": "rfb-weather-stations/1",
        "generated_at": fetched,
        "points": [
            {
                "id": p.get("id"), "ne": p.get("ne"), "en": p.get("en"),
                "lat": p.get("lat"), "lon": p.get("lon"), "elevation": p.get("elevation"),
                "elev_source": p.get("elev_source"), "coords": p.get("coords"),
                "province": p.get("province"), "group": p.get("group"),
                "dhm_city_id": p.get("dhm_city_id"), "dhm_obs_id": p.get("dhm_obs_id"),
                "approx": p.get("coords") == "approx",
            }
            for p in points
        ],
        "rivers": [
            {
                "id": row["id"], "series_id": row.get("series_id"), "name": row["name"],
                "ne": row["ne"], "basin": row["basin"], "district": row["district"],
                "lat": row["lat"], "lon": row["lon"], "elev": row["elev"],
                "warning": row["warning_m"], "danger": row["danger_m"],
            }
            for row in (rivers if rivers_ok else [])
        ],
        "rain": [
            {
                "id": row["id"], "series_id": row.get("series_id"), "name": row["name"],
                "ne": row["ne"], "district": row["district"], "lat": row["lat"],
                "lon": row["lon"], "elev": row["elev"],
            }
            for row in (rains if rain_ok else [])
        ],
        "nearest": [],
    }
    prev_stations = load_json(os.path.join(out_dir, "stations.json")) or {}
    if not rivers_ok:
        station_doc["rivers"] = prev_stations.get("rivers") or []
    if not rain_ok:
        station_doc["rain"] = prev_stations.get("rain") or []
    if rain_ok:
        for point in points:
            gauge, dist = nearest_gauge(point, rains, point.get("group") == "corridor")
            if gauge:
                station_doc["nearest"].append({"point_id": point["id"], "station_id": gauge["id"], "dist_km": dist})
    else:
        station_doc["nearest"] = prev_stations.get("nearest") or []

    history_path = os.path.join(out_dir, "history", today + ".json")
    history = load_json(history_path) or {"date": today, "runs": [], "dhm_city": [], "dhm_obs": [], "country": [], "model_issued": []}
    run = {
        "at": fetched,
        "sources": {key: {"status": meta.get("status"), "issued_at": meta.get("issued_at")} for key, meta in sources.items()},
        "verification": verification["summary"],
        "corridor": [
            [row.get("id"), row.get("level_m"), None]
            for row in home_rivers
        ],
    }
    for row in home_rain:
        run["corridor"].append([row.get("id"), None, row.get("rain_24h")])
    history["runs"] = (history.get("runs") or [])[-29:] + [run]
    if city_ok and city_doc:
        cid = str(city_doc.get("id") or "")
        known = {str(item.get("id")) for item in history.get("dhm_city") or []}
        if cid and cid not in known:
            history.setdefault("dhm_city", []).append({
                "id": cid,
                "issued_at": city_issued,
                "issue": kind,
                "cities": [
                    {"id": row["id"], "periods": ((row.get("dhm_forecast") or {}).get("periods"))}
                    for row in cities if row.get("dhm_forecast")
                ],
            })
    if obs_ok and obs_doc:
        stamp = obs_doc.get("issue_date")
        known = {item.get("issued_at") for item in history.get("dhm_obs") or []}
        issued = npt_iso(parse_dt(stamp))
        if issued not in known:
            history.setdefault("dhm_obs", []).append({
                "issued_at": issued,
                "morning": is_morning_obs(stamp),
                "stations": [
                    {"id": sid, **pack.get("morning" if is_morning_obs(stamp) else "evening", {})}
                    for sid, pack in obs_packs.items()
                    if pack.get("morning" if is_morning_obs(stamp) else "evening")
                ],
            })
    if country:
        cid = str(country.get("id") or "")
        known = {str(item.get("id")) for item in history.get("country") or []}
        if cid and cid not in known:
            history.setdefault("country", []).append({
                "id": cid,
                "issued_at": npt_iso(parse_dt(country.get("issue_date"))),
                "analysis": general.get("analysis") if general else {},
                "parts": general.get("parts") if general else [],
            })
    if model_by_index and now.hour in (0, 1, 2, 12, 13, 14):
        history.setdefault("model_issued", []).append({
            "at": fetched,
            "points": [{"id": row.get("id"), "daily": row.get("model_daily")} for row in corridor_points],
        })
        history["model_issued"] = history["model_issued"][-4:]
    history = scrub(history)
    leaked = personal_keys(history) + personal_keys(station_doc)
    if leaked:
        raise RuntimeError("refusing to write personal fields: " + ",".join(sorted(set(leaked))))
    raw_history = dump(history)
    if len(raw_history.encode("utf-8")) > 120000:
        history["runs"] = history["runs"][-8:]
        history["country"] = (history.get("country") or [])[-2:]
        history["dhm_city"] = (history.get("dhm_city") or [])[-2:]
        history["dhm_obs"] = (history.get("dhm_obs") or [])[-4:]

    def write_if_changed(path, obj):
        new_body = dump(obj)
        old = load_json(path)
        if old is not None and strip_times(old) == strip_times(obj):
            log(f"unchanged {os.path.basename(path)}")
            return False
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as handle:
            handle.write(new_body)
        os.replace(tmp, path)
        log(f"wrote {os.path.basename(path)} {len(new_body.encode('utf-8'))} bytes")
        return True

    write_if_changed(os.path.join(out_dir, "current.json"), current)
    write_if_changed(os.path.join(out_dir, "now.json"), now_doc)
    write_if_changed(os.path.join(out_dir, "stations.json"), station_doc)
    write_if_changed(history_path, history)
    now_size = os.path.getsize(os.path.join(out_dir, "now.json"))
    cur_size = os.path.getsize(os.path.join(out_dir, "current.json"))
    log("SOURCE_STATUS " + " ".join(f"{key}={meta.get('status')}" for key, meta in sources.items()))
    log(f"sizes now={now_size} current={cur_size} failures={','.join(failures) or 'none'}")
    if now_size > 15000:
        log("warning: now.json over 15 KB")
    if cur_size > 250000:
        log("warning: current.json over 250 KB")
    if failures:
        log("FAILED_SOURCES " + ",".join(failures))
    return 0


if __name__ == "__main__":
    sys.exit(main())
