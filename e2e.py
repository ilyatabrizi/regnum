#!/usr/bin/env python3
"""End-to-end checks for the REGNUM Café & Restaurant PWA.

    python3 serve.py &                                    # or the "regnum" preview
    python3 e2e.py                                        # local preview, :8181
    python3 e2e.py https://ilyatabrizi.github.io/regnum/   # the deployed build

Drives the system Chrome as a phone through everything a customer would do and
fails loudly on anything broken: the opening, the reel visibly moving, the glass
tab bar (lens, drag-to-switch, fold on scroll, dark over the reel), one-tap add,
the item sheet, the bag, the order, check-in and the room, the profile, light and
dark, the wide layout — plus no CRM anywhere, no Instagram anywhere, the green
kept out of the chrome and brought in on hover, glass never inside a backdrop root,
and the three hash-router traps (stacked listeners, same-hash navigation, chrome
derived from scroll). Screenshots land in scripts/shots/.
"""
from __future__ import annotations

import io
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

from PIL import Image, ImageChops, ImageStat

ROOT = pathlib.Path(__file__).resolve().parent
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8201/").rstrip("/") + "/"
LIVE = "localhost" not in BASE and "127.0.0.1" not in BASE
Q = "" if LIVE else "?nosw"
SHOTS = ROOT / "scripts" / "shots"
IPHONE = ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
          "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")
CRM = re.compile(r"\b(points?|loyalty|tiers?|rewards?|cashback|membership|member card|stamps?|crm|vip|league)\b", re.I)
ITEMS = 43


def greenish(css_colour):
    """True when a computed colour leans green — their #46653C by day, #8CB278 at
    night — rather than sitting on the ink/stone axis, where r≈g≈b."""
    v = [int(x) for x in re.findall(r"\d+", css_colour)[:3]]
    return len(v) == 3 and v[1] > v[0] + 12 and v[1] > v[2] + 12

PASS: list[str] = []
FAIL: list[str] = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name if cond else f"{name}  →  {detail}")


def http(url, method="GET", headers=None):
    try:
        req = urllib.request.Request(url, method=method, headers={"User-Agent": "regnum-e2e", **(headers or {})})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, (r.read() if method == "GET" else b"")
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, b""
    except Exception as e:
        return 0, {}, str(e).encode()


CONTRAST_JS = """(pairs) => {
  const rgb = (c) => c.match(/[\\d.]+/g).slice(0, 3).map(Number);
  const lum = (c) => { const v = rgb(c).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  const out = {};
  for (const [name, fg, bg] of pairs) {
    const f = document.querySelector(fg), b = bg === 'body' ? document.body : document.querySelector(bg);
    if (!f || !b) { out[name] = null; continue; }
    out[name] = Math.round(ratio(getComputedStyle(f).color, getComputedStyle(b).backgroundColor) * 100) / 100;
  }
  return out;
}"""

BACKDROP_ROOT_JS = """(sels) => {
  const bad = [];
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (!el) { bad.push(sel + ': missing'); continue; }
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.transform !== 'none' || s.filter !== 'none' || +s.opacity < 1 || s.mixBlendMode !== 'normal'
          || (s.backdropFilter && s.backdropFilter !== 'none') || (s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none'))
        bad.push(sel + ' inside ' + (a.id ? '#' + a.id : a.className || a.tagName));
    }
  }
  return bad;
}"""


