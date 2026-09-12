// The chrome every view borrows: photos, toasts, the − n + control, the one-tap
// add, the bottom sheet and the item sheet, segmented controls, faces, reveals.

import { $, $$, esc, priceHTML, priceText, money } from "./util.js";
import { haptic, replay, reduced, fly } from "./motion.js";
import { icon } from "./icons.js";
import { PHOTOS } from "./photos.js";
import { byId, OPTION_GROUPS } from "./data.js";
import { addLine, defaults, unitPrice, removeLine } from "./store.js";

/* ----------------------------------------------------------------- photos */
/** One of their photographs, at the size the slot needs, tone-painted until it arrives. */
export function photoHTML(key, { sizes = "(min-width: 900px) 440px, 92vw", pos = "", alt = "", eager = false, lazy = true, cls = "" } = {}) {
  const p = PHOTOS[key];
  if (!p) return "";
  // lazy by default; a horizontal rail passes lazy:false, because Chrome measures
  // lazy distance sideways too and the last card would arrive only once swiped to
  const load = eager ? 'fetchpriority="high"' : lazy ? 'loading="lazy"' : "";
  return `<img class="pic${cls ? " " + cls : ""}" src="assets/photos/${key}-sm.webp" srcset="assets/photos/${key}-sm.webp 480w, assets/photos/${key}.webp ${p.w}w" sizes="${sizes}" width="${p.w}" height="${p.h}" alt="${esc(alt)}" ${load} decoding="async" style="--tone:${p.tone}${pos ? `;object-position:${pos}` : ""}">`;
}

/** A menu item's square: its photograph, or a drawn glyph on the house tint. */
export function thumbHTML(item, px = 64) {
  if (item.photo) return photoHTML(item.photo, { sizes: `${px}px`, pos: item.pos, cls: "pic--thumb" });
  return `<span class="glyph">${icon(item.glyph || "cup")}</span>`;
}

/* ------------------------------------------------------------------ toast */
/** A glass capsule that drops from the top, the way iOS reports a small thing done. */
export function toast(message, { action = null, ms = 2600 } = {}) {
  const root = $("#toast-root");
  if (!root) return;
  root.replaceChildren();
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `<span class="toast-ico">${icon("check")}</span><span class="toast-t"></span>` +
    (action ? `<a class="toast-act" href="${action.href || "#"}">${esc(action.label)}</a>` : "");
  node.querySelector(".toast-t").textContent = message;
  if (action?.run) node.querySelector(".toast-act").addEventListener("click", (e) => { e.preventDefault(); action.run(); node.remove(); });
  root.append(node);
  setTimeout(() => { node.classList.add("out"); setTimeout(() => node.remove(), 420); }, ms);
}

/* -------------------------------------------------------------------- qty */
export const qtyHTML = (n, label = "") => `
  <span class="qty" ${label ? `aria-label="${esc(label)}"` : ""}>
    <button type="button" data-dec aria-label="One fewer">${icon("minus")}</button>
    <output aria-live="polite">${n}</output>
    <button type="button" data-inc aria-label="One more">${icon("plus")}</button>
  </span>`;

/** Wire a − n + control. onChange gets the new quantity. */
export function qty(node, { value, min = 0, max = 20, onChange }) {
  const out = node.querySelector("output");
  const set = (n) => {
    value = Math.min(max, Math.max(min, n));
    out.textContent = value;
    onChange(value);
  };
  node.querySelector("[data-dec]").addEventListener("click", (e) => { e.stopPropagation(); haptic(6); set(value - 1); });
  node.querySelector("[data-inc]").addEventListener("click", (e) => { e.stopPropagation(); haptic(6); set(value + 1); });
  return { set: (n) => { value = n; out.textContent = n; } };
}

/* ------------------------------------------------------------- add to bag */
export const addHTML = (item) => `
  <button class="add" type="button" data-add="${item.id}" aria-label="Add ${esc(item.name)} to your bag">
    <span class="add-plus">${icon("plus")}</span><span class="add-check">${icon("check")}</span>
  </button>`;

/** Where a thing thrown at the bag should land: the Bag tab, or the folded bar. */
function bagTarget() {
  const bar = $("#tabbar");
  if (bar?.classList.contains("min")) return $("#tabs");
  return $('#tabbar .tab[data-tab="bag"] .tab-ico');
}

