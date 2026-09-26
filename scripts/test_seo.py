#!/usr/bin/env python3
"""Fixture checks for the SEO rewriter. Does not touch the git checkout."""
from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import seo_meta  # noqa: E402

WHEN = datetime(2026, 9, 26, 12, 0, tzinfo=seo_meta.NPT)
BUILT = "2026-09-26T06:15:00Z"

FIXTURE_DASH = {
    "as_of": {"ne": "२० सेप्टेम्बर / ४ असोज २०८३ · १९:००"},
    "cards": [
        {"id": "dead", "value": 1451, "value_display": {"ne": "१,४५१"}},
        {"id": "miss", "value": 5786, "value_display": {"ne": "५,७८६"}},
        {"id": "injured", "value": 15, "value_display": {"ne": "१५"}},
        {"id": "rescued", "value": 13784, "value_display": {"ne": "१३,७८४"}},
    ],
}

PAGE = """<!DOCTYPE html>
<html lang="ne"><head>
<meta charset="utf-8">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>OLD TITLE</title>
<meta name="description" content="old description">
<meta property="og:title" content="old og">
<meta property="og:description" content="old og desc">
<meta name="twitter:title" content="old tw">
<meta name="twitter:description" content="old tw desc">
<script type="application/ld+json">{"@context":"https://schema.org","old":true}</script>
</head><body>
<p>body stays</p>
</body></html>
"""

REDIRECT = """<!DOCTYPE html>
<html><head>
<meta http-equiv="refresh" content="0;url=damage.html#map">
<title>नक्सा</title>
</head><body><p>go</p></body></html>
"""


def _meta(text: str, attr: str, key: str) -> str:
    match = re.search(
        rf'<meta\s+[^>]*{attr}="{re.escape(key)}"[^>]*content="([^"]*)"',
        text,
    )
    if not match:
        raise SystemExit(f"missing meta {attr}={key}")
    return match.group(1)


def _ld(text: str) -> dict:
    match = re.search(r'<script type="application/ld\+json">(.*?)</script>', text, re.S)
    if not match:
        raise SystemExit("missing json-ld")
    return json.loads(match.group(1))


def _numbers(text: str) -> set[str]:
    return set(re.findall(r"[0-9०-९]+(?:[,，][0-9०-९]+)*", text))


def _allowed(blob: str, facts: seo_meta.Facts) -> set[str]:
    allowed = _numbers(blob)
    for token in re.findall(r"\d+", blob):
        allowed.add(token)
        allowed.add(seo_meta.nep(token))
        allowed.add(seo_meta.nep(str(int(token))))
        allowed.add(seo_meta.nep(f"{int(token):,}"))
        allowed.add(f"{int(token):,}")
    for iso in re.findall(r"\d{4}-\d{2}-\d{2}", blob):
        year = int(iso[:4])
        if year < 2016 or year > 2036:
            continue
        try:
            day = seo_meta.date.fromisoformat(iso)
        except ValueError:
            continue
        allowed |= _numbers(seo_meta.bs_label(day))
        allowed |= _numbers(seo_meta.ad_label(day))
    for token in (facts.bs, facts.ad, facts.built_at, facts.incident_published or ""):
        allowed |= _numbers(token)
    return allowed


