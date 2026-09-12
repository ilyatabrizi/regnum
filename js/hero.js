// The hero reel — theirs, muted, looping, full-bleed on a phone.
//
// Autoplay fails quietly in two ways and both are handled. Chrome does not always
// honour a `muted` attribute on a video built from a string, so muted is set as a
// property before every play(). A strict policy (Low Power Mode, data saver)
// refuses until the first gesture, so play() is tried again on the first touch,
// scroll or key, and on coming back to the tab; if it still refuses, a play
// button shows. A silent poster is never left standing in for the film.
//
// On a wide screen the portrait reel stands in a tall frame and the room around
// it is lit by the reel itself: each frame is drawn into an 18×32 canvas that CSS
// blows up behind it, the way a television throws its light on a wall.

import { REEL } from "./reel.js";
import { icon } from "./icons.js";

export const heroMediaHTML = () => `
  <div class="hero-ambient" aria-hidden="true"><canvas width="18" height="32"></canvas></div>
  <div class="hero-frame">
    <div class="hero-media">
      <img class="hero-poster" src="${REEL.poster}" alt="" width="${REEL.w}" height="${REEL.h}" decoding="async" fetchpriority="high">
      <video class="hero-video" playsinline muted loop preload="auto" poster="${REEL.poster}" aria-hidden="true" tabindex="-1" disablepictureinpicture disableremoteplayback></video>
      <button class="hero-play" type="button" aria-label="Play the film" hidden>${icon("play")}</button>
    </div>
  </div>`;

export function mountHero(root) {
  const video = root.querySelector(".hero-video");
  const poster = root.querySelector(".hero-poster");
  const btn = root.querySelector(".hero-play");
  const canvas = root.querySelector(".hero-ambient canvas");
  const ambient = canvas?.parentElement;
  if (!video) return () => {};
  let alive = true, inView = true, raf = 0, lastT = -1;

  const hush = () => {
    video.muted = true; video.defaultMuted = true; video.playsInline = true;
    video.setAttribute("muted", ""); video.setAttribute("playsinline", ""); video.setAttribute("webkit-playsinline", "");
  };
  const shown = () => { root.classList.add("hero--playing"); btn.hidden = true; };
  const play = () => {
    if (!alive || !inView || document.hidden) return;
    hush();
    const p = video.play();
    if (p && p.then) p.then(shown).catch(() => { if (alive && video.paused) btn.hidden = false; });
  };

  hush();
  video.src = REEL.src;
  video.addEventListener("playing", shown);
  video.addEventListener("loadedmetadata", play);
  video.addEventListener("canplay", play);
  btn.addEventListener("click", () => { hush(); video.play().then(shown).catch(() => {}); });

  const gesture = () => { if (video.paused) play(); };
  const GESTURES = ["pointerdown", "touchstart", "scroll", "keydown"];
  GESTURES.forEach((ev) => addEventListener(ev, gesture, { passive: true, capture: true }));
  const onVis = () => { if (!document.hidden) play(); };
  document.addEventListener("visibilitychange", onVis);

  // off-screen, the reel rests (a phone's battery is the café's too)
  const io = "IntersectionObserver" in window ? new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView) play(); else video.pause();
  }, { threshold: 0.02 }) : null;
  io?.observe(root);

  // ambient light for wide screens
  const ctx = canvas?.getContext("2d", { alpha: false });
  const wide = matchMedia("(min-width: 900px)");
  const drawFrom = (src) => {
    try { ctx.drawImage(src, 0, 0, canvas.width, canvas.height); ambient.classList.add("lit"); } catch {}
  };
  const tick = () => {
    raf = 0;
    if (!alive) return;
    if (wide.matches && inView && !document.hidden && video.readyState >= 2 && video.currentTime !== lastT) {
      lastT = video.currentTime;
      drawFrom(video);
    }
    raf = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  };
  if (ctx) {
    const firstLight = () => { if (poster.naturalWidth) drawFrom(poster); };
    poster.complete ? firstLight() : poster.addEventListener("load", firstLight, { once: true });
    tick();
  }

  play();

  return () => {
    alive = false;
    GESTURES.forEach((ev) => removeEventListener(ev, gesture, { capture: true }));
    document.removeEventListener("visibilitychange", onVis);
    io?.disconnect();
    if (raf) { video.cancelVideoFrameCallback ? video.cancelVideoFrameCallback(raf) : cancelAnimationFrame(raf); }
    video.pause();
  };
}