/** One tap: the drink goes in as it comes, flies to the bag, the button ticks. */
export function addItem(id, btn, { qty: n = 1, opts = null, from = null } = {}) {
  const item = byId(id);
  if (!item) return;
  haptic([8, 30, 10]);
  addLine(id, n, opts);
  if (btn) { replay(btn, "done"); setTimeout(() => btn.classList.remove("done"), 1100); }
  const img = from || btn?.closest("[data-item]")?.querySelector("img.pic, .glyph");
  const src = img?.tagName === "IMG" ? (img.currentSrc || img.src) : "";
  fly(img || btn, bagTarget(), { src }).then(() => {
    replay($('#tabbar .tab[data-tab="bag"]'), "bump");
  });
  toast(n > 1 ? `${n} × ${item.name} in your bag` : `${item.name} is in your bag`, { action: { label: "View", href: "#/bag" } });
}

/** One listener for the whole app, on the document — views come and go, it stays single. */
export function wireAdds() {
  if (wireAdds.done) return;
  wireAdds.done = true;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (btn) { e.preventDefault(); e.stopPropagation(); addItem(btn.dataset.add, btn); return; }
    const open = e.target.closest("[data-item]");
    if (open && !e.target.closest("a[href], button, input, label, select, textarea")) {
      e.preventDefault();
      itemSheet(open.dataset.item);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const open = e.target.closest?.("[data-item]");
    if (open && e.target === open) { e.preventDefault(); itemSheet(open.dataset.item); }
  });
}

/* ------------------------------------------------------------------ sheet */
let openNow = null;

export function closeSheet() {
  if (!openNow) return;
  const { scrim, sheet, onClose, onKey, focus } = openNow;
  openNow = null;
  sheet.classList.remove("on");
  scrim.classList.remove("on");
  document.documentElement.classList.remove("sheet-open");
  document.removeEventListener("keydown", onKey);
  const done = () => { scrim.remove(); sheet.remove(); onClose?.(); };
  reduced() ? done() : setTimeout(done, 420);
  try { focus?.focus({ preventScroll: true }); } catch {}
}

/**
 * A bottom sheet with a grabber — swipe it down, tap outside, or Escape to close.
 * On a phone the page behind steps back, as it does under an iOS sheet; on a
 * wide screen it is a centred card. body/foot are HTML; mount(sheet) runs once
 * it is in the document.
 */
export function openSheet({ title = "", sub = "", body = "", foot = "", mount, onClose, label = "", cls = "" } = {}) {
  closeSheet();
  const root = $("#sheet-root");
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  const sheet = document.createElement("section");
  sheet.className = "sheet" + (cls ? " " + cls : "");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", label || title || "Details");
  sheet.tabIndex = -1;
  sheet.innerHTML = `
    <div class="sheet-grab"><i></i></div>
    <button class="sheet-close" type="button" aria-label="Close">${icon("close")}</button>
    <div class="sheet-body">
      ${title ? `<h2 class="sheet-title">${title}</h2>` : ""}
      ${sub ? `<p class="sheet-sub">${sub}</p>` : ""}
      ${body}
    </div>
    ${foot ? `<div class="sheet-foot">${foot}</div>` : ""}`;
  root.append(scrim, sheet);
  const view = $("#view");
  if (view) view.style.transformOrigin = `50% ${Math.round(scrollY + innerHeight * .45)}px`;
  const onKey = (e) => { if (e.key === "Escape") closeSheet(); };
  document.addEventListener("keydown", onKey);
  openNow = { scrim, sheet, onClose, onKey, focus: document.activeElement };
  requestAnimationFrame(() => requestAnimationFrame(() => {
    scrim.classList.add("on");
    sheet.classList.add("on");
    document.documentElement.classList.add("sheet-open");
    sheet.focus({ preventScroll: true });
  }));

  scrim.addEventListener("click", closeSheet);
  sheet.querySelector(".sheet-close").addEventListener("click", closeSheet);

  // drag down on the grabber, or on the body when it is scrolled to its top
  let y0 = null, dy = 0, t0 = 0;
  const grab = sheet.querySelector(".sheet-grab");
  const bodyEl = sheet.querySelector(".sheet-body");
  const start = (e) => { y0 = e.touches[0].clientY; dy = 0; t0 = performance.now(); sheet.classList.add("drag"); };
  const move = (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
  };
  const end = () => {
    if (y0 == null) return;
    const v = dy / Math.max(1, performance.now() - t0);
    sheet.classList.remove("drag");
    sheet.style.transform = "";
    if (dy > 110 || (dy > 40 && v > .6)) closeSheet();
    y0 = null;
  };
  grab.addEventListener("touchstart", start, { passive: true });
  grab.addEventListener("touchmove", move, { passive: true });
  grab.addEventListener("touchend", end);
  bodyEl.addEventListener("touchstart", (e) => { if (bodyEl.scrollTop <= 0) start(e); }, { passive: true });
  bodyEl.addEventListener("touchmove", (e) => { if (y0 != null && bodyEl.scrollTop <= 0) move(e); }, { passive: true });
  bodyEl.addEventListener("touchend", end);

  mount?.(sheet);
  wireImages(sheet);
  return { sheet, close: closeSheet };
}

