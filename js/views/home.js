// Home. Their reel, full-bleed, with their lockup alone in the exact middle of it —
// no greeting, no tagline (Ilya, 2026-09-12). Then the plates from their own photographs, who
// is in the room right now, the kitchen, the room itself, and where to find them.
//
// There is no Instagram section and no link to one: the grid near the foot is
// simply their frames, and it opens the menu rather than leaving the app.

import { BUSINESS } from "../config.js";
import { logo } from "../brand.js";
import { REEL } from "../reel.js";
import { byId, SIGNATURES, KITCHEN } from "../data.js";
import { esc, priceHTML } from "../util.js";
import { icon } from "../icons.js";
import { heroMediaHTML, mountHero } from "../hero.js";
import { photoHTML, thumbHTML, addHTML, facesHTML, poweredHTML } from "../ui.js";
import * as presence from "../presence.js";

// where each photograph's subject sits, for a 4:5 card
const CARD_POS = {
  "royal-breakfast": "50% 52%", "french-toast": "50% 50%", "red-berry": "50% 48%",
  "pizza-regnum": "50% 46%", "mango-royal": "50% 44%", "persian-tea": "48% 46%",
};
// their frames, as they came: the whole tables and the drinks on green marble
const FRAMES = [
  ["table", "#/menu?c=breakfast"], ["brunch", "#/menu?c=brunch"], ["drinks", "#/menu?c=cold"],
  ["buns", "#/menu?c=breakfast"], ["halva-cake", "#/menu?c=brunch"], ["blue-drink", "#/menu?c=cold"],
];

const card = (item) => `
  <article class="card" data-item="${item.id}" tabindex="0" aria-label="${esc(item.name)}">
    <div class="card-img">${photoHTML(item.photo, { sizes: "(min-width: 900px) 230px, 72vw", pos: CARD_POS[item.id] || "50% 50%", lazy: false })}</div>
    <div class="card-shade" aria-hidden="true"></div>
    <div class="card-body">
      ${item.tag ? `<span class="card-tag">${esc(item.tag)}</span>` : ""}
      <h3 class="card-name">${esc(item.name)}</h3>
      <div class="card-foot"><span class="card-price">${priceHTML(item.price)}</span>${addHTML(item)}</div>
    </div>
  </article>`;

const row = (item) => `
  <li class="mrow" data-item="${item.id}" tabindex="0">
    <span class="mrow-img">${thumbHTML(item, 64)}</span>
    <span class="mrow-t"><span class="mrow-n">${esc(item.name)}</span><span class="mrow-d">${esc(item.desc)}</span><span class="mrow-p">${priceHTML(item.price)}</span></span>
    ${addHTML(item)}
  </li>`;

function roomCard() {
  const people = presence.room();
  const n = people.length;
  const mine = presence.me();
  return `
    <a class="room-card" href="#/checkin" aria-label="${n} ${n === 1 ? "person" : "people"} at ${BUSINESS.name} now — ${mine ? "you're checked in" : "check in"}">
      <span class="room-top"><span class="live"><i></i>Live</span><span class="room-where">${esc(BUSINESS.name)} · ${esc(BUSINESS.city)}</span></span>
      <span class="room-mid"><span class="room-n">${n}</span><span class="room-t">${n === 1 ? "person is" : "people are"} here<br>right now</span></span>
      <span class="room-foot">${n ? facesHTML(people, { size: 34, max: 5 }) : `<span class="room-first">Be the first in.</span>`}<span class="room-cta">${mine ? "You're in" : "Check in"}${icon("arrowR")}</span></span>
    </a>`;
}

