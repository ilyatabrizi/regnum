# REGNUM Café & Restaurant — PWA preview

A working, installable preview of an app for REGNUM Café & Restaurant in Tabriz:
their reel as the hero, their own photographs through the menu, a bag that ends
at the counter, and a live view of who is in the room. Built by Alpha Agency on
REGNUM's own material.

- Local: `python3 serve.py` → http://localhost:8201
- Checks: `python3 e2e.py` — 120, all passing

Install it from the browser's share sheet and it opens full screen, offline, with
their mark on the Home Screen.

---

## What it does

| | |
|---|---|
| Their reel as the hero | 24 s, looping, muted, full-bleed on a phone; on a wide screen it stands in a tall frame and lights the room around it |
| Their photographs | 19 crops of the four frames they sent — 16 menu items carry a real photograph, the rest a drawn glyph |
| Their logo | Traced to vector from the PNG: `assets/brand/regnum.svg`, `js/brand.js` — mark, word and line as three paths |
| Menu | 7 sections, 43 items, search, chips that filter, one tap to add |
| Item sheet | Size, milk, eggs, sweetness — priced live |
| Bag → order | At the table or to take away; ends at a cashier code with a prep countdown. **Nothing is paid in the app.** |
| Check in | One tap, holds an hour, then lets go by itself. See who else is in, and where they are sitting |
| Profile | Name, how the room sees you, light/dark/system, past orders, add to Home Screen |
| No account | Everything is kept on the phone. No sign-up, no CRM, no points |

---

## What is REGNUM's, what is ours

**REGNUM's:** the name and lockup, Tabriz, the 24 s room reel, and the four
photographs (the breakfast tray, two of the brunch table, the three drinks on
green marble).

**Ours, and placeholder until REGNUM confirms:** every menu name, description and
price; the opening hours; the seating areas (Window, Banquette, Counter, Terrace,
Upstairs); the prep time on the order screen. Each is marked `PREVIEW` in
`js/config.js` and `js/data.js`, and named under *Open items* below.

**Deliberately absent:** Instagram. No handle, no link, no icon, on any screen —
Ilya's instruction for this preview, and `e2e.py` fails the build if one appears.

---

## The design

Stone and ink. The page is the colour of the marble their counters are cut from
(`#F2EFE7`); the ink is the warm near-black of the table their drinks stand on
(`#13150F`). Dark mode is the green-black of that same marble, `#0A0C08`, with
cream doing what ink does by day.

**Their green, `#46653C`, is not the colour of the interface.** It is the leaf
green of the banquettes in their own reel, and it is held back for two jobs:

1. **What the hand is on** — hover, press, focus ring, text selection. A row
   tints, its add button fills, a primary button turns green under the cursor.
2. **What is alive right now** — the live dot, the room count, the hour you have
   left on the check-in ring.

Everything a green brand usually stains — buttons at rest, tabs, links, headings,
tiles, the check-in disc itself — is ink. The photographs and the reel carry the
colour instead. `e2e.py` asserts both halves: nothing structural is green at
rest, and hover brings it in.

Display type is **Jost**, the open face built on the same rounded geometry as
their own lettering, set light at 300 so a large title stays quiet beside the
photographs. Everything that works is the phone's own UI face, as on iOS.

Glass is iOS's: a small blur with a big saturation lift, clamped with brightness
so type holds over anything passing under it. Over the reel it turns dark; over
the page it is the theme's own.

---

## Layout

Four tabs on one capsule of glass — Home · Menu · Bag · Profile — with **check-in
as its own round button beside them**, because it is a standing action rather
than a place. The lens under the current tab slides on a spring and follows a
dragged finger; the capsule folds to the current tab when you scroll down a long
page; tapping the current tab returns to the top.

---

## Build

```
python3 scripts/fetch_fonts.py     # Jost, subset to the glyphs the UI can render — 24 KB
python3 scripts/build_assets.py    # photos, reel, logo, icons from ~/Projects/REGNUM
python3 build.py                   # inline the opening, preload modules, stamp the worker
```

`build.py` must run before every deploy: it inlines the lockup into `index.html`
so the opening screen paints with the first byte, writes a `modulepreload` for
every module (ES imports are otherwise discovered one level per round trip),
rebuilds the service worker's file lists from disk, and content-hashes all of it
into one version stamp.

Two things worth knowing about the source material:

- **The reel carries their own watermark** at the foot of every frame. It is
  cropped off — 720×1280 → 720×1032. Measure that extent over the whole lower
  third of the frame: a window that starts at y=1080 will report the mark as
  starting at 1080, and the first cut left its top 24 rows in the film.
- **Two of the four photographs** carry an Instagram carousel arrow burnt into
  the left edge around y=657. Every crop that reaches that side starts past it.

---

## Checks

```
python3 e2e.py                                          # local, :8201
python3 e2e.py https://ilyatabrizi.github.io/regnum/    # a deployed build
python3 scripts/smoke.py                                # every screen, light/dark/wide → contact sheets
python3 scripts/contrast.py                             # every run of text, both themes, against WCAG AA
```

`e2e.py` drives the system Chrome as a phone through everything a customer would
do. Beyond the obvious it proves: the reel **visibly moves** (pixel diff, not
`play()` state) and carries no audio track; the glass is never inside a
transformed ancestor, which would leave it blurring nothing; no CRM vocabulary
anywhere; no Instagram anywhere; the green stays out of the chrome and arrives on
hover; and the three hash-router traps (stacked listeners on a re-used view,
same-hash navigation firing no event, scroll-derived chrome not recomputed on
navigation).

`scripts/contrast.py` resolves every text run against the first ancestor that
actually paints a flat background and reports anything under AA. Text over a
photograph or over glass is counted and skipped — its legibility is a matter of
art direction, not of two tokens.

---

## Open items — what REGNUM needs to send

1. **The menu** — real names, descriptions and prices. All 43 items are ours.
2. **Opening hours.** Currently Sat–Thu 08:00–24:00, Fri 09:00–24:00.
3. **Address and phone.** The app says "Tabriz" and nothing more.
4. **Seating areas** — the five in the check-in screen are invented.
5. **More photographs.** Four frames is thin for a restaurant of this size;
   nineteen crops is the most that can honestly be drawn from them.
6. **A decision on language.** The app is English. Their own material is mixed.
7. **Check-in presence** is a demo room generated from the clock. Setting
   `CHECKIN.endpoint` in `js/config.js` switches it to a shared room with no
   other change; the contract is one GET and one POST of `{id, name, zone, until}`.

Nothing here has been sent to the client.

---

## Files

```
index.html            the shell; the opening screen is inlined by build.py
css/app.css           the whole design system, one file
js/app.js             routes, the two bars, what scroll decides
js/views/*.js         home, menu, bag, order, checkin, profile
js/tabbar.js          the glass capsule: lens, drag, fold
js/hero.js            the reel — autoplay recovery, ambient light on wide screens
js/presence.js        who is in the room, and the demo roster behind it
js/brand.js           GENERATED — their lockup as three paths
js/photos.js          GENERATED — every photo's size and average tone
js/reel.js            GENERATED — the hero reel's source, poster and placeholder
scripts/build_assets.py   photos, reel, logo, icons from ~/Projects/REGNUM
scripts/fetch_fonts.py    Jost, subset
scripts/smoke.py          every screen, light/dark/wide → contact sheets
scripts/contrast.py       WCAG AA audit of every text run, both themes
e2e.py                120 checks
build.py              run before every deploy
serve.py              local server, :8201, with byte ranges for the reel
```

Source material stays in `~/Projects/REGNUM/` and is only ever read.
