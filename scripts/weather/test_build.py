#!/usr/bin/env python3
"""Offline checks for source timeouts, last-good retention, and personal-data scrubbing."""
import json
import os
import unittest
from datetime import datetime, timezone
from unittest import mock

import build

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class ScrubTests(unittest.TestCase):
    def test_drops_forecaster_and_nested_user(self):
        raw = {
            "title": "bulletin",
            "user": {"name": "Hidden Person", "signature": "sig"},
            "update_by": {"name": "Other Person"},
            "forecaster": "Hidden Person",
            "forecaster_name": "Hidden Person",
            "stations": [{"name": "Dhunche", "signature_image": "x"}],
        }
        clean = build.scrub(raw)
        self.assertEqual(clean["title"], "bulletin")
        self.assertEqual(clean["stations"][0]["name"], "Dhunche")
        self.assertEqual(build.personal_keys(clean), [])
        self.assertNotIn("user", clean)
        self.assertNotIn("forecaster", clean)
        self.assertNotIn("signature_image", clean["stations"][0])

    def test_refuses_dhm_javascript_and_embedded_key(self):
        with self.assertRaises(RuntimeError):
            build.guard_url("https://dhm.gov.np/mfd/main.js")
        with self.assertRaises(RuntimeError):
            build.guard_url("https://dhm.gov.np/mfd/api/weather?api_key=secret")
        with self.assertRaises(RuntimeError):
            build.guard_url("https://example.test/forecast?access_token=abc")
        self.assertTrue(build.guard_url("https://dhm.gov.np/mfd/api/weather").endswith("/weather"))


class RetainTests(unittest.TestCase):
    def test_failed_source_keeps_last_fetch_and_marks_stale(self):
        meta = build.retain_meta(
            {"status": "ok", "fetched_at": "2026-09-25T06:53:08+05:45", "issued_at": "2026-09-24T18:00:00+05:45"},
            {"status": "ok", "url": "https://dhm.gov.np/mfd/api/weather", "fetched_at": "2026-09-25T09:00:00+05:45"},
        )
        self.assertEqual(meta["status"], "retained")
        self.assertTrue(meta["stale"])
        self.assertEqual(meta["fetched_at"], "2026-09-25T06:53:08+05:45")
        self.assertEqual(meta["url"], "https://dhm.gov.np/mfd/api/weather")

    def test_failed_obs_does_not_wipe_city(self):
        city = {"id": "kathmandu", "dhm_observed": None, "dhm_forecast": {"periods": [{"t_from": 18}]}, "gauge_now": None}
        old = {"dhm_observed": {"max_c": 20.2, "min_c": 18.4}, "gauge_now": {"rain_24h": 44.4}}
        build.restore_city_gaps(city, old, obs_ok=False, rain_ok=False)
        self.assertEqual(city["dhm_observed"]["max_c"], 20.2)
        self.assertEqual(city["gauge_now"]["rain_24h"], 44.4)
        self.assertEqual(city["dhm_forecast"]["periods"][0]["t_from"], 18)

    def test_open_meteo_is_labeled_gap_fill(self):
        block = {"current": {"temperature_2m": 17.5, "time": "2026-09-25T08:00"}}
        now = build.current_of(block)
        self.assertEqual(now["src"], "model")
        self.assertEqual(now["role"], "gap-fill")
        self.assertEqual(now["t"], 17.5)


