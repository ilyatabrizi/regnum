// The tab bar: four tabs on a floating capsule of glass, and check-in beside it
// as its own round button — the way iOS sets an app's one standing action apart
// from its places.
//
// - The lens (the brighter capsule under the current tab) slides between tabs on
//   a spring, and follows a finger dragged along the bar; letting go lands on the
//   nearest tab.
// - Scrolling down a long page folds the bar to the current tab alone; scrolling
//   back up, tapping it, or going anywhere opens it again.
// - Over the hero reel the glass turns dark so its type stays white; over the page
//   it is the theme's own glass.
// - The check-in button counts the room, and once you are in it draws your hour
//   as a ring that empties.

import { $, $$, clamp, minsLeft } from "./util.js";
import { CHECKIN } from "./config.js";
import { icon } from "./icons.js";
import { haptic, replay } from "./motion.js";
import { bagCount, subscribe as onStore } from "./store.js";
import * as presence from "./presence.js";

const TAB_FOR = { "/": "home", "/menu": "menu", "/bag": "bag", "/order": "bag", "/profile": "profile" };

const bar = $("#tabbar");
const caps = $("#tabs");
const lens = $("#tabs-lens");
const row = $("#tabs-row");
const tabs = $$(".tab", row);
const ci = $("#ci-btn");
const narrow = matchMedia("(max-width: 899px)");

let active = null;
let minimized = false;

/* ------------------------------------------------------------------- lens */
function place() {
  const i = tabs.findIndex((t) => t.dataset.tab === active);
  bar.dataset.active = i;
  if (i < 0) { bar.classList.add("no-lens"); return; }
  bar.classList.remove("no-lens");
  const t = tabs[i];
  const shift = minimized ? -t.offsetLeft : 0;
  bar.style.setProperty("--row-x", `${shift}px`);
  bar.style.setProperty("--lens-x", `${t.offsetLeft + shift}px`);
  bar.style.setProperty("--lens-w", `${t.offsetWidth}px`);
  bar.style.setProperty("--min-w", `${t.offsetWidth}px`);
  bar.dataset.ready = "1";
}

export function paintTabs(path) {
  const root = "/" + (path.split("/")[1] || "");
  active = TAB_FOR[root] ?? null;
  tabs.forEach((t) => t.setAttribute("aria-current", t.dataset.tab === active ? "page" : "false"));
  ci.setAttribute("aria-current", root === "/checkin" ? "page" : "false");
  place();
}

/* ------------------------------------------------------------ fold on scroll */
function setMin(on) {
  if (on === minimized) return;
  if (on && (!narrow.matches || !active || document.documentElement.scrollHeight - innerHeight < 700)) return;
  minimized = on;
  bar.classList.toggle("min", on);
  place();
}
export const expand = () => setMin(false);

let lastY = scrollY, run = 0;
addEventListener("scroll", () => {
  const y = scrollY, dy = y - lastY;
  lastY = y;
  if (y < 120) { run = 0; setMin(false); return; }
  run = Math.sign(dy) === Math.sign(run) ? run + dy : dy;
  if (run > 48) setMin(true);
  else if (run < -28) setMin(false);
}, { passive: true });

