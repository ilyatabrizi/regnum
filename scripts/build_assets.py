#!/usr/bin/env python3
"""Everything REGNUM supplied, turned into what the app ships.

The source folder is Ilya's (~/Projects/REGNUM) and is only ever read.

  photos  four frames of their food. Each is full-bleed, so the work is choosing
          crops: the whole frame for a band, and the single dishes inside it for
          the menu. Two of the four carry an Instagram carousel arrow burnt into
          the left edge around y=657 — every crop that reaches that side starts
          past it. Each lands as WebP at 1100 and 550 wide, and js/photos.js
          records its size and average tone.
  reel    their 24 s room reel — banquettes, the counter, tea going out on a
          tray, the gold sign. It never fades, so the hero loops all of it. The
          bottom 248 px carry their own watermark, which would land under the
          hero's own wordmark, so the frame is cropped to 720×1032 first. Measure
          that extent over the whole lower third: a window starting at y=1080
          reports the mark as starting at 1080, and the first cut left its top
          24 rows in the film.
          H.264, no audio track, faststart, plus poster.webp (its exact first
          frame) and an 18×28 placeholder in js/reel.js.
  logo    the lockup PNG traced from its alpha at the 50 % edge. It parts into
          three bands of rows with nothing between them — the mark at 71–922,
          REGNUM at 956–1127, CAFÉ & RESTAURANT at 1165–1223 — so each becomes
          its own path and the app can show the mark alone, the word alone, or
          all three. The trace is re-rasterised and compared with the source;
          the script fails if they disagree.
  icons   app icons, favicon and the link-preview card, from the same alpha.

    python3 scripts/build_assets.py              # everything
    python3 scripts/build_assets.py logo icons   # just those
"""
import base64
import io
import json
import pathlib
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path.home() / "Projects" / "REGNUM"
LOGO = SRC / "ChatGPT Image Sep 10, 2026 at 04_26_30 PM.png"
REEL_SRC = SRC / "lZWP6ISoHoij6w.mp4"

# Their room, in two values: the leaf green of the banquettes and the warm
# near-black of the marble the drinks stand on. Both are medians of the frames.
GREEN = (70, 101, 60)       # #46653C
NIGHT = (10, 12, 9)         # #0A0C09
NIGHT_TOP = (17, 23, 17)    # a lift at the top edge, so the icon reads as glass rather than paint

# The three bands of the lockup, as row ranges in the source PNG.
BANDS = {"mark": (0, 940), "word": (940, 1150), "tag": (1150, 4000)}


def shot(t):
    return SRC / f"Screenshot 1405-06-19 at {t}.png"


# ------------------------------------------------------------------- photos
# name, source, crop box (x0, y0, x1, y1) or None for the whole frame.
PHOTOS = [
    # the tea service — their Persian breakfast tray
    ("tea-service", "16.21.08", None),
    ("tea-pot", "16.21.08", (0, 430, 470, 900)),
    ("buns", "16.21.08", (130, 70, 630, 560)),
    ("skillet-pizza", "16.21.08", (600, 350, 908, 680)),
    ("sweet-box", "16.21.08", (260, 580, 850, 1150)),
    # the brunch table, close
    ("brunch", "16.21.19", None),
    ("french-toast", "16.21.19", (0, 250, 540, 590)),
    ("pizza", "16.21.19", (570, 150, 908, 470)),
    ("omelette", "16.21.19", (370, 460, 908, 1110)),
    # the brunch table, wide
    ("table", "16.21.31", None),
    ("berry-toast", "16.21.31", (310, 505, 730, 870)),
    ("halva-cake", "16.21.31", (215, 890, 730, 1255)),
    ("breakfast-plate", "16.21.31", (245, 185, 710, 530)),
    ("pancakes", "16.21.31", (690, 45, 918, 310)),
    ("salad", "16.21.31", (70, 545, 350, 975)),
    # the drinks, on their green marble
    ("drinks", "16.21.55", None),
    ("red-drink", "16.21.55", (45, 520, 340, 1045)),
    ("mango-drink", "16.21.55", (340, 470, 640, 930)),
    ("blue-drink", "16.21.55", (610, 720, 900, 1135)),
]
EDGE = 2  # a screenshot can carry a hairline of the phone's UI at its frame