class ObservationTests(unittest.TestCase):
    def test_older_report_does_not_replace_this_morning(self):
        packs = {}
        today = {
            "issue_date": "2026-09-25T03:00:00.000Z",
            "stations": [{"id": 12, "rainfall": 71.2, "max_temperature": 20.2, "min_temperature": 16.2}],
        }
        yesterday = {
            "issue_date": "2026-09-24T03:00:00.000Z",
            "stations": [{"id": 12, "rainfall": 14.6, "max_temperature": 20.2, "min_temperature": 18.4}],
        }
        build.merge_obs_doc(packs, today)
        build.merge_obs_doc(packs, yesterday)
        pub = build.obs_public(packs[12])
        self.assertEqual(pub["rain_24h_mm"], 71.2)
        self.assertEqual(pub["min_c"], 16.2)
        self.assertTrue(pub["obs_at"].startswith("2026-09-25T08:45"))

    def test_null_observation_is_not_filled_with_zero(self):
        packs = {}
        today = {
            "issue_date": "2026-09-25T03:00:00.000Z",
            "stations": [{"id": 16, "rainfall": None, "max_temperature": None, "min_temperature": None}],
        }
        evening = {
            "issue_date": "2026-09-24T12:00:00.000Z",
            "stations": [{"id": 16, "rainfall": 0, "max_temperature": 17.5, "min_temperature": 5}],
        }
        build.merge_obs_doc(packs, today)
        build.merge_obs_doc(packs, evening)
        pub = build.obs_public(packs[16])
        self.assertIsNone(pub["rain_24h_mm"])
        self.assertIsNone(pub["max_c"])
        self.assertIsNone(pub["min_c"])
        self.assertNotEqual(pub["rain_24h_mm"], 0)


class FetchDeadlineTests(unittest.TestCase):
    def test_deadline_stops_retries(self):
        calls = []

        def boom(*args, **kwargs):
            calls.append(kwargs.get("timeout"))
            raise TimeoutError("timed out")

        with mock.patch("urllib.request.urlopen", side_effect=boom):
            with self.assertRaises(TimeoutError):
                build.fetch_json("https://dhm.gov.np/mfd/api/weather", timeout=12, attempts=4, deadline=3)
        self.assertGreaterEqual(len(calls), 1)
        self.assertLessEqual(len(calls), 2)


