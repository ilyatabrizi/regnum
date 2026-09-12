#!/usr/bin/env python3
"""Contrast audit: every run of text on every screen, in both themes.

Walks the rendered DOM, resolves each text node's own colour against the first
ancestor that actually paints a background, and reports anything under WCAG AA
for its size. Written after the rename from KAIRO's fixed navy to REGNUM's
--ink turned four permanently-white chips into cream-on-white; a token that
flips with the theme under a surface that does not is the bug class this
catches.

    python3 scripts/contrast.py [base-url]
"""
import sys
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8201/").rstrip("/") + "/"
ROUTES = ["/", "/menu", "/bag", "/checkin", "/profile"]

JS = r"""
() => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * r + .7152 * g + .0722 * b;
  };
  const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  // The ground a run of text is read against, or null when nothing flat is behind
  // it. A photograph, a gradient, glass over a moving reel — their contrast is a
  // matter of art direction (a scrim, a shadow), not of a pair of tokens, and
  // resolving them to the page's paper would report a wall of white-on-white that
  // is not there. Those are skipped and counted instead.
  const bgOf = (el) => {
    let acc = null;
    for (let n = el; n; n = n.parentElement) {
      const st = getComputedStyle(n);
      if (st.backgroundImage !== "none" || st.backdropFilter !== "none" || st.webkitBackdropFilter !== "none") return null;
      const c = parse(st.backgroundColor);
      if (c.length && (c[3] ?? 1) > .92) return acc ? over(acc, c) : c.slice(0, 3);
      if (c.length && (c[3] ?? 0) > .04) acc = acc || c;
    }
    return [255, 255, 255];
  };
  const out = []; let skipped = 0;
  for (const el of document.querySelectorAll("body *")) {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (!txt) continue;
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || st.visibility === "hidden" || +st.opacity < .35) continue;
    const bg = bgOf(el);
    if (!bg) { skipped++; continue; }
    const size = parseFloat(st.fontSize), weight = +st.fontWeight || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const c = ratio(over(parse(st.color), bg), bg);
    if (c < (large ? 3 : 4.5)) out.push({ t: txt.slice(0, 44), c: +c.toFixed(2), size, weight, sel: el.className || el.tagName });
  }
  return { out, skipped };
}
"""

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    bad = skipped = 0
    for scheme in ("light", "dark"):
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme=scheme)
        pg = ctx.new_page()
        pg.goto(BASE + "?nosw#/")
        pg.wait_for_selector("#boot", state="detached", timeout=12000)
        for r in ROUTES:
            pg.evaluate("h => { location.hash = h }", "#" + r)
            pg.wait_for_timeout(700)
            res = pg.evaluate(JS)
            skipped += res["skipped"]
            for f in res["out"]:
                bad += 1
                print(f"  {scheme:5} {r:9} {f['c']:5}:1  {f['size']:.0f}px/{f['weight']}  {f['t']!r}  .{f['sel']}")
        ctx.close()
    b.close()
    print(f"contrast: all text on a flat ground passes AA ({skipped} runs over photos/glass not judged)"
          if not bad else f"contrast: {bad} below AA ({skipped} over photos/glass not judged)")