/** Yes / no, iOS-style. */
export function confirmSheet({ title, sub = "", yes = "OK", no = "Cancel", danger = false, onYes }) {
  openSheet({
    title, sub, label: title, cls: "sheet--confirm",
    foot: `<div class="btn-pair"><button class="btn btn--soft" type="button" data-no>${esc(no)}</button><button class="btn ${danger ? "btn--danger" : "btn--primary"}" type="button" data-yes>${esc(yes)}</button></div>`,
    mount(sheet) {
      sheet.querySelector("[data-no]").addEventListener("click", closeSheet);
      sheet.querySelector("[data-yes]").addEventListener("click", () => { closeSheet(); onYes?.(); });
    },
  });
}

/* ------------------------------------------------------------- item sheet */
/** A drink or a dish: its photo, what it is, the choices it takes. line = edit that bag line. */
export function itemSheet(id, { line = null } = {}) {
  const item = byId(id);
  if (!item) return;
  const editing = !!line;
  const opts = { ...defaults(item), ...(line?.opts || {}) };
  let n = line ? line.qty : 1;
  const hero = item.photo
    ? `<div class="it-hero">${photoHTML(item.photo, { sizes: "(min-width: 700px) 540px, 100vw", pos: item.pos, eager: true })}</div>`
    : `<div class="it-hero it-hero--glyph"><span class="glyph glyph--xl">${icon(item.glyph || "cup")}</span></div>`;
  const groups = (item.options || []).map((g) => {
    const grp = OPTION_GROUPS[g];
    return `<fieldset class="opt" data-g="${g}"><legend class="opt-name">${esc(grp.name)}</legend><div class="opt-row">` +
      grp.choices.map((c) => `<button type="button" class="pill" data-v="${c.id}" aria-pressed="${opts[g] === c.id}">${esc(c.label)}${c.add ? `<small>+${money(c.add)}</small>` : ""}</button>`).join("") +
      `</div></fieldset>`;
  }).join("");
  const body = `${hero}
    <div class="it-head">
      <div class="it-titles">${item.tag ? `<span class="tag">${esc(item.tag)}</span>` : ""}<h2 class="it-name">${esc(item.name)}</h2></div>
      <div class="it-price" id="it-unit"></div>
    </div>
    <p class="it-desc">${esc(item.desc)}</p>
    ${groups}`;
  const foot = `<div class="it-foot">${qtyHTML(n, "Quantity")}<button class="btn btn--primary btn--grow" type="button" id="it-go"><span>${editing ? "Update" : "Add to bag"}</span><span class="btn-sum money" id="it-sum"></span></button></div>`;
  openSheet({
    body, foot, label: item.name, cls: "sheet--item",
    mount(sheet) {
      const sum = sheet.querySelector("#it-sum"), unit = sheet.querySelector("#it-unit");
      const paint = () => {
        const u = unitPrice(item, opts);
        unit.innerHTML = priceHTML(u);
        sum.textContent = priceText(u * n);
      };
      sheet.querySelectorAll(".opt").forEach((fs) => fs.addEventListener("click", (e) => {
        const b = e.target.closest(".pill");
        if (!b) return;
        haptic(6);
        opts[fs.dataset.g] = b.dataset.v;
        fs.querySelectorAll(".pill").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        paint();
      }));
      qty(sheet.querySelector(".qty"), { value: n, min: 1, max: 20, onChange: (v) => { n = v; paint(); } });
      paint();
      sheet.querySelector("#it-go").addEventListener("click", () => {
        if (editing) {
          removeLine(line.key);
          addLine(item.id, n, opts);
          closeSheet();
          toast(`${item.name} updated`);
          return;
        }
        const img = sheet.querySelector(".it-hero img, .it-hero .glyph");
        addItem(item.id, null, { qty: n, opts, from: img });
        closeSheet();
      });
    },
  });
}