class AlertPlaceTests(unittest.TestCase):
    def test_today_pins_corridor_and_skips_orange_provinces(self):
        with open(os.path.join(ROOT, "data", "weather-alert.json"), encoding="utf-8") as handle:
            alert = json.load(handle)
        with open(os.path.join(ROOT, "data", "nepal-districts-svg.json"), encoding="utf-8") as handle:
            districts = json.load(handle)["districts"]
        now = datetime(2026, 9, 25, 5, 0, tzinfo=timezone.utc)
        ids = build.select_alert_districts(alert, districts, "2026-09-25", now)
        self.assertEqual(
            ids[:8],
            ["rasuwa", "nuwakot", "dhading", "gorkha", "chitwan", "sindhupalchok", "baglung", "myagdi"],
        )
        self.assertNotIn("dhanusha", ids)
        self.assertIn("kathmandu", ids)
        self.assertEqual(len(ids), 38)
        self.assertEqual(build.alert_level(alert, "rasuwa", "bagmati", "2026-09-25", now), "red")
        self.assertEqual(build.alert_level(alert, "sindhupalchok", "bagmati", "2026-09-25", now), "red")

    def test_orange_provinces_join_only_when_few_reds(self):
        districts = [
            {"id": "rasuwa", "en": "Rasuwa", "ne": "रसुवा", "province": "bagmati"},
            {"id": "kailali", "en": "Kailali", "ne": "कैलाली", "province": "sudurpaschim"},
        ]
        alert = {
            "warning_days": [{"date": "2026-09-25", "provinces": {
                "bagmati": {"level": "red"},
                "sudurpaschim": {"level": "orange"},
            }}],
            "callout": {"page_id": 1, "window_end": "2020-01-01T00:00:00+05:45", "districts": []},
            "district_warnings": [],
        }
        now = datetime(2026, 9, 25, 5, 0, tzinfo=timezone.utc)
        self.assertEqual(
            build.select_alert_districts(alert, districts, "2026-09-25", now),
            ["rasuwa", "kailali"],
        )
        many = [{"id": f"d{i}", "en": f"D{i:02d}", "ne": f"D{i}", "province": "bagmati"} for i in range(8)]
        many.append({"id": "orange1", "en": "Orange", "ne": "Orange", "province": "madhesh"})
        wide = {
            "warning_days": [{"date": "2026-09-25", "provinces": {
                "bagmati": {"level": "red"},
                "madhesh": {"level": "orange"},
            }}],
            "callout": {},
            "district_warnings": [],
        }
        ids = build.select_alert_districts(wide, many, "2026-09-25", now)
        self.assertEqual(len(ids), 8)
        self.assertNotIn("orange1", ids)

    def test_dhm_beats_a_fresh_gauge_and_null_stays_null(self):
        cities = [{
            "id": "kathmandu",
            "dhm_observed": {
                "rain_24h_mm": 71.2, "max_c": 20.2, "min_c": 16.2,
                "obs_at": "2026-09-25T08:45:00+05:45", "trace": False,
            },
            "verify": {"state": "ok"},
        }]
        gauges = [{
            "district": "KATHMANDU", "r24": 5, "fresh": True, "name": "X",
            "ne": "X", "en": "X", "obs_at": "2026-09-25T10:00:00+05:45",
            "lat": 27.7, "lon": 85.3, "id": 1,
        }]
        districts = [{"id": "kathmandu", "en": "Kathmandu", "ne": "काठमाडौं", "province": "bagmati"}]
        source, obs, verify = build.choose_obs(
            "kathmandu", {"lat": 27.7, "lon": 85.3, "point_id": "kathmandu"},
            cities, gauges, build.district_key_map(districts), {}, "2026-09-25",
        )
        self.assertEqual(source, "dhm")
        self.assertEqual(obs["rain24"], 71.2)
        self.assertIsNone(obs["t"])
        self.assertFalse(obs["stale"])
        self.assertEqual(verify, "ok")
        empty_source, empty_obs, _ = build.choose_obs(
            "dhading", {"lat": None, "lon": None, "point_id": None}, [], [], {}, {}, "2026-09-25",
        )
        self.assertIsNone(empty_source)
        self.assertIsNone(empty_obs)

    def test_fresh_gauge_replaces_yesterdays_dhm(self):
        cities = [{
            "id": "kathmandu",
            "dhm_observed": {"rain_24h_mm": 1, "max_c": 1, "min_c": 1, "obs_at": "2026-09-24T08:45:00+05:45"},
        }]
        gauges = [{
            "district": "Kathmandu", "r24": 9, "fresh": True, "name": "KTM",
            "ne": "KTM", "en": "KTM", "obs_at": "2026-09-25T10:00:00+05:45",
            "lat": 27.7, "lon": 85.3, "id": 2,
        }]
        districts = [{"id": "kathmandu", "en": "Kathmandu"}]
        source, obs, _ = build.choose_obs(
            "kathmandu", {"lat": 27.7, "lon": 85.3},
            cities, gauges, build.district_key_map(districts), {}, "2026-09-25",
        )
        self.assertEqual(source, "hydrology")
        self.assertEqual(obs["rain24"], 9)
        self.assertFalse(obs["stale"])

    def test_sindhupalchowk_alias(self):
        districts = [{"id": "sindhupalchok", "en": "Sindhupalchok"}]
        key_map = build.district_key_map(districts)
        self.assertEqual(key_map.get("sindhupalchowk"), "sindhupalchok")
        self.assertEqual(
            build.resolve_district("NAWALPARASI (BARDAGHAT SUSTA EAST)", key_map),
            "nawalparasi-east",
        )
        self.assertIsNone(build.resolve_district("Nawalparasi", key_map))