def main() -> int:
    if seo_meta.ad_to_bs(seo_meta.date(2026, 9, 26)) != (2083, 6, 10):
        raise SystemExit("2026-09-26 is not Asoj 10")
    if seo_meta.ad_to_bs(seo_meta.date(2026, 9, 20)) != (2083, 6, 4):
        raise SystemExit("2026-09-20 is not Asoj 4")
    if seo_meta.ad_to_bs(seo_meta.date(2026, 8, 26)) != (2083, 5, 10):
        raise SystemExit("2026-08-26 is not Bhadra 10")
    if seo_meta.bs_label(seo_meta.date(2026, 9, 26)) != "असोज १०":
        raise SystemExit("BS label mismatch")

    repo = Path(__file__).resolve().parents[1]
    facts = seo_meta.load_facts(repo, WHEN, BUILT)
    copies = seo_meta.page_copies(facts)
    titles = [item.title for item in copies.values()]
    if len(titles) != len(set(titles)):
        raise SystemExit("page titles are not unique: " + ", ".join(titles))
    descriptions = [item.description for item in copies.values()]
    if len(descriptions) != len(set(descriptions)):
        dupes = [item for item in descriptions if descriptions.count(item) > 1]
        raise SystemExit("page descriptions are not unique: " + " | ".join(set(dupes)))
    blob = ""
    for name in (
        "api/dashboard.json",
        "data/weather-alert.json",
        "data/flood-bulletin.json",
        "data/nea_electricity.json",
        "ndrrma-rescue.json",
        "data/pmdrf-named-donors.json",
        "data/gallery-path.json",
    ):
        path = repo / name
        if path.is_file():
            blob += path.read_text(encoding="utf-8")
    for path in repo.glob("data/police_roads_*.json"):
        blob += path.read_text(encoding="utf-8")
    allowed = _allowed(blob, facts)
    for rel, copy in copies.items():
        if len(copy.title) > seo_meta.TITLE_LIMIT:
            raise SystemExit(f"{rel} title too long ({len(copy.title)}): {copy.title}")
        if len(copy.description) > seo_meta.DESC_LIMIT:
            raise SystemExit(f"{rel} description too long ({len(copy.description)}): {copy.description}")
        if "२० सेप्टेम्बर" in copy.title:
            raise SystemExit(f"{rel} title still frozen on 20 September: {copy.title}")
        if "असोज १०" not in copy.title:
            raise SystemExit(f"{rel} title missing Asoj 10: {copy.title}")
        for number in _numbers(copy.title + " " + copy.description):
            if number not in allowed:
                raise SystemExit(f"{rel} uses a number that is not in the data files: {number} in {copy.title} / {copy.description}")
    home = copies["index.html"]
    if facts.dead and facts.dead not in home.title:
        raise SystemExit("homepage title omitted the NDRRMA death figure")
    if "NDRRMA" not in home.description or (facts.ndrrma_asof and facts.ndrrma_asof not in home.description):
        raise SystemExit("homepage description missing NDRRMA or its as-of time")
    roads = copies["notices.html"]
    if "नेपाल प्रहरी" not in roads.description:
        raise SystemExit("roads description missing Nepal Police")
    weather = copies["weather.html"]
    if "DHM" not in weather.description or "रातो" not in weather.title:
        raise SystemExit("weather copy is not about the DHM warning")
    power = copies["electricity.html"]
    if "NEA" not in power.description or "बिजुली" not in power.title:
        raise SystemExit("electricity copy is not about NEA")
    for rel in ("electricity.html", "weather.html", "notices.html", "names.html", "donate.html"):
        if rel not in copies:
            raise SystemExit(f"missing copy for {rel}")

    partial = seo_meta.Facts(when=WHEN, bs="असोज १०", ad="२६ सेप्टेम्बर २०२६", built_at=BUILT, dead="१,४५१")
    partial_copy = seo_meta.page_copies(partial)["index.html"]
    if "सम्पर्कविहीन" in partial_copy.description or "उद्धार" in partial_copy.description:
        raise SystemExit("missing humanitarian figures were invented: " + partial_copy.description)
    if "१,४५१" not in partial_copy.title:
        raise SystemExit("present death figure was dropped")

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        subprocess.check_call(["git", "init", "-q"], cwd=root)
        subprocess.check_call(["git", "config", "user.email", "seo@example.com"], cwd=root)
        subprocess.check_call(["git", "config", "user.name", "seo"], cwd=root)
        (root / "index.html").write_text(PAGE.replace("OLD TITLE", "गृह"), encoding="utf-8")
        (root / "weather.html").write_text(PAGE.replace("OLD TITLE", "मौसम"), encoding="utf-8")
        (root / "map.html").write_text(REDIRECT, encoding="utf-8")
        (root / "api").mkdir()
        (root / "api" / "dashboard.json").write_text(json.dumps(FIXTURE_DASH), encoding="utf-8")
        (root / "data").mkdir()
        (root / "data" / "dhm.html").write_text("<p>?v=</p>", encoding="utf-8")
        subprocess.check_call(["git", "add", "."], cwd=root)
        subprocess.check_call(["git", "commit", "-q", "-m", "fixture"], cwd=root)
        subprocess.check_call(["git", "commit", "-q", "--allow-empty", "--date=2026-09-26T00:00:00", "-m", "touch weather"], cwd=root)
        # The empty commit does not touch weather.html, so lastmod stays the fixture commit.
        seo_meta.apply(root, BUILT, when=WHEN)
        home_html = (root / "index.html").read_text(encoding="utf-8")
        if "<p>body stays</p>" not in home_html:
            raise SystemExit("rewriter changed the page body")
        if 'http-equiv="Cache-Control"' not in home_html:
            raise SystemExit("no-cache meta tag was removed")
        if 'rel="sitemap"' not in home_html:
            raise SystemExit("sitemap link missing")
        if _meta(home_html, "property", "og:title") != _title(home_html):
            raise SystemExit("og:title does not match title")
        if _meta(home_html, "name", "twitter:description") != _meta(home_html, "name", "description"):
            raise SystemExit("twitter description does not match the meta description")
        data = _ld(home_html)
        types = data["@graph"][1]["@type"]
        if "NewsArticle" not in types or "LiveBlogPosting" not in types:
            raise SystemExit(f"homepage JSON-LD is not a live article: {types}")
        if data["@graph"][1]["dateModified"] != BUILT:
            raise SystemExit("dateModified is not the build time")
        if "datePublished" in data["@graph"][1]:
            raise SystemExit("incident date was invented without gallery-path.json")
        if "telephone" in home_html.lower() or "email" in json.dumps(data).lower():
            raise SystemExit("JSON-LD includes a phone or email")
        if re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", home_html):
            raise SystemExit("an email address was written into the page")
        weather_html = (root / "weather.html").read_text(encoding="utf-8")
        weather_ld = _ld(weather_html)
        crumb = next(node for node in weather_ld["@graph"] if node.get("@type") == "BreadcrumbList")
        if len(crumb["itemListElement"]) != 2:
            raise SystemExit("section breadcrumb is incomplete")
        if crumb["itemListElement"][1]["name"] != "मौसम":
            raise SystemExit("breadcrumb name mismatch")
        if "NewsArticle" in json.dumps(weather_ld):
            raise SystemExit("section page was marked as the live article")
        redirect = (root / "map.html").read_text(encoding="utf-8")
        if "असोज १०" not in redirect or "application/ld+json" in redirect:
            raise SystemExit("redirect page was expanded into a full article")
        if (root / "data" / "dhm.html").read_text(encoding="utf-8") != "<p>?v=</p>":
            raise SystemExit("archived data html was rewritten")
        sitemap = (root / "sitemap.xml").read_text(encoding="utf-8")
        if "<changefreq>" in sitemap or "<priority>" in sitemap:
            raise SystemExit("sitemap still has changefreq or priority")
        if "electricity.html" not in sitemap and "weather.html" not in sitemap:
            raise SystemExit("sitemap dropped a section page")
        if "map.html" not in sitemap or "api/dashboard.json" not in sitemap:
            raise SystemExit("sitemap is missing a public URL")
        if "<lastmod>2026-09-" not in sitemap:
            raise SystemExit("sitemap lastmod was not taken from git: " + sitemap)
        robots = (root / "robots.txt").read_text(encoding="utf-8")
        if "Sitemap: https://nirajbhusal.github.io/rasuwa-flood-bulletin/sitemap.xml" not in robots:
            raise SystemExit("robots.txt is missing the sitemap line")
        card = seo_meta.og_card_html(repo, facts)
        if "रसुवा–भोटेकोशी बाढी" not in card or "#c41e3a" not in card:
            raise SystemExit("share-image template lost the title or brand colour")
        if facts.dead and facts.dead not in card:
            raise SystemExit("share-image template omitted a live figure")
        if "Noto Sans Devanagari" not in card and "Mukta" not in card:
            raise SystemExit("share-image template has no Devanagari font")

    print("seo ok")
    for rel in ("index.html", "notices.html", "weather.html", "electricity.html"):
        print(f"  {rel}: {copies[rel].title}")
    return 0


def _title(text: str) -> str:
    match = re.search(r"<title>(.*?)</title>", text, re.S)
    if not match:
        raise SystemExit("missing title")
    return match.group(1)


if __name__ == "__main__":
    sys.exit(main())