def photos():
    out = ROOT / "assets" / "photos"
    out.mkdir(parents=True, exist_ok=True)
    meta = {}
    for name, src, box in PHOTOS:
        im = Image.open(shot(src)).convert("RGB")
        w, h = im.size
        im = im.crop(box) if box else im.crop((EDGE, EDGE, w - EDGE, h - EDGE))
        cw, ch = im.size
        for suffix, width, q in (("", 1100, 80), ("-sm", 550, 74)):
            tw = min(width, cw)
            th = round(ch * tw / cw)
            frame = im.resize((tw, th), Image.LANCZOS) if tw != cw else im.copy()
            if tw < cw:
                frame = frame.filter(ImageFilter.UnsharpMask(radius=0.8, percent=30, threshold=2))
            frame.save(out / f"{name}{suffix}.webp", "WEBP", quality=q, method=6)
        r, g, b = im.resize((1, 1), Image.BOX).getpixel((0, 0))
        tone = "#%02x%02x%02x" % (int(r * .8), int(g * .8), int(b * .8))
        big = min(1100, cw)
        meta[name] = {"w": big, "h": round(ch * big / cw), "tone": tone}
        print(f"  photo {name:16} {cw}x{ch} → {big}x{meta[name]['h']}  tone {tone}")
    (ROOT / "js" / "photos.js").write_text(
        "// GENERATED by scripts/build_assets.py — every photo's size and average tone.\n"
        "// The tone paints the frame until the image has pixels.\n"
        "export const PHOTOS = " + json.dumps(meta, indent=2) + ";\n", encoding="utf-8")


# --------------------------------------------------------------------- reel
REEL_LEN = 24.0
REEL_W, REEL_H = 720, 1032     # the source, less the 248 px of watermark at its foot


def ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def reel():
    out = ROOT / "assets" / "video"
    out.mkdir(parents=True, exist_ok=True)
    ff = ffmpeg()
    mp4 = out / "hero.mp4"
    subprocess.run([ff, "-hide_banner", "-loglevel", "error", "-y", "-i", str(REEL_SRC),
                    "-an", "-vf", f"crop={REEL_W}:{REEL_H}:0:0,format=yuv420p",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "27",
                    "-profile:v", "high", "-level", "4.0", "-g", "60", "-keyint_min", "30",
                    "-movflags", "+faststart", str(mp4)], check=True)
    png = out / "_poster.png"
    subprocess.run([ff, "-hide_banner", "-loglevel", "error", "-y", "-i", str(mp4),
                    "-frames:v", "1", str(png)], check=True)
    im = Image.open(png).convert("RGB")
    png.unlink()
    im.save(out / "poster.webp", "WEBP", quality=72, method=6)
    tiny = im.resize((18, 28), Image.BOX)
    buf = io.BytesIO()
    tiny.save(buf, "JPEG", quality=72)
    lqip = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    probe = subprocess.run([ff, "-hide_banner", "-i", str(mp4)], capture_output=True, text=True).stderr
    if "Audio:" in probe:
        raise SystemExit("reel still carries an audio track")
    (ROOT / "js" / "reel.js").write_text(
        "// GENERATED by scripts/build_assets.py — the hero reel.\n"
        "// Their 24 s room reel, cropped past the watermark at its foot. No audio.\n"
        "export const REEL = " + json.dumps({
            "src": "assets/video/hero.mp4", "poster": "assets/video/poster.webp",
            "w": REEL_W, "h": REEL_H, "seconds": REEL_LEN, "lqip": lqip}, indent=2) + ";\n", encoding="utf-8")
    kb = mp4.stat().st_size / 1024
    print(f"  reel  hero.mp4 {kb:.0f} KB, {REEL_LEN}s, {REEL_W}×{REEL_H}, no audio; "
          f"poster {(out / 'poster.webp').stat().st_size / 1024:.0f} KB")


# --------------------------------------------------------------------- logo
M = 8  # margin around the ink in the traced viewBox, in source pixels


def alpha():
    return np.asarray(Image.open(LOGO))[..., 3]