class TopRainTests(unittest.TestCase):
    def test_archale_transliterates_with_schwa(self):
        self.assertEqual(build.to_devanagari("Archale"), "अर्चले")
        self.assertEqual(build.to_devanagari("Khopasi"), "खोपसी")
        self.assertEqual(build.to_devanagari("क्याङजिन"), "क्याङजिन")

    def test_fresh_gauges_beat_stale_dhm_and_ignore_model(self):
        districts = [
            {"id": "palpa", "en": "Palpa", "ne": "पाल्पा", "province": "lumbini"},
            {"id": "kavrepalanchok", "en": "Kavrepalanchok", "ne": "काभ्रेपलाञ्चोक", "province": "bagmati"},
            {"id": "kathmandu", "en": "Kathmandu", "ne": "काठमाडौं", "province": "bagmati"},
        ]
        now = datetime(2026, 9, 25, 8, 9, tzinfo=timezone.utc)
        gauges = [
            {"id": 744, "name": "Archale", "ne": "Archale", "en": "Archale", "district": "Palpa", "r24": 222.0, "obs_at": "2026-09-25T13:25:00+05:45"},
            {"id": 848, "name": "Khopasi(Panauti)", "ne": "Khopasi(Panauti)", "en": "Khopasi(Panauti)", "district": "KAVREPALANCHOK", "r24": 134.6, "obs_at": "2026-09-25T13:35:00+05:45"},
            {"id": 867, "name": "Gandakot", "ne": "Gandakot", "en": "Gandakot", "district": "Palpa", "r24": 132.0, "obs_at": "2026-09-25T13:25:00+05:45"},
            {"id": 1, "name": "Old", "ne": "Old", "en": "Old", "district": "Palpa", "r24": 500, "obs_at": "2026-09-25T08:00:00+05:45"},
            {"id": 2, "name": "ModelHill", "ne": "ModelHill", "en": "ModelHill", "district": "Palpa", "r24": 900, "obs_at": "2026-09-25T13:40:00+05:45", "source": "model"},
        ]
        dhm = [{
            "id": 12, "name": "Kathmandu", "ne": "काठमाडौं", "en": "Kathmandu",
            "district_id": "kathmandu", "rain24": 71.2, "obs_at": "2026-09-25T08:45:00+05:45", "source": "dhm",
        }]
        rows = build.top_rain(gauges, dhm, districts, now)
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0]["station"]["en"], "Archale")
        self.assertEqual(rows[0]["station"]["ne"], "अर्चले")
        self.assertEqual(rows[0]["district"], {"ne": "पाल्पा", "en": "Palpa"})
        self.assertEqual(rows[0]["province"], "lumbini")
        self.assertEqual(rows[0]["rain24"], 222.0)
        self.assertEqual(rows[0]["obs_at"], "2026-09-25T13:25:00+05:45")
        self.assertEqual(rows[0]["source"], "hydrology")
        self.assertEqual(rows[1]["district"]["en"], "Kavrepalanchok")
        self.assertEqual(rows[2]["station"]["en"], "Gandakot")
        self.assertTrue(all(row["source"] != "model" for row in rows))
        self.assertNotIn("Old", [row["station"]["en"] for row in rows])
        self.assertNotIn("Kathmandu", [row["station"]["en"] for row in rows])

    def test_fresh_dhm_can_outrank_a_gauge(self):
        districts = [{"id": "kathmandu", "en": "Kathmandu", "ne": "काठमाडौं", "province": "bagmati"}]
        now = datetime(2026, 9, 25, 8, 9, tzinfo=timezone.utc)
        gauges = [{
            "id": 744, "name": "Archale", "ne": "Archale", "en": "Archale",
            "district": "Kathmandu", "r24": 10, "obs_at": "2026-09-25T13:25:00+05:45",
        }]
        dhm = [{
            "id": 12, "ne": "काठमाडौं", "en": "Kathmandu", "district_id": "kathmandu",
            "rain24": 80, "obs_at": "2026-09-25T13:20:00+05:45", "source": "dhm",
        }]
        rows = build.top_rain(gauges, dhm, districts, now)
        self.assertEqual(rows[0]["source"], "dhm")
        self.assertEqual(rows[0]["station"]["ne"], "काठमाडौं")
        self.assertEqual(rows[0]["rain24"], 80)


if __name__ == "__main__":
    unittest.main()