/* ----------------------------------------------------------------- images */
/** Fade a photo in once it has pixels. One that fails retries once, then keeps its tone. */
export function wireImages(root = document) {
  $$("img.pic", root).forEach((im) => {
    if (im.dataset.wired) return;
    im.dataset.wired = "1";
    const ready = () => im.classList.add("ready");
    if (im.complete && im.naturalWidth) { ready(); return; }
    im.addEventListener("load", ready, { once: true });
    im.addEventListener("error", () => {
      if (im.dataset.retry) return;
      im.dataset.retry = "1";
      setTimeout(() => { im.removeAttribute("srcset"); im.src = im.src.split("?")[0] + "?r=1"; }, 900);
    });
  });
}

let revealObs = null;
export function observeReveals(root = document) {
  revealObs?.disconnect();
  const items = $$(".rv", root);
  if (!("IntersectionObserver" in window) || reduced()) { items.forEach((el) => el.classList.add("in")); return; }
  revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealObs.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -4% 0px", threshold: 0.02 });
  items.forEach((el) => revealObs.observe(el));
}

/* ---------------------------------------------------------------- avatars */
/** A face: the photo if there is one, else initials on the person's colour. */
export function avatarHTML({ ini = "", hue = 8, photo = "", size = 40, me = false } = {}) {
  const face = photo ? `<img src="${photo}" alt="" decoding="async">` : ini ? `<b>${esc(ini)}</b>` : icon("profile");
  return `<span class="av av-${hue}${me ? " av--me" : ""}" style="--s:${size}px" aria-hidden="true">${face}</span>`;
}

/** Up to five faces, overlapped, and a +n for the rest. */
export function facesHTML(people, { size = 34, max = 5 } = {}) {
  const shown = people.slice(0, max).map((p) => avatarHTML({ ...p, size })).join("");
  const more = people.length > max ? `<span class="av av-more" style="--s:${size}px"><b>+${people.length - max}</b></span>` : "";
  return `<span class="faces">${shown}${more}</span>`;
}

/* ------------------------------------------------------ segmented control */
export const segHTML = (name, options, value, cls = "") => `
  <div class="seg ${cls}" role="radiogroup" aria-label="${esc(name)}" data-seg="${esc(name)}">
    <span class="seg-ink" aria-hidden="true"></span>
    ${options.map((o) => `<button type="button" role="radio" aria-checked="${o.v === value}" data-v="${o.v}">${o.ico ? icon(o.ico) : ""}<span>${esc(o.label)}</span></button>`).join("")}
  </div>`;

/** The pill slides to the chosen segment; onChange(value). */
export function wireSeg(seg, onChange) {
  const ink = seg.querySelector(".seg-ink");
  const place = (animate = true) => {
    const on = seg.querySelector('[aria-checked="true"]') || seg.querySelector("button");
    if (!on || !on.offsetWidth) return;
    if (!animate) ink.style.transition = "none";
    ink.style.width = `${on.offsetWidth}px`;
    ink.style.transform = `translateX(${on.offsetLeft}px)`;
    if (!animate) { void ink.offsetWidth; ink.style.transition = ""; }
    seg.dataset.ready = "1";
  };
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b || b.getAttribute("aria-checked") === "true") return;
    seg.querySelectorAll("button[data-v]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    haptic(6);
    place();
    onChange(b.dataset.v, e);
  });
  place(false);
  if ("ResizeObserver" in window) new ResizeObserver(() => place(false)).observe(seg);
  return { place };
}

/* ------------------------------------------------------------ small parts */
export const emptyHTML = ({ glyph = "bag", title, sub, cta = "", href = "#/" }) => `
  <div class="empty">
    <span class="empty-ico">${icon(glyph)}</span>
    <p class="d3">${title}</p>
    <p class="small">${sub}</p>
    ${cta ? `<a class="btn btn--primary" href="${href}">${cta}</a>` : ""}
  </div>`;

export const poweredHTML = () => `
  <div class="powered">
    <img class="on-light" src="assets/brand/alpha-black.png" alt="Alpha Agency" width="34" height="26">
    <img class="on-dark" src="assets/brand/alpha-white.png" alt="" width="34" height="26">
    <div><small>Powered by</small><b>Alpha Agency</b></div>
    <span>Preview · ${new Date().getFullYear()}</span>
  </div>`;
