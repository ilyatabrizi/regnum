// Motion helpers. Everything here steps aside for reduced motion — except the
// hero reel, which is content, not decoration.

export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A tap you can feel, where the phone allows it (Android; iOS ignores it). */
export function haptic(pattern = 8) {
  try { navigator.vibrate?.(pattern); } catch {}
}

/** Restart a CSS animation that is keyed to a class. */
export function replay(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/**
 * Throw a small copy of `from` into `to` along an arc — the photo of a drink
 * into the bag tab. Resolves when it lands.
 */
export function fly(from, to, { src = "", size = 46 } = {}) {
  if (!from || !to || reduced() || !Element.prototype.animate) return Promise.resolve();
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  if (!a.width || !b.width) return Promise.resolve();
  const n = document.createElement("div");
  n.className = "flyer" + (src ? "" : " flyer--dot");
  n.style.width = n.style.height = `${size}px`;
  if (src) n.style.backgroundImage = `url("${src}")`;
  document.body.append(n);
  const x0 = a.left + a.width / 2 - size / 2, y0 = a.top + a.height / 2 - size / 2;
  const x1 = b.left + b.width / 2 - size / 2, y1 = b.top + b.height / 2 - size / 2;
  const peak = Math.min(y0, y1) - Math.min(140, Math.abs(y1 - y0) * .35 + 60);
  const frames = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = x0 + (x1 - x0) * t;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * peak + t * t * y1;
    frames.push({ transform: `translate(${x}px, ${y}px) scale(${1 - .62 * t})`, opacity: t > .88 ? (1 - t) / .12 : 1 });
  }
  const anim = n.animate(frames, { duration: 640, easing: "cubic-bezier(.35, 0, .45, 1)", fill: "both" });
  return anim.finished.catch(() => {}).then(() => n.remove());
}