def mean_diff(a: bytes, b: bytes) -> float:
    ia, ib = Image.open(io.BytesIO(a)).convert("L"), Image.open(io.BytesIO(b)).convert("L")
    return ImageStat.Stat(ImageChops.difference(ia, ib)).mean[0]


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("pip install playwright  (uses the system Chrome)")
    SHOTS.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------ over http
    st, _, sw = http(BASE + "sw.js")
    sw = sw.decode("utf-8", "replace")
    head, _, tail = sw.partition("const ASSETS")
    shell = re.findall(r'"\./([^"]*)"', head)
    assets = re.findall(r'"\./([^"]*)"', tail.split("];")[0])
    photos_js = http(BASE + "js/photos.js")[2].decode()
    full = [f"assets/photos/{k}.webp" for k in re.findall(r'"([a-z-]+)": \{', photos_js)]
    paths = sorted(set(shell + assets + full + ["404.html", "assets/og.jpg", "README.md"]) - {"__installed__"})
    missing = [p for p in paths if http(BASE + p, "HEAD")[0] != 200]
    check(f"http: all {len(paths)} shell, asset and photo URLs answer 200", not missing, ", ".join(missing[:6]))
    check("worker lists every module the app has", len([s for s in shell if s.startswith("js/")]) >= 23, str(len(shell)))
    check("full-size photos exist for all 19", len(full) == 19, str(len(full)))

    st, h, body = http(BASE + "manifest.webmanifest")
    try:
        man = json.loads(body)
        check("manifest: standalone, named, 3 icons incl. maskable", man.get("display") == "standalone" and man.get("short_name") == "REGNUM"
              and len(man.get("icons", [])) >= 3 and any(i.get("purpose") == "maskable" for i in man["icons"]))
        check("manifest served as JSON", "json" in h.get("content-type", ""), h.get("content-type", ""))
    except Exception as e:
        check("manifest parses", False, str(e))

    st, h, _ = http(BASE + "assets/video/hero.mp4", "HEAD")
    check("reel served as video/mp4", st == 200 and "video/mp4" in h.get("content-type", ""), f"{st} {h.get('content-type')}")
    st, h, head_bytes = http(BASE + "assets/video/hero.mp4", headers={"Range": "bytes=0-262143"})
    check("reel answers byte ranges (Safari needs 206)", st == 206 and "content-range" in h, f"{st}")
    check("reel moov is up front and carries no audio track", b"moov" in head_bytes and b"vide" in head_bytes and b"soun" not in head_bytes)
    size = int(h.get("content-range", "/0").split("/")[-1] or 0)
    check("reel under 3.2 MB", 0 < size < 3.2e6, str(size))

    html = http(BASE)[2].decode("utf-8", "replace")
    head_html = html.split("<body")[0]
    check("noindex while unapproved", 'name="robots" content="noindex' in html)
    check("viewport-fit=cover for the notch", "viewport-fit=cover" in html)
    check("scrollRestoration claimed in <head>", "scrollRestoration" in head_html)
    check("theme applied before first paint", 'localStorage.getItem("regnum.v1.theme")' in head_html)
    check("opening inlined: their lockup as SVG", '<div id="boot"' in html and 'class="logo"' in html.split('<div id="boot"')[1][:400])
    mods = [s for s in shell if s.startswith("js/")]
    preloads = html.count('rel="modulepreload"')
    check("every module but app.js announced with modulepreload", preloads == len(mods) - 1, f"{preloads} vs {len(mods) - 1}")
    v_css = re.search(r"css/app\.css\?v=([0-9a-f]+)", html)
    v_js = re.search(r"js/app\.js\?v=([0-9a-f]+)", html)
    v_sw = re.search(r'VERSION = "regnum-([0-9a-f]+)"', sw)
    check("build stamp agrees across css, js and worker", bool(v_css and v_js and v_sw) and v_css.group(1) == v_js.group(1) == v_sw.group(1))
    check("og card and absolute og:image for link previews", "og:image" in html and "https://" in html.split("og:image")[1][:80])
    js_all = "".join(http(BASE + m)[2].decode("utf-8", "replace") for m in mods)
    check("no secrets in shipped js", not re.search(r"(sk_live|api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9]{12,}|password\s*[:=]\s*['\"])", js_all, re.I))
    check("404 bounces home to the hash router", "location.replace" in http(BASE + "404.html")[2].decode())

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)

        def new_page(ctx, tag):
            pg = ctx.new_page()
            pg.errors = []
            pg.on("pageerror", lambda e: pg.errors.append(f"{tag} pageerror: {e}"))
            pg.on("console", lambda m: pg.errors.append(f"{tag} console: {m.text}") if m.type == "error" else None)
            return pg

        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True,
                                  has_touch=True, user_agent=IPHONE, color_scheme="light")
        page = new_page(ctx, "phone")
        J = page.evaluate
        wait = page.wait_for_timeout

        def goto(h, ms=650):
            J("h => { location.hash = h }", h)
            wait(ms)

        def shot(name):
            page.screenshot(path=str(SHOTS / f"e2e-{name}.png"))

        def badge():
            return J("(() => { const b = document.getElementById('bag-badge'); return b.classList.contains('on') ? +b.textContent : 0; })()")

        # ------------------------------------------------------------- opening
        t0 = time.time()
        page.goto(BASE + Q + "#/", wait_until="commit")
        try:
            page.wait_for_selector("#boot .boot-logo svg.logo", state="attached", timeout=8000)
            first = True
        except Exception:
            first = False
        check("opening shows their lockup from the first paint", first)
        check("the lockup holds still (nothing on it animates)", J("(() => { const l = document.querySelector('#boot .boot-logo'); return !l || l.getAnimations({ subtree: true }).length === 0; })()"))
        try:
            page.wait_for_selector("#boot", state="detached", timeout=12000)
        except Exception:
            pass
        took = time.time() - t0
        check("opening leaves within 6 s", J("!document.getElementById('boot')") and took < 6, f"{took:.1f}s")
        page.wait_for_load_state("load")
        wait(500)
        check("Jost loaded, and at the light weight the titles are set in", J("document.fonts.check('300 30px Jost')"))

        # ------------------------------------------------------------ tab bar
        tabs = J("[...document.querySelectorAll('#tabs .tab')].map(t => [t.querySelector('.tab-l').textContent, t.getAttribute('href')])")
        check("tab bar: Home · Menu · Bag · Profile, in that order", tabs == [["Home", "#/"], ["Menu", "#/menu"], ["Bag", "#/bag"], ["Profile", "#/profile"]], str(tabs))
        check("check-in stands apart as its own round button", J("(() => { const c = document.getElementById('ci-btn'); const s = getComputedStyle(c); return c.getAttribute('href') === '#/checkin' && s.borderRadius === '50%' && c.offsetWidth === c.offsetHeight; })()"))
        g = J("(() => { const s = getComputedStyle(document.getElementById('tabs')); return { bf: s.backdropFilter || s.webkitBackdropFilter, r: parseFloat(s.borderRadius), h: document.getElementById('tabs').offsetHeight }; })()")
        check("tab bar is glass: backdrop blur + saturate, fully round, 62 px", "blur" in (g["bf"] or "") and "saturate" in (g["bf"] or "") and g["r"] >= 31 and g["h"] == 62, str(g))
        check("Home is the current tab, lens under it", J("document.querySelector('.tab[data-tab=home]').getAttribute('aria-current') === 'page' && document.getElementById('tabbar').dataset.ready === '1'"))
        lens = J("(() => { const l = document.getElementById('tabs-lens').getBoundingClientRect(), t = document.querySelector('.tab[data-tab=home]').getBoundingClientRect(); return Math.abs(l.left - t.left) < 2 && Math.abs(l.width - t.width) < 2; })()")
        check("lens sits exactly under the current tab", lens)
        check("glass never inside a backdrop root (a transformed or filtered ancestor)", not J(BACKDROP_ROOT_JS, ["#tabs", "#ci-btn", "#bar", ".hero .btn--glass"]),
              str(J(BACKDROP_ROOT_JS, ["#tabs", "#ci-btn", "#bar", ".hero .btn--glass"])))
        check("tab bar goes dark over the reel", J("document.getElementById('tabbar').dataset.tone") == "dark")
        check("top bar is clear over the reel", J("document.getElementById('bar').classList.contains('over-hero')"))

        # --------------------------------------------------------------- reel
        v = J("(() => { const v = document.querySelector('.hero-video'); return { muted: v.muted, inline: v.playsInline, loop: v.loop, src: v.currentSrc }; })()")
        check("reel is muted as a property, inline, looping", v["muted"] and v["inline"] and v["loop"] and v["src"].endswith("hero.mp4"), str(v))
        try:
            page.wait_for_function("(() => { const v = document.querySelector('.hero-video'); return v && !v.paused && v.currentTime > .4; })()", timeout=8000)
            playing = True
        except Exception:
            playing = False
        check("reel plays by itself", playing)
        same = J("(() => { const a = document.querySelector('.hero-video').getBoundingClientRect(), b = document.querySelector('.hero-media').getBoundingClientRect(); return Math.abs(a.top - b.top) < 1 && Math.abs(a.height - b.height) < 1 && Math.abs(a.width - b.width) < 1; })()")
        check("reel fills the hero (not stacked under its poster)", same)
        hero = J("(() => { const r = document.querySelector('.hero').getBoundingClientRect(); return { x: 0, y: 0, width: r.width, height: Math.min(r.height, innerHeight) * .55 }; })()")
        a = page.screenshot(clip=hero)
        wait(1300)
        b = page.screenshot(clip=hero)
        d = mean_diff(a, b)
        check("reel visibly moves on screen (pixel diff over 1.3 s)", d > 0.4, f"{d:.2f}")
        shot("home")
        check("hero carries their lockup as vector, all three bands", J("document.querySelectorAll('.hero-logo svg path').length") == 3)
        hc = J("(() => { const h = document.querySelector('.hero').getBoundingClientRect(), l = document.querySelector('.hero-logo').getBoundingClientRect(); return { dx: +((l.left + l.width / 2) - (h.left + h.width / 2)).toFixed(2), dy: +((l.top + l.height / 2) - (h.top + h.height / 2)).toFixed(2) }; })()")
        check("the lockup stands in the exact middle of the hero", abs(hc["dx"]) < 1 and abs(hc["dy"]) < 1, str(hc))
        check("the hero carries no greeting and no tagline",
              not J("!!document.querySelector('.hero-eyebrow, .hero-line')")
              and not re.search(r"good (morning|afternoon|evening)|a long morning|everything on it", J("document.querySelector('.hero').innerText"), re.I))

        # --------------------------------------------------------------- home
        cards = J("[...document.querySelectorAll('.card')].map(c => c.querySelector('.card-name').textContent)")
        check("the rail: six of their own plates, each with a one-tap add", len(cards) == 6 and J("document.querySelectorAll('.card .add').length") == 6, str(cards))
        n_room = J("+document.querySelector('.room-n').textContent")
        check("room card count matches the check-in badge", n_room == J("+document.getElementById('ci-count').textContent"), f"{n_room}")
        check("their frames: six tiles, each opening a part of the menu", J("document.querySelectorAll('.frame-tile[href^=\"#/menu\"]').length") == 6)
        check("footer signs off Powered by Alpha Agency", "Alpha Agency" in J("document.querySelector('.powered').innerText"))
        for y in range(0, 4400, 380):
            J(f"scrollTo(0, {y})")
            wait(90)
        wait(900)
        broken = J("[...document.querySelectorAll('img.pic')].filter(i => !(i.complete && i.naturalWidth)).map(i => i.src)")
        check("every photo on Home has pixels", not broken, str(broken[:3]))
        J("scrollTo(0, 1000)")
        wait(700)
        check("past the reel: the bar turns glass and shows the lockup", J("(() => { const b = document.getElementById('bar'); return b.classList.contains('solid') && +getComputedStyle(document.getElementById('bar-logo')).opacity > .9; })()"))
        check("past the reel: the tab bar is light glass again", J("document.getElementById('tabbar').dataset.tone") == "light")

        # fold on scroll
        J("scrollTo(0, 200)")
        wait(300)
        for y in range(260, 1500, 120):
            J(f"scrollTo(0, {y})")
            wait(40)
        wait(750)
        fold = J("(() => ({ min: document.getElementById('tabbar').classList.contains('min'), caps: document.getElementById('tabs').offsetWidth, row: document.getElementById('tabs-row').offsetWidth, tab: document.querySelector('.tab[aria-current=page]').offsetWidth }))()")
        check("scrolling down folds the bar to the current tab", fold["min"] and fold["caps"] < 120, str(fold))
        check("folding clips the tabs, never squeezes them (regression)", fold["tab"] >= 65 and fold["row"] >= 270 and fold["caps"] >= fold["tab"], str(fold))
        page.click("#tabs")
        wait(700)
        check("tapping the folded bar opens it without navigating", not J("document.getElementById('tabbar').classList.contains('min')") and J("location.hash") == "#/")
        for y in range(1500, 1100, -60):
            J(f"scrollTo(0, {y})")
            wait(40)
        wait(400)
        check("scrolling up keeps it open", not J("document.getElementById('tabbar').classList.contains('min')"))

        # drag the lens from Home to Profile
        J("scrollTo(0, 0)")
        wait(500)
        rect = J("(() => { const a = document.querySelector('.tab[data-tab=home]').getBoundingClientRect(), b = document.querySelector('.tab[data-tab=profile]').getBoundingClientRect(); return [a.x + a.width / 2, a.y + a.height / 2, b.x + b.width / 2]; })()")
        page.mouse.move(rect[0], rect[1])
        page.mouse.down()
        steps = 14
        for i in range(1, steps + 1):
            page.mouse.move(rect[0] + (rect[2] - rect[0]) * i / steps, rect[1])
            wait(16)
        page.mouse.up()
        wait(900)
        check("dragging the lens along the bar switches tabs", J("location.hash") == "#/profile", J("location.hash"))
        check("…and the tone follows the page (no reel behind Profile)", J("document.getElementById('tabbar').dataset.tone") == "light")

        # --------------------------------------------------------------- menu
        goto("#/menu")
        check("menu: seven sections, eight chips", J("document.querySelectorAll('.msec').length") == 7 and J("document.querySelectorAll('.chip').length") == 8)
        check(f"menu: all {ITEMS} items, each with a price", J("document.querySelectorAll('.mrow').length") == ITEMS
              and J("[...document.querySelectorAll('.mrow-p')].every(p => /\\d{1,3}(,\\d{3})+/.test(p.textContent))"))
        check("photographed items show their photo, the rest a drawn glyph", J("document.querySelectorAll('.mrow img.pic').length") == 16 and J("document.querySelectorAll('.mrow .glyph').length") == ITEMS - 16)
        J("document.getElementById('view').firstElementChild.dataset.probe = 'same'")
        page.click('.chip[data-c="tea"]')
        wait(500)
        vis = J("[...document.querySelectorAll('.msec')].filter(s => !s.hidden).map(s => s.dataset.c)")
        check("a chip filters to its section", vis == ["tea"], str(vis))
        check("…the address follows without a re-render", J("location.hash") == "#/menu?c=tea" and J("document.getElementById('view').firstElementChild.dataset.probe") == "same")
        page.click('.chip[data-c="all"]')
        wait(300)
        page.fill("#q", "latte")
        wait(300)
        rows = J("[...document.querySelectorAll('.mrow')].filter(r => !r.hidden).map(r => r.dataset.q)")
        check("search finds every latte and nothing else", len(rows) == 3 and all("latte" in r for r in rows), str(len(rows)))
        page.fill("#q", "zzqq")
        wait(300)
        check("search with no match says so", J("!document.getElementById('none').hidden"))
        page.fill("#q", "")
        wait(200)
        shot("menu")

        n0 = badge()
        page.click('.mrow[data-item="espresso"] .add')
        try:
            page.wait_for_selector(".flyer", state="attached", timeout=700)
            flew = True
        except Exception:
            flew = False
        wait(500)
        check("one tap adds it: badge counts, the photo flies to the bag", badge() == n0 + 1 and flew, f"{badge()} flew={flew}")
        check("…and a toast says so, with a way to the bag", "Espresso" in J("document.getElementById('toast-root').innerText") and J("!!document.querySelector('.toast-act[href=\"#/bag\"]')"))

        # stacked-listener regression: five visits, then one tap = one drink
        for h in ["#/", "#/menu", "#/", "#/menu", "#/", "#/menu"]:
            goto(h, 450)
        n0 = badge()
        page.click('.mrow[data-item="americano"] .add')
        wait(600)
        check("after six visits one tap still adds exactly one (no stacked listeners)", badge() == n0 + 1, f"{n0} → {badge()}")

        # same-hash: the current tab takes you back to the top, no re-render
        page.fill("#q", "tea")
        J("scrollTo(0, 700)")
        wait(300)
        page.click('.tab[data-tab="menu"]')
        wait(900)
        check("tapping the current tab scrolls to the top and keeps the screen", J("scrollY") < 5 and J("document.getElementById('q').value") == "tea", f"y={J('scrollY')}")
        page.fill("#q", "")
        wait(200)

        # --------------------------------------------------------- item sheet
        n0 = badge()
        page.click('.mrow[data-item="latte"] .mrow-n')
        wait(700)
        check("a row opens its sheet", J("!!document.querySelector('.sheet.on')") and J("document.querySelector('.it-name').textContent") == "Caffè Latte")
        check("the page steps back under the sheet", J("document.documentElement.classList.contains('sheet-open')"))
        page.click('.opt[data-g="size"] .pill[data-v="large"]')
        page.click('.opt[data-g="milk"] .pill[data-v="oat"]')
        wait(200)
        check("choices re-price it (Large +60,000, Oat +40,000)", "370,000" in J("document.getElementById('it-unit').innerText"), J("document.getElementById('it-unit').innerText"))
        page.click(".sheet [data-inc]")
        wait(150)
        check("quantity multiplies the sum", J("document.getElementById('it-sum').textContent") == "740,000 Toman", J("document.getElementById('it-sum').textContent"))
        shot("sheet")
        page.click("#it-go")
        wait(700)
        check("add from the sheet: two in, sheet gone", badge() == n0 + 2 and not J("!!document.querySelector('.sheet')"), f"{badge()}")
        page.click('.mrow[data-item="cold-brew"] .mrow-n')
        wait(500)
        page.keyboard.press("Escape")
        wait(600)
        check("Escape closes a sheet", not J("!!document.querySelector('.sheet')"))

        # ---------------------------------------------------------------- bag
        goto("#/bag", 800)
        lines = J("document.querySelectorAll('.line').length")
        check("bag: one line per drink as chosen", lines == 3, str(lines))
        total = lambda: int(re.sub(r"\D", "", J("document.getElementById('total').innerText")) or 0)
        linesum = J("[...document.querySelectorAll('.line-p')].reduce((s, e) => s + +e.textContent.replace(/\\D/g, ''), 0)")
        check("total is the sum of the lines", total() == linesum, f"{total()} vs {linesum}")
        t0 = total()
        page.click('.line[data-key^="espresso"] [data-inc]')
        wait(300)
        check("+ on a line re-prices in place", total() == t0 + 190000, f"{t0} → {total()}")
        page.click('.line[data-key^="americano"] [data-dec]')
        wait(700)
        check("− to nothing takes the line out, with an undo", J("document.querySelectorAll('.line').length") == 2 and J("!!document.querySelector('.toast-act')"))
        page.click(".toast-act")
        wait(700)
        check("Undo brings it back", J("document.querySelectorAll('.line').length") == 3)
        page.click('.line[data-key^="latte"] [data-edit]')
        wait(600)
        check("Change opens the line in its sheet, to update", J("document.getElementById('it-go').innerText").startswith("Update"))
        page.click('.opt[data-g="size"] .pill[data-v="regular"]')
        page.click("#it-go")
        wait(900)
        check("…and the line shows the new choice", "Large" not in J("document.querySelector('.line[data-key^=\"latte\"] .line-o').textContent") and "Oat" in J("document.querySelector('.line[data-key^=\"latte\"] .line-o').textContent"))
        page.click('.seg [data-v="takeaway"]')
        wait(300)
        check("take-away hides the table number", J("document.getElementById('table-field').hidden"))
        page.click('.seg [data-v="table"]')
        wait(300)
        page.fill("#table", "7")
        page.fill("#oname", "Sara")
        before = total()
        check("glass checkout floats above the tab bar", J("(() => { const c = document.getElementById('checkout'), t = document.getElementById('tabbar'); return (getComputedStyle(c).backdropFilter || getComputedStyle(c).webkitBackdropFilter).includes('blur') && getComputedStyle(c).position === 'sticky'; })()"))
        shot("bag")
        page.click("#place")
        wait(1000)
        check("placing the order opens it", J("location.hash").startswith("#/order/"))
        code = J("document.getElementById('code').textContent")
        check("the order has a counter number", bool(re.fullmatch(r"\d{3}", code)), code)
        check("…with the bag's total to pay at the counter", str(f"{before:,}") in J("document.body.innerText") and "To pay at the counter" in J("document.body.innerText"))
        check("…and says where it goes", "table 7" in J("document.querySelector('.order-where').textContent") and "Sara" in J("document.querySelector('.order-where').textContent"))
        check("bag is empty once ordered", badge() == 0)
        check("the order counts down and steps along", J("document.querySelector('.steps li.now') !== null") and "min" in J("document.getElementById('eta').textContent"))
        check("a pushed screen gets a back button", not J("document.getElementById('bar-back').hidden"))
        shot("order")
        page.click("#bar-back")
        wait(700)
        check("back goes back", J("location.hash") == "#/bag")

        # ------------------------------------------------------------- profile
        goto("#/profile", 800)
        check("profile lists the order placed here", J("document.querySelectorAll('.orow').length") == 1)
        page.click("[data-again]")
        wait(600)
        check("Again puts it back in the bag", badge() >= 3, str(badge()))
        page.fill("#me-name", "Sara Karimi")
        wait(600)
        check("the room will see a first name and initial", "Sara K." in J("document.getElementById('me-sub').textContent"))
        page.click('.seg--vis [data-v="initials"]')
        wait(250)
        check("…or initials", "S. K." in J("document.getElementById('me-sub').textContent"))
        page.click('.seg--vis [data-v="hidden"]')
        wait(250)
        check("…or no one", "Hidden" in J("document.getElementById('me-sub').textContent"))
        page.click('.seg--vis [data-v="name"]')
        wait(250)
        check("no account, no sign-up — said plainly", "no account" in J("document.querySelector('.ph-sub').textContent"))

        # ------------------------------------------------------------ check-in
        goto("#/checkin", 800)
        n_before = J("+document.querySelector('#room-n b').textContent")
        check("check-in: the room is listed with its count", n_before == J("document.querySelectorAll('.person').length"), str(n_before))
        check("…and nothing asked before the tap", J("document.getElementById('stage').dataset.in") == "0" and J("document.getElementById('ci-more').hidden"))
        page.click("#disc")
        wait(1200)
        check("one tap checks you in", J("document.getElementById('stage').dataset.in") == "1" and J("document.getElementById('ci-btn').dataset.in") == "1")
        me = J("(() => { const r = document.querySelector('.person'); return r && r.classList.contains('person--me') ? r.querySelector('.person-n').textContent : ''; })()")
        check("you join the top of the room, as the room sees you", me.startswith("Sara K.") and "You" in me, me)
        check("the room counts you", J("+document.querySelector('#room-n b').textContent") == n_before + 1)
        check("your hour shows on the check-in button, as a ring", J("document.getElementById('ci-l').textContent") in ("60m", "59m") and J("getComputedStyle(document.querySelector('.ci-ring-fill')).opacity") == "1")
        page.click('#zones .pill[data-z="Banquette"]')
        wait(400)
        check("where you sit shows beside your name", "Banquette" in J("document.querySelector('.person--me .person-d').textContent"))
        page.click("#extend")
        wait(400)
        check("Another hour holds the seat", "Held until" in J("document.getElementById('toast-root').innerText"))
        shot("checkin")
        goto("#/", 1200)
        check("Home knows you're in", "You're checked in" in J("document.getElementById('hero-here').innerText") and "You're in" in J("document.querySelector('.room-cta').innerText"))
        goto("#/checkin", 700)
        page.click("#out")
        wait(600)
        check("Check out leaves the room", J("document.getElementById('stage').dataset.in") == "0" and J("+document.querySelector('#room-n b').textContent") == n_before)
        goto("#/profile", 600)
        page.click('.seg--vis [data-v="hidden"]')
        wait(250)
        goto("#/checkin", 600)
        page.click("#disc")
        wait(700)
        check("hidden: you are 'Someone' to the room", J("document.querySelector('.person--me .person-n').textContent").startswith("Someone") and "hidden" in J("document.getElementById('ci-foot').textContent"))
        page.click("#out")
        wait(300)

        # chrome derived from scroll is recomputed on navigation
        goto("#/menu", 700)
        J("scrollTo(0, 1400)")
        wait(500)
        solid_long = J("document.getElementById('bar').classList.contains('solid')")
        goto("#/order/none", 700)
        check("a short screen never inherits the bar a long one earned", solid_long and not J("document.getElementById('bar').classList.contains('solid')"))

        # ------------------------------------------------------------- no CRM
        seen = []
        for h in ["#/", "#/menu", "#/bag", "#/checkin", "#/profile"]:
            goto(h, 600)
            seen.append(J("document.body.innerText"))
        goto("#/menu", 600)
        page.click('.mrow[data-item="royal-breakfast"] .mrow-n')
        wait(600)
        seen.append(J("document.querySelector('.sheet').innerText"))
        page.keyboard.press("Escape")
        wait(500)
        hits = sorted({m.group(0).lower() for t in seen for m in CRM.finditer(t)})
        check("no CRM anywhere: no points, tiers, rewards, cashback, membership", not hits, str(hits))

        # ------------------------------------------------------- no Instagram
        # Ilya's instruction for this preview. Asserted three ways, because a
        # handle can come back as a link, as a word, or as the glyph alone.
        ig_words = [t for t in seen if re.search(r"instagram|@regnum", t, re.I)]
        ig_links = J("""[...document.querySelectorAll('a[href*="instagram"]')].map(a => a.href)""")
        check("no Instagram: not a link, not a handle, not a word", not ig_words and not ig_links, str(ig_links or "text"))

        # ------------------------------------------- the green stays out of the chrome
        # Their colour is for hover, focus and what is alive — not for the
        # interface. At rest, nothing structural may be stained. (The other half
        # of this rule — that hover DOES bring the green in — is checked on the
        # wide screen: the rule is gated on (hover: hover) and (pointer: fine),
        # so a touch context cannot see it, and must not.)
        goto("#/menu", 700)
        rest = J("""(() => {
          const g = (el, p) => getComputedStyle(el)[p];
          return { body: g(document.body, 'color'), chip: g(document.querySelector('.chip[aria-pressed="true"]'), 'backgroundColor'),
                   add: g(document.querySelector('.mrow .add'), 'backgroundColor'), row: g(document.querySelector('.mrow'), 'backgroundColor'),
                   lens: g(document.getElementById('tabs-lens'), 'backgroundColor') };
        })()""")
        stained = {k: v for k, v in rest.items() if greenish(v)}
        check("at rest the chrome is ink, not green", not stained, str(stained))

        # ------------------------------------------------------------ overflow
        for w in (390, 320):
            page.set_viewport_size({"width": w, "height": 740})
            wide = []
            for h in ["#/", "#/menu", "#/bag", "#/checkin", "#/profile"]:
                goto(h, 450)
                if J("document.documentElement.scrollWidth > innerWidth + 1"):
                    wide.append(h)
            check(f"no sideways scroll at {w} px", not wide, str(wide))
        page.set_viewport_size({"width": 390, "height": 844})

        # ------------------------------------------------------------ contrast
        goto("#/menu", 600)
        c = J(CONTRAST_JS, [["title", ".lt", "body"], ["sub", ".ph-sub", "body"], ["note", ".menu-note", "body"], ["desc", ".mrow-d", ".list"], ["price", ".mrow-p", ".list"]])
        check("light: text contrast ≥ 4.5:1", all(v and v >= 4.5 for v in c.values()), str(c))

        # ---------------------------------------------------------------- dark
        goto("#/profile", 600)
        page.click('.seg--theme [data-v="dark"]')
        wait(700)
        check("Dark turns the whole app to their green-black", J("document.documentElement.dataset.mode") == "dark" and J("getComputedStyle(document.body).backgroundColor") == "rgb(10, 12, 8)")
        # the first value data-mode ever takes, and how far the parser had got when it
        # took it: "dark:loading" means the inline head script did it, before any module
        page.add_init_script("""(() => { window.__early = null;
          const mark = () => { const d = document.documentElement; if (!window.__early && d && d.dataset.mode) window.__early = d.dataset.mode + ':' + document.readyState; };
          new MutationObserver(mark).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-mode'] });
          mark(); })()""")
        page.reload()
        page.wait_for_selector("#boot", state="detached", timeout=12000)
        early = J("window.__early")
        check("…and is dark from the first paint after a reload, before any module runs", early == "dark:loading", str(early))
        goto("#/menu", 700)
        c = J(CONTRAST_JS, [["title", ".lt", "body"], ["sub", ".ph-sub", "body"], ["desc", ".mrow-d", ".list"]])
        check("dark: text contrast ≥ 4.5:1", all(v and v >= 4.5 for v in c.values()), str(c))
        shot("dark-menu")
        goto("#/profile", 600)
        page.click('.seg--theme [data-v="system"]')
        wait(500)

        # --------------------------------------------------------------- clear
        page.click("#clear")
        wait(600)
        page.click(".sheet [data-yes]")
        wait(900)
        check("Clear everything empties this phone", badge() == 0 and J("document.getElementById('me-name').value") == "" and J("document.querySelectorAll('.orow').length") == 0)

        phone_errors = page.errors[:]
        ctx.close()

        # ------------------------------------------------------ reduced motion
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, user_agent=IPHONE, reduced_motion="reduce")
        pg = new_page(ctx, "reduced")
        pg.goto(BASE + Q + "#/")
        pg.wait_for_selector("#boot", state="detached", timeout=12000)
        try:
            pg.wait_for_function("(() => { const v = document.querySelector('.hero-video'); return v && !v.paused && v.currentTime > .4; })()", timeout=8000)
            ok = True
        except Exception:
            ok = False
        check("reduced motion never hides the reel", ok)
        phone_errors += pg.errors
        ctx.close()

        # ---------------------------------------------------------- wide screen
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        pg = new_page(ctx, "desktop")
        pg.goto(BASE + Q + "#/")
        pg.wait_for_selector("#boot", state="detached", timeout=12000)
        pg.wait_for_timeout(2600)
        dj = pg.evaluate
        check("wide: the tab bar moves to the top centre", dj("document.getElementById('tabbar').getBoundingClientRect().top < 40"))
        check("wide: check-in reads in words", "Check in" in dj("document.getElementById('ci-wide').innerText") and dj("getComputedStyle(document.getElementById('ci-wide')).display") != "none")
        fr = dj("(() => { const r = document.querySelector('.hero-frame').getBoundingClientRect(); return r.width / r.height; })()")
        check("wide: the portrait reel stands in its own frame, cut to the film", 0.68 < fr < 0.72, f"{fr:.3f}")
        wc = dj("(() => { const c = (r) => [r.left + r.width / 2, r.top + r.height / 2], [hx, hy] = c(document.querySelector('.hero').getBoundingClientRect()), [lx, ly] = c(document.querySelector('.hero-logo').getBoundingClientRect()), [fx, fy] = c(document.querySelector('.hero-frame').getBoundingClientRect()); return { logo_dx: +(lx - hx).toFixed(2), logo_dy: +(ly - hy).toFixed(2), film_dx: +(fx - hx).toFixed(2), film_dy: +(fy - hy).toFixed(2) }; })()")
        check("wide: the lockup and the film share the hero's exact centre", all(abs(v) < 1 for v in wc.values()), str(wc))
        check("wide: the room around it is lit by the reel", dj("document.querySelector('.hero-ambient').classList.contains('lit')"))
        check("wide: glass not inside a backdrop root", not dj(BACKDROP_ROOT_JS, ["#tabs", "#ci-btn", "#bar"]))
        check("wide: no sideways scroll", not dj("document.documentElement.scrollWidth > innerWidth + 1"))
        dj("location.hash = '#/menu'")
        pg.wait_for_timeout(800)
        add_rest = dj("getComputedStyle(document.querySelector('.mrow .add')).backgroundColor")
        row_rest = dj("getComputedStyle(document.querySelector('.mrow')).backgroundColor")
        pg.hover(".mrow")
        pg.wait_for_timeout(450)
        add_on = dj("getComputedStyle(document.querySelector('.mrow .add')).backgroundColor")
        row_on = dj("getComputedStyle(document.querySelector('.mrow')).backgroundColor")
        check("wide: hover brings their green in, on the row and its add button",
              greenish(add_on) and add_on != add_rest and row_on != row_rest, f"{add_rest} → {add_on}")
        pg.mouse.move(5, 5)
        pg.wait_for_timeout(250)
        dj("location.hash = '#/'")
        pg.wait_for_timeout(900)
        pg.screenshot(path=str(SHOTS / "e2e-desktop.png"))
        phone_errors += pg.errors

        if LIVE:
            try:
                pg.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller !== undefined", timeout=5000)
                pg.evaluate("navigator.serviceWorker.ready")
                pg.wait_for_timeout(2500)
                keys = pg.evaluate("caches.keys()")
                check("live: the offline worker installs its cache", any(k.startswith("regnum-") for k in keys), str(keys))
            except Exception as e:
                check("live: the offline worker installs its cache", False, str(e).splitlines()[0])
        ctx.close()
        browser.close()

    check("no console errors anywhere", not phone_errors, "; ".join(phone_errors[:4]))

    print(f"\n{len(PASS)} passed, {len(FAIL)} failed  —  {BASE}")
    for f in FAIL:
        print("  FAIL", f)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