def glyphs():
    """Every ink contour, simplified, sorted into the three bands of the lockup.

    The source has nothing at all on rows 923–955 and 1128–1164, so a contour's
    own top edge says which band it belongs to with no ambiguity to resolve."""
    mask = (alpha() >= 128).astype(np.uint8) * 255
    contours, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    hier = hier[0]
    bands = {k: [] for k in BANDS}
    for i, c in enumerate(contours):
        parent = hier[i][3]
        top = cv2.boundingRect(contours[i if parent == -1 else parent])[1]
        band = next(k for k, (a, b) in BANDS.items() if a <= top < b)
        poly = cv2.approxPolyDP(c, 0.6, True).reshape(-1, 2)
        if len(poly) >= 3:
            bands[band].append(poly)
    return mask, bands


def bbox(polys):
    pts = np.concatenate(polys)
    return int(pts[:, 0].min()), int(pts[:, 1].min()), int(pts[:, 0].max()) + 1, int(pts[:, 1].max()) + 1


def path_d(polys, ox, oy):
    """Relative, integer, implicit-command path — a dense polygon is exact at any
    size the app shows the logo, and costs less than curves of the same fidelity."""
    parts = []
    for poly in polys:
        x, y = int(poly[0][0]) - ox, int(poly[0][1]) - oy
        seg = [f"M{x} {y}l"]
        nums = []
        px, py = x, y
        for qx, qy in poly[1:]:
            qx, qy = int(qx) - ox, int(qy) - oy
            nums += [qx - px, qy - py]
            px, py = qx, qy
        s = ""
        for n in nums:
            s += (str(n) if n < 0 or not s else " " + str(n))
        seg.append(s + "z")
        parts.append("".join(seg))
    return "".join(parts)


def logo():
    mask, bands = glyphs()
    allp = bands["mark"] + bands["word"] + bands["tag"]
    x0, y0, x1, y1 = bbox(allp)
    ox, oy = x0 - M, y0 - M
    vw, vh = (x1 - x0) + 2 * M, (y1 - y0) + 2 * M

    def view(polys):
        a, b, c, d = bbox(polys)
        return f"{a - ox - M} {b - oy - M} {c - a + 2 * M} {d - b + 2 * M}"

    d_mark, d_word, d_tag = (path_d(bands[k], ox, oy) for k in ("mark", "word", "tag"))
    mark_vb, word_vb = view(bands["mark"]), view(bands["word"] + bands["tag"])

    # re-rasterise the simplified outline and hold it against the source
    canvas = np.zeros_like(mask)
    cv2.fillPoly(canvas, [p.astype(np.int32) for p in allp], 255)
    a, b = canvas > 0, mask > 0
    iou = (a & b).sum() / (a | b).sum()
    if iou < 0.975:
        raise SystemExit(f"trace disagrees with the source (IoU {iou:.4f})")

    ink = "#%02x%02x%02x" % NIGHT
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}" role="img" aria-label="REGNUM Café &amp; Restaurant">'
           f'<path fill="{ink}" fill-rule="evenodd" d="{d_mark}"/>'
           f'<path fill="{ink}" fill-rule="evenodd" d="{d_word}"/>'
           f'<path fill="{ink}" fill-rule="evenodd" d="{d_tag}"/></svg>\n')
    (ROOT / "assets" / "brand").mkdir(parents=True, exist_ok=True)
    (ROOT / "assets" / "brand" / "regnum.svg").write_text(svg, encoding="utf-8")
    js = f"""// GENERATED by scripts/build_assets.py from their lockup PNG — do not edit.
// Traced from the alpha at the 50 % edge. The lockup parts into three bands of
// rows with nothing between them, so the mark, the word and the line under it
// are three paths in one coordinate space: the bar can show the word alone, the
// check-in disc the mark alone, the opening screen all three.

export const LOGO_VIEWBOX = "0 0 {vw} {vh}";
export const MARK_VIEWBOX = "{mark_vb}";
export const WORD_VIEWBOX = "{word_vb}";
export const MARK_D = "{d_mark}";
export const WORD_D = "{d_word}";
export const TAG_D = "{d_tag}";

/**
 * Their lockup in currentColor.
 *   part "full"  the mark, the word and the line under it
 *   part "word"  REGNUM · CAFÉ & RESTAURANT, without the mark
 *   part "mark"  the doorway and its roots, alone
 */
export const logo = ({{ part = "full", cls = "", label = "REGNUM Café & Restaurant" }} = {{}}) => {{
  const vb = part === "mark" ? MARK_VIEWBOX : part === "word" ? WORD_VIEWBOX : LOGO_VIEWBOX;
  const paths =
    (part === "word" ? "" : `<path class="logo-mark" fill-rule="evenodd" d="${{MARK_D}}"/>`) +
    (part === "mark" ? "" : `<path class="logo-word" fill-rule="evenodd" d="${{WORD_D}}"/>` +
                            `<path class="logo-tag" fill-rule="evenodd" d="${{TAG_D}}"/>`);
  return `<svg class="logo${{cls ? " " + cls : ""}}" viewBox="${{vb}}" fill="currentColor" role="img" aria-label="${{label}}" focusable="false">${{paths}}</svg>`;
}};
"""
    (ROOT / "js" / "brand.js").write_text(js, encoding="utf-8")
    pts = sum(len(p) for p in allp)
    print(f"  logo  {len(allp)} contours, {pts} points, IoU {iou:.4f}, "
          f"path {len(d_mark) + len(d_word) + len(d_tag)} bytes, viewBox {vw}×{vh}")


