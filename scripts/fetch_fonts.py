#!/usr/bin/env python3
"""Jost — the one face REGNUM ships.

Their wordmark is a rounded geometric monoline: circular bowls, a single stroke
weight, letters set wide apart. Jost is the open face built on the same logic,
so it sets every word that speaks for the house — page titles, the hero line,
prices at display size. Everything that works is the phone's own UI face, as on
iOS, because a restaurant's app should feel like the phone, not like a poster.

One variable file covers 300–500: light for the large quiet titles, medium for
the small ones. Google serves one file per unicode range; the app is English, so
only the latin range (the last @font-face in the payload) is taken, then
re-subset to the characters the interface can actually render.

    python3 scripts/fetch_fonts.py
"""
import pathlib
import re
import subprocess

OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "fonts"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
# ASCII, Latin-1 (É for CAFÉ, ×, ·), dashes, curly quotes, bullet, ellipsis, arrow, minus.
GLYPHS = ("U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,"
          "U+2022,U+2026,U+2192,U+2212")
FACES = [("jost", "Jost:wght@300..500")]


def get(url):
    """curl, not urllib: this Mac's Python SSL times out on the Google handshake
    where the system curl does not."""
    return subprocess.run(["curl", "-sSfL", "-m", "40", "--retry", "3", "-A", UA, url],
                          check=True, capture_output=True).stdout


def latin_url(query):
    css = get(f"https://fonts.googleapis.com/css2?family={query}&display=swap").decode()
    urls = re.findall(r"url\((https://[^)]+\.woff2)\)", css)
    if not urls:
        raise SystemExit(f"no woff2 in payload for {query}")
    return urls[-1]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, query in FACES:
        raw = OUT / f"{name}.raw.woff2"
        raw.write_bytes(get(latin_url(query)))
        dest = OUT / f"{name}.woff2"
        subprocess.run(["python3", "-m", "fontTools.subset", str(raw), f"--unicodes={GLYPHS}",
                        "--layout-features=kern,liga,calt,tnum,lnum,case", "--flavor=woff2",
                        "--output-file={}".format(dest)], check=True)
        raw.unlink()
        print(f"  {dest.name:18} {dest.stat().st_size / 1024:5.1f} KB")


if __name__ == "__main__":
    main()
