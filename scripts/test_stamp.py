#!/usr/bin/env python3
"""Fixture checks for the deploy stamper. Does not touch git."""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stamp_build  # noqa: E402


FIXTURE_HTML = """<!DOCTYPE html>
<html><head>
<link rel="stylesheet" href="fonts.css?v=agent-left-this">
<link rel="stylesheet" href="empty.css?v=">
<script>window.PAGE_VER="hand-bumped-by-an-agent";</script>
<script src="app.js?v=another-hand-value"></script>
</head><body>
<script>
s.src=["names-index.js?v", window.PAGE_VER].join("=");
s.src="names-index.js?v="+(window.PAGE_VER||"");
</script>
<script>window.PAGE_VER = 'also-hand-set';</script>
</body></html>
"""

FIXTURE_SW = """const PAGE_VER = 'hand-set-sw';
const SW_VER = 'hand-set-sw';
const STATIC_CACHE = 'rasuwa-static-hand-set-sw';
const RUNTIME_CACHE = 'rasuwa-runtime-hand-set-sw';
const url = ['fonts.css?v', PAGE_VER].join('=');
"""


def main() -> int:
    build = "abc1234-20260925T120000Z"
    html = stamp_build.stamp_html(FIXTURE_HTML, build)
    if f'fonts.css?v={build}' not in html:
        raise SystemExit("literal css query was not stamped")
    if f'empty.css?v={build}' not in html:
        raise SystemExit("empty ?v= was not filled")
    if f'app.js?v={build}' not in html:
        raise SystemExit("script query was not stamped")
    if html.count(f'window.PAGE_VER="{build}"') != 1:
        raise SystemExit("double-quoted PAGE_VER was not stamped")
    if html.count(f"window.PAGE_VER = '{build}'") != 1:
        raise SystemExit("single-quoted PAGE_VER was not stamped")
    if '["names-index.js?v", window.PAGE_VER].join("=")' not in html:
        raise SystemExit("join() loader was rewritten")
    if 's.src="names-index.js?v="+(window.PAGE_VER||"")' not in html:
        raise SystemExit("concatenation loader should be left for the source fix, not half-rewritten")
    # The concatenation form still contains an empty ?v= in source. The real
    # pages must not ship that form; the fixture only checks we don't break it
    # into invalid JS like ?v=BUILD"+(...).
    if f'?v={build}"+' in html:
        raise SystemExit("concatenation was corrupted into a stuck query")

    sw = stamp_build.stamp_sw(FIXTURE_SW, build)
    if f"const PAGE_VER = '{build}'" not in sw:
        raise SystemExit("SW PAGE_VER was not stamped")
    if f"const SW_VER = '{build}'" not in sw:
        raise SystemExit("SW_VER was not stamped")
    if f"const STATIC_CACHE = 'rasuwa-static-{build}'" not in sw:
        raise SystemExit("STATIC_CACHE was not stamped")
    if f"const RUNTIME_CACHE = 'rasuwa-runtime-{build}'" not in sw:
        raise SystemExit("RUNTIME_CACHE was not stamped")
    if "['fonts.css?v', PAGE_VER].join('=')" not in sw:
        raise SystemExit("SW join() helper was rewritten")

    derived = stamp_build.stamp_sw(
        "const PAGE_VER = 'old';\nconst SW_VER = PAGE_VER;\n"
        "const STATIC_CACHE = 'rasuwa-static-' + PAGE_VER;\n"
        "const RUNTIME_CACHE = 'rasuwa-runtime-' + PAGE_VER;\n",
        build,
    )
    if f"const PAGE_VER = '{build}'" not in derived:
        raise SystemExit("derived SW PAGE_VER was not stamped")
    if "const STATIC_CACHE = 'rasuwa-static-' + PAGE_VER;" not in derived:
        raise SystemExit("derived static cache was rewritten: " + derived)
    if "const RUNTIME_CACHE = 'rasuwa-runtime-' + PAGE_VER;" not in derived:
        raise SystemExit("derived runtime cache was rewritten: " + derived)
    if derived.count(build) != 1:
        raise SystemExit("build id leaked into derived cache names: " + derived)

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        src = root / "src"
        out = root / "out"
        src.mkdir()
        (src / "index.html").write_text(
            """<!DOCTYPE html><html><head>
<script>window.PAGE_VER="old";</script>
<link rel="stylesheet" href="fonts.css?v=old">
<script src="refresh.js?v=old"></script>
</head><body>
<script>s.src=["names-index.js?v", window.PAGE_VER].join("=");</script>
</body></html>
""",
            encoding="utf-8",
        )
        (src / "sw.js").write_text(FIXTURE_SW, encoding="utf-8")
        (src / "data").mkdir()
        (src / "data" / "dhm.html").write_text("<p>?v=</p>", encoding="utf-8")
        stamp_build.stamp_tree(src, out, build, "2026-09-25T12:00:00Z")
        page = (out / "index.html").read_text(encoding="utf-8")
        if f"?v={build}" not in page or "empty ?v" in page:
            raise SystemExit("tree stamp failed on index")
        if stamp_build.EMPTY_V_RE.search(page):
            raise SystemExit("stamped index still has an empty ?v=")
        version = json.loads((out / "version.json").read_text(encoding="utf-8"))
        if version["build"] != build or version["built_at"] != "2026-09-25T12:00:00Z":
            raise SystemExit(f"version.json mismatch: {version}")
        # Archived HTML under data/ is not an app page and must be left as-is.
        if (out / "data" / "dhm.html").read_text(encoding="utf-8") != "<p>?v=</p>":
            raise SystemExit("data html was rewritten")
        work = root / "work"
        work.mkdir()
        (work / "index.html").write_text('<script>window.PAGE_VER="old";</script>\n<link href="a.css?v=old">\n', encoding="utf-8")
        (work / "sw.js").write_text(
            "const PAGE_VER = 'old';\nconst SW_VER = PAGE_VER;\n"
            "const STATIC_CACHE = 'rasuwa-static-' + PAGE_VER;\n"
            "const RUNTIME_CACHE = 'rasuwa-runtime-' + PAGE_VER;\n",
            encoding="utf-8",
        )
        stamp_build.stamp_in_place(work, build, "2026-09-25T12:00:00Z")
        if build not in (work / "index.html").read_text(encoding="utf-8"):
            raise SystemExit("in-place html was not stamped")
        if json.loads((work / "version.json").read_text(encoding="utf-8"))["build"] != build:
            raise SystemExit("in-place version.json mismatch")
    print("stamp ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