# -------------------------------------------------------------------- icons
def gradient(size):
    t = np.linspace(0, 1, size)[:, None, None]
    top, bot = np.array(NIGHT_TOP, float), np.array(NIGHT, float)
    rows = top * (1 - t) + bot * t
    return Image.fromarray(np.repeat(rows, size, axis=1).astype(np.uint8), "RGB")


def band_alpha(which):
    """The source alpha, cropped to one band of the lockup (or the mark + word)."""
    _, bands = glyphs()
    polys = sum((bands[k] for k in (which if isinstance(which, tuple) else (which,))), [])
    x0, y0, x1, y1 = bbox(polys)
    return Image.fromarray(alpha()).crop((x0, y0, x1, y1))


def stamp(size, height_frac, which="mark", grow=0):
    """The mark, white, centred on their night. Sized by HEIGHT: the mark is
    nearly square and the word is a long ribbon, so width would not compare.

    `grow` dilates the alpha before it is scaled down. The mark is drawn in
    hairlines; at favicon size they fall below a pixel and resample to grey mush,
    so the favicon is thickened first and only then reduced."""
    a = band_alpha(which)
    if grow:
        a = Image.fromarray(cv2.dilate(np.asarray(a), np.ones((grow, grow), np.uint8)))
    th = round(size * height_frac)
    tw = round(a.width * th / a.height)
    a = a.resize((tw, th), Image.LANCZOS)
    bg = gradient(size)
    white = Image.new("RGB", (tw, th), (255, 255, 255))
    bg.paste(white, ((size - tw) // 2, (size - th) // 2), a)
    return bg


def icons():
    out = ROOT / "assets" / "icons"
    out.mkdir(parents=True, exist_ok=True)
    for name, size, frac in (("icon-512", 512, .60), ("icon-192", 192, .60), ("apple-touch-icon", 180, .58)):
        stamp(size, frac).save(out / f"{name}.png", optimize=True)
    # maskable: the safe zone is the centred circle of 80 % — the mark must sit well inside it
    stamp(512, .46).save(out / "maskable-512.png", optimize=True)
    stamp(32, .80, grow=9).save(out / "favicon-32.png", optimize=True)

    # the card a shared link unfurls into: a frame of theirs on the left, the lockup on their night
    og = Image.new("RGB", (1200, 630), NIGHT)
    ph = Image.open(ROOT / "assets" / "photos" / "drinks.webp").convert("RGB")
    s = 630 / ph.height
    ph = ph.resize((round(ph.width * s), 630), Image.LANCZOS)
    cx = max(0, (ph.width - 520) // 2)
    og.paste(ph.crop((cx, 0, cx + 520, 630)), (0, 0))
    a = band_alpha(("mark", "word", "tag"))
    th = 430
    tw = round(a.width * th / a.height)
    a = a.resize((tw, th), Image.LANCZOS)
    og.paste(Image.new("RGB", (tw, th), (255, 255, 255)), (520 + (680 - tw) // 2, (630 - th) // 2), a)
    og.save(ROOT / "assets" / "og.jpg", "JPEG", quality=84, optimize=True, progressive=True)
    print("  icons 512 / 192 / 180 / maskable / favicon, og.jpg 1200×630")


TASKS = {"photos": photos, "reel": reel, "logo": logo, "icons": icons}

if __name__ == "__main__":
    for name in (sys.argv[1:] or list(TASKS)):
        TASKS[name]()
