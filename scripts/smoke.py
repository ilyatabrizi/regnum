#!/usr/bin/env python3
"""Quick visual pass: every screen on a phone, light and dark, and the wide layout.

    python3 scripts/smoke.py [base-url]      # default http://localhost:8201/

Shoots scripts/shots/smoke-*.png, stitches two contact sheets, and prints every
console error or failed step. e2e.py is the real suite; this is for looking.
"""
import pathlib
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8201/").rstrip("/") + "/"
OUT = pathlib.Path(__file__).resolve().parent / "shots"
OUT.mkdir(parents=True, exist_ok=True)
IPHONE = ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
          "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")
Q = "" if "github.io" in BASE else "?nosw"

errors, shots = [], []


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True, args=["--autoplay-policy=no-user-gesture-required"])

        def listen(pg, tag):
            pg.on("pageerror", lambda e: errors.append(f"[{tag}] pageerror: {e}"))
            pg.on("console", lambda m: errors.append(f"[{tag}] console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)

        def phone(scheme="light"):
            ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True,
                                has_touch=True, user_agent=IPHONE, color_scheme=scheme)
            pg = ctx.new_page()
            listen(pg, scheme)
            return ctx, pg

        def snap(pg, name):
            path = OUT / f"smoke-{name}.png"
            pg.screenshot(path=str(path))
            shots.append(path)

        def go(pg, h, ms=800):
            pg.evaluate("h => { location.hash = h }", h)
            pg.wait_for_timeout(ms)

        def step(name, fn):
            try:
                fn()
            except Exception as e:  # keep going: one broken screen should not hide the rest
                errors.append(f"step {name}: {str(e).splitlines()[0]}")

        def open_app(pg, wait=1800):
            pg.goto(BASE + Q + "#/")
            pg.wait_for_selector("#boot", state="detached", timeout=12000)
            pg.wait_for_timeout(wait)

        ctx, pg = phone()
        step("home", lambda: (open_app(pg), snap(pg, "01-home")))
        for i, y in enumerate([760, 1500, 2240, 2980]):
            step(f"home-{i}", lambda y=y, i=i: (pg.evaluate(f"scrollTo(0,{y})"), pg.wait_for_timeout(800), snap(pg, f"02-home-{i}")))
        step("menu", lambda: (go(pg, "#/menu"), snap(pg, "03-menu")))
        step("add", lambda: (pg.click('.mrow[data-item="latte"] .add'), pg.wait_for_timeout(900), snap(pg, "04-menu-added")))
        step("sheet", lambda: (pg.click('.mrow[data-item="royal-breakfast"] .mrow-n'), pg.wait_for_timeout(900), snap(pg, "05-item-sheet")))
        step("sheet-add", lambda: (pg.click("#it-go"), pg.wait_for_timeout(900)))
        step("bag", lambda: (go(pg, "#/bag"), snap(pg, "06-bag")))
        step("bag-bottom", lambda: (pg.evaluate("scrollTo(0, document.body.scrollHeight)"), pg.wait_for_timeout(600), snap(pg, "07-bag-bottom")))
        step("order", lambda: (pg.click("#place"), pg.wait_for_timeout(1400), snap(pg, "08-order")))
        step("checkin", lambda: (go(pg, "#/checkin"), snap(pg, "09-checkin")))
        step("tap-in", lambda: (pg.click("#disc"), pg.wait_for_timeout(1600), snap(pg, "10-checked-in")))
        step("room", lambda: (pg.evaluate("scrollTo(0, 560)"), pg.wait_for_timeout(600), snap(pg, "11-room")))
        step("profile", lambda: (go(pg, "#/profile"), snap(pg, "12-profile")))
        step("home-in", lambda: (go(pg, "#/", 1500), snap(pg, "12b-home-checked-in")))
        ctx.close()

        ctx, pg = phone("dark")
        step("dark-home", lambda: (open_app(pg, 1500), pg.evaluate("scrollTo(0, 900)"), pg.wait_for_timeout(900), snap(pg, "13-dark-home")))
        step("dark-menu", lambda: (go(pg, "#/menu"), snap(pg, "14-dark-menu")))
        step("dark-checkin", lambda: (go(pg, "#/checkin"), snap(pg, "15-dark-checkin")))
        step("dark-profile", lambda: (go(pg, "#/profile"), snap(pg, "15b-dark-profile")))
        ctx.close()

        ctx = b.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()
        listen(pg, "desktop")
        step("desk-home", lambda: (open_app(pg, 2600), snap(pg, "16-desk-home")))
        step("desk-home-2", lambda: (pg.evaluate("scrollTo(0, 940)"), pg.wait_for_timeout(1000), snap(pg, "17-desk-home-2")))
        step("desk-menu", lambda: (go(pg, "#/menu"), snap(pg, "18-desk-menu")))
        step("desk-checkin", lambda: (go(pg, "#/checkin"), snap(pg, "19-desk-checkin")))
        ctx.close()
        b.close()

    phones = [s for s in shots if "desk" not in s.name]
    desks = [s for s in shots if "desk" in s.name]
    if phones:
        tw, th, cols = 300, 649, 6
        sheet = Image.new("RGB", (cols * (tw + 8) + 8, ((len(phones) + cols - 1) // cols) * (th + 8) + 8), "white")
        for i, s in enumerate(phones):
            im = Image.open(s).convert("RGB").resize((tw, th), Image.LANCZOS)
            sheet.paste(im, (8 + (i % cols) * (tw + 8), 8 + (i // cols) * (th + 8)))
        sheet.save(OUT / "smoke-sheet-phone.jpg", quality=84)
    if desks:
        tw, th = 720, 450
        sheet = Image.new("RGB", (2 * (tw + 8) + 8, ((len(desks) + 1) // 2) * (th + 8) + 8), "white")
        for i, s in enumerate(desks):
            im = Image.open(s).convert("RGB").resize((tw, th), Image.LANCZOS)
            sheet.paste(im, (8 + (i % 2) * (tw + 8), 8 + (i // 2) * (th + 8)))
        sheet.save(OUT / "smoke-sheet-desk.jpg", quality=84)
    print(f"{len(shots)} shots → {OUT}")
    print("\n".join(errors) if errors else "no console errors, no failed steps")


if __name__ == "__main__":
    main()