/* ---------------------------------------------------------- drag the lens */
let drag = null, swallow = false;
// the tabs are links, and a mouse dragged across a link starts the browser's own
// drag — which cancels the pointer on the first move. Ours is the only drag here.
caps.addEventListener("dragstart", (e) => e.preventDefault());
caps.addEventListener("pointerdown", (e) => {
  if (minimized || e.button > 0 || active == null && !tabs.length) return;
  drag = { x0: e.clientX, id: e.pointerId, moved: false, idx: -1 };
});
caps.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0;
  if (!drag.moved) {
    if (Math.abs(dx) < 8) return;
    drag.moved = true;
    try { caps.setPointerCapture(e.pointerId); } catch {}
    bar.classList.add("dragging");
    bar.classList.remove("no-lens");
  }
  const w = tabs[0].offsetWidth;
  const r = row.getBoundingClientRect();
  const x = clamp(e.clientX - r.left - w / 2, 0, r.width - w);
  bar.style.setProperty("--lens-x", `${x}px`);
  bar.style.setProperty("--lens-w", `${w}px`);
  const idx = clamp(Math.round(x / w), 0, tabs.length - 1);
  if (idx !== drag.idx) {
    drag.idx = idx;
    haptic(4);
    tabs.forEach((t, i) => t.classList.toggle("under", i === idx));
  }
});
const endDrag = () => {
  if (!drag) return;
  const d = drag;
  drag = null;
  bar.classList.remove("dragging");
  tabs.forEach((t) => t.classList.remove("under"));
  if (!d.moved) return;
  swallow = true;
  setTimeout(() => { swallow = false; }, 0);
  const t = tabs[d.idx];
  if (t && location.hash !== t.getAttribute("href")) location.hash = t.getAttribute("href");
  else place();
};
caps.addEventListener("pointerup", endDrag);
// a cancelled pointer (a system gesture taking over) puts the lens back, and goes nowhere
caps.addEventListener("pointercancel", () => {
  drag = null;
  bar.classList.remove("dragging");
  tabs.forEach((t) => t.classList.remove("under"));
  place();
});
caps.addEventListener("click", (e) => {
  if (swallow) { e.preventDefault(); e.stopPropagation(); return; }
  // a folded bar opens on tap instead of navigating
  if (minimized) { e.preventDefault(); setMin(false); return; }
  // the tab you are already on takes you back to the top, as on iOS
  const t = e.target.closest(".tab");
  if (t && t.getAttribute("href") === (location.hash.split("?")[0] || "#/")) {
    e.preventDefault();
    scrollTo({ top: 0, behavior: "smooth" });
  }
}, true);

/* ------------------------------------------------------------------ tone */
export function setTone(dark) {
  const v = dark ? "dark" : "light";
  if (bar.dataset.tone !== v) bar.dataset.tone = v;
}

/* ------------------------------------------------------------------ badges */
function paintBag() {
  const b = $("#bag-badge");
  const n = bagCount();
  const txt = n > 99 ? "99+" : String(n);
  const changed = b.textContent !== txt;
  b.textContent = txt;
  b.classList.toggle("on", n > 0);
  const tab = tabs.find((t) => t.dataset.tab === "bag");
  tab.setAttribute("aria-label", n ? `Bag, ${n} ${n === 1 ? "thing" : "things"}` : "Bag");
  if (changed && n > 0) replay(b, "pop");
}

let ciState = "";
function paintCheckin() {
  const mine = presence.me();
  const n = presence.count();
  const state = mine ? "in" : "out";
  if (state !== ciState) {
    ciState = state;
    $("#ci-ico").innerHTML = icon(mine ? "check" : "checkin");
    ci.dataset.in = mine ? "1" : "0";
  }
  const count = $("#ci-count");
  count.textContent = n;
  count.classList.toggle("on", !mine && n > 0);
  const label = $("#ci-l");
  if (mine) {
    const left = minsLeft(mine.until);
    label.textContent = `${left}m`;
    $("#ci-wide").textContent = `You're in · ${left} min`;
    const frac = clamp(left / CHECKIN.holdMinutes, 0, 1);
    ci.style.setProperty("--left", String(Math.round(frac * 1000)));
    ci.setAttribute("aria-label", `Checked in, ${left} minutes left`);
  } else {
    label.textContent = "Check in";
    $("#ci-wide").textContent = n ? `${n} here now · Check in` : "Check in";
    ci.style.setProperty("--left", "0");
    ci.setAttribute("aria-label", n ? `Check in — ${n} people here now` : "Check in");
  }
}

export function initTabbar() {
  tabs.forEach((t) => { t.querySelector(".tab-ico").innerHTML = icon(t.dataset.tab) + icon(t.dataset.tab + "F"); });
  onStore(paintBag);
  presence.subscribe(paintCheckin);
  paintBag();
  paintCheckin();
  setInterval(paintCheckin, 20000);
  addEventListener("resize", () => { if (!narrow.matches) setMin(false); place(); });
  if ("ResizeObserver" in window) new ResizeObserver(() => place()).observe(row);
  document.fonts?.ready?.then(place);
}
