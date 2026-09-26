#!/usr/bin/env python3
"""Rewrite live SEO tags from the bulletin's own data files.

Runs inside the Pages stamp (scripts/stamp_build.py) so every publish
refreshes titles, descriptions, JSON-LD, the sitemap and the share image.
Does not change visible page bodies, data values, or PAGE_VER / ?v= stamps.

The no-cache http-equiv meta tags stay. The service worker already fetches
pages network-first, and those tags still ask a browser to revalidate before
the worker controls the page. Removing them is not required.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

BASE = "https://nirajbhusal.github.io/rasuwa-flood-bulletin/"
SITEMAP_URL = BASE + "sitemap.xml"
TITLE_LIMIT = 65
DESC_LIMIT = 160

try:
    NPT = ZoneInfo("Asia/Kathmandu")
except Exception:  # pragma: no cover - tzdata is present on the runner
    NPT = timezone(timedelta(hours=5, minutes=45))

DIGITS = str.maketrans("0123456789", "०१२३४५६७८९")
AD_MONTHS = (
    "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन",
    "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
)
BS_MONTHS = (
    "बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
    "कात्तिक", "मङ्सिर", "पुस", "माघ", "फागुन", "चैत",
)
# Month lengths from nepali-datetime calendar_bs.csv (Hamro Patro for 2083).
# 1 बैशाख 2082 = 14 April 2025.
BS_MONTH_DAYS = {
    2082: (31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30),
    2083: (31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30),
    2084: (31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30),
    2085: (31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30),
}
BS_EPOCH_YEAR = 2082
BS_EPOCH_AD = date(2025, 4, 14)

# Extra inputs whose git history should move a page's lastmod.
PAGE_DATA = {
    "index.html": [
        "api/dashboard.json", "api/dashboard.ne.json", "latest.json",
        "data/weather-alert.json", "data/flood-bulletin.json",
        "data/police_roads_*.json", "data/nea_electricity.json",
    ],
    "weather.html": [
        "data/weather-alert.json", "data/dhm-weather-alert.json",
        "data/flood-bulletin.json", "data/weather/current.json", "data/weather/now.json",
    ],
    "notices.html": [
        "data/police_roads_*.json", "data/roads-dor.json",
        "data/weather-alert.json", "data/ndrrma_vehicle_*.json",
    ],
    "electricity.html": ["data/nea_electricity.json"],
    "names.html": ["ndrrma-rescue.json", "api/dashboard.json"],
    "damage.html": ["api/dashboard.json", "data/gallery-path.json"],
    "donate.html": ["data/pmdrf-named-donors.json"],
    "gov.html": ["api/dashboard.json"],
    "response.html": ["api/dashboard.json"],
    "contact.html": ["data/weather-alert.json"],
    "photos.html": ["data/gallery-path.json"],
    "about.html": ["data/gallery-path.json"],
    "map.html": ["damage.html", "data/gallery-path.json"],
    "need.html": ["contact.html"],
    "api/index.html": ["api/dashboard.json"],
    "embed/dashboard.html": ["api/dashboard.json"],
    "api/embed.html": ["embed/dashboard.html"],
}


def nep(value) -> str:
    return str(value).translate(DIGITS)


def clip(text: str, limit: int) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    cut = text[:limit]
    for sep in (" · ", "। ", " "):
        i = cut.rfind(sep)
        if i >= int(limit * 0.55):
            return cut[:i].rstrip(" ·।,")
    return cut.rstrip(" ·।,")


def ad_to_bs(day: date) -> tuple[int, int, int]:
    cursor = BS_EPOCH_AD
    year = BS_EPOCH_YEAR
    while year in BS_MONTH_DAYS:
        lengths = BS_MONTH_DAYS[year]
        span = sum(lengths)
        if day < cursor + timedelta(days=span):
            offset = (day - cursor).days
            if offset < 0:
                break
            for month, days in enumerate(lengths, start=1):
                if offset < days:
                    return year, month, offset + 1
                offset -= days
        cursor += timedelta(days=span)
        year += 1
    raise ValueError(f"date outside the BS table: {day.isoformat()}")


def bs_label(day: date) -> str:
    _year, month, dom = ad_to_bs(day)
    return f"{BS_MONTHS[month - 1]} {nep(dom)}"


def ad_label(day: date) -> str:
    return f"{nep(day.day)} {AD_MONTHS[day.month - 1]} {nep(day.year)}"


def npt_hm(when: datetime) -> str:
    local = when.astimezone(NPT)
    return nep(f"{local.hour:02d}:{local.minute:02d}")


def parse_when(value: str) -> datetime:
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=NPT)
    return dt.astimezone(NPT)


def load_json(path: Path):
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def latest_match(root: Path, pattern: str):
    best = None
    best_key = ""
    for path in sorted(root.glob(pattern)):
        data = load_json(path)
        if not isinstance(data, dict):
            continue
        key = str((data.get("as_of") or {}).get("iso") or path.name)
        if best is None or key >= best_key:
            best, best_key = data, key
    return best


def card(dashboard: dict | None, card_id: str) -> dict | None:
    if not dashboard:
        return None
    for item in dashboard.get("cards") or []:
        if item.get("id") == card_id and (item.get("value_display") or {}).get("ne"):
            return item
    return None


def display(item: dict | None) -> str | None:
    if not item:
        return None
    text = ((item.get("value_display") or {}).get("ne") or "").strip()
    return text or None


@dataclass
class Facts:
    when: datetime
    bs: str
    ad: str
    built_at: str
    incident_published: str | None = None
    dead: str | None = None
    missing: str | None = None
    treating: str | None = None
    rescued: str | None = None
    ndrrma_asof: str | None = None
    police_total: str | None = None
    police_full: str | None = None
    police_night: str | None = None
    police_asof: str | None = None
    dhm_red: str | None = None
    dhm_orange: str | None = None
    dhm_asof: str | None = None
    flood_notable: str | None = None
    flood_asof: str | None = None
    flood_source: str | None = None
    nea_upcoming: str | None = None
    nea_mw: str | None = None
    nea_projects: str | None = None
    nea_asof: str | None = None
    nea_statement_bs: str | None = None
    nea_alert_active: bool = False
    nea_supply_districts: str | None = None
    nea_mw_updates: str | None = None
    names_count: str | None = None
    names_asof: str | None = None
    donors: str | None = None
    fund_label: str | None = None
    fund_asof: str | None = None
    helpline: str | None = None
    sources: dict = field(default_factory=dict)


def _fmt_count(value) -> str | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int):
        return nep(f"{value:,}")
    if isinstance(value, float) and value.is_integer():
        return nep(f"{int(value):,}")
    return None


def load_facts(root: Path, when: datetime, built_at: str) -> Facts:
    day = when.astimezone(NPT).date()
    facts = Facts(when=when.astimezone(NPT), bs=bs_label(day), ad=ad_label(day), built_at=built_at)
    dash = load_json(root / "api" / "dashboard.json")
    if isinstance(dash, dict):
        facts.dead = display(card(dash, "dead"))
        facts.missing = display(card(dash, "miss"))
        facts.treating = display(card(dash, "injured"))
        facts.rescued = display(card(dash, "rescued"))
        as_of = (dash.get("as_of") or {}).get("ne")
        if as_of:
            facts.ndrrma_asof = str(as_of).strip()
        facts.sources["ndrrma"] = True

    police = latest_match(root, "data/police_roads_*.json")
    if isinstance(police, dict):
        counts = police.get("counts") or {}
        facts.police_total = _fmt_count(counts.get("total"))
        facts.police_full = _fmt_count(counts.get("full_block"))
        facts.police_night = _fmt_count(counts.get("night_ban"))
        as_of = (police.get("as_of") or {}).get("ne")
        if as_of:
            facts.police_asof = str(as_of).strip()
        facts.sources["police"] = True

    alert = load_json(root / "data" / "weather-alert.json")
    if isinstance(alert, dict):
        today = day.isoformat()
        for block in alert.get("warning_days") or []:
            if block.get("date") != today:
                continue
            counts = {"red": 0, "orange": 0}
            districts = block.get("districts") or {}
            if isinstance(districts, dict) and districts:
                for rec in districts.values():
                    level = (rec or {}).get("level")
                    if level in counts:
                        counts[level] += 1
                facts.dhm_red = nep(counts["red"])
                facts.dhm_orange = nep(counts["orange"])
            break
        issued = ((alert.get("ui") or {}).get("issued") or {}).get("ne")
        if issued:
            facts.dhm_asof = str(issued).strip()
        helpline = ((alert.get("ui") or {}).get("helpline_label") or {}).get("ne")
        if helpline:
            facts.helpline = str(helpline).strip()
        facts.sources["dhm"] = True

    flood = load_json(root / "data" / "flood-bulletin.json")
    if isinstance(flood, dict):
        days = flood.get("days") or []
        idx = next((i for i, item in enumerate(days) if item.get("id") == day.isoformat()), None)
        if idx is not None:
            notable = 0
            seen = False
            for station in flood.get("stations") or []:
                series = station.get("days") or []
                if idx >= len(series):
                    continue
                seen = True
                if series[idx] in ("Y", "O"):
                    notable += 1
            if seen and notable:
                facts.flood_notable = nep(notable)
        issued = ((flood.get("source") or {}).get("issued") or {}).get("ne")
        if issued:
            facts.flood_asof = str(issued).strip()
        name = (((flood.get("source") or {}).get("name") or {}).get("ne"))
        if name:
            facts.flood_source = str(name).strip()

    nea = load_json(root / "data" / "nea_electricity.json")
    if isinstance(nea, dict):
        rows = ((nea.get("planned_shutdowns") or {}).get("rows")) or []
        if rows:
            upcoming = sum(1 for row in rows if row.get("status_at_check") == "upcoming")
            facts.nea_upcoming = nep(upcoming)
        checked = (nea.get("planned_shutdowns") or {}).get("checked_at")
        if checked:
            try:
                stamp = parse_when(str(checked))
                facts.nea_asof = f"{bs_label(stamp.date())}, {npt_hm(stamp)}"
            except ValueError:
                facts.nea_asof = None
        alert = nea.get("alert") or {}
        summary = nea.get("alert_summary") or {}
        if alert.get("active"):
            facts.nea_alert_active = True
            facts.nea_supply_districts = _fmt_count(summary.get("districts_supply_affected"))
            facts.nea_mw_updates = _fmt_count(summary.get("generation_mw_stopped_in_items"))
            as_of = alert.get("as_of") or summary.get("as_of")
            if as_of:
                try:
                    stamp = parse_when(str(as_of))
                    facts.nea_asof = f"{bs_label(stamp.date())}, {npt_hm(stamp)}"
                except ValueError:
                    pass
        incident = ((nea.get("incidents") or [None])[0]) or {}
        statements = ((incident.get("statements") or {}).get("items")) or []
        chosen = None
        for item in statements:
            figures = item.get("figures") or {}
            if figures.get("hydro_mw_disrupted") is None:
                continue
            if chosen is None or str(item.get("date") or "") >= str(chosen.get("date") or ""):
                chosen = item
        if chosen:
            figures = chosen.get("figures") or {}
            facts.nea_mw = _fmt_count(figures.get("hydro_mw_disrupted"))
            facts.nea_projects = _fmt_count(figures.get("hydro_projects"))
            try:
                facts.nea_statement_bs = bs_label(date.fromisoformat(str(chosen.get("date"))))
            except ValueError:
                facts.nea_statement_bs = None
        facts.sources["nea"] = True

    rescue = load_json(root / "ndrrma-rescue.json")
    if isinstance(rescue, dict) and isinstance(rescue.get("api_count"), int):
        facts.names_count = nep(f"{rescue['api_count']:,}")
        pulled = rescue.get("pulled_at")
        if pulled:
            try:
                stamp = parse_when(str(pulled))
                facts.names_asof = f"{bs_label(stamp.date())}, {npt_hm(stamp)}"
            except ValueError:
                facts.names_asof = None

    donors = load_json(root / "data" / "pmdrf-named-donors.json")
    if isinstance(donors, dict):
        totals = donors.get("totals") or {}
        facts.donors = _fmt_count(totals.get("donors"))
        label = totals.get("label_ne")
        if label:
            facts.fund_label = str(label).strip()
        updated = donors.get("updated")
        if updated:
            try:
                facts.fund_asof = bs_label(date.fromisoformat(str(updated)[:10]))
            except ValueError:
                facts.fund_asof = str(updated)

    gallery = load_json(root / "data" / "gallery-path.json")
    if isinstance(gallery, dict):
        meta = gallery.get("meta") or {}
        event = meta.get("event_date")
        summary = meta.get("origin_summary_en") or ""
        if event:
            if "8:37" in summary and "26 Aug 2026" in summary:
                facts.incident_published = f"{event}T08:37:00+05:45"
            else:
                facts.incident_published = str(event)
    return facts


@dataclass
class Copy:
    title: str
    description: str
    crumb: str


def _join(parts: list[str], sep: str = " · ") -> str:
    return sep.join(part for part in parts if part)


def _ndrrma(facts: Facts, bits: list[str], tail: str) -> str:
    shown = [bit for bit in bits if bit]
    if facts.ndrrma_asof and shown:
        line = "NDRRMA, " + facts.ndrrma_asof + ": " + " · ".join(shown) + "।"
    elif shown:
        line = "NDRRMA: " + " · ".join(shown) + "।"
    else:
        line = ""
    if tail:
        line = (line + " " + tail).strip()
    return line or f"{facts.bs}। {tail}".strip()


def page_copies(facts: Facts) -> dict[str, Copy]:
    bs = facts.bs
    ndrrma_bits = []
    if facts.dead:
        ndrrma_bits.append(f"शव {facts.dead}")
    if facts.missing:
        ndrrma_bits.append(f"सम्पर्कविहीन करिब {facts.missing}")
    if facts.treating:
        ndrrma_bits.append(f"उपचाररत {facts.treating}")
    if facts.rescued:
        ndrrma_bits.append(f"उद्धार {facts.rescued}")
    ndrrma_desc = ""
    if facts.ndrrma_asof and ndrrma_bits:
        ndrrma_desc = "NDRRMA, " + facts.ndrrma_asof + ": " + " · ".join(ndrrma_bits) + "।"
    elif ndrrma_bits:
        ndrrma_desc = "NDRRMA: " + " · ".join(ndrrma_bits) + "।"

    road_bits = []
    if facts.police_total:
        road_bits.append(f"अवरोध {facts.police_total}")
    if facts.police_full:
        road_bits.append(f"पूर्ण {facts.police_full}")
    if facts.police_night:
        road_bits.append(f"रात्रि बन्द {facts.police_night}")
    road_desc = ""
    if road_bits:
        prefix = "नेपाल प्रहरी"
        if facts.police_asof:
            prefix += ", " + facts.police_asof
        road_desc = prefix + ": " + " · ".join(road_bits) + "।"

    weather_bits = []
    if facts.dhm_red is not None:
        weather_bits.append(f"रातो {facts.dhm_red}")
    if facts.dhm_orange is not None:
        weather_bits.append(f"सुन्तला {facts.dhm_orange}")
    weather_desc = ""
    if weather_bits:
        prefix = "DHM"
        if facts.dhm_asof:
            prefix += ", " + facts.dhm_asof
        weather_desc = prefix + ": " + " · ".join(weather_bits) + " जिल्ला।"
        if facts.flood_notable:
            flood_bits = ["बाढी पूर्वानुमान"]
            if facts.flood_asof:
                flood_bits.append(facts.flood_asof)
            extra = " " + ", ".join(flood_bits) + f": उल्लेख्य बढ्ने {facts.flood_notable}।"
            if len(weather_desc) + len(extra) <= DESC_LIMIT:
                weather_desc += extra

    elec_bits = []
    if facts.nea_alert_active and (facts.nea_supply_districts or facts.nea_mw_updates):
        if facts.nea_supply_districts:
            elec_bits.append(f"आपूर्ति प्रभावित {facts.nea_supply_districts} जिल्ला")
        if facts.nea_mw_updates:
            elec_bits.append(f"प्राधिकरणका अद्यावधिकमा {facts.nea_mw_updates} मेगावाट")
    else:
        if facts.nea_upcoming is not None:
            elec_bits.append(f"आगामी कटौती {facts.nea_upcoming}")
        if facts.nea_mw:
            projects = f" ({facts.nea_projects} आयोजना)" if facts.nea_projects else ""
            when = f"{facts.nea_statement_bs} मा " if facts.nea_statement_bs else ""
            elec_bits.append(f"{when}{facts.nea_mw} मेगावाट अवरुद्ध{projects}")
    elec_desc = ""
    if elec_bits:
        prefix = "NEA"
        if facts.nea_asof:
            prefix += ", जाँच " + facts.nea_asof
        elec_desc = prefix + ": " + " · ".join(elec_bits) + "।"

    names_desc = ""
    if facts.names_count:
        prefix = "NDRRMA नाम-सूची " + facts.names_count
        if facts.names_asof:
            prefix += ", " + facts.names_asof
        names_desc = prefix + "।"
        if facts.missing and facts.ndrrma_asof:
            names_desc += f" सम्पर्कविहीन करिब {facts.missing} — NDRRMA, {facts.ndrrma_asof}।"

    fund_desc = ""
    if facts.fund_label or facts.donors:
        bits = []
        if facts.fund_label:
            bits.append(facts.fund_label)
        if facts.donors:
            bits.append(f"दाता {facts.donors}")
        prefix = "PMDRF"
        if facts.fund_asof:
            prefix += ", " + facts.fund_asof
        fund_desc = prefix + ": " + " · ".join(bits) + "।"

    contact_desc = ""
    if facts.helpline:
        prefix = "DHM"
        if facts.dhm_asof:
            prefix += ", " + facts.dhm_asof
        contact_desc = f"{prefix}: {facts.helpline}। आपत्कालीन सहायता र स्थानीय सम्पर्क।"

    home_title = _join(["रसुवा–भोटेकोशी बाढी", bs, f"शव {facts.dead}" if facts.dead else ""])
    home_desc = ndrrma_desc or f"{bs} ({facts.ad})। रसुवा–भोटेकोशी बाढी बुलेटिन।"
    if facts.nea_alert_active and facts.nea_supply_districts and facts.nea_mw_updates:
        elec_extra = f" बिजुली: आपूर्ति प्रभावित {facts.nea_supply_districts} जिल्ला · {facts.nea_mw_updates} मेगावाट।"
        if len(home_desc) + len(elec_extra) <= DESC_LIMIT:
            home_desc += elec_extra
    if facts.nea_alert_active and facts.nea_supply_districts:
        elec_title_extra = f"आपूर्ति प्रभावित {facts.nea_supply_districts}"
    elif facts.nea_upcoming is not None:
        elec_title_extra = f"आगामी कटौती {facts.nea_upcoming}"
    else:
        elec_title_extra = ""
    specs = {
        "index.html": Copy(home_title, home_desc, "गृह"),
        "notices.html": Copy(
            _join(["सडक", bs, f"पूर्ण अवरोध {facts.police_full}" if facts.police_full else ""]),
            road_desc or f"{bs}। सडक स्थिति।",
            "सडक",
        ),
        "weather.html": Copy(
            _join(["मौसम", bs, _join([
                f"रातो {facts.dhm_red}" if facts.dhm_red is not None else "",
                f"सुन्तला {facts.dhm_orange}" if facts.dhm_orange is not None else "",
            ], " ")]),
            weather_desc or f"{bs}। मौसम चेतावनी।",
            "मौसम",
        ),
        "electricity.html": Copy(
            _join(["बिजुली", bs, elec_title_extra]),
            elec_desc or f"{bs}। बिजुली।",
            "बिजुली",
        ),
        "names.html": Copy(
            _join(["नामावली", bs, f"{facts.names_count} नाम" if facts.names_count else ""]),
            names_desc or f"{bs}। उद्धार र सम्पर्कविहीन नामावली।",
            "नामावली",
        ),
        "damage.html": Copy(
            _join(["क्षति", bs, f"शव {facts.dead}" if facts.dead else ""]),
            _ndrrma(facts, [f"शव {facts.dead}" if facts.dead else "", f"उपचाररत {facts.treating}" if facts.treating else ""], "क्षति मूल्यांकन।"),
            "क्षति",
        ),
        "donate.html": Copy(
            _join(["राहत कोष", bs, f"{facts.donors} दाता" if facts.donors else ""]),
            fund_desc or f"{bs}। राहत कोष।",
            "राहत कोष",
        ),
        "gov.html": Copy(
            _join(["सरकारी पहल", bs, f"उद्धार {facts.rescued}" if facts.rescued else ""]),
            _ndrrma(facts, [f"उद्धार {facts.rescued}" if facts.rescued else ""], "सरकारी पहल।"),
            "सरकारी पहल",
        ),
        "response.html": Copy(
            _join(["मानवीय प्रतिक्रिया", bs, f"सम्पर्कविहीन {facts.missing}" if facts.missing else ""]),
            _ndrrma(facts, [f"सम्पर्कविहीन करिब {facts.missing}" if facts.missing else "", f"शव {facts.dead}" if facts.dead else ""], "मानवीय प्रतिक्रिया।"),
            "मानवीय प्रतिक्रिया",
        ),
        "contact.html": Copy(
            _join(["सम्पर्क", bs, facts.helpline or ""]),
            contact_desc or f"{bs}। आपत्कालीन सहायता र सम्पर्क।",
            "सम्पर्क",
        ),
        "photos.html": Copy(f"तस्बिर · {bs}", f"{bs} ({facts.ad})। जाँचिएका तस्बिर र भिडियो।", "तस्बिर"),
        "supply.html": Copy(f"एलपीजी · {bs}", f"{bs} ({facts.ad})। एलपीजी आयातको भन्सार दैनिक सारांश।", "एलपीजी"),
        "markets.html": Copy(f"पुँजी बजार · {bs}", f"{bs} ({facts.ad})। पुँजी बजार सुधार एवं पुनरुत्थान कार्ययोजना।", "पुँजी बजार"),
        "about.html": Copy(f"हाम्रो बारेमा · {bs}", f"{bs} ({facts.ad})। रसुवा–भोटेकोशी बाढीको व्यक्तिगत नागरिक बुलेटिन।", "हाम्रो बारेमा"),
        "map.html": Copy(f"नक्सा · {bs}", f"{bs}। नक्सा र समयरेखा क्षति मूल्यांकनमा छ।", "नक्सा"),
        "need.html": Copy(f"राहत सामग्री · {bs}", f"{bs}। राहत सामग्री र गोदाम सम्पर्क पानामा छ।", "राहत सामग्री"),
        "api/index.html": Copy(
            _join(["ओभरभ्यू API", bs, f"शव {facts.dead}" if facts.dead else ""]),
            _ndrrma(facts, ndrrma_bits, "सार्वजनिक JSON।"),
            "ओभरभ्यू API",
        ),
        "embed/dashboard.html": Copy(
            _join(["ड्यासबोर्ड", bs, f"शव {facts.dead}" if facts.dead else ""]),
            _ndrrma(facts, [f"शव {facts.dead}" if facts.dead else "", f"उद्धार {facts.rescued}" if facts.rescued else ""], "इम्बेड ड्यासबोर्ड।"),
            "ड्यासबोर्ड",
        ),
        "api/embed.html": Copy(f"ड्यासबोर्ड इम्बेड · {bs}", f"{bs}। ड्यासबोर्ड इम्बेड।", "इम्बेड"),
    }
    seen: dict[str, str] = {}
    for path, copy in specs.items():
        copy.title = clip(copy.title, TITLE_LIMIT)
        copy.description = clip(copy.description, DESC_LIMIT)
        if copy.title in seen:
            copy.title = clip(f"{copy.crumb} · {bs} · {path}", TITLE_LIMIT)
        seen[copy.title] = path
    return specs


def page_url(rel: str) -> str:
    if rel == "index.html":
        return BASE
    if rel == "api/index.html":
        return BASE + "api/"
    return BASE + rel


def _publisher() -> dict:
    return {
        "@type": "Person",
        "name": "Niraj Bhusal",
        "url": "https://www.linkedin.com/in/nirajbhusal/",
    }


def json_ld(rel: str, copy: Copy, facts: Facts) -> dict:
    website = {
        "@type": "WebSite",
        "@id": BASE + "#website",
        "name": "रसुवा–भोटेकोशी बाढी बुलेटिन",
        "alternateName": "Rasuwa–Bhotekoshi Flood Bulletin",
        "url": BASE,
        "inLanguage": ["ne", "en"],
        "publisher": _publisher(),
    }
    image = {
        "@type": "ImageObject",
        "url": BASE + "og-header.png",
        "width": 1200,
        "height": 630,
    }
    if rel == "index.html":
        article = {
            "@type": ["NewsArticle", "LiveBlogPosting"],
            "@id": BASE + "#live",
            "headline": copy.title,
            "description": copy.description,
            "inLanguage": "ne",
            "url": BASE,
            "mainEntityOfPage": BASE,
            "image": image,
            "dateModified": facts.built_at,
            "author": _publisher(),
            "publisher": _publisher(),
            "isAccessibleForFree": True,
        }
        if facts.incident_published:
            article["datePublished"] = facts.incident_published
            article["coverageStartTime"] = facts.incident_published
        return {"@context": "https://schema.org", "@graph": [website, article]}

    url = page_url(rel)
    webpage = {
        "@type": "WebPage",
        "@id": url + "#webpage",
        "url": url,
        "name": copy.title,
        "description": copy.description,
        "isPartOf": {"@id": BASE + "#website"},
        "inLanguage": "ne",
        "dateModified": facts.built_at,
        "primaryImageOfPage": image,
    }
    if facts.incident_published:
        webpage["datePublished"] = facts.incident_published
    crumbs = {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "रसुवा–भोटेकोशी बाढी", "item": BASE},
            {"@type": "ListItem", "position": 2, "name": copy.crumb, "item": url},
        ],
    }
    return {"@context": "https://schema.org", "@graph": [website, webpage, crumbs]}


def dumps_ld(data: dict) -> str:
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    json.loads(raw)
    return raw.replace("<", "\\u003c")


def _set_title(text: str, title: str) -> str:
    esc = html.escape(title, quote=False)
    if re.search(r"<title>.*?</title>", text, flags=re.S | re.I):
        return re.sub(r"<title>.*?</title>", f"<title>{esc}</title>", text, count=1, flags=re.S | re.I)
    return text.replace("</head>", f"<title>{esc}</title>\n</head>", 1)


def _set_meta(text: str, attr: str, key: str, value: str) -> tuple[str, bool]:
    esc = html.escape(value, quote=True)
    pattern = re.compile(
        rf"<meta\s+([^>]*?\b{attr}\s*=\s*['\"]{re.escape(key)}['\"][^>]*)>",
        re.I,
    )
    match = pattern.search(text)
    if not match:
        return text, False
    tag = match.group(0)
    if re.search(r"\bcontent\s*=", tag, re.I):
        tag = re.sub(
            r"(\bcontent\s*=\s*)(['\"])(.*?)\2",
            lambda m: m.group(1) + '"' + esc + '"',
            tag,
            count=1,
            flags=re.S | re.I,
        )
    else:
        tag = tag[:-1] + f' content="{esc}">'
    return text[: match.start()] + tag + text[match.end() :], True


def _ensure_meta(text: str, attr: str, key: str, value: str) -> str:
    text, found = _set_meta(text, attr, key, value)
    if found:
        return text
    esc = html.escape(value, quote=True)
    tag = f'<meta {attr}="{key}" content="{esc}">'
    return text.replace("</head>", tag + "\n</head>", 1)


def _set_json_ld(text: str, payload: str) -> str:
    script = f'<script type="application/ld+json">{payload}</script>'
    pattern = re.compile(r'<script type="application/ld\+json">.*?</script>', re.S | re.I)
    if pattern.search(text):
        return pattern.sub(lambda _m: script, text, count=1)
    return text.replace("</head>", script + "\n</head>", 1)


SITEMAP_LINK = (
    '<link rel="sitemap" type="application/xml" title="Sitemap" href="'
    + SITEMAP_URL
    + '">'
)


def _ensure_sitemap_link(text: str) -> str:
    if 'rel="sitemap"' in text or "rel='sitemap'" in text:
        return text
    if "<head>" in text.lower() or "</head>" in text.lower():
        return text.replace("</head>", SITEMAP_LINK + "\n</head>", 1)
    return text


def is_redirect(text: str) -> bool:
    return bool(re.search(r'http-equiv\s*=\s*["\']refresh["\']', text, re.I))


def rewrite_html(text: str, rel: str, copy: Copy, facts: Facts, full: bool) -> str:
    if not re.search(r"<title\b", text, re.I) and "og:title" not in text:
        return text
    text = _set_title(text, copy.title)
    if is_redirect(text):
        return _ensure_sitemap_link(text)
    text = _ensure_meta(text, "name", "description", copy.description)
    text = _ensure_meta(text, "property", "og:title", copy.title)
    text = _ensure_meta(text, "property", "og:description", copy.description)
    text = _ensure_meta(text, "name", "twitter:title", copy.title)
    text = _ensure_meta(text, "name", "twitter:description", copy.description)
    if full:
        text = _set_json_ld(text, dumps_ld(json_ld(rel, copy, facts)))
    return _ensure_sitemap_link(text)


def content_pages(root: Path) -> list[str]:
    pages = [p.name for p in sorted(root.glob("*.html"))]
    for rel in ("api/index.html", "api/embed.html", "embed/dashboard.html"):
        if (root / rel).is_file() and rel not in pages:
            pages.append(rel)
    return pages


def expand_paths(root: Path, patterns: list[str]) -> list[str]:
    found: list[str] = []
    for pattern in patterns:
        if any(ch in pattern for ch in "*?[]"):
            matches = sorted(root.glob(pattern))
            found.extend(p.relative_to(root).as_posix() for p in matches if p.is_file())
        elif (root / pattern).exists():
            found.append(pattern)
    return found


def git_lastmod(git_root: Path, paths: list[str], fallback: str) -> str:
    paths = [p for p in paths if p]
    git_dir = git_root / ".git"
    if not paths or not git_dir.exists():
        return fallback
    try:
        out = subprocess.check_output(
            ["git", "-C", str(git_root), "log", "-120", "--format=%cs%x09%s", "--", *paths],
            stderr=subprocess.DEVNULL,
            text=True,
        )
    except (subprocess.CalledProcessError, OSError):
        return fallback
    stamped = ""
    for line in out.splitlines():
        if "\t" not in line:
            continue
        day, subject = line.split("\t", 1)
        if subject.startswith("stamp build id"):
            stamped = stamped or day
            continue
        return day
    return stamped or fallback


def write_sitemap(root: Path, git_root: Path, when: datetime) -> None:
    fallback = when.astimezone(NPT).date().isoformat()
    entries: list[tuple[str, str]] = []
    for rel in content_pages(root):
        paths = [rel, *expand_paths(git_root, PAGE_DATA.get(rel, []))]
        entries.append((page_url(rel), git_lastmod(git_root, paths, fallback)))
    dash = "api/dashboard.json"
    if (root / dash).is_file() or (git_root / dash).is_file():
        entries.append((BASE + dash, git_lastmod(git_root, [dash], fallback)))
    entries.sort(key=lambda item: (item[0] != BASE, item[0]))
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, last in entries:
        lines.append("  <url>")
        lines.append(f"    <loc>{html.escape(loc)}</loc>")
        lines.append(f"    <lastmod>{html.escape(last)}</lastmod>")
        lines.append("  </url>")
    lines.append("</urlset>")
    (root / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")


def ensure_robots(root: Path) -> None:
    path = root / "robots.txt"
    line = "Sitemap: " + SITEMAP_URL
    if not path.is_file():
        path.write_text("User-agent: *\nAllow: /\n" + line + "\n", encoding="utf-8")
        return
    text = path.read_text(encoding="utf-8")
    if "Sitemap:" in text:
        return
    if text and not text.endswith("\n"):
        text += "\n"
    path.write_text(text + line + "\n", encoding="utf-8")


def og_card_html(root: Path, facts: Facts) -> str:
    fonts = root / "fonts"

    def face(weight: str, name: str, urange: str) -> str:
        uri = (fonts / name).resolve().as_uri()
        return (
            "@font-face{font-family:Mukta;font-style:normal;font-weight:"
            + weight
            + ";font-display:block;src:url('"
            + uri
            + "') format('woff2');unicode-range:"
            + urange
            + ";}"
        )

    deva = "U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF"
    latn = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2212"
    faces = "".join(
        [
            face("500", "mukta-500-deva.woff2", deva),
            face("500", "mukta-500-latn.woff2", latn),
            face("700", "mukta-700-deva.woff2", deva),
            face("700", "mukta-700-latn.woff2", latn),
            face("800", "mukta-800-deva.woff2", deva),
            face("800", "mukta-800-latn.woff2", latn),
        ]
    )
    cards = []
    if facts.dead:
        cards.append((facts.dead, "शव", "NDRRMA"))
    if facts.police_full or facts.police_total:
        value = facts.police_full or facts.police_total
        label = "पूर्ण अवरोध" if facts.police_full else "अवरोध"
        cards.append((value, label, "नेपाल प्रहरी"))
    if facts.dhm_red is not None and facts.dhm_orange is not None:
        cards.append((f"{facts.dhm_red} · {facts.dhm_orange}", "रातो · सुन्तला", "DHM"))
    cards = cards[:3]
    card_html = []
    for value, label, source in cards:
        card_html.append(
            "<div class=\"card\"><b>"
            + html.escape(value)
            + "</b><span>"
            + html.escape(label)
            + "</span><em>"
            + html.escape(source)
            + "</em></div>"
        )
    return """<!DOCTYPE html>
