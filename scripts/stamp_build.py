#!/usr/bin/env python3
"""Stamp one build id into a deploy copy. Does not commit.

GitHub Pages serves the artifact produced by .github/workflows/pages.yml.
Hand-edited PAGE_VER / ?v= values in git are overwritten here, whatever an
agent left behind.
A content push publishes a new id; weather-only snapshots do not.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

SKIP_ROOT = {".git", ".github", "_site", "__pycache__", ".pytest_cache"}

PAGE_VER_RE = re.compile(
    r"""(window\.PAGE_VER\s*=\s*)(?P<q>["'])[^"']*(?P=q)"""
)
SW_CONST_RE = re.compile(
    r"""(const\s+PAGE_VER\s*=\s*)(?P<q>["'])[^"']*(?P=q)"""
)
SW_VER_RE = re.compile(
    r"""(const\s+SW_VER\s*=\s*)(?P<q>["'])[^"']*(?P=q)"""
)
STATIC_CACHE_RE = re.compile(
    r"""(const\s+STATIC_CACHE\s*=\s*)(?P<q>["'])rasuwa-static-[^"']*(?P=q)(?!\s*\+)"""
)
RUNTIME_CACHE_RE = re.compile(
    r"""(const\s+RUNTIME_CACHE\s*=\s*)(?P<q>["'])rasuwa-runtime-[^"']*(?P=q)(?!\s*\+)"""
)
# A ?v= whose value is empty or not this build. Concatenation (`?v=" +`) is
# left alone so script loaders that join the query stay valid.
EMPTY_V_RE = re.compile(r"""\?v=(?=["'\s&#>]|$)""")


def make_build(sha: str | None = None, when: datetime | None = None) -> tuple[str, str]:
    now = when or datetime.now(timezone.utc).replace(microsecond=0)
    short = (sha or os.environ.get("BUILD_SHA") or "local").strip()
    if short.startswith("refs/"):
        short = "local"
    short = short[:7] or "local"
    built_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    build = f"{short}-{now.strftime('%Y%m%dT%H%M%SZ')}"
    return build, built_at


def stamp_queries(text: str, build: str) -> str:
    """Replace literal ?v= values. Skip JS string concatenation."""
    out: list[str] = []
    i = 0
    token = "?v="
    while True:
        j = text.find(token, i)
        if j < 0:
            out.append(text[i:])
            break
        n = j + len(token)
        while n < len(text) and text[n] not in "\"' \t\n\r&#>":
            n += 1
        nxt = text[n] if n < len(text) else ""
        if nxt in "'\"":
            rest = text[n + 1 : n + 16].lstrip()
            if rest[:1] in "+.)":
                out.append(text[i:n])
                i = n
                continue
        out.append(text[i:j])
        out.append(token + build)
        i = n
    return "".join(out)


def stamp_page_ver(text: str, build: str) -> str:
    return PAGE_VER_RE.sub(lambda m: m.group(1) + m.group("q") + build + m.group("q"), text)


def stamp_html(text: str, build: str) -> str:
    return stamp_page_ver(stamp_queries(text, build), build)


def stamp_sw(text: str, build: str) -> str:
    text = SW_CONST_RE.sub(lambda m: m.group(1) + m.group("q") + build + m.group("q"), text)
    text = SW_VER_RE.sub(lambda m: m.group(1) + m.group("q") + build + m.group("q"), text)
    text = STATIC_CACHE_RE.sub(
        lambda m: m.group(1) + m.group("q") + "rasuwa-static-" + build + m.group("q"),
        text,
    )
    text = RUNTIME_CACHE_RE.sub(
        lambda m: m.group(1) + m.group("q") + "rasuwa-runtime-" + build + m.group("q"),
        text,
    )
    return text


def verify_tree(root: Path, build: str) -> list[str]:
    problems: list[str] = []
    html_files = [p for p in root.rglob("*.html") if "data/" not in p.as_posix() and "/data/" not in p.as_posix()]
    # Archived DHM bulletins live under data/ and are not app pages.
    for path in html_files:
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = path.relative_to(root).as_posix()
        if EMPTY_V_RE.search(text):
            problems.append(f"{rel}: empty ?v=")
        for match in re.finditer(r"\?v=([^\"'\s&#>]*)", text):
            val = match.group(1)
            if val != build:
                problems.append(f"{rel}: ?v={val!r} != {build}")
        for match in PAGE_VER_RE.finditer(text):
            # Re-read the value from the assignment we would have written.
            raw = match.group(0)
            val = raw.split("=", 1)[1].strip().strip("\"'")
            if val != build:
                problems.append(f"{rel}: PAGE_VER {val!r} != {build}")
    sw = root / "sw.js"
    if not sw.is_file():
        problems.append("sw.js missing")
    else:
        sw_text = sw.read_text(encoding="utf-8")
        found = SW_CONST_RE.search(sw_text)
        if not found or build not in found.group(0):
            problems.append("sw.js PAGE_VER was not stamped")
        literal_cache = f"rasuwa-static-{build}" in sw_text
        derived_cache = "rasuwa-static-' + PAGE_VER" in sw_text or 'rasuwa-static-" + PAGE_VER' in sw_text
        if not literal_cache and not derived_cache:
            problems.append("sw.js static cache name missing build")
        if build not in sw_text:
            problems.append("sw.js does not contain the build id")
    version = root / "version.json"
    if not version.is_file():
        problems.append("version.json missing")
    else:
        data = json.loads(version.read_text(encoding="utf-8"))
        if data.get("build") != build:
            problems.append(f"version.json build {data.get('build')!r} != {build}")
        if not data.get("built_at"):
            problems.append("version.json missing built_at")
    return problems


def copy_site(src: Path, dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)

    def ignore(directory: str, names: list[str]) -> set[str]:
        if Path(directory).resolve() == src.resolve():
            return {n for n in names if n in SKIP_ROOT or n.endswith(".pyc")}
        return {n for n in names if n == "__pycache__" or n.endswith(".pyc")}

    shutil.copytree(src, dest, ignore=ignore, symlinks=False)


def stamp_files(root: Path, build: str, built_at: str, git_root: Path | None = None, render_og: bool = False) -> None:
    # SEO runs on the deploy copy before ?v= / PAGE_VER stamping, so a publish
    # refreshes titles without a hand-edited build id.
    import seo_meta

    seo_meta.apply(root, built_at, git_root=git_root or root, render_og_image=render_og)
    for path in root.rglob("*.html"):
        if "/data/" in path.as_posix():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        stamped = stamp_html(text, build)
        if stamped != text:
            path.write_text(stamped, encoding="utf-8")
    sw = root / "sw.js"
    if sw.is_file():
        sw.write_text(stamp_sw(sw.read_text(encoding="utf-8"), build), encoding="utf-8")
    (root / "version.json").write_text(
        json.dumps({"build": build, "built_at": built_at}, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    problems = verify_tree(root, build)
    if problems:
        raise SystemExit("stamp verify failed:\n" + "\n".join(problems))


def stamp_tree(src: Path, dest: Path, build: str, built_at: str, render_og: bool = False) -> None:
    copy_site(src, dest)
    stamp_files(dest, build, built_at, git_root=src, render_og=render_og)


def stamp_in_place(src: Path, build: str, built_at: str, render_og: bool = False) -> None:
    stamp_files(src, build, built_at, git_root=src, render_og=render_og)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Stamp a Pages deploy artifact")
    parser.add_argument("--src", type=Path, default=Path("."))
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--in-place", action="store_true")
    parser.add_argument("--sha", default=os.environ.get("BUILD_SHA", "local"))
    parser.add_argument("--build", default="", help="Override the build id (tests)")
    parser.add_argument("--render-og", action="store_true", help="Screenshot og-header.png")
    args = parser.parse_args(argv)
    src = args.src.resolve()
    if args.build:
        build = args.build
        built_at = datetime.now(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        build, built_at = make_build(args.sha)
    if args.in_place:
        stamp_in_place(src, build, built_at, render_og=args.render_og)
    else:
        if args.out is None:
            parser.error("--out is required unless --in-place")
        stamp_tree(src, args.out.resolve(), build, built_at, render_og=args.render_og)
    print(build)
    return 0


if __name__ == "__main__":
    sys.exit(main())
