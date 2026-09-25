#!/usr/bin/env python3
"""Offline checks for source timeouts, last-good retention, and personal-data scrubbing."""
import unittest
from unittest import mock

import build


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


if __name__ == "__main__":
    unittest.main()
