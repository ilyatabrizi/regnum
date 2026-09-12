// Wiring: routes, the two bars, and what has to stay in step with the page no
// matter which screen is up.

import { logo } from "./brand.js";
import { BUSINESS } from "./config.js";
import { initTheme, PAPER } from "./theme.js";
import { $ } from "./util.js";
import { icon } from "./icons.js";
import { route, startRouter } from "./router.js";
import { runBoot } from "./boot.js";
import { wireAdds, wireImages, observeReveals, closeSheet } from "./ui.js";
import { initTabbar, paintTabs, setTone, expand } from "./tabbar.js";

import home from "./views/home.js";
import menu from "./views/menu.js";
import bagView from "./views/bag.js";
import orderView from "./views/order.js";
import checkin from "./views/checkin.js";
import profile from "./views/profile.js";

/* ----------------------------------------------------------------- routes */
route("/", home);
route("/menu", menu);
route("/bag", bagView);
route("/order/:id", orderView);
route("/checkin", checkin);
route("/profile", profile);

/* ---------------------------------------------------------------- top bar */
const bar = $("#bar");
const barTitle = $("#bar-title");
const back = $("#bar-back");
const tabbar = $("#tabbar");
const themeMeta = $("#theme-color");

$("#bar-logo").innerHTML = logo({ part: "word", cls: "logo--bar", label: BUSINESS.name });
back.innerHTML = icon("chevronL");

const TITLES = { "/menu": "Menu", "/bag": "Bag", "/order": "Your order", "/checkin": "Check in", "/profile": "Profile" };
const rootOf = (p) => "/" + ((p || "/").split("/")[1] || "");

/* ------------------------------------------------- what scroll decides */
// Recomputed on every render as well as on scroll: replacing the DOM fires no
// scroll event, and a short page must not inherit the bar a long one earned.
let lt = null, hero = null, ticking = false;
function chrome() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const barH = bar.offsetHeight;
    const heroBottom = hero ? hero.getBoundingClientRect().bottom : -1;
    const overHero = heroBottom > barH + 4;
    const scrollable = document.documentElement.scrollHeight - innerHeight > 40;
    bar.classList.toggle("over-hero", overHero);
    bar.classList.toggle("solid", !overHero && scrollable && scrollY > 6);
    bar.classList.toggle("titled", !!lt && lt.getBoundingClientRect().bottom < barH - 2);
    const tb = tabbar.getBoundingClientRect();
    setTone(heroBottom > tb.top + tb.height / 2);
    // Safari tints its status bar from theme-color: the reel's dark while it sits under it
    const dark = document.documentElement.dataset.mode === "dark";
    const want = overHero ? "#0A0C08" : (dark ? PAPER.dark : PAPER.light);
    if (themeMeta.content !== want) themeMeta.content = want;
  });
}
addEventListener("scroll", chrome, { passive: true });
addEventListener("resize", chrome);
document.addEventListener("theme:change", chrome);

/* ------------------------------------------------------------ after render */
document.addEventListener("view:rendered", (e) => {
  const p = e.detail.path;
  const root = rootOf(p);
  closeSheet();
  paintTabs(p);
  lt = e.detail.screen.querySelector(".lt");
  hero = e.detail.screen.querySelector(".hero");
  barTitle.textContent = TITLES[root] || "";
  back.hidden = root !== "/order";
  document.body.dataset.route = root.slice(1) || "home";
  bar.classList.remove("solid", "titled");
  observeReveals(e.detail.screen);
  wireImages(e.detail.screen);
  expand();
  chrome();
  document.title = TITLES[root] ? `${TITLES[root]} · ${BUSINESS.full}` : `${BUSINESS.full} — ${BUSINESS.city}`;
});
back.addEventListener("click", () => (history.length > 1 ? history.back() : (location.hash = "#/")));

/* -------------------------------------------------------------------- go */
initTheme();
initTabbar();
wireAdds();
runBoot(startRouter());

const local = ["localhost", "127.0.0.1"].includes(location.hostname);
if ("serviceWorker" in navigator && !location.search.includes("nosw") && (!local || location.search.includes("sw"))) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
