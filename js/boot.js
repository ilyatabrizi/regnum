// The opening: their lockup, still, on stone (their green-black in dark mode) until
// the page behind it is ready, then a plain fade. Nothing about the logo moves.
// index.html carries the markup inline, so the logo is there with the first paint.

import { STORAGE } from "./config.js";

const SEEN = STORAGE + "booted";
const root = document.documentElement;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const loaded = (img) => (!img || (img.complete && img.naturalWidth)) ? Promise.resolve()
  : new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); });

export async function runBoot(firstRender) {
  const boot = document.getElementById("boot");
  if (!boot) { root.classList.remove("booting"); return; }
  const warm = root.classList.contains("boot-warm");
  try { sessionStorage.setItem(SEEN, "1"); } catch {}

  // ready = the first screen is in, the reel's first frame has pixels, the type is loaded
  const ready = (async () => {
    await Promise.resolve(firstRender).catch(() => {});
    await Promise.all([loaded(document.querySelector(".hero-poster")), document.fonts?.ready?.catch?.(() => {})]);
  })();
  // long enough to register the logo on a first visit, barely there on a reload
  await Promise.race([Promise.all([ready, wait(warm ? 200 : 750)]), wait(3000)]);

  boot.classList.add("gone");
  await wait(460);
  boot.remove();
  root.classList.remove("booting", "boot-warm");
  document.dispatchEvent(new CustomEvent("boot:done"));
}