<html lang="ne">
<head>
<meta charset="utf-8">
<style>
""" + faces + """
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#f6f7f4;color:#0f172a;font-family:Mukta,"Noto Sans Devanagari",sans-serif}
.bar{height:16px;background:#c41e3a}
.wrap{padding:46px 64px 40px}
h1{margin:0;color:#c41e3a;font-size:76px;font-weight:800;line-height:1.12;letter-spacing:0}
.date{margin:14px 0 0;font-size:34px;font-weight:700;color:#1e293b}
.stats{display:flex;gap:22px;margin-top:42px}
.card{flex:1;background:#fff;border:1px solid #e7e5e4;border-top:6px solid #c41e3a;border-radius:22px;padding:22px 24px 18px}
.card b{display:block;font-size:54px;font-weight:800;line-height:1.1;color:#0f172a}
.card span{display:block;margin-top:8px;font-size:26px;font-weight:700;color:#c41e3a}
.card em{display:block;margin-top:6px;font-style:normal;font-size:18px;font-weight:500;line-height:1.35;color:#475569}
</style>
</head>
<body>
<div class="bar"></div>
<div class="wrap">
  <h1>रसुवा–भोटेकोशी बाढी</h1>
  <p class="date">""" + html.escape(facts.bs + " · " + facts.ad) + """</p>
  <div class="stats">""" + "".join(card_html) + """</div>
</div>
</body>
</html>
"""


def render_og(root: Path, facts: Facts, dest: Path) -> None:
    import tempfile

    from playwright.sync_api import sync_playwright

    html_text = og_card_html(root, facts)
    with tempfile.TemporaryDirectory() as tmp:
        card = Path(tmp) / "og-card.html"
        card.write_text(html_text, encoding="utf-8")
        with sync_playwright() as pw:
            errors: list[str] = []
            browser = None
            for kwargs in ({"channel": "chrome"}, {}):
                try:
                    browser = pw.chromium.launch(args=["--disable-dev-shm-usage"], **kwargs)
                    break
                except Exception as exc:  # noqa: BLE001 - try the next browser
                    errors.append(str(exc))
            if browser is None:
                raise SystemExit("could not launch Chromium for the share image: " + "; ".join(errors))
            page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
            page.goto(card.resolve().as_uri())
            page.evaluate("() => document.fonts.ready")
            loaded = page.evaluate("() => document.fonts.check('80px Mukta', 'रसुवा')")
            if not loaded:
                browser.close()
                raise SystemExit("Devanagari font did not load for the share image")
            page.screenshot(
                path=str(dest),
                clip={"x": 0, "y": 0, "width": 1200, "height": 630},
                type="png",
            )
            browser.close()
    data = dest.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n" or int.from_bytes(data[16:20], "big") != 1200 or int.from_bytes(data[20:24], "big") != 630:
        raise SystemExit("share image is not a 1200x630 PNG")


def apply(root: Path, built_at: str, git_root: Path | None = None, render_og_image: bool = False, when: datetime | None = None) -> Facts:
    root = root.resolve()
    git_root = (git_root or root).resolve()
    moment = when.astimezone(NPT) if when else datetime.now(NPT)
    data_root = root if (root / "api" / "dashboard.json").is_file() or not (git_root / "api" / "dashboard.json").is_file() else git_root
    facts = load_facts(data_root, moment, built_at)
    copies = page_copies(facts)
    for rel in content_pages(root):
        path = root / rel
        text = path.read_text(encoding="utf-8", errors="replace")
        copy = copies.get(rel)
        if copy is None:
            topic = "बुलेटिन"
            match = re.search(r"<title>(.*?)</title>", text, flags=re.S | re.I)
            if match:
                topic = re.sub(r"\s+", " ", match.group(1)).split("·")[0].strip() or topic
            copy = Copy(
                clip(f"{topic} · {facts.bs}", TITLE_LIMIT),
                clip(f"{facts.bs} ({facts.ad})। रसुवा–भोटेकोशी बाढी बुलेटिन।", DESC_LIMIT),
                topic,
            )
        updated = rewrite_html(text, rel, copy, facts, full=rel in copies)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
    write_sitemap(root, git_root, moment)
    ensure_robots(root)
    if render_og_image:
        render_og(root if (root / "fonts").is_dir() else git_root, facts, root / "og-header.png")
    return facts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Rewrite bulletin SEO from live data files")
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--git-root", type=Path, default=None)
    parser.add_argument("--built-at", default="")
    parser.add_argument("--when", default="", help="ISO timestamp in NPT or with a timezone (tests)")
    parser.add_argument("--render-og", action="store_true")
    args = parser.parse_args(argv)
    built_at = args.built_at or datetime.now(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
    when = parse_when(args.when) if args.when else None
    apply(args.root, built_at, git_root=args.git_root, render_og_image=args.render_og, when=when)
    print(built_at)
    return 0


if __name__ == "__main__":
    sys.exit(main())