export default function home() {
  const html = `
    <section class="hero" id="hero" style="--lqip:url('${REEL.lqip}')" aria-label="${esc(BUSINESS.full)}">
      ${heroMediaHTML()}
      <div class="hero-veil" aria-hidden="true"></div>
      <div class="hero-mid"><h1 class="hero-logo">${logo({ cls: "logo--hero" })}</h1></div>
      <div class="hero-acts">
        <a class="btn btn--light" href="#/menu">See the menu</a>
        <a class="btn btn--glass" href="#/checkin" id="hero-here"><i class="live-dot" aria-hidden="true"></i><span></span></a>
      </div>
    </section>

    <section class="sec home-sigs">
      <div class="wrap"><div class="sec-head rv"><div><p class="eyebrow">The table</p><h2 class="d2">What everyone orders</h2></div><a class="link" href="#/menu">Menu${icon("chevronR")}</a></div></div>
      <div class="rail" id="rail">${SIGNATURES.map((id) => card(byId(id))).join("")}</div>
    </section>

    <section class="sec wrap rv"><div id="room-slot">${roomCard()}</div></section>

    <section class="sec wrap rv">
      <div class="sec-head"><div><p class="eyebrow">From the kitchen</p><h2 class="d2">Baked in the pan, brought out in it</h2></div><a class="link" href="#/menu?c=kitchen">Kitchen${icon("chevronR")}</a></div>
      <div class="kitchen">
        <figure class="feature">${photoHTML("skillet-pizza", { sizes: "(min-width: 900px) 620px, 92vw", pos: "50% 52%", alt: "A pepperoni pizza, baked and served in its skillet" })}<figcaption>Pepperoni, olive, green shoots — straight from the pan</figcaption></figure>
        <ul class="list mlist">${KITCHEN.map((id) => row(byId(id))).join("")}</ul>
      </div>
    </section>

    <section class="sec wrap rv">
      <div class="sec-head"><div><p class="eyebrow">The room</p><h2 class="d2">How it looks when it arrives</h2></div></div>
      <div class="frames">${FRAMES.map(([k, href]) => `<a class="frame-tile" href="${href}" aria-label="See this part of the menu">${photoHTML(k, { sizes: "(min-width: 900px) 180px, 31vw", pos: "50% 50%" })}</a>`).join("")}</div>
      <a class="btn btn--soft btn--block frames-btn" href="#/menu">${icon("menu")}<span>Open the whole menu</span></a>
    </section>

    <section class="sec wrap rv">
      <div class="sec-head"><div><p class="eyebrow">Visit</p><h2 class="d2">Find us in ${esc(BUSINESS.city)}</h2></div></div>
      <ul class="list">
        <li class="row"><span class="row-ico">${icon("pin")}</span><span class="row-t"><b>${esc(BUSINESS.full)}</b><span>${esc(BUSINESS.city)}, ${esc(BUSINESS.country)}</span></span></li>
        ${BUSINESS.hours.map((h) => `<li class="row"><span class="row-ico">${icon("clock")}</span><span class="row-t"><b>${esc(h.days)}</b><span>${esc(h.time)}</span></span></li>`).join("")}
        <li><a class="row row--tap" href="#/checkin"><span class="row-ico">${icon("people")}</span><span class="row-t"><b>Who is in right now</b><span>Tap in when you sit down</span></span><span class="row-go">${icon("chevronR")}</span></a></li>
      </ul>
    </section>

    <footer class="footer wrap">
      <div class="footer-logo">${logo({ cls: "logo--footer" })}</div>
      <p class="small">A café and a restaurant in ${esc(BUSINESS.city)}.</p>
      ${poweredHTML()}
    </footer>`;

  return {
    html,
    padTop: false,
    mount(screen, onLeave) {
      onLeave(mountHero(screen.querySelector(".hero")));
      const here = screen.querySelector("#hero-here span");
      const slot = screen.querySelector("#room-slot");
      const paint = () => {
        const n = presence.count();
        here.textContent = presence.isIn() ? "You're checked in" : n ? `${n} here now` : "Check in";
        slot.innerHTML = roomCard();
      };
      paint();
      onLeave(presence.subscribe(paint));
    },
  };
}
