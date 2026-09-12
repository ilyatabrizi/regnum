#!/usr/bin/env python3
"""Stamp the build. Run before every deploy.

1. Inline the opening screen into index.html — their lockup (js/brand.js), all
   three paths, still — so it paints with the first byte instead of waiting for
   the modules.
2. Announce every module with a modulepreload link: ES imports are otherwise
   found one level at a time, one round trip per level, which from Tabriz to
   GitHub Pages is most of the wait.
3. Write the service worker's shell and asset lists from what is on disk, so a
   new module or photo can never be missing from the offline copy.
4. Content-hash all of it into the worker's VERSION and the ?v= query strings,
   so a returning visitor never runs a stale mix.

    python3 build.py
"""
import hashlib
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
idx = ROOT / "index.html"
sw = ROOT / "sw.js"


def block(html, name, inner):
    pat = re.compile(rf"<!-- {name}:start -->.*?<!-- {name}:end -->", re.S)
    return pat.sub(lambda _: f"<!-- {name}:start -->\n{inner}\n<!-- {name}:end -->", html)


def boot_block():
    brand = (ROOT / "js/brand.js").read_text(encoding="utf-8")
    vb = re.search(r'LOGO_VIEWBOX = "([^"]+)"', brand).group(1)
    parts = [re.search(rf'{n}_D = "([^"]+)"', brand).group(1) for n in ("MARK", "WORD", "TAG")]
    paths = "".join(f'<path fill-rule="evenodd" d="{d}"/>' for d in parts)
    return ('<div id="boot" aria-hidden="true"><div class="boot-logo">'
            f'<svg class="logo" viewBox="{vb}" fill="currentColor" focusable="false">{paths}</svg>'
            '</div></div>')


mods = sorted(p.relative_to(ROOT).as_posix() for p in ROOT.glob("js/**/*.js"))
html = idx.read_text(encoding="utf-8")
html = block(html, "boot", boot_block())
if "<!-- preload:start -->" not in html:
    html = html.replace('<script type="module" src="js/app.js',
                        '<!-- preload:start -->\n<!-- preload:end -->\n<script type="module" src="js/app.js', 1)
html = block(html, "preload", "\n".join(f'<link rel="modulepreload" href="{m}">' for m in mods if m != "js/app.js"))
idx.write_text(html, encoding="utf-8")

shell = ["./", "./index.html", "./manifest.webmanifest", "./css/app.css"] + [f"./{m}" for m in mods]
assets = sorted(f"./{p.relative_to(ROOT).as_posix()}" for pat in
                ("assets/fonts/*.woff2", "assets/brand/*", "assets/icons/*.png", "assets/photos/*-sm.webp", "assets/video/poster.webp")
                for p in ROOT.glob(pat))
src = sw.read_text(encoding="utf-8")
fmt = lambda items: "\n".join(f'  "{u}",' for u in items)
src = re.sub(r"/\* shell:start \*/.*?/\* shell:end \*/", lambda _: f"/* shell:start */\n{fmt(shell)}\n  /* shell:end */", src, flags=re.S)
src = re.sub(r"/\* assets:start \*/.*?/\* assets:end \*/", lambda _: f"/* assets:start */\n{fmt(assets)}\n  /* assets:end */", src, flags=re.S)
sw.write_text(src, encoding="utf-8")

files = sorted([*ROOT.glob("js/**/*.js"), ROOT / "css/app.css", idx, ROOT / "manifest.webmanifest", sw])
h = hashlib.sha1()
for f in files:
    h.update(re.sub(rb'\?v=[0-9a-f]+|const VERSION = "regnum-[^"]+";', b"", f.read_bytes()))
stamp = h.hexdigest()[:10]

sw.write_text(re.sub(r'const VERSION = "regnum-[^"]+";', f'const VERSION = "regnum-{stamp}";', sw.read_text(encoding="utf-8")), encoding="utf-8")
html = idx.read_text(encoding="utf-8")
html = re.sub(r'css/app\.css(\?v=[0-9a-f]+)?', f"css/app.css?v={stamp}", html)
html = re.sub(r'js/app\.js(\?v=[0-9a-f]+)?"', f'js/app.js?v={stamp}"', html)
idx.write_text(html, encoding="utf-8")
print(f"build {stamp}: lockup inlined, {len(mods) - 1} modules preloaded, worker lists {len(shell)} shell + {len(assets)} assets")
